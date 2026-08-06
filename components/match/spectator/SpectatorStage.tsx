"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket/client";
import { C2S, S2C } from "@/lib/socket/events";
import { useI18n } from "@/lib/i18n";
import { DraftBoard } from "./DraftBoard";
import { MatchSummary } from "./MatchSummary";
import type { SpectatorPayload } from "./types";

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

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-background">
      <div ref={stageRef} className="ovl-stage relative shrink-0">
        {!payload ? (
          <div className="flex h-full w-full items-center justify-center font-display text-[44px] text-muted">
            {t("match.connecting")}
          </div>
        ) : payload.state.finished ? (
          <MatchSummary payload={payload} roomName={roomName} />
        ) : (
          <DraftBoard payload={payload} roomName={roomName} clockOffset={clockOffset} />
        )}
      </div>
    </div>
  );
}
