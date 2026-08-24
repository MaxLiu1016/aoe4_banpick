import { isSimultaneousStep } from "./schema";
import type { PresetConfig } from "./schema";
import { gameIndexOfSteps } from "./engine";

/**
 * Structural validation of a preset. Returns a list of problems (empty = valid).
 * Used by the editor (warnings) and match creation (hard block).
 *
 * Issues are returned as a code plus its numbers rather than as finished English
 * sentences: the people building presets read Chinese and Japanese, and an
 * English-only wall of errors was the first thing that stopped them. Render one
 * with `t("validate." + code, params)` — see lib/i18n.tsx for the strings.
 *
 * Rules enforced:
 *  - enough "Game result" steps that a best-of series can always be decided
 *    (a Bo5 needs 5 games, a Bo3 needs 3, …);
 *  - at least 2 civs and 1 map to choose from;
 *  - civ/map bans + picks stay within the pool sizes (no over-banning/-picking);
 *  - a random map draw still has un-claimed maps left to draw from;
 *  - "random" is not asked to do something only a player can do;
 *  - every game can actually produce a map and a civ for each player.
 */
export interface PresetIssue {
  code: string;
  params?: Record<string, string | number>;
}

export function validatePreset(config: PresetConfig): PresetIssue[] {
  const errs: PresetIssue[] = [];
  const push = (code: string, params?: Record<string, string | number>) => errs.push({ code, params });
  const steps = config.steps;
  const games = steps.filter((s) => s.type === "GAME_RESULT").length;
  const bestOf = config.options.bestOf;
  const target = Math.floor(bestOf / 2) + 1; // wins needed to take the series
  const neededGames = 2 * target - 1; // worst-case games so it can always be decided

  if (config.maps.length < 1) push("noMaps");
  if (config.civs.length < 2) push("noCivs");

  if (games < 1) {
    push("noGames");
  } else if (games < neededGames) {
    push("tooFewGames", { bestOf, needed: neededGames, have: games });
  }

  // --- Maps: bans + picks must stay within the pool, and leave one to play. ---
  const mapBans = steps.filter((s) => s.type === "MAP_BAN").reduce((n, s) => n + s.count, 0);
  const mapPicks = steps.filter((s) => s.type === "MAP_PICK").reduce((n, s) => n + s.count, 0);
  if (mapBans + mapPicks > config.maps.length) {
    push("mapOverdraw", { used: mapBans + mapPicks, pool: config.maps.length });
  }
  const poolMaps = mapPicks > 0 ? mapPicks : config.maps.length - mapBans;
  if (games > 0 && poolMaps < 1) push("mapPoolEmpty");

  // --- Civs: pool bans + drafts must stay within the pool. Only a "pool" ban
  // removes a civ globally; an "opponent" ban just blocks one side. ---
  const poolCivBans = steps
    .filter((s) => s.type === "CIV_BAN" && (s.banScope ?? "pool") === "pool")
    .reduce((n, s) => n + s.count, 0);
  const civPicks = steps.filter((s) => s.type === "CIV_PICK").reduce((n, s) => n + s.count, 0);
  if (poolCivBans + civPicks > config.civs.length) {
    push("civOverdraw", { used: poolCivBans + civPicks, pool: config.civs.length });
  }

  // --- Per-game civ + map presence. ---
  const gameOf = gameIndexOfSteps(steps);
  const CIV_STEPS = ["CIV_OFFER", "CIV_SNIPE_OPPONENT"];
  for (let g = 0; g < games; g++) {
    const gSteps = steps.filter((_, i) => gameOf[i] === g);
    if (!gSteps.some((s) => s.type === "MAP_SELECT")) push("gameNoMap", { game: g + 1 });
    if (!gSteps.some((s) => CIV_STEPS.includes(s.type))) push("gameNoCiv", { game: g + 1 });
    // The civ a player fields is what survives the opponent's snipe, so each game
    // must offer at least one more civ than can be sniped (offer − snipe ≥ 1).
    // Counted across ALL the game's offer steps, per player: a format may split
    // the offer into several turn-based steps ("P1 picks 1, P2 picks 2, P1 picks
    // 1"), and reading only the first step called that a 1-civ offer and rejected
    // a perfectly good preset.
    const offerSteps = gSteps.filter((s) => s.type === "CIV_OFFER");
    const snipeTotal = gSteps.filter((s) => s.type === "CIV_SNIPE_OPPONENT").reduce((n, s) => n + s.count, 0);
    if (offerSteps.length) {
      let p1 = 0, p2 = 0;
      for (const s of offerSteps) {
        // LOSER/WINNER isn't knowable until the series is played, so it counts for
        // whichever seat it lands on — the one reading that keeps a valid preset valid.
        if (!isSimultaneousStep(s) && s.actor === "PLAYER1") p1 += s.count;
        else if (!isSimultaneousStep(s) && s.actor === "PLAYER2") p2 += s.count;
        else { p1 += s.count; p2 += s.count; }
      }
      const offer = Math.min(p1, p2);
      if (offer - snipeTotal < 1) push("offerMinusSnipe", { game: g + 1, offer, snipe: snipeTotal });
    }
  }

  // --- LOSER / WINNER need a previous game to resolve against. ---
  // Both read the PREVIOUS game's result (`resolveActor` in the engine), and the
  // first game has none, so they resolve to nobody. Neither way that fails is
  // visible from the editor. A MAP_SELECT ends up with no turn AND nobody
  // awaiting, which is exactly the condition on which `scheduleTimer` tears the
  // clock down — so the draft stops dead with no countdown to rescue it. A
  // SYNC_CONFIRM quietly degrades into asking BOTH players instead of the one
  // it names, which is a wrong gate rather than a stuck one, and reads as the
  // other player being confirmed against their will.
  //
  // A GAME_RESULT is exempt: its actor is only "whoever calls the result first",
  // never a turn, and the shipped EGC formats declare WINNER on every one of
  // them. So is anything simultaneous, which ignores `actor` by definition.
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (gameOf[i] !== 0) continue;
    if (s.type === "GAME_RESULT" || isSimultaneousStep(s)) continue;
    if (s.actor === "LOSER" || s.actor === "WINNER") push("actorNoPrevGame", { step: i + 1 });
  }

  // --- "Random" cannot draft into a hand. ------------------------------------
  // HOST_DRAW means the SERVER performs the step. It has something legal to play
  // only where the result belongs to nobody — a ban, or the map draw. Put it on
  // a civ draft and the draft stops for good: the server's pick list is only
  // computed for a player seat and comes back empty, neither player may act
  // because it is not their turn, and with nobody awaited `scheduleTimer` takes
  // the clock away, so there is no timeout to auto-fill and move on.
  //
  // MAP_PICK is deliberately NOT here. A map picked at random is an orphan —
  // claimed by neither player, so a "from your own maps" step can never reach it
  // and it is out of the draw's leftovers too — but the draft still moves, and
  // presets in the wild do it. The editor no longer offers it; the ones already
  // saved keep working.
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.actor !== "HOST_DRAW") continue;
    if (isSimultaneousStep(s)) continue; // a simultaneous step ignores `actor` entirely
    if (s.type === "CIV_PICK" || s.type === "CIV_OFFER") push("drawCannotPick", { step: i + 1 });
  }

  // --- A random map draw needs maps left to draw FROM. -----------------------
  // "🎲 Random (from remaining)" draws out of what NEITHER player claimed. A
  // draft that bans and picks the pool down to nothing leaves that draw an empty
  // hat, and there is no sensible thing for it to do then: the engine used to
  // reach into the players' picked maps, which handed somebody their own pick as
  // the "random" first map, and refusing to do that instead stops the draft dead
  // (no turn, nobody awaited, so `scheduleTimer` takes the clock away too).
  // Neither is discoverable from the editor, so the shape is rejected here.
  //
  // Simultaneous bans count once, not once per player: both sides ban blind and
  // may land on the same map, so `count` is the only figure that is always true.
  // That errs towards leaving MORE maps than there will be — a preset this rule
  // clears might still be tight, but one it flags is certainly empty.
  //
  // Skipped when there is no pool at all: a new preset opens with an empty map
  // list on purpose, and `noMaps` already says the useful thing about that.
  if (config.maps.length > 0) {
    let left = config.maps.length;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.type === "MAP_BAN" || s.type === "MAP_PICK") {
        left -= s.count;
      } else if (s.type === "MAP_SELECT" && s.actor === "HOST_DRAW" && left < 1) {
        push("drawNoMapsLeft", { step: i + 1 });
        break;
      }
    }
  }

  // --- Hand sufficiency for the offer/snipe duel with excludeUsedCivs:
  // each player must be able to field a distinct civ every game. ---
  const usesDuel = steps.some((s) => s.type === "CIV_OFFER");
  const excludes = steps.some((s) => s.type === "CIV_OFFER" && s.excludeUsedCivs);
  if (usesDuel && excludes && civPicks > 0 && civPicks < games) {
    push("handTooSmall", { hand: civPicks, games });
  }

  return errs;
}
