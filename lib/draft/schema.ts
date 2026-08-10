import { z } from "zod";

/**
 * The BP rule system. A preset = global settings + an ordered list of steps.
 * A "match" executes these steps in order, validated server-side before each
 * action is persisted.
 */

// Who performs a step.
export const ActorSchema = z.enum([
  "HOST_DRAW", // system/host draws randomly (e.g. first map from un-banned pool)
  "PLAYER1",
  "PLAYER2",
  "LOSER", // loser of the previous game
  "WINNER", // winner of the previous game
]);
export type Actor = z.infer<typeof ActorSchema>;

// What pool a step operates on.
export const PoolSchema = z.enum([
  "map", // the map pool
  "civ", // the full civ pool
  "drafted_civ", // civs already PICKed into this match's available pool (for snipe draft)
]);
export type Pool = z.infer<typeof PoolSchema>;

// Step kinds, mapped from the real-world flow.
export const StepTypeSchema = z.enum([
  "MAP_BAN",
  "MAP_PICK",
  "CIV_BAN",
  "CIV_PICK", // build each player's persistent civ pool ("hand")
  "MAP_SELECT", // choose the map actually played this game
  "SYNC_CONFIRM", // a gate: press confirm before the draft proceeds. Both players by default; name an actor and only that side is asked (custom copy via the step label)
  // --- Two-pool duel: simultaneous hidden offer, then simultaneous hidden counter-snipe ---
  "CIV_OFFER", // both players secretly offer N civs from their hand for this game, then reveal
  "CIV_SNIPE_OPPONENT", // both players secretly ban M of the opponent's offer (this game only), then reveal
  "GAME_RESULT", // record winner of the current game
]);
export type StepType = z.infer<typeof StepTypeSchema>;

export const StepSchema = z.object({
  id: z.string(),
  type: StepTypeSchema,
  actor: ActorSchema,
  pool: PoolSchema,
  count: z.number().int().min(1).max(50).default(1),
  timeLimitSec: z.number().int().min(0).max(3600).default(0), // 0 = no limit
  // When picking a civ, show the map that will be played (for snipe context).
  showCurrentMap: z.boolean().default(false),
  // For snipe draft: exclude civs already used in previous games of this match.
  excludeUsedCivs: z.boolean().default(false),
  // For CIV_BAN: "pool" = removed for everyone; "opponent" = only the opponent
  // of the banning player can't use it (the banner still can). Default "pool".
  banScope: z.enum(["pool", "opponent"]).optional(),
  // For MAP_SELECT: "own" = choose from your OWN picked map pool; "shared" =
  // choose from the maps BOTH players picked (the combined pool). Default "own".
  mapScope: z.enum(["own", "shared"]).optional(),
  // Both players act at the same time and each other's choices stay hidden until
  // BOTH have submitted, then reveal together; the step's `actor` is ignored.
  // MAP_BAN / CIV_BAN default to OFF (turn-based) and CIV_OFFER defaults to ON —
  // see `isSimultaneousStep`, which is what everything should ask.
  simultaneous: z.boolean().optional(),
  // Whether this step may be paused.
  pausable: z.boolean().default(true),
  label: z.string().max(120).optional(),
});
export type Step = z.infer<typeof StepSchema>;

/**
 * Does this step happen simultaneously (both seats at once, hidden until both
 * submit) rather than on one seat's turn?
 *
 * The default differs by type and that is deliberate: snipe and the confirm gate
 * are only meaningful simultaneously, bans start turn-based, and CIV_OFFER is
 * simultaneous UNLESS switched off — presets written before turn-based offers
 * existed have no flag at all and must keep the hidden double-blind offer they
 * were built around. Ask this rather than reading `simultaneous` directly.
 */
export function isSimultaneousStep(s: Pick<Step, "type" | "simultaneous" | "actor">): boolean {
  switch (s.type) {
    case "CIV_SNIPE_OPPONENT":
      return true;
    // A confirm gate is simultaneous only when it is asking everybody. Name a
    // side — "the winner acknowledges the map the loser just picked" — and it
    // becomes that player's turn like any other step.
    case "SYNC_CONFIRM":
      return !(s.actor === "PLAYER1" || s.actor === "PLAYER2" || s.actor === "LOSER" || s.actor === "WINNER");
    case "CIV_OFFER":
      return s.simultaneous !== false;
    case "MAP_BAN":
    case "CIV_BAN":
      return Boolean(s.simultaneous);
    default:
      return false;
  }
}

// A selectable civ or map entry.
export const PoolEntrySchema = z.object({
  id: z.string(), // stable slug, e.g. "english", "mongols"
  name: z.string(),
  imageUrl: z.string().optional(), // sourced from ageofempires.fandom.com only
});
export type PoolEntry = z.infer<typeof PoolEntrySchema>;

export const PresetOptionsSchema = z.object({
  bestOf: z.number().int().min(1).max(15).default(5),
  // Spectators may see what civ a player is hovering before they confirm.
  publicHover: z.boolean().default(false),
  // Global default per-step timer (a step can override).
  defaultTimeLimitSec: z.number().int().min(0).max(3600).default(0),
  // Allow either side to pause.
  pausable: z.boolean().default(true),
  // How a game's winner is decided: "vote" = both players pick and must agree
  // (host can still override); "host" = only the host/referee calls it.
  resultMode: z.enum(["vote", "host"]).default("vote"),
  // Hide both players' names from SPECTATORS (the two players and the host still
  // see each other) — for practising a tournament format without being scouted.
  anonymous: z.boolean().default(false),
  // Play every game of the series instead of stopping the moment one side can no
  // longer be caught — practice sessions usually want all the games. Optional
  // rather than defaulted because it is set per match in the lobby, not authored
  // into a preset, and a default would make it required on every stored config.
  playAll: z.boolean().optional(),
  // A series that does not start level. The grand final of a double-elimination
  // bracket is the case: the side arriving from the winners' bracket is already
  // a game up before anybody picks anything. Set per match in the lobby, like
  // playAll, so it is optional rather than defaulted — a stored preset should
  // not carry a handicap.
  headStart: z.object({
    player1: z.number().int().min(0).max(20),
    player2: z.number().int().min(0).max(20),
  }).optional(),
});
export type PresetOptions = z.infer<typeof PresetOptionsSchema>;

export const PresetConfigSchema = z.object({
  civs: z.array(PoolEntrySchema).min(1),
  maps: z.array(PoolEntrySchema).min(1),
  steps: z.array(StepSchema).min(1),
  options: PresetOptionsSchema,
});
export type PresetConfig = z.infer<typeof PresetConfigSchema>;
