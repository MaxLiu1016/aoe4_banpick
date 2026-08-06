"use client";

import { useEffect, useState } from "react";
import { Thumb } from "@/components/Thumb";
import type { CivDuel, DerivedState, PoolView } from "@/lib/draft/engine";
import { OWNER, OWNER_RGB, other, type Seat } from "./types";

type Translate = (k: string, p?: Record<string, string | number>) => string;

/** How long one card waits for the card before it to turn over. */
const FLIP_STAGGER_MS = 150;

/**
 * The offer and snipe phases, which the civ pool cannot describe: what matters in
 * them is not which civs are left but what each side is holding face-down.
 *
 * The rule the whole panel is built around is that a spectator must never learn a
 * secret before the opponent does. The server already blanks the hidden lists, so
 * this view is not the last line of defence — but it is the one that has to make a
 * blank list *interesting*. It answers "how many, and are they in yet?" and stops
 * there, and when the secret does open it turns the cards over one at a time so
 * the reveal is an event rather than a repaint.
 */
export function CivDuelPanel({
  state, duel, names, civById, t,
}: {
  state: DerivedState;
  duel: CivDuel;
  names: Record<Seat, string>;
  civById: Map<string, PoolView>;
  t: Translate;
}) {
  const sniping = state.currentStep?.type === "CIV_SNIPE_OPPONENT";
  // A turn-based offer is drafted in the open — the server sends it through, and
  // hiding it here would be inventing a secret the format never asked for.
  const hidden = !sniping && duel.offerHidden;

  const cardsOf = (seat: Seat): (PoolView | undefined)[] => {
    if (hidden) return Array.from({ length: duel.offerCount }, () => undefined);
    const offered = duel.offered[seat].map((id) => civById.get(id));
    // An open offer shows the empty seats it still owes, so the shape of the round
    // is visible before it is filled.
    const owed = Math.max(0, duel.offerTarget[seat] - offered.length);
    return sniping ? offered : [...offered, ...Array.from({ length: owed }, () => undefined)];
  };
  const cards: Record<Seat, (PoolView | undefined)[]> = { player1: cardsOf("player1"), player2: cardsOf("player2") };

  // Reveal cursor: how many cards have been turned over so far. Reset whenever the
  // step changes, so every phase gets its own reveal rather than one long one.
  const revealTotal = sniping ? cards.player1.length + cards.player2.length : 0;
  const revealIndex = useReveal(revealTotal, state.currentStepIndex);

  // Two cards a side is the common shape and gets the biggest card; past that the
  // row wraps inside its own half rather than shrinking the whole arena away.
  const widest = Math.max(cards.player1.length, cards.player2.length, 1);
  const cardW = widest <= 2 ? 200 : widest <= 6 ? 152 : 112;

  // Both sides in but the step has not turned over yet — the one moment where
  // "nothing to show" is the actual news.
  const revealPending = hidden && !state.awaiting.player1 && !state.awaiting.player2;

  return (
    // A fixed band, so the arena sits in the middle of the space the pool grid
    // would have filled instead of hanging off the heading.
    <div className="mt-6 flex h-[610px] flex-col justify-center">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        <Side
          seat="player1" cards={cards.player1} cardW={cardW} hidden={hidden} sniping={sniping}
          from={0} revealIndex={revealIndex} names={names} state={state} t={t}
        />
        {/* The VS keeps its place whatever happens below it: a mark that jumps when
            the reveal starts reads as a glitch on a stream. */}
        <div className="w-[140px] text-center">
          <div className="font-display text-[64px] font-bold leading-none text-gold" style={{ textShadow: "0 3px 14px rgba(0,0,0,.8)" }}>
            VS
          </div>
          <div className="h-[76px] pt-4">
            {revealPending && (
              <>
                <div className="font-sans text-[15px] font-semibold tracking-[.18em] text-gold-bright">{t("spec.revealing")}</div>
                <div className="relative mx-auto mt-2.5 h-1.5 w-[130px] overflow-hidden rounded-full" style={{ background: "rgba(58,51,38,.9)" }}>
                  <div
                    className="ovl-sweep absolute inset-y-0 left-0 w-1/3 rounded-full"
                    style={{ background: "linear-gradient(90deg, transparent, var(--gold-bright), transparent)" }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <Side
          seat="player2" cards={cards.player2} cardW={cardW} hidden={hidden} sniping={sniping}
          from={cards.player1.length} revealIndex={revealIndex} names={names} state={state} t={t}
        />
      </div>
      {(sniping || hidden) && (
        // Said out loud, because "why can't I see it?" is the first thing a viewer
        // asks and the answer is the point of the phase.
        <div className="mt-7 text-center font-sans text-[16px] text-muted">
          {t(sniping ? "spec.snipeHidden" : "spec.hiddenOffer")}
        </div>
      )}
    </div>
  );
}

/** One seat's half of the arena: their cards, and where they are up to. */
function Side({
  seat, cards, cardW, hidden, sniping, from, revealIndex, names, state, t,
}: {
  seat: Seat;
  cards: (PoolView | undefined)[];
  cardW: number;
  hidden: boolean;
  sniping: boolean;
  from: number;
  revealIndex: number;
  names: Record<Seat, string>;
  state: DerivedState;
  t: Translate;
}) {
  const waiting = state.awaiting[seat];
  // How many cards this seat still owes — which is all of them while they are
  // face-down, since a hidden offer never says how far along it is.
  const owed = cards.filter((c) => !c).length;
  const label = owed > 0 ? t("spec.offering", { n: owed }) : t("spec.offered");
  return (
    <div className="text-center">
      <div className="truncate font-display text-[28px] font-bold leading-none" style={{ color: OWNER[seat] }}>{names[seat]}</div>
      <div className="mt-2 font-sans text-[15px] font-semibold tracking-[.18em] text-muted">{label}</div>
      <div className="mt-3.5 flex flex-wrap items-start justify-center gap-3.5">
        {cards.map((civ, i) => (
          <Card
            key={civ?.id ?? `slot-${i}`}
            civ={civ}
            seat={seat}
            width={cardW}
            kind={hidden ? "back" : civ ? "face" : "slot"}
            glow={waiting}
            // In the snipe phase the offers turn over one at a time; before that a
            // face-up card is simply news as it lands.
            turned={sniping ? from + i < revealIndex : undefined}
          />
        ))}
      </div>
      <div className="mt-4">
        {sniping ? (
          <Status
            live={state.awaiting[other(seat)]}
            text={t(state.awaiting[other(seat)] ? "spec.snipeChoosing" : "spec.snipeLocked", { name: names[other(seat)] })}
          />
        ) : (
          <Status live={waiting} text={waiting ? `… ${t("spec.choosing")}` : `✓ ${t("spec.locked")}`} />
        )}
      </div>
    </div>
  );
}

/**
 * A single offered civ. Face-down it is a card back in the owner's colour — the
 * only thing a spectator is allowed to know about it is whose it is.
 */
function Card({ civ, seat, width, kind, glow, turned }: {
  civ?: PoolView;
  seat: Seat;
  width: number;
  /** back = face-down and staying that way; slot = an offer not made yet; face = shown. */
  kind: "back" | "slot" | "face";
  glow: boolean;
  /** Only for a face that arrives by turning over: whether its moment has come. */
  turned?: boolean;
}) {
  const face = (
    <div
      className="flex flex-col items-center justify-center rounded-[14px] p-2.5"
      style={{
        width, height: width,
        border: `3px solid ${OWNER[seat]}`,
        background: `rgba(${OWNER_RGB[seat]},.12)`,
        backfaceVisibility: "hidden",
      }}
    >
      <Thumb src={civ?.imageUrl} alt={civ?.name ?? ""} className="h-[64%] w-[64%] object-contain" />
      <div className="mt-1 w-full truncate text-center font-display text-[16px] font-bold leading-tight" style={{ color: OWNER[seat] }}>
        {civ?.name ?? "—"}
      </div>
    </div>
  );

  // `extra` is how the back gets flipped away from the viewer when it is the far
  // side of a turning card: the rotation has to sit on the same element as the
  // hidden backface, or the browser flattens the pair and draws both at once.
  const backCard = (extra?: React.CSSProperties) => (
    <div
      className="flex items-center justify-center rounded-[14px]"
      style={{
        width, height: width,
        border: `3px solid ${OWNER[seat]}`,
        background: `linear-gradient(160deg, rgba(${OWNER_RGB[seat]},.22), var(--surface-2))`,
        backfaceVisibility: "hidden",
        ...extra,
      }}
    >
      <span className="font-display font-bold leading-none" style={{ fontSize: width * 0.5, color: OWNER[seat] }}>?</span>
    </div>
  );

  if (kind === "back") return backCard();
  // An empty slot in an open offer: nothing has been put here yet, and nothing is
  // being hidden either — so it reads as a gap, not as a card.
  if (kind === "slot") {
    return (
      <div
        className={`rounded-[14px] ${glow ? "ovl-glow" : ""}`}
        style={{ width, height: width, border: "3px dashed rgba(216,178,74,.9)", background: "rgba(216,178,74,.07)" }}
      />
    );
  }
  // A card that was already public when it landed: it pops in, it doesn't turn over.
  if (turned === undefined) return <div className="ovl-pop">{face}</div>;

  return (
    <div style={{ perspective: 900 }}>
      <div
        className={turned ? "ovl-flip relative" : "relative"}
        style={{ transformStyle: "preserve-3d", transform: turned ? undefined : "rotateY(180deg)" }}
      >
        {face}
        {backCard({ position: "absolute", left: 0, top: 0, transform: "rotateY(180deg)" })}
      </div>
    </div>
  );
}

/** "Locked in" / "still choosing", in the step bar's own visual language. */
function Status({ live, text }: { live: boolean; text: string }) {
  return (
    <span
      className={`inline-block rounded-[10px] px-4 py-2 font-sans text-[15px] font-semibold tracking-[.14em] ${live ? "ovl-glow" : ""}`}
      style={{
        border: live ? "1px solid var(--gold)" : "1px solid rgba(58,51,38,.9)",
        background: live ? "rgba(216,178,74,.16)" : "rgba(32,36,45,.5)",
        color: live ? "var(--gold-bright)" : "var(--muted)",
      }}
    >
      {text}
    </span>
  );
}

/**
 * Releases one card every {@link FLIP_STAGGER_MS}, restarting whenever `key` changes.
 *
 * The cursor carries the step it was counted for, so a new step resets it by simply
 * not matching — read during render rather than corrected afterwards by an effect,
 * which would render the old count once before fixing it.
 */
function useReveal(total: number, key: number): number {
  const [cursor, setCursor] = useState({ key, i: 0 });
  const revealIndex = cursor.key === key ? cursor.i : 0;
  useEffect(() => {
    if (revealIndex >= total) return;
    const id = setTimeout(() => setCursor({ key, i: revealIndex + 1 }), FLIP_STAGGER_MS);
    return () => clearTimeout(id);
  }, [revealIndex, total, key]);
  return revealIndex;
}

/**
 * Who has locked in during a phase that hides what was locked in — a simultaneous
 * ban, or both players confirming. `pendingBans` is never read: what was banned is
 * the opponent's information until the step closes, and "they are in" is the whole
 * story a spectator gets.
 */
export function LockRow({ state, names, t }: { state: DerivedState; names: Record<Seat, string>; t: Translate }) {
  const isBan = state.currentStep?.type === "MAP_BAN" || state.currentStep?.type === "CIV_BAN";
  return (
    <>
      <div className="mt-5 flex items-center justify-center gap-[26px]">
        {(["player1", "player2"] as Seat[]).map((seat) => {
          const live = state.awaiting[seat];
          return (
            <span key={seat} className="flex items-center gap-2.5">
              <span className="font-display text-[20px] font-bold leading-none" style={{ color: OWNER[seat] }}>{names[seat]}</span>
              <Status live={live} text={live ? `… ${t("spec.choosing")}` : `✓ ${t("spec.locked")}`} />
            </span>
          );
        })}
      </div>
      {isBan && <div className="mt-2.5 text-center font-sans text-[15px] text-muted">{t("spec.banHidden")}</div>}
    </>
  );
}
