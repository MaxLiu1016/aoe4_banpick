/**
 * The mark a tile wears to say what happened to it.
 *
 * Shapes, not colours. The same tile has to read on a greyscale screenshot and
 * to somebody who cannot tell red from green, so the badge carries the meaning
 * and the colour only agrees with it.
 *
 * SVG, not emoji. The pool used to say ✕ ● 🚫 🔒, which drew differently on
 * every platform, could not be given a stroke weight, and — in the case of the
 * ✕ — sat inside an element with `opacity-30`, so the most consequential mark on
 * the page rendered at three-tenths alpha.
 */

export type MarkKind = "ban" | "check" | "lock";

/** 24x24, stroked, round caps. Five strokes across the whole set. */
const GLYPH: Record<MarkKind, React.ReactNode> = {
  // A circle with a bar through it: "not this one", in no language.
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="5.6" y1="18.4" x2="18.4" y2="5.6" />
    </>
  ),
  // Settled. The counterpart of the dashed empty slot, which means "not yet".
  check: <path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" />,
  // Handed in, not yet opened — a simultaneous ban of your own.
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5 V7.5 a4 4 0 0 1 8 0 v3" />
    </>
  ),
};

/**
 * A corner badge on a tile. `label` is the same sentence the legend used to
 * carry — deleting the legend must not cost a screen reader the word for it.
 */
export function TileBadge({ mark, size = 24, corner = "tr", className = "", style, label }: {
  mark: MarkKind;
  size?: number;
  /** Top-right is what happened to the tile; top-left is a note of your own. */
  corner?: "tr" | "tl";
  className?: string;
  /** For callers that colour from a CSS variable rather than a utility class. */
  style?: React.CSSProperties;
  label: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute z-10 flex items-center justify-center rounded-full border border-black/50 ${
        corner === "tr" ? "right-1 top-1" : "left-1 top-1"
      } ${className}`}
      style={{ width: size, height: size, background: "rgba(15,17,21,.72)", ...style }}
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
        width={Math.round(size * 0.66)} height={Math.round(size * 0.66)} role="img"
      >
        <title>{label}</title>
        {GLYPH[mark]}
      </svg>
    </span>
  );
}

/**
 * The line through a tile that is out of play.
 *
 * This is the app's existing word for a ban — it is what a banned tile in the
 * board strip wears, and what an empty ban slot draws to say a ban belongs
 * there. The pool was the one place spelling it ✕ instead.
 */
export function StrikeBar({ animate, dashed }: { animate?: boolean; dashed?: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-1/2 z-10 h-[3px] -translate-y-1/2 ${animate ? "strike-draw" : ""}`}
      style={{
        // Dashed for a ban that only closed this civ to YOU. The line is the
        // word "no", which is what a player asked to see and is true either way;
        // the breaks in it are what keeps "gone from the draft" and "gone for
        // you, and your opponent may still field it" from becoming one thing.
        background: dashed
          ? "repeating-linear-gradient(to right, var(--danger) 0 9px, transparent 9px 16px)"
          : "var(--danger)",
        boxShadow: dashed ? undefined : "0 0 6px rgba(0,0,0,.6)",
      }}
    />
  );
}
