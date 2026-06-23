import type { PresetConfig, Step, PoolEntry } from "./schema";

export type SeatRole = "player1" | "player2" | "host";
export type ActionType = "ban" | "pick" | "select" | "snipe" | "result" | "offer" | "gsnipe";

/** A persisted, already-resolved action (actor is a concrete seat, not LOSER/WINNER). */
export interface EngineAction {
  seq: number;
  stepIndex: number;
  actor: SeatRole;
  actionType: ActionType;
  pool?: "map" | "civ" | "drafted_civ";
  target: string; // entry id, or "player1"/"player2" for a result
  gameIndex?: number;
  scope?: "pool" | "opponent"; // for civ bans
}

export interface CivBan {
  id: string;
  by: SeatRole;
  scope: "pool" | "opponent";
}

const opponentOf = (p: SeatRole): "player1" | "player2" | null =>
  p === "player1" ? "player2" : p === "player2" ? "player1" : null;

export interface GameRec {
  gameIndex: number;
  map?: string;
  civP1?: string;
  civP2?: string;
  winner?: "player1" | "player2" | null;
}

export type EntryState = "available" | "banned" | "picked" | "drafted";
export interface PoolView extends PoolEntry {
  state: EntryState;
  by?: SeatRole;
}

export interface CivDuel {
  phase: "offer" | "snipe" | "resolved" | null;
  offerCount: number;
  snipeCount: number;
  /** Civs each player offered for this game (socket layer redacts before reveal). */
  offered: { player1: string[]; player2: string[] };
  /** Civs each player sniped from the OPPONENT this game (redacted before reveal). */
  snipedBy: { player1: string[]; player2: string[] };
  /** Whether each player has finished submitting for the current sub-phase. */
  submitted: { player1: boolean; player2: boolean };
}

export interface DerivedState {
  status: "lobby" | "running" | "paused" | "finished";
  currentStepIndex: number;
  currentStep: Step | null;
  currentStepProgress: number;
  currentGameIndex: number;
  /** Single-actor turn (turn-based steps). null for simultaneous/duel steps. */
  turn: SeatRole | null;
  /** True when the current step is a simultaneous (hidden) duel step. */
  simultaneous: boolean;
  /** Which players still owe input for the current step. */
  awaiting: { player1: boolean; player2: boolean };
  finished: boolean;
  bestOf: number;
  target: number;
  score: { player1: number; player2: number };
  maps: PoolView[];
  civs: PoolView[];
  draftedCivIds: string[];
  draftedByP1: string[];
  draftedByP2: string[];
  /** Civs each player may offer this game: their drafted hand, or the full available pool when no hand was drafted. */
  offerableP1: string[];
  offerableP2: string[];
  /** All civ bans with who banned and the scope ("pool" = global, "opponent" = vs opponent). */
  civBans: CivBan[];
  /** Civs the current player may pick into their hand (during a CIV_PICK step). */
  civPickableIds: string[];
  /** Per-player map pools (maps each player picked). Loser selects from their own. */
  mapsByP1: string[];
  mapsByP2: string[];
  selectableMapIds: string[];
  civDuel: CivDuel | null;
  games: GameRec[];
}

export function gameIndexOfSteps(steps: Step[]): number[] {
  const out: number[] = [];
  let g = 0;
  for (const s of steps) {
    out.push(g);
    if (s.type === "GAME_RESULT") g++;
  }
  return out;
}

function resolveActor(step: Step, gameIndex: number, games: GameRec[]): SeatRole | null {
  switch (step.actor) {
    case "PLAYER1": return "player1";
    case "PLAYER2": return "player2";
    case "HOST_DRAW": return "host";
    case "LOSER":
    case "WINNER": {
      const prev = games[gameIndex - 1];
      if (!prev?.winner) return null;
      const loser = prev.winner === "player1" ? "player2" : "player1";
      return step.actor === "LOSER" ? loser : prev.winner;
    }
    default: return null;
  }
}

