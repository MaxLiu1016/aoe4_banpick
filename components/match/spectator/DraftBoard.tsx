"use client";

import { useEffect, useState } from "react";
import { Thumb } from "@/components/Thumb";
import { useI18n } from "@/lib/i18n";
import type { DerivedState, PoolView } from "@/lib/draft/engine";
import { CivDuelPanel, LockRow } from "./CivDuel";
import { OWNER, OWNER_RGB, other, seatNames, type Seat, type SpectatorPayload } from "./types";

/** Steps either side of the current one to keep on screen. */
const STEP_WINDOW = 3;

// The canvas is a fixed 1920x1080, so every band's height is a share of a budget
// rather than something that can grow. Named here because they have to add up.
const HEADER_H = 112;
const STEPBAR_H = 66;
// Sized down to what it can afford: the two player columns hang off the bottom
// of this band and a 1080-tall canvas has no more room to give them.
const HERO_H = 166;
const CONTENT_TOP = HEADER_H + STEPBAR_H + HERO_H; // 344

// Where the two player columns sit, and therefore how wide the middle is. The
// duel needs the width far more than the columns do — the pool is not on screen
// during it, and what is on screen is two hands of cards meant to be read from
// across a room — so the columns step aside and become a reminder of who holds
// what rather than a full account of it.
const COL = { w: 360, inset: 88, centre: 480 };
const COL_DUEL = { w: 200, inset: 40, centre: 280 };

/**
 * The draft as a broadcast picture: the whole civ pool in the middle as the single
 * source of truth, and each player's own view of it down the sides.
 *
 * Colour means ownership, never action — a ban is always desaturated with a red
 * bar, gold is reserved for whatever is happening right now. Nothing a player has
 * hidden is shown: the server already redacts it for spectators, and this screen
 * reports "locked in / choosing" rather than trying to fill the gap.
 */
