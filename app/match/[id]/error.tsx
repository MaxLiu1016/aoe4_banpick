"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { reportClientError } from "@/lib/reportClientError";

/**
 * A crash in the draft room, caught where it can still be recovered from.
 *
 * The important word is `reset`. Everything about a draft lives on the server —
 * the room is a projection of an append-only log — so re-mounting the tree and
 * re-joining the socket restores the exact position without a page load, without
 * losing a seat, and without the player wondering whether they just forfeited a
 * turn by pressing F5. That is the whole reason this file is a boundary and not
 * an error page.
 *
 * It also reports. Until this existed, a render that threw in somebody's browser
 * left the server log spotless and the player with a blank frame, so the only
 * evidence we ever had was a sentence in Discord.
 */
export default function MatchError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    reportClientError({
      where: "match",
      matchId: params?.id,
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error, params?.id]);

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-16 text-center">
      <div className="aoe-panel rounded-xl p-8">
        <h1 className="font-display text-xl aoe-gold-text">{t("err.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t("err.matchBody")}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="aoe-btn rounded px-5 py-2 font-display">
            {t("err.retry")}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded border border-bronze px-4 py-2 font-sans text-sm text-muted hover:text-gold-bright"
          >
            {t("err.reload")}
          </button>
        </div>
        {/* The digest is the only handle on a server-rendered failure, and it is
            what somebody can paste into a bug report. Shown small, not hidden. */}
        {error.digest && <p className="mt-5 font-mono text-[11px] text-muted/70">{error.digest}</p>}
      </div>
    </div>
  );
}
