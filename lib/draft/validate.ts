import type { PresetConfig } from "./schema";
import { gameIndexOfSteps } from "./engine";

/**
 * Structural validation of a preset. Returns a list of human-readable problems
 * (empty = valid). Used by the editor (warnings) and match creation (hard block).
 *
 * Rules enforced:
 *  - enough "Game result" steps that a best-of series can always be decided
 *    (a Bo5 needs 5 games, a Bo3 needs 3, …);
 *  - at least 2 civs and 1 map to choose from;
 *  - civ/map bans + picks stay within the pool sizes (no over-banning/-picking);
 *  - every game can actually produce a map and a civ for each player.
 */
export function validatePreset(config: PresetConfig): string[] {
  const errs: string[] = [];
  const steps = config.steps;
  const games = steps.filter((s) => s.type === "GAME_RESULT").length;
  const bestOf = config.options.bestOf;
  const target = Math.floor(bestOf / 2) + 1; // wins needed to take the series
  const neededGames = 2 * target - 1; // worst-case games so it can always be decided

  if (config.maps.length < 1) errs.push("The map pool needs at least 1 map.");
  if (config.civs.length < 2) errs.push("The civ pool needs at least 2 civilizations to choose from.");

  if (games < 1) {
    errs.push("Add at least one game (a “Game result” step).");
  } else if (games < neededGames) {
    errs.push(`Best of ${bestOf} needs at least ${neededGames} games (“Game result” steps) so the series can always be decided — there are only ${games}.`);
  }

  // --- Maps: bans + picks must stay within the pool, and leave one to play. ---
  const mapBans = steps.filter((s) => s.type === "MAP_BAN").reduce((n, s) => n + s.count, 0);
  const mapPicks = steps.filter((s) => s.type === "MAP_PICK").reduce((n, s) => n + s.count, 0);
  if (mapBans + mapPicks > config.maps.length) {
    errs.push(`Map bans + picks (${mapBans + mapPicks}) exceed the map pool (${config.maps.length}).`);
  }
  const poolMaps = mapPicks > 0 ? mapPicks : config.maps.length - mapBans;
  if (games > 0 && poolMaps < 1) errs.push("After bans/picks the map pool would be empty — no map to play.");

  // --- Civs: pool bans + drafts must stay within the pool. Only a "pool" ban
  // removes a civ globally; an "opponent" ban just blocks one side. ---
  const poolCivBans = steps
    .filter((s) => s.type === "CIV_BAN" && (s.banScope ?? "pool") === "pool")
    .reduce((n, s) => n + s.count, 0);
  const civPicks = steps.filter((s) => s.type === "CIV_PICK").reduce((n, s) => n + s.count, 0);
  if (poolCivBans + civPicks > config.civs.length) {
    errs.push(`Civ pool bans + drafts (${poolCivBans + civPicks}) exceed the civ pool (${config.civs.length}).`);
  }

  // --- Per-game civ + map presence. ---
  const gameOf = gameIndexOfSteps(steps);
  const CIV_STEPS = ["CIV_OFFER", "CIV_SNIPE_OPPONENT"];
  for (let g = 0; g < games; g++) {
    const gSteps = steps.filter((_, i) => gameOf[i] === g);
    if (!gSteps.some((s) => s.type === "MAP_SELECT")) errs.push(`Game ${g + 1}: add a “Select map” step — the game has no map.`);
    if (!gSteps.some((s) => CIV_STEPS.includes(s.type))) errs.push(`Game ${g + 1}: add a civ step (offer/snipe) — players have no civ.`);
  }

  // --- Hand sufficiency for the offer/snipe duel with excludeUsedCivs:
  // each player must be able to field a distinct civ every game. ---
  const usesDuel = steps.some((s) => s.type === "CIV_OFFER");
  const excludes = steps.some((s) => s.type === "CIV_OFFER" && s.excludeUsedCivs);
  if (usesDuel && excludes && civPicks > 0 && civPicks < games) {
    errs.push(`Each player's hand (${civPicks}) is smaller than the number of games (${games}); with "exclude used civs" they will run out.`);
  }

  return errs;
}
