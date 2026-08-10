"use client";

import { useEffect, useMemo, useState } from "react";
import { Thumb } from "@/components/Thumb";
import { useI18n } from "@/lib/i18n";
import type { DerivedState, PoolView } from "@/lib/draft/engine";
import { CivDuelPanel, LockRow } from "./CivDuel";
import { useChangeStamp } from "../useChangeStamp";
import { StrikeBar, TileBadge } from "../TileMark";
import { OWNER, OWNER_RGB, other, seatNames, type Seat, type SpectatorPayload } from "./types";

/** Steps either side of the current one to keep on screen. */
const STEP_WINDOW = 3;

/** How long a banned map stays to be watched leaving. */
const LINGER_MS = 900;

/**
 * The ids that have just gone, for as long as it takes to see them go.
 *
 * Dropping a tile on the same frame it is banned swallows the only event
 * feedback this screen has — the flinch and the red line — and a viewer would
 * see a grid quietly get shorter with no idea where. So a departing tile is held
 * for a beat first.
 *
 * Departures are worked out during render rather than in an effect: an effect
 * runs a frame after the state that caused it, and that frame is the one the
 * animation starts on.
 */
function useDeparting(present: string[], ms = LINGER_MS): Set<string> {
  const key = present.join(",");
  const [held, setHeld] = useState<{ key: string; ids: string[] }>({ key, ids: [] });
  if (held.key !== key) {
    const now = new Set(present);
    const gone = held.key ? held.key.split(",").filter((id) => id && !now.has(id)) : [];
    setHeld({ key, ids: gone.length ? [...new Set([...held.ids, ...gone])] : held.ids });
  }
  useEffect(() => {
    if (held.ids.length === 0) return;
    // Inside a timeout, so this is not a synchronous set during the effect.
    const timer = setTimeout(() => setHeld((h) => (h.ids.length ? { ...h, ids: [] } : h)), ms);
    return () => clearTimeout(timer);
  }, [held.ids, ms]);
  return useMemo(() => new Set(held.ids), [held.ids]);
}

/**
 * Which slots of a row the step in progress is about to fill.
 *
 * Counted off the step list rather than off what has happened, because steps
 * finish in order. Returns null when the current step fills none of this row.
 */
function activeSlots(state: DerivedState, type: string, seat: Seat): { from: number; to: number } | null {
  let before = 0;
  for (let i = 0; i < state.stepBar.length; i++) {
    const s = state.stepBar[i];
    if (s.type !== type || (s.actor !== null && s.actor !== seat)) continue;
    if (i === state.currentStepIndex) return { from: before, to: before + s.count };
    if (i > state.currentStepIndex) break;
    before += s.count;
  }
  return null;
}

/**
 * How many entries of one kind a seat will be asked for across the whole draft.
 *
 * This is what lets the columns stand their empty slots up from the first
 * second, so a viewer joining a draft in progress can see how much of it is
 * still to come. A simultaneous step has no actor because both sides are the
 * actor, so it counts towards each of them.
 */
function reserved(state: DerivedState, type: string, seat: Seat): number {
  return state.stepBar
    .filter((s) => s.type === type && (s.actor === null || s.actor === seat))
    .reduce((n, s) => n + s.count, 0);
}

