"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSocket } from "@/lib/socket/client";
import { C2S, S2C } from "@/lib/socket/events";
import { useI18n } from "@/lib/i18n";
import { DraftBoard } from "./DraftBoard";
import { ReplayControls } from "./ReplayControls";
import { MatchSummary } from "./MatchSummary";
import { GameResultCard } from "./GameResultCard";
import { SnipeOutcome } from "./CivDuel";
import { OWNER_RGB, seatNames, type Seat, type SpectatorPayload } from "./types";

/** How long the snipe result stays up before the draft moves on. */
const SNIPE_HOLD_MS = 10_000;

/**
 * How far back a caster can step. A Bo9 EGC draft is under 130 acts, so this
 * holds a whole match with room to spare; the cap is only here so a page left
 * open for a day cannot grow without bound.
 */
const HISTORY_MAX = 400;

/**
 * What makes one snapshot worth keeping.
 *
 * Broadcasts arrive for reasons that are not acts — a pause, an options change,
 * a reconnect — and a caster stepping backwards wants one entry per THING THAT
 * HAPPENED, not one per packet. Step index plus progress-within-step is exactly
 * that: it ticks once per ban, per pick, per offer.
 */
const actKey = (p: SpectatorPayload) =>
  `${p.state.currentStepIndex}:${p.state.currentStepProgress}:${p.state.finished}` +
  `:${p.state.score.player1}-${p.state.score.player2}:${p.status}`;

/**
 * The broadcast page: a fixed 1920x1080 canvas scaled to fit whatever it is being
 * shown on, holding whichever view the draft's state calls for.
 *
 * Fixed rather than responsive on purpose. This is a picture that gets pointed at
 * a stream or a projector, and a layout that reflows is a layout that composes
 * differently on the operator's laptop than on the broadcast — the one place you
 * cannot check it. Scaling keeps the composition identical everywhere.
 *
 * Read-only throughout: it joins with no ticket and emits nothing but the join.
 */
