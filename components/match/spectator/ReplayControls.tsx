"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * The scrub bar for a caster, and the reason it hides itself.
 *
 * This page is what a stream is pointed at, so anything permanently on it is
 * permanently on the broadcast. A control that is only wanted for the few
 * seconds somebody is using it should only be there for those seconds — so it
 * follows the mouse the way a video player's does, and goes away again. The
 * keyboard works whether it is visible or not, which is how it will mostly be
 * driven: a caster's hand is not on the mouse.
 *
 * It does NOT say "REPLAY" across the board. Whether the stream is showing the
 * live step is the operator's business to know, not the audience's to be told —
 * and a caster deliberately running a few steps behind does not want a badge
 * burnt into their output. The board's own LIVE indicator carries the truth for
 * anyone who looks.
 */
export function ReplayControls({ at, total, live, pinned, onSeek, onLive }: {
  /** 0-based position in the history buffer. */
  at: number;
  total: number;
  live: boolean;
  /** Always on screen. Set once a draft is over: there is no live picture left
      to keep clean, and replaying it is the only reason to open the page. */
  pinned?: boolean;
  onSeek: (index: number) => void;
  onLive: () => void;
}) {
  const { t } = useI18n();
  const [stirred, setStirred] = useState(false);
  // Pinned open while parked — someone who has stepped off live needs the way
  // back to be findable without knowing that moving the mouse summons it. That
  // is a fact about `live`, so it is derived rather than stored; the state below
  // only tracks the part that is genuinely about recent input.
  const visible = pinned || !live || stirred;

  // Any input reveals it; a few seconds of stillness puts it away again.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setStirred(true);
      clearTimeout(timer);
      timer = setTimeout(() => setStirred(false), 2500);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  if (total <= 1) return null;

  const btn = "rounded border border-bronze px-3 py-1.5 font-display text-[15px] text-gold-bright disabled:opacity-30 hover:brightness-125";
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-5 transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-xl border border-bronze px-4 py-2.5"
        style={{ background: "rgba(15,17,21,.92)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      >
        <button className={btn} onClick={() => onSeek(0)} disabled={at === 0} title={t("replay.first")}>⏮</button>
        <button className={btn} onClick={() => onSeek(at - 1)} disabled={at === 0} title={t("replay.back")}>◀</button>
        <span className="min-w-[112px] text-center font-sans text-[14px] font-semibold tracking-[.1em] text-muted">
          {t("replay.position", { n: at + 1, total })}
        </span>
        <button className={btn} onClick={() => onSeek(at + 1)} disabled={live} title={t("replay.forward")}>▶</button>
        <button
          onClick={onLive}
          disabled={live}
          className={`rounded px-3.5 py-1.5 font-display text-[15px] ${
            live
              ? "border border-bronze text-muted opacity-50"
              : "border border-gold bg-gold/15 text-gold-bright hover:brightness-125"
          }`}
        >
          {t("replay.live")}
        </button>
      </div>
    </div>
  );
}
