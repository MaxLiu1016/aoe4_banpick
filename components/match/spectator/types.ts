import type { DerivedState } from "@/lib/draft/engine";

/** The `S2C.STATE` snapshot, as much of it as a spectator is sent. */
export interface SpectatorPayload {
  matchId: string;
  status: "lobby" | "running" | "paused" | "finished";
  publicHover?: boolean;
  anonymous?: boolean;
  deadlineTs: number | null;
  serverNow?: number;
  seats: {
    host: string;
    player1: { id: string; name?: string; ready?: boolean } | null;
    player2: { id: string; name?: string; ready?: boolean } | null;
  };
  state: DerivedState;
}

export type Seat = "player1" | "player2";

/** Ownership colour. Everything on this screen is coloured by whose it is. */
export const OWNER: Record<Seat, string> = { player1: "var(--p1)", player2: "var(--p2)" };
/** Same two colours as rgb triples, for the translucent fills. */
export const OWNER_RGB: Record<Seat, string> = { player1: "56,189,248", player2: "251,113,133" };

export const other = (s: Seat): Seat => (s === "player1" ? "player2" : "player1");

/** Both seats' display names, already respecting anonymous mode. */
export function seatNames(p: SpectatorPayload, fallback: Record<Seat, string>): Record<Seat, string> {
  // Anonymous drafts are practised formats the players don't want scouted, so the
  // broadcast page — the most public surface there is — must honour it.
  if (p.anonymous) return fallback;
  return {
    player1: p.seats.player1?.name || fallback.player1,
    player2: p.seats.player2?.name || fallback.player2,
  };
}