export function SpectatorStage({ matchId, roomName }: { matchId: string; roomName: string }) {
  const { t } = useI18n();
  const [payload, setPayload] = useState<SpectatorPayload | null>(null);
  // Every state this page has been shown, so a caster can walk back through the
  // draft and talk over it.
  //
  // Replaying stored payloads rather than asking the server for history is what
  // makes this safe for free: each one was already redacted for a spectator at
  // the moment it was sent, so no snapshot can contain something that was secret
  // then. A history endpoint would have to re-derive that reasoning.
  //
  // The cost is honest and worth naming: this only covers what this tab saw. A
  // reload starts the buffer over, and opening the page mid-draft gets no
  // backlog. Casters open the board before the match, which is the case that
  // matters; the fix for the rest is a server-side action log, later.
  const [history, setHistory] = useState<SpectatorPayload[]>([]);
  /** null = following live. A number is a position the operator parked on. */
  const [cursor, setCursor] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Server-minus-client clock skew, so the countdown tracks the server's real
  // deadline rather than this machine's idea of now. State rather than a ref: it
  // is read while rendering the board, and a ref read during render is a value
  // React can't promise is the one the render was built from.
  const [clockOffset, setClockOffset] = useState(0);
  // Which game's snipe result is currently being held on screen, if any.
  const [snipeHold, setSnipeHold] = useState<number | null>(null);
  const prevStepRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // Written straight to the element rather than held in state: resizing a
    // broadcast window should cost a style recalculation, not a React render of
    // the entire board.
    const fit = () => {
      el.style.setProperty("--stage-scale", String(Math.min(window.innerWidth / 1920, window.innerHeight / 1080)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onState = (p: SpectatorPayload) => {
      if (typeof p.serverNow === "number") setClockOffset(p.serverNow - Date.now());
      // Catch the transition rather than the state: arriving at a draft that is
      // already past its snipe should not replay a beat that happened long ago.
      const now = p.state.currentStep?.type;
      if (prevStepRef.current === "CIV_SNIPE_OPPONENT" && now === "GAME_RESULT") {
        setSnipeHold(p.state.currentGameIndex);
      }
      prevStepRef.current = now;
      setPayload(p);
      setHistory((h) => {
        const last = h[h.length - 1];
        if (last && actKey(last) === actKey(p)) {
          // Same act, fresher packet (a clock tick, a rename). Replace rather
          // than append, so stepping doesn't stutter over duplicates.
          return [...h.slice(0, -1), p];
        }
        return h.length >= HISTORY_MAX ? [...h.slice(1), p] : [...h, p];
      });
    };
    socket.on(S2C.STATE, onState);
    // Re-join on every connect: a reconnect is a fresh server-side socket that has
    // never heard of this room. No ticket — a spectator has no identity to prove.
    const join = () => socket.emit(C2S.JOIN, { matchId });
    socket.on("connect", join);
    if (socket.connected) join();
    return () => {
      socket.off(S2C.STATE, onState);
      socket.off("connect", join);
    };
  }, [matchId]);

  // Held long enough to read out loud, then it gets out of the way on its own.
  useEffect(() => {
    if (snipeHold === null) return;
    const id = setTimeout(() => setSnipeHold(null), SNIPE_HOLD_MS);
    return () => clearTimeout(id);
  }, [snipeHold]);

  // What is actually on screen. Parked, that is a stored snapshot with its clock
  // blanked — a historical deadline would otherwise count down against now and
  // show a dead timer racing to zero.
  const live = cursor === null;
  const shown: SpectatorPayload | null = live
    ? payload
    : history[Math.min(cursor, history.length - 1)]
      ? { ...history[Math.min(cursor, history.length - 1)], deadlineTs: null }
      : payload;

  const holding =
    live && snipeHold !== null && shown?.state.currentGameIndex === snipeHold && !shown.state.finished
      ? shown.state.civDuel
      : null;

  const seek = (i: number) => {
    const clamped = Math.max(0, Math.min(i, history.length - 1));
    setCursor(clamped >= history.length - 1 ? null : clamped);
  };
  const at = live ? Math.max(0, history.length - 1) : Math.min(cursor, history.length - 1);

  // Arrow keys, because the mouse is not where a caster's hand is.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const here = cursor === null ? history.length - 1 : cursor;
      if (e.key === "ArrowLeft") { e.preventDefault(); seek(here - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seek(here + 1); }
      else if (e.key === "Home") { e.preventDefault(); seek(0); }
      else if (e.key === "End") { e.preventDefault(); setCursor(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, history.length]);

  // Whose turn it is, thrown in from the edges of the window rather than the edges
  // of the board. The stage is letterboxed on most screens, and lighting that
  // margin reads as the board spilling colour into the room — which is the whole
  // point of a cue you are meant to catch without looking at it. Only while the
  // draft board is up: the result and summary screens are nobody's turn.
  const onBoard = Boolean(shown) && !shown!.state.finished && !holding &&
    !shown!.awaitingAck && shown!.state.currentStep?.type !== "GAME_RESULT" &&
    shown!.status === "running";
  const glowSeats = onBoard
    ? (["player1", "player2"] as Seat[]).filter((seat) =>
        shown!.state.simultaneous ? shown!.state.awaiting[seat] : shown!.state.turn === seat)
    : [];

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-background">
      {/* Portalled so the page wrapper's lingering route transform can't become the
          containing block and pin these to the document instead of the window. */}
      {glowSeats.length > 0 &&
        createPortal(
          <>
            {glowSeats.map((seat) => (
              <div key={seat} aria-hidden
                className={`turn-glow fixed inset-y-0 z-10 w-[18vw] ${seat === "player1" ? "left-0" : "right-0"}`}
                style={{
                  background: `linear-gradient(to ${seat === "player1" ? "right" : "left"}, rgba(${OWNER_RGB[seat]},.42), transparent)`,
                }} />
            ))}
          </>,
          document.body
        )}
      <div ref={stageRef} className="ovl-stage relative shrink-0">
        {!shown ? (
          <div className="flex h-full w-full items-center justify-center font-display text-[44px] text-muted">
            {t("match.connecting")}
          </div>
        ) : shown.state.finished ? (
          <MatchSummary payload={shown} roomName={roomName} />
        ) : holding ? (
          <SnipeOutcome
            state={shown.state}
            duel={holding}
            names={seatNames(shown, { player1: t("match.p1"), player2: t("match.p2") })}
            civById={new Map(shown.state.civs.map((c) => [c.id, c]))}
            t={t}
          />
        ) : shown.awaitingAck || shown.state.currentStep?.type === "GAME_RESULT" ? (
          // The beat between games gets the whole screen. A pool grid is the wrong
          // thing to be looking at while a game is being called.
          <GameResultCard payload={shown} />
        ) : (
          <DraftBoard payload={shown} roomName={roomName} clockOffset={clockOffset} live={live} />
        )}
      </div>
      <ReplayControls at={at} total={history.length} live={live} onSeek={seek} onLive={() => setCursor(null)} />
    </div>
  );
}
