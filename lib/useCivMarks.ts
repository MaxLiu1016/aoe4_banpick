"use client";

import { useCallback, useState } from "react";

/**
 * A player's own marks on the pool.
 *
 * SAS asked for this twice and then said exactly how he uses it: "normally I
 * only use the ✅ to fade out used civs, I don't use numbers with colors". So it
 * is one flag per entry, not aoe2cm's crown/skull/number layer — a scratchpad
 * for thinking, not an annotation for anybody else to read.
 *
 * Deliberately local. It never reaches the server, so the opponent cannot infer
 * anything from it, there is nothing to redact, and marking during a hidden step
 * cannot leak a plan. Kept per match in `localStorage` so a reload mid-draft —
 * which is exactly when somebody has been marking for twenty minutes — does not
 * throw the work away.
 */
const key = (matchId: string) => `bp:marks:${matchId}`;

function load(matchId: string): Set<string> {
  try {
    if (typeof window === "undefined") return new Set();
    const raw = window.localStorage.getItem(key(matchId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    // A blocked or full localStorage costs the marks, not the draft.
    return new Set();
  }
}

export function useCivMarks(matchId: string) {
  // Lazy initialiser rather than an effect: the marks are known before the first
  // paint, so reading them later would flash the pool unmarked and then mark it.
  const [marked, setMarked] = useState<Set<string>>(() => load(matchId));

  const toggle = useCallback((id: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      try { window.localStorage.setItem(key(matchId), JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [matchId]);

  const clear = useCallback(() => {
    setMarked(new Set());
    try { window.localStorage.removeItem(key(matchId)); } catch { /* ignore */ }
  }, [matchId]);

  return { marked, toggle, clear };
}
