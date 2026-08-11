"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";

/**
 * The last thing standing when the root layout itself has failed.
 *
 * This replaces the layout, so there are no providers, no dictionary and no
 * guarantee the fonts loaded — which is why the copy is plain English and the
 * styling is inline. Everything it depends on is something that has already been
 * proven to work by the fact that you are reading it.
 *
 * Route-level boundaries (`app/match/[id]/error.tsx`) catch almost everything
 * first and can offer a real recovery. This one exists so that the case they
 * cannot catch still says something and still reports itself, rather than
 * leaving the bare frame that sent a player back to Discord asking what happened.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError({
      where: "global",
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0f1115", color: "#e8e2d2", fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 460 }}>
            <h1 style={{ fontSize: 22, margin: "0 0 10px", color: "#f1cf6c" }}>Something broke on this page</h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#9a917d", margin: "0 0 20px" }}>
              The draft itself is safe — it lives on the server, not in this tab. Try again, and if it keeps
              happening, tell us what you were doing: the error has been reported automatically.
            </p>
            <button
              onClick={reset}
              style={{
                background: "transparent", color: "#f1cf6c", border: "1px solid #8a6a32",
                borderRadius: 6, padding: "9px 20px", fontSize: 14, cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
