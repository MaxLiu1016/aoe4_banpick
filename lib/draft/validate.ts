import type { PresetConfig } from "./schema";
import { gameIndexOfSteps } from "./engine";

/**
 * Structural validation of a preset: every game must be able to produce at least
 * one map and one civ per player. Returns a list of human-readable problems
 * (empty = valid). Used by the editor (warnings) and match creation (hard block).
 */
export function validatePreset(config: PresetConfig): string[] {
  const errs: string[] = [];
  const steps = config.steps;
  const games = steps.filter((s) => s.type === "GAME_RESULT").length;

  if (config.maps.length < 1) errs.push("The map pool needs at least 1 map.");
  if (config.civs.length < 1) errs.push("The civ pool needs at least 1 civilization.");
  if (games < 1) errs.push("Add at least one game (a “Game result” step).");

  // How many maps can ever enter the selectable pool: picked maps if any MAP_PICK
  // exists, else all maps minus the bans.
  const mapBans = steps.filter((s) => s.type === "MAP_BAN").reduce((n, s) => n + s.count, 0);
  const mapPicks = steps.filter((s) => s.type === "MAP_PICK").reduce((n, s) => n + s.count, 0);
  const poolMaps = mapPicks > 0 ? mapPicks : config.maps.length - mapBans;
  if (games > 0 && poolMaps < 1) errs.push("After bans/picks the map pool would be empty — no map to play.");

  // Per-game civ + map presence.
  const gameOf = gameIndexOfSteps(steps);
  const CIV_STEPS = ["CIV_OFFER", "CIV_SNIPE_OPPONENT"];
  for (let g = 0; g < games; g++) {
    const gSteps = steps.filter((_, i) => gameOf[i] === g);
    if (!gSteps.some((s) => s.type === "MAP_SELECT")) errs.push(`Game ${g + 1}: add a “Select map” step — the game has no map.`);
    if (!gSteps.some((s) => CIV_STEPS.includes(s.type))) errs.push(`Game ${g + 1}: add a civ step (offer/snipe) — players have no civ.`);
  }

  // Hand sufficiency for the offer/snipe duel with excludeUsedCivs:
  // each player must be able to field a distinct civ every game.
  const handPerPlayer = steps.filter((s) => s.type === "CIV_PICK").reduce((n, s) => n + s.count, 0);
  const usesDuel = steps.some((s) => s.type === "CIV_OFFER");
  const excludes = steps.some((s) => s.type === "CIV_OFFER" && s.excludeUsedCivs);
  if (usesDuel && excludes && handPerPlayer > 0 && handPerPlayer < games) {
    errs.push(`Each player's hand (${handPerPlayer}) is smaller than the number of games (${games}); with "exclude used civs" they will run out.`);
  }

  return errs;
}