export function DraftBoard({
  payload, roomName, clockOffset,
}: { payload: SpectatorPayload; roomName: string; clockOffset: number }) {
  const { t } = useI18n();
  const { state } = payload;
  const names = seatNames(payload, { player1: t("match.p1"), player2: t("match.p2") });

  const civById = new Map(state.civs.map((c) => [c.id, c]));
  const mapById = new Map(state.maps.map((m) => [m.id, m]));

  // A civ is out if it was banned globally OR struck from either hand. The pool is
  // the spectator's map of what is still gettable, so both count.
  const banned = new Set<string>([
    ...state.civs.filter((c) => c.state === "banned").map((c) => c.id),
    ...state.civBans.map((b) => b.id),
  ]);
  // Civs already fielded in an earlier game, per seat.
  const usedBy = (seat: Seat) =>
    new Set(
      state.games
        .filter((g) => g.gameIndex < state.currentGameIndex)
        .map((g) => (seat === "player1" ? g.civP1 : g.civP2))
        .filter(Boolean) as string[]
    );

  // Maps already used by a game, so a drafted map that has had its turn reads as
  // spent rather than still to come.
  const playedMaps = new Set(state.games.map((g) => g.map).filter(Boolean) as string[]);
  const currentMap = state.games[state.currentGameIndex]?.map;
  const step = state.currentStep;
  const stepName = step ? t(`step.${step.type}`) : "";
  const heading =
    state.turn === "host"
      ? t("turn.randomDraw")
      : state.simultaneous || !state.turn
      ? t("spec.bothTurn", { step: stepName })
      : t("spec.turnOf", { name: names[state.turn as Seat], step: stepName });

  // The offer and snipe phases are about what is face-down, which the pool cannot
  // say — so for those steps the middle of the board becomes the duel itself.
  const duel = step?.type === "CIV_OFFER" || step?.type === "CIV_SNIPE_OPPONENT" ? state.civDuel : null;
  // Any other step where both sides act blind: the pool is still the right picture,
  // but it has to be said who is already in. (`pendingBans` is never read.)
  const showLocks = !duel && state.simultaneous;
  const box = duel ? COL_DUEL : COL;

  // While the maps are being drafted, the middle shows the maps. It used to show
  // the civ pool throughout — twenty-three flags nothing was happening to, while
  // the thing being banned appeared only as a thumbnail in a side column.
  const mapStep = step?.type === "MAP_BAN" || step?.type === "MAP_PICK" || step?.type === "MAP_SELECT";
  const entries = mapStep ? state.maps : state.civs;
  // Seven across at this width gives a tile you can read a name under. A small
  // pool has room to spare and gets a bigger one; maps are wide, so fewer fit.
  const poolCols = mapStep
    ? (entries.length <= 6 ? 3 : entries.length <= 12 ? 4 : 5)
    : (entries.length <= 12 ? 6 : entries.length <= 24 ? 8 : 10);
  // A map banned during the map draft is banned for everyone, and the pool is the
  // only place that says so before the columns fill up.
  const outOfPool = mapStep
    ? new Set(state.maps.filter((m) => m.state === "banned").map((m) => m.id))
    : banned;

  const from = Math.max(0, Math.min(state.currentStepIndex - STEP_WINDOW, state.stepBar.length - STEP_WINDOW * 2 - 1));
  const steps = state.stepBar.slice(from, from + STEP_WINDOW * 2 + 1);
  const decided = state.games.filter((g) => g.winner);

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(1300px 640px at 50% -12%, rgba(216,178,74,.12), transparent 62%), var(--background)" }}
    >
      {/* ---- Header: who, the score, and the series so far ---- */}
      <div
        className="absolute left-0 right-0 top-0 grid grid-cols-[1fr_auto_1fr] items-center px-12"
        style={{
          height: HEADER_H,
          borderBottom: "2px solid rgba(138,106,50,.6)",
          background: "linear-gradient(180deg, rgba(32,36,45,.9), rgba(15,17,21,.9))",
        }}
      >
        <div className="min-w-0">
          <div className="truncate font-display text-[27px] font-semibold leading-tight text-foreground">{roomName}</div>
          <div className="mt-1 font-sans text-[17px] font-semibold tracking-[.18em] text-muted">
            {t("spec.format", { n: state.bestOf, g: state.currentGameIndex + 1 })}
          </div>
          {/* Games already played: what each side fielded and who took it. They
              used to have a strip across the bottom of the board; up here they
              cost nothing and give the pool its height back. */}
          {decided.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {decided.map((g) => {
                const w = g.winner as Seat;
                const civ = (seat: Seat) => civById.get((seat === "player1" ? g.civP1 : g.civP2) ?? "");
                const won = civ(w), lost = civ(other(w));
                return (
                  <span key={g.gameIndex} className="flex items-center gap-1.5 rounded-md px-2 py-1"
                    style={{ border: `1px solid ${OWNER[w]}`, background: `rgba(${OWNER_RGB[w]},.1)` }}>
                    <span className="font-sans text-[16px] font-semibold tracking-[.08em]" style={{ color: OWNER[w] }}>
                      G{g.gameIndex + 1}
                    </span>
                    <span className="relative shrink-0" title={won?.name}>
                      <Thumb src={won?.imageUrl} alt={won?.name ?? ""} className="h-[30px] w-[30px] object-contain" />
                      <span className="absolute -right-1.5 -top-2 text-[13px] leading-none">👑</span>
                    </span>
                    <span className="font-sans text-[12px] text-muted">vs</span>
                    <span className="shrink-0" title={lost?.name}>
                      <Thumb src={lost?.imageUrl} alt={lost?.name ?? ""}
                        className="h-[30px] w-[30px] object-contain opacity-45 grayscale" />
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[26px]">
          <div className="text-right font-display text-[40px] font-bold leading-none" style={{ color: OWNER.player1 }}>
            {names.player1}
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[52px] font-bold leading-none" style={{ color: OWNER.player1 }}>{state.score.player1}</span>
            <span className="font-display text-[30px] font-bold leading-none text-bronze">—</span>
            <span className="font-display text-[52px] font-bold leading-none" style={{ color: OWNER.player2 }}>{state.score.player2}</span>
          </div>
          <div className="text-left font-display text-[40px] font-bold leading-none" style={{ color: OWNER.player2 }}>
            {names.player2}
          </div>
        </div>
        <div className="flex items-center justify-end">
          {payload.status === "paused" ? (
            <span className="font-display text-[34px] font-bold leading-none text-danger">{t("spec.paused")}</span>
          ) : (
            <span className="inline-flex items-center gap-[9px] font-sans text-[16px] font-semibold tracking-[.18em] text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--urgent)" }} />
              {t("spec.live")}
            </span>
          )}
        </div>
      </div>

      {/* ---- Step bar ---- */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center gap-2.5 px-12"
        style={{ top: HEADER_H, height: STEPBAR_H, borderBottom: "1px solid rgba(58,51,38,.8)" }}
      >
        {steps.map((s, i) => {
          const idx = from + i;
          const done = idx < state.currentStepIndex;
          const now = idx === state.currentStepIndex;
          const owner = s.actor === "player1" || s.actor === "player2" ? OWNER[s.actor] : "var(--bronze)";
          return (
            <div
              key={idx}
              className="flex shrink-0 items-center gap-2 rounded-lg px-[15px] py-[7px]"
              style={{
                border: now ? "1px solid var(--gold)" : "1px solid rgba(58,51,38,.9)",
                borderLeft: `4px solid ${owner}`,
                background: now ? "rgba(216,178,74,.16)" : done ? "rgba(32,36,45,.4)" : "rgba(32,36,45,.3)",
                opacity: done ? 0.45 : 1,
              }}
            >
              <span className="font-display text-[15px] font-semibold leading-none" style={{ color: now ? "var(--gold-bright)" : "var(--muted)" }}>
                {done ? "✓" : idx + 1}
              </span>
              <span
                className="max-w-[220px] truncate font-sans text-[15px] leading-none"
                style={{ color: now ? "var(--gold-bright)" : done ? "var(--muted)" : "var(--foreground)", fontWeight: now ? 600 : 400 }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ---- The three things a viewer is actually watching for ---- */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center gap-[48px] px-12"
        style={{ top: HEADER_H + STEPBAR_H, height: HERO_H }}
      >
        <HeroMap map={currentMap ? mapById.get(currentMap) : undefined} t={t} />
        <div className="min-w-0 max-w-[720px] text-center">
          <div className="truncate font-display text-[42px] font-bold leading-tight text-gold-bright">{heading}</div>
          <div className="mt-1.5 font-sans text-[17px] font-semibold tracking-[.2em] text-muted">
            {t("spec.gameNofM", { n: state.currentGameIndex + 1, total: state.bestOf })}
          </div>
        </div>
        {/* The clock used to live in the top-right corner at 40px, which is where
            you look last. It is the number the whole screen is waiting on. */}
        <Countdown deadlineTs={payload.status === "paused" ? null : payload.deadlineTs} clockOffset={clockOffset} />
      </div>

      {/* ---- Player columns ---- */}
      {(["player1", "player2"] as Seat[]).map((seat) => (
        <PlayerColumn
          key={seat}
          seat={seat}
          name={names[seat]}
          compact={Boolean(duel)}
          width={box.w}
          inset={box.inset}
          hand={(seat === "player1" ? state.draftedByP1 : state.draftedByP2).map((id) => civById.get(id)).filter(Boolean) as PoolView[]}
          used={usedBy(seat)}
          civBans={state.civBans.filter((b) => b.by === seat).map((b) => civById.get(b.id)).filter(Boolean) as PoolView[]}
          mapsPicked={(seat === "player1" ? state.mapsByP1 : state.mapsByP2).map((id) => mapById.get(id)).filter(Boolean) as PoolView[]}
          playedMaps={playedMaps}
          mapBans={state.maps.filter((m) => m.state === "banned" && m.by === seat)}
          picking={state.awaiting[seat]}
          t={t}
        />
      ))}

      {/* ---- The middle: the pool, or the duel that replaces it ---- */}
      <div className="absolute" style={{ top: CONTENT_TOP, left: box.centre, right: box.centre, bottom: 34 }}>
        {showLocks && (
          <div className="mb-7">
            <LockRow state={state} names={names} t={t} />
          </div>
        )}
        {duel ? (
          <CivDuelPanel state={state} duel={duel} names={names} civById={civById} t={t} />
        ) : (
          <>
            <div className="grid gap-3.5" style={{ gridTemplateColumns: `repeat(${poolCols}, minmax(0, 1fr))` }}>
              {entries.map((c) => {
                const owner: Seat | null = (c.state === "drafted" || c.state === "picked") && (c.by === "player1" || c.by === "player2") ? c.by : null;
                const out = !owner && outOfPool.has(c.id);
                return (
                  <div
                    key={c.id}
                    className="relative rounded-[10px] p-2"
                    style={{
                      border: owner ? `2px solid ${OWNER[owner]}` : out ? "2px solid rgba(154,145,125,.45)" : "2px solid rgba(138,106,50,.85)",
                      background: owner ? `rgba(${OWNER_RGB[owner]},.12)` : "var(--surface-2)",
                      opacity: out ? 0.32 : 1,
                    }}
                  >
                    <Thumb src={c.imageUrl} alt={c.name}
                      className={`block w-full ${mapStep ? "aspect-[16/10] object-cover" : "aspect-square object-contain"} ${out ? "grayscale" : ""}`} />
                    <div
                      className="mt-1 truncate text-center font-sans text-[15px] font-semibold leading-tight"
                      style={{ color: owner ? OWNER[owner] : out ? "var(--muted)" : "var(--foreground)" }}
                    >
                      {c.name}
                    </div>
                    {owner && (
                      <span className="absolute right-1.5 top-[5px] font-sans text-[14px] font-bold leading-none" style={{ color: OWNER[owner] }}>●</span>
                    )}
                    {out && <span className="ovl-slash absolute left-1.5 right-1.5 top-[44%] h-1" style={{ background: "var(--danger)" }} />}
                  </div>
                );
              })}
            </div>
            <div className="mt-[22px] flex items-center justify-center gap-[26px] font-sans text-[15px] font-semibold tracking-[.06em] text-muted">
              <Legend swatch={{ border: "2px solid var(--bronze)" }} label={t("spec.legendPool")} />
              <Legend swatch={{ background: "var(--danger)" }} label={t("spec.legendBanned")} />
              <Legend swatch={{ border: `2px solid ${OWNER.player1}` }} label={t("spec.legendHeld", { name: names.player1 })} />
              <Legend swatch={{ border: `2px solid ${OWNER.player2}` }} label={t("spec.legendHeld", { name: names.player2 })} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The map this game is being drafted for, as a picture.
 *
 * It used to be four words of grey uppercase under the heading, which is a strange
 * way to treat the one fact every civ decision on screen is being made against.
 */
function HeroMap({ map, t }: { map?: PoolView; t: (k: string, p?: Record<string, string | number>) => string }) {
  if (!map) {
    return (
      <div className="flex shrink-0 flex-col items-center text-center" style={{ width: 272 }}>
        <div className="flex items-center justify-center rounded-[10px] font-display text-[42px] font-bold text-bronze"
          style={{ width: 208, height: 130, border: "2px dashed rgba(138,106,50,.7)" }}>?</div>
        <div className="mt-1.5 w-full truncate font-sans text-[14px] font-semibold tracking-[.16em] text-muted">{t("spec.mapPending")}</div>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 flex-col items-center text-center" style={{ width: 272 }}>
      <div className="overflow-hidden rounded-[10px]" style={{ width: 208, height: 130, border: "3px solid var(--gold)" }}>
        <Thumb src={map.imageUrl} alt={map.name} className="h-full w-full object-cover" />
      </div>
      <div className="mt-1.5 w-full truncate font-display text-[22px] font-bold leading-tight text-gold-bright">{map.name}</div>
    </div>
  );
}

/** A map's name, laid over the bottom of its own picture — the column has no
 *  height to spare for a caption underneath, and an unnamed map is a texture.
 *
 *  Held inside the frame rather than flush to the edge: the frame is what says
 *  whose map this is, and a label sitting on top of it cuts the bottom out of
 *  the one border on the tile that carries meaning. */
function MapName({ name, dim }: { name: string; dim?: boolean }) {
  return (
    <span className={`absolute bottom-[2px] left-[2px] right-[2px] truncate rounded-b-[5px] px-1 text-center font-sans text-[12px] font-semibold leading-[16px] ${dim ? "text-gold-bright/70" : "text-gold-bright"}`}
      style={{ background: "rgba(15,17,21,.42)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}>
      {name}
    </span>
  );
}

function Legend({ swatch, label }: { swatch: React.CSSProperties; label: string }) {
  return (
    <span className="flex items-center gap-[7px]">
      <span className="inline-block h-[13px] w-[13px] rounded-[3px]" style={swatch} />
      {label}
    </span>
  );
}

/** A player's own side of the draft: what they hold, and what they struck out. */
function PlayerColumn({
  seat, name, compact, width, inset, hand, used, civBans, mapsPicked, playedMaps, mapBans, picking, t,
}: {
  seat: Seat;
  name: string;
  /** The duel owns the middle — this side stands down to a reminder of the hand. */
  compact: boolean;
  width: number;
  inset: number;
  hand: PoolView[];
  used: Set<string>;
  civBans: PoolView[];
  /** Maps this player drafted into the shared pool — the ones still to be played on. */
  mapsPicked: PoolView[];
  playedMaps: Set<string>;
  mapBans: PoolView[];
  picking: boolean;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const right = seat === "player2";
  const remaining = hand.filter((c) => !used.has(c.id)).length;
  const heading = (label: string, colour: string) => (
    <div className="mt-6 font-sans text-[15px] font-semibold tracking-[.18em]" style={{ color: colour }}>{label}</div>
  );

  if (compact) {
    return (
      <div className="absolute" style={{ top: CONTENT_TOP, width, [right ? "right" : "left"]: inset, textAlign: right ? "right" : "left" }}>
        <div className="truncate pb-2 font-display text-[26px] font-bold leading-none" style={{ color: OWNER[seat], borderBottom: `3px solid ${OWNER[seat]}` }}>
          {name}
        </div>
        <div className="mt-2.5 font-sans text-[13px] font-semibold tracking-[.18em] text-muted">{t("spec.hand", { n: remaining })}</div>
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {hand.map((c) => (
            <div key={c.id} className="relative">
              <Thumb src={c.imageUrl} alt={c.name}
                className={`aspect-square w-full rounded bg-surface-2 object-contain ${used.has(c.id) ? "grayscale opacity-30" : ""}`} />
              <span className="pointer-events-none absolute inset-0 rounded"
                style={{ border: used.has(c.id) ? "2px solid rgba(58,51,38,.9)" : `2px solid ${OWNER[seat]}` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute" style={{ top: CONTENT_TOP, width, [right ? "right" : "left"]: inset, textAlign: right ? "right" : "left" }}>
      <div className={`flex items-center gap-3 pb-3 ${right ? "justify-end" : ""}`} style={{ borderBottom: `3px solid ${OWNER[seat]}` }}>
        {right && <span className="font-sans text-[15px] font-semibold tracking-[.14em] text-muted">P2</span>}
        <span className="truncate font-display text-[38px] font-bold leading-none" style={{ color: OWNER[seat] }}>{name}</span>
        {!right && <span className="font-sans text-[15px] font-semibold tracking-[.14em] text-muted">P1</span>}
      </div>

      {hand.length > 0 && (
        <>
          <div
            className="mt-[18px] font-sans text-[15px] font-semibold tracking-[.18em]"
            style={{ color: picking ? "var(--gold-bright)" : "var(--muted)" }}
          >
            {t(picking ? "spec.handPicking" : "spec.hand", { n: remaining })}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {hand.map((c) => {
              const spent = used.has(c.id);
              return (
                <div key={c.id} className="relative">
                  <Thumb src={c.imageUrl} alt={c.name}
                    className={`aspect-square w-full rounded-lg bg-surface-2 object-contain ${spent ? "grayscale opacity-35" : ""}`}
                    // Border colour carries ownership, so it has to stay inline.
                  />
                  <span
                    className="pointer-events-none absolute inset-0 rounded-lg"
                    style={{ border: spent ? "2px solid rgba(58,51,38,.9)" : `2px solid ${OWNER[seat]}`, background: "transparent" }}
                  />
                  {spent && <span className="absolute right-1 top-0.5 font-sans text-[12px] font-semibold text-muted">{t("spec.used")}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {civBans.length > 0 && (
        <>
          {heading(t("spec.civsBanned"), "var(--danger)")}
          <div className={`mt-3 flex flex-wrap gap-3 ${right ? "justify-end" : ""}`}>
            {civBans.map((c) => (
              <div key={c.id} className="relative h-[78px] w-[78px]">
                <Thumb src={c.imageUrl} alt={c.name} className="h-[78px] w-[78px] rounded border border-[rgba(154,145,125,.45)] bg-surface-2 object-contain grayscale" />
                <span className="ovl-slash absolute left-0 right-0 top-1/2 h-1" style={{ background: "var(--danger)" }} />
              </div>
            ))}
          </div>
        </>
      )}

      {mapsPicked.length > 0 && (
        <>
          {heading(t("spec.mapsPicked"), OWNER[seat])}
          <div className={`mt-3 flex flex-wrap gap-3 ${right ? "justify-end" : ""}`}>
            {mapsPicked.map((m) => {
              const spent = playedMaps.has(m.id);
              return (
                <div key={m.id} className="relative" style={{ width: 118 }}>
                  <Thumb src={m.imageUrl} alt={m.name}
                    className={`h-[74px] w-[118px] rounded-md object-cover ${spent ? "grayscale opacity-40" : ""}`} />
                  <span className="pointer-events-none absolute inset-0 rounded-md"
                    style={{ border: spent ? "2px solid rgba(58,51,38,.9)" : `2px solid ${OWNER[seat]}` }} />
                  <MapName name={m.name} />
                  {spent && <span className="absolute right-1 top-0.5 font-sans text-[12px] font-semibold text-muted">{t("spec.used")}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {mapBans.length > 0 && (
        <>
          {heading(t("spec.mapsBanned"), "var(--muted)")}
          <div className={`mt-3 flex flex-wrap gap-3 ${right ? "justify-end" : ""}`}>
            {mapBans.map((m) => (
              <div key={m.id} className="relative" style={{ width: 118 }}>
                <Thumb src={m.imageUrl} alt={m.name} className="h-[74px] w-[118px] rounded-md border border-[rgba(154,145,125,.45)] bg-surface-2 object-cover grayscale" />
                <span className="ovl-slash-lg absolute left-0 right-0 top-[44%] h-1" style={{ background: "var(--danger)" }} />
                <MapName name={m.name} dim />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Seconds left on the current step, on the server's clock rather than this one's. */
function Countdown({ deadlineTs, clockOffset }: { deadlineTs: number | null; clockOffset: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadlineTs) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadlineTs]);
  // Fixed width, because Cinzel has no tabular figures and a 1 is narrower than
  // a 4 — without it the heading and the map beside the clock shuffle sideways on
  // every tick, which on a stream reads as the page glitching.
  const box = "inline-block shrink-0 text-center font-display text-[60px] font-bold leading-none";
  if (!deadlineTs) return <span className={`${box} text-muted`} style={{ width: 168 }}>—</span>;
  const remain = Math.max(0, Math.ceil((deadlineTs - (now + clockOffset)) / 1000));
  const urgent = remain <= 10;
  return (
    <span
      className={`${box} ${urgent ? "ovl-pulse" : ""}`}
      style={{ width: 168, color: urgent ? undefined : "var(--gold-bright)" }}
    >
      {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, "0")}
    </span>
  );
}

export type { DerivedState };
