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
    const offer = gSteps.find((s) => s.type === "CIV_OFFER");
    const snipe = gSteps.find((s) => s.type === "CIV_SNIPE_OPPONENT");
    if (offer && offer.count - (snipe?.count ?? 0) < 1) {
      push("offerMinusSnipe", { game: g + 1, offer: offer.count, snipe: snipe?.count ?? 0 });
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
