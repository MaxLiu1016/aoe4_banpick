import { isSimultaneousStep } from "./schema";
import type { PresetConfig, Step, PoolEntry } from "./schema";

export type SeatRole = "player1" | "player2" | "host";
export type ActionType = "ban" | "pick" | "select" | "snipe" | "result" | "offer" | "gsnipe" | "confirm";

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
  /** Civs the CURRENT offer step asks of whoever it is addressed to. */
  offerCount: number;
  /** Total civs each player offers this game, across every offer step in it. */
  offerTarget: { player1: number; player2: number };
  /** False while a turn-based offer step is running: those are made in the open. */
  offerHidden: boolean;
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
  /**
   * Every step in order, flattened for the progress bar so players can see the
   * whole flow and where they are in it. `actor` is null for simultaneous steps
   * (nobody owns them) and for LOSER/WINNER steps whose game hasn't resolved.
   *
   * `count` is how many entries the step asks for, and it is here so the board can
   * reserve the slots a player will end up filling. Without it the pick band grows
   * a tile at a time and shoves everything below it down the page — which happens
   * to be exactly when the player is reaching for the pool.
   */
  stepBar: { type: string; label: string; gameIndex: number; actor: SeatRole | null; count: number }[];
  /** True when the current step is a simultaneous (hidden) duel step. */
  simultaneous: boolean;
  /**
   * Bans submitted in the CURRENT simultaneous ban step but not yet revealed
   * (the step is still waiting on the other player). These are deliberately
   * NOT reflected in `maps`/`civs` yet; the socket layer redacts the opponent's
   * list before sending. Empty for every other kind of step.
   */
  pendingBans: { player1: string[]; player2: string[] };
  /** Which players still owe input for the current step. */
  awaiting: { player1: boolean; player2: boolean };
  finished: boolean;
  bestOf: number;
  target: number;
  /** Series runs to the last game rather than stopping once it's decided. */
  playAll: boolean;
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
  // SYNC_CONFIRM: whether each player has pressed confirm, keyed by step index.
  const confirmedByStep = new Map<number, { player1: boolean; player2: boolean }>();
  const pendingBans: { player1: string[]; player2: string[] } = { player1: [], player2: [] };

  // --- Pass 1 -------------------------------------------------------------
  // A simultaneous ban step must not reveal either player's bans until BOTH
  // have submitted, so we have to know whether the step is finished BEFORE
  // deciding whether to apply its bans to the pools. That is only knowable by
  // counting each player's actions per step first, hence the separate pass.
  const perStepByActor = new Map<number, { player1: number; player2: number }>();
  for (const a of actions) {
    const e = perStepByActor.get(a.stepIndex) ?? { player1: 0, player2: 0 };
    if (a.actor === "player1") e.player1++;
    else if (a.actor === "player2") e.player2++;
    perStepByActor.set(a.stepIndex, e);
  }
  const isSimulBan = (i: number): boolean => {
    const s = steps[i];
    return !!s?.simultaneous && (s.type === "MAP_BAN" || s.type === "CIV_BAN");
  };
  const simulBanDone = (i: number): boolean => {
    const s = steps[i];
    if (!s) return false;
    const e = perStepByActor.get(i) ?? { player1: 0, player2: 0 };
    return e.player1 >= s.count && e.player2 >= s.count;
  };

  // --- Pass 2 -------------------------------------------------------------
  for (const a of actions) {
    const g = a.gameIndex ?? gameOf[a.stepIndex] ?? 0;
    switch (a.actionType) {
      case "ban":
        // Withhold this step's bans while it is still waiting on a player —
        // applying them now would leak the choice to the opponent mid-step.
        if (isSimulBan(a.stepIndex) && !simulBanDone(a.stepIndex)) {
          if (a.actor === "player1") pendingBans.player1.push(a.target);
          else if (a.actor === "player2") pendingBans.player2.push(a.target);
          break;
        }
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
      case "confirm": {
        const c = confirmedByStep.get(a.stepIndex) ?? { player1: false, player2: false };
        if (a.actor === "player1") c.player1 = true;
        else if (a.actor === "player2") c.player2 = true;
        confirmedByStep.set(a.stepIndex, c);
        break;
      }
    }
  }
  for (const [g, w] of resultByGame) if (games[g]) games[g].winner = w;

  // --- Offer / snipe targets ----------------------------------------------
  // A game may contain several offer steps: a simultaneous one asks `count` of
  // BOTH seats, a turn-based one asks it of a single seat, which is what lets a
  // format read "P1 picks 1, P2 picks 2, P1 picks 1". So the target is per player
  // and cumulative per step — step N is complete once the seats it addressed have
  // delivered, without waiting on offers a later step will ask for.
  const offerCumByStep = new Map<number, { player1: number; player2: number }>();
  const offerTotal = Array.from({ length: totalGames }, () => ({ player1: 0, player2: 0 }));
  const hasOffer = Array.from({ length: totalGames }, () => false);
  const snipeCumByStep = new Map<number, number>();
  const snipeTotal = Array.from({ length: totalGames }, () => 0);
  steps.forEach((s, i) => {
    const g = gameOf[i];
    if (s.type === "CIV_OFFER") {
      const tot = offerTotal[g];
      if (!tot) return;
      hasOffer[g] = true;
      const who = isSimultaneousStep(s) ? null : resolveActor(s, g, games);
      // An unresolved LOSER/WINNER actor can only happen for a step whose game
      // hasn't been played yet, which the step cursor never reaches — asking both
      // seats keeps it safely incomplete until the previous game decides it.
      if (who === "player1" || who === "player2") tot[who] += s.count;
      else { tot.player1 += s.count; tot.player2 += s.count; }
      offerCumByStep.set(i, { player1: tot.player1, player2: tot.player2 });
    } else if (s.type === "CIV_SNIPE_OPPONENT" && snipeTotal[g] != null) {
      snipeTotal[g] += s.count;
      snipeCumByStep.set(i, snipeTotal[g]);
    }
  });

  // Resolve duel civs: survivor of each player's offer after the opponent's snipe.
  for (let g = 0; g < totalGames; g++) {
    const sc = snipeTotal[g] ?? 0;
    if (!hasOffer[g]) continue;
    const offerDone = offerP1[g].length >= offerTotal[g].player1 && offerP2[g].length >= offerTotal[g].player2;
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
      case "CIV_OFFER": {
        const need = offerCumByStep.get(i) ?? { player1: s.count, player2: s.count };
        return offerP1[g].length >= need.player1 && offerP2[g].length >= need.player2;
      }
      case "CIV_SNIPE_OPPONENT": {
        const need = snipeCumByStep.get(i) ?? s.count;
        return snipeByP1[g].length >= need && snipeByP2[g].length >= need;
      }
      case "SYNC_CONFIRM": {
        const c = confirmedByStep.get(i);
        return !!c?.player1 && !!c?.player2;
      }
      default:
        // A simultaneous ban needs `count` from EACH player, not `count` total —
        // otherwise one fast player alone would complete the step.
        if (isSimulBan(i)) return simulBanDone(i);
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
  let offerableP1 = draftedByP1.length ? draftedByP1 : availableCivIds;
  let offerableP2 = draftedByP2.length ? draftedByP2 : availableCivIds;
  // A turn-based offer is made in the open and off the same table, so whatever
  // one side has already taken this game is gone for the other. The simultaneous
  // offer is the opposite case: neither can see the other, so both naming the
  // same civ is legitimate and is exactly what the snipe phase plays with.
  if (currentStep?.type === "CIV_OFFER" && !isSimultaneousStep(currentStep)) {
    const takenP1 = new Set(offerP1[cg] ?? []);
    const takenP2 = new Set(offerP2[cg] ?? []);
    offerableP1 = offerableP1.filter((id) => !takenP2.has(id));
    offerableP2 = offerableP2.filter((id) => !takenP1.has(id));
  }

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
      const need = offerCumByStep.get(currentStepIndex) ?? { player1: currentStep.count, player2: currentStep.count };
      if (isSimultaneousStep(currentStep)) {
        simultaneous = true;
        awaiting.player1 = offerP1[cg].length < need.player1;
        awaiting.player2 = offerP2[cg].length < need.player2;
      } else {
        turn = resolveActor(currentStep, cg, games);
        awaiting.player1 = turn === "player1" && offerP1[cg].length < need.player1;
        awaiting.player2 = turn === "player2" && offerP2[cg].length < need.player2;
      }
    } else if (currentStep.type === "CIV_SNIPE_OPPONENT") {
      simultaneous = true;
      const need = snipeCumByStep.get(currentStepIndex) ?? currentStep.count;
      awaiting.player1 = snipeByP1[cg].length < need;
      awaiting.player2 = snipeByP2[cg].length < need;
    } else if (currentStep.type === "SYNC_CONFIRM") {
      simultaneous = true;
      const c = confirmedByStep.get(currentStepIndex);
      awaiting.player1 = !c?.player1;
      awaiting.player2 = !c?.player2;
    } else if (isSimulBan(currentStepIndex)) {
      simultaneous = true;
      const e = perStepByActor.get(currentStepIndex) ?? { player1: 0, player2: 0 };
      awaiting.player1 = e.player1 < currentStep.count;
      awaiting.player2 = e.player2 < currentStep.count;
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
  // The combined pool of maps BOTH players picked (for "shared" map selection).
  const pickedMaps = maps.filter((m) => m.state === "picked").map((m) => m.id);
  let mapSelectBase: string[];
  if (currentStep?.type === "MAP_SELECT") {
    const scope = currentStep.mapScope ?? "own";
    // A random (HOST_DRAW) draw always uses the leftover neutral maps — never a
    // player's picked pool — regardless of scope.
    if (turn === "host") mapSelectBase = neutralMaps;
    else if (scope === "shared") mapSelectBase = pickedMaps.length ? pickedMaps : neutralMaps;
    else if (turn === "player1") mapSelectBase = mapsByP1.length ? mapsByP1 : neutralMaps;
    else if (turn === "player2") mapSelectBase = mapsByP2.length ? mapsByP2 : neutralMaps;
    else mapSelectBase = neutralMaps;
  } else mapSelectBase = neutralMaps;
  if (mapSelectBase.length === 0) mapSelectBase = maps.filter((m) => m.state !== "banned").map((m) => m.id);
  const notPlayedMaps = mapSelectBase.filter((id) => !playedMaps.has(id));
  const selectableMapIds = notPlayedMaps.length > 0 ? notPlayedMaps : mapSelectBase;

  // Civs the current player may pick into their hand (respects opponent/pool bans).
  const civPickableIds =
    currentStep?.type === "CIV_PICK" && (turn === "player1" || turn === "player2") ? pickableFor(turn) : [];

  // Duel view for the current game.
  let civDuel: CivDuel | null = null;
  if (hasOffer[cg] && cg < totalGames) {
    const phase: CivDuel["phase"] =
      currentStep?.type === "CIV_OFFER" ? "offer" :
      currentStep?.type === "CIV_SNIPE_OPPONENT" ? "snipe" :
      (games[cg].civP1 || games[cg].civP2) ? "resolved" : null;
    const tot = offerTotal[cg];
    const sc = snipeTotal[cg] ?? 0;
    // What THIS step still owes, which is what "has each side submitted?" means
    // mid-game; the game total is what the whole offer phase adds up to.
    const cum = (currentStep?.type === "CIV_OFFER" ? offerCumByStep.get(currentStepIndex) : null) ?? tot;
    const snipeCum = (currentStep?.type === "CIV_SNIPE_OPPONENT" ? snipeCumByStep.get(currentStepIndex) : null) ?? sc;
    civDuel = {
      phase,
      offerCount: currentStep?.type === "CIV_OFFER" ? currentStep.count : Math.max(tot.player1, tot.player2),
      offerTarget: { player1: tot.player1, player2: tot.player2 },
      offerHidden: currentStep?.type !== "CIV_OFFER" || isSimultaneousStep(currentStep),
      snipeCount: sc,
      offered: { player1: offerP1[cg].slice(), player2: offerP2[cg].slice() },
      snipedBy: { player1: snipeByP1[cg].slice(), player2: snipeByP2[cg].slice() },
      submitted:
        phase === "offer"
          ? { player1: offerP1[cg].length >= cum.player1, player2: offerP2[cg].length >= cum.player2 }
          : phase === "snipe"
          ? { player1: snipeByP1[cg].length >= snipeCum, player2: snipeByP2[cg].length >= snipeCum }
          : { player1: true, player2: true },
    };
  }

  const stepBar = steps.map((s, i) => ({
    type: s.type as string,
    label: s.label || (s.type as string),
    gameIndex: gameOf[i],
    actor: isSimultaneousStep(s) ? null : resolveActor(s, gameOf[i], games),
    count: s.count,
  }));

  // Normally the series ends the moment one side is mathematically safe. With
  // playAll the only thing that ends it is running out of steps, so a 3-0 Bo5
  // still plays games 4 and 5.
  const playAll = Boolean(config.options.playAll);
  const finished = !currentStep || (!playAll && (p1 >= target || p2 >= target));

  return {
    status: finished ? "finished" : status,
    currentStepIndex,
    currentStep,
    currentStepProgress: currentStep ? actionsByStep.get(currentStepIndex) ?? 0 : 0,
    currentGameIndex,
    turn,
    stepBar,
    simultaneous,
    pendingBans,
    awaiting,
    finished,
    bestOf: config.options.bestOf,
    target,
    playAll,
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
  // A simultaneous ban has no turn — instead both players are gated on `awaiting`,
  // and a player must not re-ban something already sitting in their own hidden list.
  const simulBan = Boolean(step.simultaneous) && (step.type === "MAP_BAN" || step.type === "CIV_BAN");
  const simulBanGate = (): ValidationResult | null => {
    if (role !== "player1" && role !== "player2") return { ok: false, error: "Only players may ban." };
    if (!state.awaiting[role]) return { ok: false, error: "You have already banned." };
    if (state.pendingBans[role].includes(target)) return { ok: false, error: "You already banned that." };
    return null;
  };

  switch (step.type) {
    case "MAP_BAN":
    case "MAP_PICK": {
      if (simulBan) {
        const gate = simulBanGate();
        if (gate) return gate;
      } else if (state.turn !== role) return { ok: false, error: "It is not your turn." };
      const entry = state.maps.find((m) => m.id === target);
      if (!entry) return { ok: false, error: "Unknown map." };
      if (entry.state !== "available") return { ok: false, error: "Map already taken." };
      return { ok: true, resolved: { actionType: step.type === "MAP_BAN" ? "ban" : "pick", pool: "map", gameIndex } };
    }
    case "CIV_BAN": {
      if (simulBan) {
        const gate = simulBanGate();
        if (gate) return gate;
      } else if (state.turn !== role) return { ok: false, error: "It is not your turn." };
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
      if (!state.awaiting[role]) {
        // A turn-based offer step has a turn, so "not yet" and "already done" are
        // different refusals and saying the wrong one is just confusing.
        return { ok: false, error: state.turn && state.turn !== role ? "It is not your turn." : "You have already offered." };
      }
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
    case "SYNC_CONFIRM": {
      if (role !== "player1" && role !== "player2") return { ok: false, error: "Only players may confirm." };
      if (!state.awaiting[role]) return { ok: false, error: "You have already confirmed." };
      return { ok: true, resolved: { actionType: "confirm", gameIndex } };
    }
    default:
      return { ok: false, error: "Current step does not accept this action." };
  }
}
