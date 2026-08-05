"use client";

import { useState } from "react";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * A number input you can actually empty while you retype it.
 *
 * The obvious controlled version — `value={n}` with `onChange={clamp(+e.target.value)}`
 * — rewrites the field on every keystroke, so the moment you clear it the empty
 * string becomes 0, gets clamped up to the minimum, and reappears in the box. On
 * a desktop you can hide that by selecting the whole field and typing over it in
 * one gesture. On a phone you can't, so the first digit is simply impossible to
 * replace: every backspace puts it straight back.
 *
 * So: hold whatever is typed as a draft, commit only values already inside the
 * range, and clamp once on blur. Nothing outside ever sees a half-typed number.
 */
export function NumberInput({ value, min, max, onChange, className, title }: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  className?: string;
  title?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      title={title}
      value={draft ?? String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const n = Number(raw);
        if (raw !== "" && Number.isInteger(n) && n >= min && n <= max) onChange(n);
      }}
      onBlur={() => {
        if (draft === null) return;
        const n = Number(draft);
        // Left empty or nonsense: keep what it was rather than inventing a number.
        onChange(clamp(draft === "" || !Number.isFinite(n) ? value : n, min, max));
        setDraft(null);
      }}
      className={className}
    />
  );
}
