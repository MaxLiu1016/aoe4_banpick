/**
 * Socket.IO event contract shared by the custom server and the browser client.
 * Persistent BP actions are written to MongoDB first, then broadcast; ephemeral
 * events (hover, timer, pause heartbeat) are broadcast-only.
 */

export const ROOM = (matchId: string) => `match:${matchId}`;

// Client -> Server
export const C2S = {
  JOIN: "match:join", // { matchId, role, userId? }
  ACTION: "match:action", // a ban/pick/select/result request (validated server-side)
  HOVER: "match:hover", // { matchId, role, pool, targetId | null } (ephemeral)
  PAUSE: "match:pause", // { matchId, paused }
  READY: "match:ready", // { matchId, ready } — a seated player toggles ready
  RENAME: "match:rename", // { matchId, name } — a seated player renames themselves
  START: "match:start", // { matchId } — host force-starts once both seated
  RESULT_CLICK: "match:resultClick", // { matchId, gameIndex, winner }
  RESULT_OVERRIDE: "match:resultOverride", // host only { matchId, gameIndex, winner }
} as const;

// Server -> Client
export const S2C = {
  STATE: "match:state", // full authoritative state snapshot
  ACTION_APPLIED: "match:actionApplied", // a single applied action (incremental)
  HOVER: "match:hover", // relayed hover (if publicHover enabled)
  PAUSED: "match:paused", // { paused, by }
  TIMER: "match:timer", // { stepIndex, deadlineTs }
  ERROR: "match:error", // { message }
} as const;

export type Role = "player1" | "player2" | "host" | "spectator";

export interface HoverPayload {
  matchId: string;
  role: Role;
  pool: "map" | "civ" | "drafted_civ";
  targetId: string | null;
}
