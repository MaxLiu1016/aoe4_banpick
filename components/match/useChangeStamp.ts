"use client";

import { useState } from "react";

/**
 * How many times `value` has changed since this component mounted.
 *
 * Zero on the first render, and that is the whole point. A civ that was already
 * banned when you opened the page has not just been banned, and a board that
 * plays every animation it has ever owed the moment a spectator joins is a board
 * nobody can read. Animate on a non-zero stamp, and use it as a `key` so the same
 * tile changing twice replays rather than sitting still the second time.
 *
 * Derived from props during render — the pattern React documents for exactly this
 * — rather than corrected afterwards by an effect, which would paint the new state
 * once without its animation before adding it.
 */
export function useChangeStamp(value: string): number {
  const [seen, setSeen] = useState({ value, n: 0 });
  if (seen.value !== value) {
    setSeen({ value, n: seen.n + 1 });
    return seen.n + 1;
  }
  return seen.n;
}
