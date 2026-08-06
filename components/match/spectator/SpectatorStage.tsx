"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSocket } from "@/lib/socket/client";
import { C2S, S2C } from "@/lib/socket/events";
import { useI18n } from "@/lib/i18n";
import { DraftBoard } from "./DraftBoard";
import { MatchSummary } from "./MatchSummary";
import { GameResultCard } from "./GameResultCard";
import { SnipeOutcome } from "./CivDuel";
import { OWNER_RGB, seatNames, type Seat, type SpectatorPayload } from "./types";

/** How long the snipe result stays up before the draft moves on. */
const SNIPE_HOLD_MS = 10_000;

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

  const holding =
    snipeHold !== null && payload?.state.currentGameIndex === snipeHold && !payload.state.finished
      ? payload.state.civDuel
      : null;

  // Whose turn it is, thrown in from the edges of the window rather than the edges
  // of the board. The stage is letterboxed on most screens, and lighting that
  // margin reads as the board spilling colour into the room — which is the whole
  // point of a cue you are meant to catch without looking at it. Only while the
  // draft board is up: the result and summary screens are nobody's turn.
  const onBoard = Boolean(payload) && !payload!.state.finished && !holding &&
    !payload!.awaitingAck && payload!.state.currentStep?.type !== "GAME_RESULT" &&
    payload!.status === "running";
  const glowSeats = onBoard
    ? (["player1", "player2"] as Seat[]).filter((seat) =>
        payload!.state.simultaneous ? payload!.state.awaiting[seat] : payload!.state.turn === seat)
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
        {!payload ? (
          <div className="flex h-full w-full items-center justify-center font-display text-[44px] text-muted">
            {t("match.connecting")}
          </div>
        ) : payload.state.finished ? (
          <MatchSummary payload={payload} roomName={roomName} />
        ) : holding ? (
          <SnipeOutcome
            state={payload.state}
            duel={holding}
            names={seatNames(payload, { player1: t("match.p1"), player2: t("match.p2") })}
            civById={new Map(payload.state.civs.map((c) => [c.id, c]))}
            t={t}
          />
        ) : payload.awaitingAck || payload.state.currentStep?.type === "GAME_RESULT" ? (
          // The beat between games gets the whole screen. A pool grid is the wrong
          // thing to be looking at while a game is being called.
          <GameResultCard payload={payload} />
        ) : (
          <DraftBoard payload={payload} roomName={roomName} clockOffset={clockOffset} />
        )}
      </div>
    </div>
  );
}