export function deriveState(
  config: PresetConfig,
  rawActions: EngineAction[],
  status: DerivedState["status"] = "running"
): DerivedState {
  const steps = config.steps;
  const gameOf = gameIndexOfSteps(steps);
  const totalGames = steps.filter((s) => s.type === "GAME_RESULT").length;

  // Per-game duel step counts.
  const offerCountByGame: number[] = [];
  const snipeCountByGame: number[] = [];
  steps.forEach((s, i) => {
    const g = gameOf[i];
    if (s.type === "CIV_OFFER") offerCountByGame[g] = s.count;
    if (s.type === "CIV_SNIPE_OPPONENT") snipeCountByGame[g] = s.count;
  });

  const actions = [...rawActions].sort((a, b) => a.seq - b.seq);

  const mapSt = new Map<string, { state: EntryState; by?: SeatRole }>();
  const civSt = new Map<string, { state: EntryState; by?: SeatRole }>();
  const games: GameRec[] = Array.from({ length: totalGames }, (_, i) => ({ gameIndex: i, winner: null }));
  const playedMaps = new Set<string>();
  const resultByGame = new Map<number, "player1" | "player2">();

  const blank = (): string[][] => Array.from({ length: totalGames }, () => []);
  const offerP1 = blank(), offerP2 = blank();
  const snipeByP1 = blank(), snipeByP2 = blank(); // civs each player removed from opponent's offer
  const civBans: CivBan[] = [];

  for (const a of actions) {
    const g = a.gameIndex ?? gameOf[a.stepIndex] ?? 0;
    switch (a.actionType) {
      case "ban":
        if (a.pool === "map") {
          mapSt.set(a.target, { state: "banned", by: a.actor });
        } else {
          const scope = a.scope ?? "pool";
          civBans.push({ id: a.target, by: a.actor, scope });
          // Only a pool ban removes the civ globally; an opponent ban is conditional.
          if (scope === "pool") civSt.set(a.target, { state: "banned", by: a.actor });
        }
        break;
      case "pick":
        if (a.pool === "map") mapSt.set(a.target, { state: "picked", by: a.actor });
        else civSt.set(a.target, { state: "drafted", by: a.actor });
        break;
      case "select":
        if (games[g]) games[g].map = a.target;
        playedMaps.add(a.target);
        break;
      case "snipe": // legacy direct pick
        if (games[g]) {
          if (a.actor === "player1") games[g].civP1 = a.target;
          else if (a.actor === "player2") games[g].civP2 = a.target;
        }
        break;
      case "offer":
        if (a.actor === "player1") offerP1[g]?.push(a.target);
        else if (a.actor === "player2") offerP2[g]?.push(a.target);
        break;
      case "gsnipe":
        if (a.actor === "player1") snipeByP1[g]?.push(a.target);
        else if (a.actor === "player2") snipeByP2[g]?.push(a.target);
        break;
      case "result":
        if (a.target === "player1" || a.target === "player2") resultByGame.set(g, a.target);
        break;
    }
  }
  for (const [g, w] of resultByGame) if (games[g]) games[g].winner = w;

  // Resolve duel civs: survivor of each player's offer after the opponent's snipe.
  for (let g = 0; g < totalGames; g++) {
    const oc = offerCountByGame[g];
    const sc = snipeCountByGame[g] ?? 0;
    if (oc == null) continue;
    const offerDone = offerP1[g].length >= oc && offerP2[g].length >= oc;
    const snipeDone = snipeByP1[g].length >= sc && snipeByP2[g].length >= sc;
    if (offerDone && snipeDone) {
      const survP1 = offerP1[g].filter((id) => !snipeByP2[g].includes(id)); // P2 snipes P1
      const survP2 = offerP2[g].filter((id) => !snipeByP1[g].includes(id)); // P1 snipes P2
      if (survP1.length >= 1 && games[g].civP1 == null) games[g].civP1 = survP1[0];
      if (survP2.length >= 1 && games[g].civP2 == null) games[g].civP2 = survP2[0];
    }
  }

  const actionsByStep = new Map<number, number>();
  for (const a of actions) actionsByStep.set(a.stepIndex, (actionsByStep.get(a.stepIndex) ?? 0) + 1);

  const stepComplete = (i: number): boolean => {
    const s = steps[i];
    const g = gameOf[i];
    switch (s.type) {
      case "GAME_RESULT":
        return games[g]?.winner != null;
      case "CIV_OFFER":
        return offerP1[g].length >= s.count && offerP2[g].length >= s.count;
      case "CIV_SNIPE_OPPONENT":
        return snipeByP1[g].length >= s.count && snipeByP2[g].length >= s.count;
      default:
        return (actionsByStep.get(i) ?? 0) >= s.count;
    }
  };

  let currentStepIndex = steps.length;
  for (let i = 0; i < steps.length; i++) {
    if (!stepComplete(i)) { currentStepIndex = i; break; }
  }
  const currentStep = currentStepIndex < steps.length ? steps[currentStepIndex] : null;
  const currentGameIndex = currentStep ? gameOf[currentStepIndex] : totalGames;
  const cg = currentGameIndex;

  let p1 = 0, p2 = 0;
  for (const gme of games) {
    if (gme.winner === "player1") p1++;
    else if (gme.winner === "player2") p2++;
  }
  const target = Math.floor(config.options.bestOf / 2) + 1;

  const maps: PoolView[] = config.maps.map((m) => ({ ...m, ...(mapSt.get(m.id) ?? { state: "available" as const }) }));
  const civs: PoolView[] = config.civs.map((c) => ({ ...c, ...(civSt.get(c.id) ?? { state: "available" as const }) }));
  const draftedCivIds = civs.filter((c) => c.state === "drafted").map((c) => c.id);
  const draftedByP1 = civs.filter((c) => c.state === "drafted" && c.by === "player1").map((c) => c.id);
  const draftedByP2 = civs.filter((c) => c.state === "drafted" && c.by === "player2").map((c) => c.id);
  // What each player may OFFER from this game: normally their drafted hand, but
  // when no hand was drafted (the "easy" flow) the whole available civ pool is
  // open, so both players simultaneously pick any civ each game.
  const availableCivIds = civs.filter((c) => c.state === "available").map((c) => c.id);
  const offerableP1 = draftedByP1.length ? draftedByP1 : availableCivIds;
  const offerableP2 = draftedByP2.length ? draftedByP2 : availableCivIds;

  // Per-player civ blocks: a "pool" ban blocks both; an "opponent" ban by X blocks X's opponent.
  const blockedFor = (p: "player1" | "player2") =>
    new Set(civBans.filter((b) => b.scope === "pool" || (b.scope === "opponent" && opponentOf(b.by) === p)).map((b) => b.id));
  const draftedSet = new Set(civs.filter((c) => c.state === "drafted").map((c) => c.id));
  const pickableFor = (p: "player1" | "player2") => {
    const blocked = blockedFor(p);
    return civs.filter((c) => c.state === "available" && !blocked.has(c.id) && !draftedSet.has(c.id)).map((c) => c.id);
  };

  // Per-player map pools (maps each player PICKed into the pool).
  const mapsByP1 = maps.filter((m) => m.state === "picked" && m.by === "player1").map((m) => m.id);
  const mapsByP2 = maps.filter((m) => m.state === "picked" && m.by === "player2").map((m) => m.id);

  // turn / simultaneous / awaiting
  let turn: SeatRole | null = null;
  let simultaneous = false;
  const awaiting = { player1: false, player2: false };
  if (currentStep) {
    if (currentStep.type === "CIV_OFFER") {
      simultaneous = true;
      awaiting.player1 = offerP1[cg].length < currentStep.count;
      awaiting.player2 = offerP2[cg].length < currentStep.count;
    } else if (currentStep.type === "CIV_SNIPE_OPPONENT") {
      simultaneous = true;
      awaiting.player1 = snipeByP1[cg].length < currentStep.count;
      awaiting.player2 = snipeByP2[cg].length < currentStep.count;
    } else {
      turn = resolveActor(currentStep, cg, games);
      awaiting.player1 = turn === "player1";
      awaiting.player2 = turn === "player2";
    }
  }

  // Map selection pool: a player selects from THEIR OWN picked maps; a random
  // (HOST_DRAW) draw uses the LEFTOVER neutral maps (un-banned and not in either
  // player's pool) — never a player's picked map.
  const neutralMaps = maps.filter((m) => m.state === "available").map((m) => m.id);
  let mapSelectBase: string[];
  if (currentStep?.type === "MAP_SELECT" && turn === "player1") mapSelectBase = mapsByP1.length ? mapsByP1 : neutralMaps;
  else if (currentStep?.type === "MAP_SELECT" && turn === "player2") mapSelectBase = mapsByP2.length ? mapsByP2 : neutralMaps;
  else mapSelectBase = neutralMaps;
  if (mapSelectBase.length === 0) mapSelectBase = maps.filter((m) => m.state !== "banned").map((m) => m.id);
  const notPlayedMaps = mapSelectBase.filter((id) => !playedMaps.has(id));
  const selectableMapIds = notPlayedMaps.length > 0 ? notPlayedMaps : mapSelectBase;

  // Civs the current player may pick into their hand (respects opponent/pool bans).
  const civPickableIds =
    currentStep?.type === "CIV_PICK" && (turn === "player1" || turn === "player2") ? pickableFor(turn) : [];

  // Duel view for the current game.
  let civDuel: CivDuel | null = null;
  if (offerCountByGame[cg] != null && cg < totalGames) {
    const phase: CivDuel["phase"] =
      currentStep?.type === "CIV_OFFER" ? "offer" :
      currentStep?.type === "CIV_SNIPE_OPPONENT" ? "snipe" :
      (games[cg].civP1 || games[cg].civP2) ? "resolved" : null;
    const oc = offerCountByGame[cg];
    const sc = snipeCountByGame[cg] ?? 0;
    civDuel = {
      phase,
      offerCount: oc,
      snipeCount: sc,
      offered: { player1: offerP1[cg].slice(), player2: offerP2[cg].slice() },
      snipedBy: { player1: snipeByP1[cg].slice(), player2: snipeByP2[cg].slice() },
      submitted:
        phase === "offer"
          ? { player1: offerP1[cg].length >= oc, player2: offerP2[cg].length >= oc }
          : phase === "snipe"
          ? { player1: snipeByP1[cg].length >= sc, player2: snipeByP2[cg].length >= sc }
          : { player1: true, player2: true },
    };
  }

  const finished = !currentStep || p1 >= target || p2 >= target;

  return {
    status: finished ? "finished" : status,
    currentStepIndex,
    currentStep,
    currentStepProgress: currentStep ? actionsByStep.get(currentStepIndex) ?? 0 : 0,
    currentGameIndex,
    turn,
    simultaneous,
    awaiting,
    finished,
    bestOf: config.options.bestOf,
    target,
    score: { player1: p1, player2: p2 },
    maps,
    civs,
    draftedCivIds,
    draftedByP1,
    draftedByP2,
    offerableP1,
    offerableP2,
    civBans,
    civPickableIds,
    mapsByP1,
    mapsByP2,
    selectableMapIds,
    civDuel,
    games,
  };
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  resolved?: { actionType: ActionType; pool?: "map" | "civ" | "drafted_civ"; gameIndex: number; scope?: "pool" | "opponent" };
}

