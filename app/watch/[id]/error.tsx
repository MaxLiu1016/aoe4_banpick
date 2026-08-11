"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { reportClientError } from "@/lib/reportClientError";

/** How long to wait before the board tries to put itself back together. */
const RETRY_MS = 4000;

/**
 * A crash on the broadcast page, which nobody is sitting in front of.
 *
 * That is the whole design constraint. This page is pointed at by OBS or a
 * projector; a button saying "try again" is a button nobody will press, and a
 * dead frame stays dead for the rest of the match. So it retries itself, and the
 * copy is aimed at whoever eventually glances at the stream rather than at a
 * user who is about to act.
 *
 * Retries are counted and reported, because "it recovered on its own eleven
 * times" is a materially different bug from "it broke once".
 */
export default function WatchError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ id: string }>();
  const attempt = useRef(0);
  const [countdown, setCountdown] = useState(RETRY_MS / 1000);

  useEffect(() => {
    attempt.current += 1;
    reportClientError({
      where: `watch#retry${attempt.current}`,
      matchId: params?.id,
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error, params?.id]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((n) => Math.max(0, n - 1)), 1000);
    const retry = setTimeout(reset, RETRY_MS);
    return () => { clearInterval(tick); clearTimeout(retry); };
  }, [reset]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <p className="font-display text-2xl aoe-gold-text">Reconnecting to the board…</p>
        <p className="mt-3 font-sans text-sm text-muted">
          The draft is still running on the server. Retrying in {countdown}s.
        </p>
      </div>
    </div>
  );
}