// The canvas is a fixed 1920x1080, so every band's height is a share of a budget
// rather than something that can grow. Named here because they have to add up.
const HEADER_H = 128;
const STEPBAR_H = 60;
// Tall enough to leave air under the map's name. The two player columns hang off
// the bottom of this band and a 1080-tall canvas has no more room to give them,
// so the step bar gives some of its own back.
const HERO_H = 196;
const CONTENT_TOP = HEADER_H + STEPBAR_H + HERO_H; // 368

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

  // Two different things were being called "banned", and treating them as one
  // was wrong in both directions.
  //
  // A POOL ban takes the civ off the table for everybody. An OPPONENT ban only
  // closes it to the other side — whoever cast it can still field it themselves
  // (`lib/draft/engine.ts` only sets the civ's state for `scope === "pool"`).
  // Lumping them together drew a live civ as dead stock and, once the middle
  // started dropping what had left, took a civ out of the pool that one of the
  // two players could still pick.
  const banned = new Set(state.civs.filter((c) => c.state === "banned").map((c) => c.id));
  // A set per civ, not one seat: both players can ban the same civ against each
  // other, and then it is closed to both. A single-value map recorded only
  // whichever ban was replayed last.
  const closedTo = new Map<string, Set<Seat>>();
  for (const b of state.civBans) {
    if (b.scope !== "opponent" || (b.by !== "player1" && b.by !== "player2")) continue;
    const seat = other(b.by);
    const set = closedTo.get(b.id) ?? new Set<Seat>();
    set.add(seat);
    closedTo.set(b.id, set);
  }
  // Whose options the middle is describing right now. An opponent-scoped ban is
  // only true of one player, so marking it while the OTHER one is choosing says
  // the wrong thing: they can take that civ, and the board is telling the room
  // they can't. Nobody in particular is choosing on a simultaneous step or a
  // random draw, so there the mark stands for whoever it applies to.
  const chooser: Seat | null = state.simultaneous
    ? null
    : state.turn === "player1" || state.turn === "player2" ? state.turn : null;
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
    // Off the FULL pool, not the shrinking one: a grid that re-flowed every time
    // a civ left would move every remaining tile out from under the eye.
    : (entries.length <= 12 ? 6 : entries.length <= 24 ? 8 : 10);
  // A map banned during the map draft is banned for everyone, and the pool is the
  // only place that says so before the columns fill up.
  const outOfPool = mapStep
    ? new Set(state.maps.filter((m) => m.state === "banned").map((m) => m.id))
    : banned;

  // A CIV stays wherever it was. A claimed one is marked — the owner's tick, or
  // the ban's line — rather than removed: the grid is the one place on this
  // canvas where a civ keeps its position for the whole draft, and a viewer
  // hunting for one should find it where they last saw it. It also matters that
  // an opponent-scoped ban leaves the civ live for the player who cast it.
  //
  // A banned MAP is different in both respects: a map ban is global, so nobody
  // is playing it again, and it is already recorded in the column of whoever
  // struck it. It leaves — after a beat, so the strike can be read on the way
  // out rather than the grid just getting shorter.
  const alive = mapStep ? entries.filter((m) => m.state !== "banned").map((m) => m.id) : [];
  const leaving = useDeparting(alive);
  const shown = mapStep
    ? entries.filter((m) => m.state !== "banned" || leaving.has(m.id))
    : entries;

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
                // Written out side by side. `border` and `borderLeft` together
                // are a shorthand and a longhand for the same property, and
                // React re-applies them in whatever order the object happens to
                // enumerate — so the left edge could win or lose between renders.
                borderTop: now ? "1px solid var(--gold)" : "1px solid rgba(58,51,38,.9)",
                borderRight: now ? "1px solid var(--gold)" : "1px solid rgba(58,51,38,.9)",
                borderBottom: now ? "1px solid var(--gold)" : "1px solid rgba(58,51,38,.9)",
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
        <Countdown deadlineTs={payload.status === "paused" ? null : payload.deadlineTs} limitSec={payload.limitSec} clockOffset={clockOffset} />
      </div>

      {/* ---- Player columns ---- */}
      {(["player1", "player2"] as Seat[]).map((seat) => (
        <PlayerColumn
          slots={{
            hand: reserved(state, "CIV_PICK", seat),
            civBans: reserved(state, "CIV_BAN", seat),
            mapsPicked: reserved(state, "MAP_PICK", seat),
            mapBans: reserved(state, "MAP_BAN", seat),
          }}
          active={{
            hand: activeSlots(state, "CIV_PICK", seat),
            civBans: activeSlots(state, "CIV_BAN", seat),
            mapsPicked: activeSlots(state, "MAP_PICK", seat),
            mapBans: activeSlots(state, "MAP_BAN", seat),
          }}
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
          mapBans={(seat === "player1" ? state.mapBansByP1 : state.mapBansByP2).map((id) => mapById.get(id)).filter(Boolean) as PoolView[]}
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
          /* No legend under this grid any more. It was four colour swatches
             explaining what the tiles now say on themselves — a whole row of a
             fixed canvas spent on a key nobody watching a stream has time to
             cross-reference. */
          <div className="grid gap-3.5" style={{ gridTemplateColumns: `repeat(${poolCols}, minmax(0, 1fr))` }}>
            {shown.map((c) => (
              <PoolCell key={c.id} entry={c} isMap={mapStep} leaving={leaving.has(c.id)}
                closed={!mapStep && (chooser ? Boolean(closedTo.get(c.id)?.has(chooser)) : Boolean(closedTo.get(c.id)?.size))}
                out={!(c.state === "drafted" || c.state === "picked") && outOfPool.has(c.id)} />
            ))}
          </div>
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
      {/* On the picture, like every other map on this board — and the plate
          grows with the tile, so the biggest map gets the deepest one. The name
          used to sit underneath in a row of its own, which is the height the
          picture could have had. */}
      <div className="relative overflow-hidden rounded-[10px]" style={{ width: 208, height: 130, border: "3px solid var(--gold)" }}>
        <Thumb src={map.imageUrl} alt={map.name} className="h-full w-full object-cover" />
        <MapName name={map.name} size={18} />
      </div>
    </div>
  );
}

/**
 * One entry in the pool, and the moment it stops being available.
 *
 * The strike used to be the only thing that moved, and it moved on mount too — so
 * a stream joining a half-finished draft replayed every ban it had missed, all at
 * once. Now the tile flinches or takes the claim as it happens, throws a ring in
 * the colour of what happened, and does nothing at all for history.
 */
function PoolCell({ entry, isMap, out, closed, leaving }: {
  entry: PoolView; isMap: boolean; out: boolean;
  /** On its way off the board, and this is the beat it gets to be seen going. */
  leaving?: boolean;
  /** Closed to whoever is choosing right now. The civ is still live for the
      other player, which is why it is marked rather than struck. */
  closed?: boolean;
}) {
  const owner: Seat | null =
    (entry.state === "drafted" || entry.state === "picked") && (entry.by === "player1" || entry.by === "player2") ? entry.by : null;
  const stamp = useChangeStamp(`${entry.state}:${entry.by ?? ""}:${out ? "x" : ""}:${closed ? "c" : ""}`);
  const fresh = stamp > 0 && (out || Boolean(owner));
  const ringColour = out ? "var(--danger)" : owner ? OWNER[owner] : "var(--gold)";
  return (
    <div
      className={`relative overflow-hidden rounded-[10px] ${fresh ? (out ? "tile-strike" : "tile-take") : ""} ${leaving ? "tile-leave" : ""}`}
      style={{
        border: owner ? `2px solid ${OWNER[owner]}` : out ? "2px solid rgba(154,145,125,.45)" : "2px solid rgba(138,106,50,.85)",
        background: owner ? `rgba(${OWNER_RGB[owner]},.12)` : "var(--surface-2)",
      }}
    >
      {/* Contained, not cropped, and 16:10 for both kinds. A square civ cell spent
          a third of its height on the background either side of a flag, and this
          canvas has none to spare. The fade for a struck tile lives on the
          artwork, never on this box — everything that says WHAT HAPPENED is a
          child of it, and a parent at a third alpha takes the marks down with it. */}
      <Thumb src={entry.imageUrl} alt={entry.name}
        className={`block w-full aspect-[16/10] ${isMap ? "object-cover" : "object-contain"} ${out ? "opacity-30 grayscale" : ""}`} />
      <MapName name={entry.name} dim={out} size={isMap ? 15 : 13} tone={owner ? OWNER[owner] : undefined} />
      {owner && <TileBadge mark="check" size={24} label={entry.name} style={{ color: OWNER[owner] }} />}
      {/* Closed to one side only: the same glyph a full ban wears, deliberately,
          because both are "you can't have this". The difference is the line —
          struck means it is out of the draft, unstruck means the other player
          can still field it. */}
      {!out && closed && <TileBadge mark="ban" size={24} label={entry.name} className="text-danger" />}
      {out && <StrikeBar animate={stamp > 0} />}
      {fresh && (
        <span key={stamp} aria-hidden className="tile-ring pointer-events-none absolute inset-0 rounded-[10px]"
          style={{ boxShadow: `0 0 0 3px ${ringColour}, 0 0 20px 3px ${ringColour}` }} />
      )}
    </div>
  );
}

/** A name, laid over the bottom of its own picture — the column has no height to
 *  spare for a caption underneath, and an unnamed tile is a texture.
 *
 *  Held inside the frame rather than flush to the edge: the frame is what says
 *  whose tile this is, and a label sitting on top of it cuts the bottom out of
 *  the one border on the tile that carries meaning. */
function MapName({ name, dim, tone, size = 13 }: { name: string; dim?: boolean; tone?: string; size?: number }) {
  return (
    <span
      className="absolute bottom-[2px] left-[2px] right-[2px] truncate rounded-b-[5px] px-1 text-center font-sans font-semibold"
      style={{
        background: "rgba(15,17,21,.42)",
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
        fontSize: size,
        // Deeper than the text needs. This is a broadcast canvas read from across
        // a room, and a plate cropped tight to the glyphs reads as a smudge on
        // top of the picture rather than as a label under it.
        lineHeight: `${Math.round(size * 1.85)}px`,
        color: tone ?? "var(--gold-bright)",
        opacity: dim ? 0.7 : 1,
      }}
    >
      {name}
    </span>
  );
}

/**
 * A slot nobody has filled yet.
 *
 * The board draws every slot the format reserves from the first second, so how
 * far a draft has to run is legible before anything has happened — which is what
 * a viewer joining mid-stream needs and a caption cannot give them. The wash says
 * which kind of act lands here; there is no gold and no pulse, because nobody
 * watching this screen is being asked to click.
 */
function EmptySlot({ w, h, intent, active }: {
  w: number; h: number; intent: "pick" | "ban";
  /** The step in progress is about to fill this one. Nobody watching clicks
      anything, but "where does the next one land" is the question a caster is
      answering out loud, and the board can answer it a beat first. */
  active?: boolean;
}) {
  const ban = intent === "ban";
  return (
    <div
      className={`relative shrink-0 rounded-[8px] border-2 ${ban ? "border-dotted" : "border-dashed"} ${
        active ? (ban ? "slot-wait-ban" : "slot-wait-pick") : ""
      }`}
      style={{
        width: w,
        height: h,
        borderColor: "rgba(138,106,50,.5)",
        background: ban ? "rgba(181,72,47,.13)" : "color-mix(in srgb, var(--pick) 13%, transparent)",
      }}
      aria-hidden
    >
      {ban && (
        <span className="absolute left-1/2 top-1/2 h-[3px] -translate-x-1/2 -translate-y-1/2 rounded"
          style={{ width: Math.round(w * 0.6), background: "rgba(154,145,125,.3)" }} />
      )}
    </div>
  );
}

/** A player's own side of the draft: what they hold, and what they struck out. */
function PlayerColumn({
  seat, name, compact, width, inset, hand, used, civBans, mapsPicked, playedMaps, mapBans, slots, active, picking, t,
}: {
  seat: Seat;
  name: string;
  /** What the format still owes this seat, per kind. */
  slots: { hand: number; civBans: number; mapsPicked: number; mapBans: number };
  /** Which of those the step in progress is filling, so the room can see where
      the next thing lands before it lands. */
  active: Record<"hand" | "civBans" | "mapsPicked" | "mapBans", { from: number; to: number } | null>;
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
                className={`aspect-[16/10] w-full rounded bg-surface-2 object-contain ${used.has(c.id) ? "grayscale opacity-30" : ""}`} />
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

      {(hand.length > 0 || slots.hand > 0) && (
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
                // Mount-time pop is right here: a tile in this grid is new because
                // the civ is new, and a column that fills itself in on join reads
                // as the board dealing the hand rather than as a glitch.
                <div key={c.id} className="ovl-pop relative">
                  <Thumb src={c.imageUrl} alt={c.name}
                    className={`aspect-[16/10] w-full rounded-lg bg-surface-2 object-contain ${spent ? "grayscale opacity-35" : ""}`}
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
            {Array.from({ length: Math.max(0, slots.hand - hand.length) }, (_, i) => {
              const n = hand.length + i;
              const on = Boolean(active.hand) && n >= active.hand!.from && n < active.hand!.to;
              return (
                <div key={`e${i}`}
                  className={`aspect-[16/10] w-full rounded-lg border-2 border-dashed ${on ? "slot-wait-pick" : ""}`}
                  style={{ borderColor: "rgba(138,106,50,.5)", background: "color-mix(in srgb, var(--pick) 13%, transparent)" }} />
              );
            })}
          </div>
        </>
      )}

      {(civBans.length > 0 || slots.civBans > 0) && (
        <>
          {heading(t("spec.civsBanned"), "var(--danger)")}
          <div className={`mt-3 flex flex-wrap gap-3 ${right ? "justify-end" : ""}`}>
            {civBans.map((c) => (
              <div key={c.id} className="relative overflow-hidden rounded" style={{ width: 110 }}>
                <Thumb src={c.imageUrl} alt={c.name}
                  className="aspect-[16/10] w-full rounded border border-[rgba(154,145,125,.45)] bg-surface-2 object-contain opacity-45 grayscale" />
                <MapName name={c.name} dim size={11} />
                <StrikeBar />
                <TileBadge mark="ban" size={20} label={c.name} className="text-danger" />
              </div>
            ))}
            {Array.from({ length: Math.max(0, slots.civBans - civBans.length) }, (_, i) => (
              <EmptySlot key={`e${i}`} w={110} h={69} intent="ban"
                active={Boolean(active.civBans) && civBans.length + i >= active.civBans!.from && civBans.length + i < active.civBans!.to} />
            ))}
          </div>
        </>
      )}

      {(mapsPicked.length > 0 || slots.mapsPicked > 0) && (
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
                  <MapName name={m.name} size={15} />
                  {spent && <span className="absolute right-1 top-0.5 font-sans text-[12px] font-semibold text-muted">{t("spec.used")}</span>}
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, slots.mapsPicked - mapsPicked.length) }, (_, i) => (
              <EmptySlot key={`e${i}`} w={118} h={74} intent="pick"
                active={Boolean(active.mapsPicked) && mapsPicked.length + i >= active.mapsPicked!.from && mapsPicked.length + i < active.mapsPicked!.to} />
            ))}
          </div>
        </>
      )}

      {(mapBans.length > 0 || slots.mapBans > 0) && (
        <>
          {heading(t("spec.mapsBanned"), "var(--muted)")}
          <div className={`mt-3 flex flex-wrap gap-3 ${right ? "justify-end" : ""}`}>
            {mapBans.map((m) => (
              <div key={m.id} className="relative overflow-hidden rounded-md" style={{ width: 118 }}>
                <Thumb src={m.imageUrl} alt={m.name}
                  className="h-[74px] w-[118px] rounded-md border border-[rgba(154,145,125,.45)] bg-surface-2 object-cover opacity-45 grayscale" />
                <MapName name={m.name} dim size={15} />
                <StrikeBar />
                <TileBadge mark="ban" size={20} label={m.name} className="text-danger" />
              </div>
            ))}
            {Array.from({ length: Math.max(0, slots.mapBans - mapBans.length) }, (_, i) => (
              <EmptySlot key={`e${i}`} w={118} h={74} intent="ban"
                active={Boolean(active.mapBans) && mapBans.length + i >= active.mapBans!.from && mapBans.length + i < active.mapBans!.to} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Seconds left on the current step, on the server's clock rather than this one's. */
function Countdown({ deadlineTs, limitSec, clockOffset }: { deadlineTs: number | null; limitSec?: number | null; clockOffset: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadlineTs) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadlineTs]);
  // Fixed width, because Cinzel has no tabular figures and a 1 is narrower than
  // a 4 — without it the heading and the map beside the clock shuffle sideways on
  // every tick, which on a stream reads as the page glitching. Narrower now that
  // it is a plain number.
  const box = "inline-block shrink-0 text-center font-display text-[60px] font-bold leading-none";
  if (!deadlineTs) return <span className={`${box} text-muted`} style={{ width: 108 }}>—</span>;
  // Never more than the step was given: the offset is measured a round trip
  // before it is used, so rounding up can land a second past the limit.
  const raw = Math.ceil((deadlineTs - (now + clockOffset)) / 1000);
  const remain = Math.max(0, limitSec && limitSec > 0 ? Math.min(raw, limitSec) : raw);
  const urgent = remain <= 10;
  return (
    <span
      className={`${box} ${urgent ? "ovl-pulse" : ""}`}
      style={{ width: 108, color: urgent ? undefined : "var(--gold-bright)" }}
    >
      {/* Seconds, not m:ss. No step in any format runs to a minute, so the
          leading "0:" was a zero that never changed sitting in 60px type. */}
      {remain}
    </span>
  );
}

export type { DerivedState };