export function validateAction(state: DerivedState, role: SeatRole, target: string): ValidationResult {
  const step = state.currentStep;
  if (state.finished) return { ok: false, error: "The series has been decided." };
  if (state.status === "lobby") return { ok: false, error: "The draft has not started yet." };
  if (!step) return { ok: false, error: "Draft is not awaiting an action." };
  if (state.status === "paused") return { ok: false, error: "Draft is paused." };

  const gameIndex = state.currentGameIndex;
  const duel = state.civDuel;

  switch (step.type) {
    case "MAP_BAN":
    case "MAP_PICK": {
      if (state.turn !== role) return { ok: false, error: "It is not your turn." };
      const entry = state.maps.find((m) => m.id === target);
      if (!entry) return { ok: false, error: "Unknown map." };
      if (entry.state !== "available") return { ok: false, error: "Map already taken." };
      return { ok: true, resolved: { actionType: step.type === "MAP_BAN" ? "ban" : "pick", pool: "map", gameIndex } };
    }
    case "CIV_BAN": {
      if (state.turn !== role) return { ok: false, error: "It is not your turn." };
      const entry = state.civs.find((c) => c.id === target);
      if (!entry) return { ok: false, error: "Unknown civ." };
      const scope = step.banScope ?? "pool";
      if (scope === "opponent") {
        // Opponent bans never change the civ's GLOBAL state, so checking only
        // `state === "available"` would let the same civ be banned twice. Guard
        // against a civ already gone (pool ban / drafted) and against this player
        // re-banning a civ they already banned for the opponent.
        if (entry.state !== "available") return { ok: false, error: "That civ is already banned." };
        if (state.civBans.some((b) => b.id === target && (b.scope === "pool" || b.by === role))) {
          return { ok: false, error: "You already banned that civ." };
        }
      } else if (entry.state !== "available") {
        return { ok: false, error: "Civ already taken." };
      }
      return { ok: true, resolved: { actionType: "ban", pool: "civ", gameIndex, scope: step.banScope } };
    }
    case "CIV_PICK": {
      if (state.turn !== role) return { ok: false, error: "It is not your turn." };
      if (!state.civPickableIds.includes(target)) return { ok: false, error: "Civ not available to pick." };
      return { ok: true, resolved: { actionType: "pick", pool: "civ", gameIndex } };
    }
    case "MAP_SELECT": {
      if (state.turn !== role) return { ok: false, error: "It is not your turn." };
      if (!state.selectableMapIds.includes(target)) return { ok: false, error: "Map not selectable." };
      return { ok: true, resolved: { actionType: "select", pool: "map", gameIndex } };
    }
    case "CIV_OFFER": {
      if (role !== "player1" && role !== "player2") return { ok: false, error: "Only players may offer." };
      if (!state.awaiting[role]) return { ok: false, error: "You have already offered." };
      const ownPool = role === "player1" ? state.offerableP1 : state.offerableP2;
      if (!ownPool.includes(target)) return { ok: false, error: "That civ is not available to offer." };
      const alreadyOffered = (role === "player1" ? duel?.offered.player1 : duel?.offered.player2) ?? [];
      if (alreadyOffered.includes(target)) return { ok: false, error: "Already offered this game." };
      if (step.excludeUsedCivs) {
        const usedThisRole = state.games.filter((g) => g.gameIndex < gameIndex).map((g) => (role === "player1" ? g.civP1 : g.civP2));
        if (usedThisRole.includes(target)) return { ok: false, error: "Civ already used in a previous game." };
      }
      return { ok: true, resolved: { actionType: "offer", gameIndex } };
    }
    case "CIV_SNIPE_OPPONENT": {
      if (role !== "player1" && role !== "player2") return { ok: false, error: "Only players may snipe." };
      if (!state.awaiting[role]) return { ok: false, error: "You have already sniped." };
      const oppOffer = (role === "player1" ? duel?.offered.player2 : duel?.offered.player1) ?? [];
      if (!oppOffer.includes(target)) return { ok: false, error: "That civ is not in your opponent's offer." };
      const alreadySniped = (role === "player1" ? duel?.snipedBy.player1 : duel?.snipedBy.player2) ?? [];
      if (alreadySniped.includes(target)) return { ok: false, error: "Already sniped this civ." };
      return { ok: true, resolved: { actionType: "gsnipe", gameIndex } };
    }
    default:
      return { ok: false, error: "Current step does not accept this action." };
  }
}
