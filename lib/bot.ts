/**
 * The practice opponent. It exists so one person can walk a format end to end —
 * the thing you actually want before running a draft in front of a tournament.
 *
 * It plays legal, not well. Every choice is drawn at random from what the engine
 * says is allowed, which is the same code path the turn timer already uses to
 * fill in for a player who ran out of clock. That is deliberate: a bot that tried
 * to draft cleverly would be a second, weaker implementation of the rules, and
 * the one thing this must never do is make a move the rules don't allow.
 */

import type { DerivedState } from "./draft/engine";

/** Fixed id for the seat a bot occupies. Recognisable on sight in the database. */
export const BOT_ID = "000000000000000000000b07";
export const BOT_NAME = "Bot";

/**
 * How long the bot sits on its hands before acting.
 *
 * On a timed step it waits, so the countdown means something and a human can
 * follow what just happened instead of the board jumping. Long enough to read,
 * short enough that a 40-step draft doesn't become an afternoon. On a step with
 * no clock there is nothing to watch tick, and a pause would just look like it
 * had hung — so it answers straight away.
 */
export const BOT_THINK_MS = 3000;
export const botDelay = (timeLimitSec: number): number => (timeLimitSec > 0 ? BOT_THINK_MS : 0);

/**
 * What a given seat may legally submit for a simultaneous (duel) step.
 *
 * Lives here rather than beside the socket handlers because it is a question about
 * the draft, not about the database — and because both the turn timer's auto-fill
 * and the bot need exactly the same answer.
 */
export function duelTargetsFor(state: DerivedState, role: "player1" | "player2"): string[] {
  const step = state.currentStep;
  const d = state.civDuel;
  if (!step || !d) return [];
  if (step.type === "CIV_OFFER") {
    const own = role === "player1" ? state.offerableP1 : state.offerableP2;
    const offered = role === "player1" ? d.offered.player1 : d.offered.player2;
    const usedPrev = state.games
      .filter((g) => g.gameIndex < state.currentGameIndex)
      .map((g) => (role === "player1" ? g.civP1 : g.civP2));
    return own.filter((id) => !offered.includes(id) && (!step.excludeUsedCivs || !usedPrev.includes(id)));
  }
  if (step.type === "CIV_SNIPE_OPPONENT") {
    const oppOffer = role === "player1" ? d.offered.player2 : d.offered.player1;
    const mine = role === "player1" ? d.snipedBy.player1 : d.snipedBy.player2;
    return oppOffer.filter((id) => !mine.includes(id));
  }
  return [];
}

/**
 * One legal move for the bot's seat, or null if it owes nothing right now.
 *
 * Every branch mirrors validateAction rather than deciding anything of its own.
 * If the two ever disagree the bot simply stalls and the turn timer takes over —
 * it cannot produce a move the rules would reject.
 */
export function botTargetFor(state: DerivedState, seat: "player1" | "player2"): string | null {
  const step = state.currentStep;
  if (!step || !state.awaiting[seat]) return null;
  const pick = (arr: string[]) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);

  switch (step.type) {
    case "SYNC_CONFIRM":
      return "confirm";
    case "CIV_OFFER":
    case "CIV_SNIPE_OPPONENT":
      return pick(duelTargetsFor(state, seat));
    case "CIV_BAN": {
      // Keyed on the seat rather than state.turn, which is null while a
      // simultaneous ban is open and both sides owe a move at once.
      //
      // pendingBans matters as much as civBans here: during a simultaneous ban the
      // ones already submitted are held back unrevealed, so a seat asked for two
      // would otherwise offer the same civ twice and have the second rejected.
      const mine = new Set([
        ...state.civBans.filter((b) => b.by === seat).map((b) => b.id),
        ...state.pendingBans[seat],
      ]);
      return pick(state.civs.filter((c) => c.state === "available" && !mine.has(c.id)).map((c) => c.id));
    }
    case "MAP_BAN":
    case "MAP_PICK": {
      const held = new Set(state.pendingBans[seat]);
      return pick(state.maps.filter((m) => m.state === "available" && !held.has(m.id)).map((m) => m.id));
    }
    case "CIV_PICK":
      return pick(state.civPickableIds);
    case "MAP_SELECT":
      return pick(state.selectableMapIds);
    default:
      return null;
  }
}
