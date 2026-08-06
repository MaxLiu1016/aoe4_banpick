"use client";

import { useEffect, useState } from "react";
import { Thumb } from "@/components/Thumb";
import { useI18n } from "@/lib/i18n";
import type { DerivedState, PoolView } from "@/lib/draft/engine";
import { OWNER, OWNER_RGB, seatNames, type Seat, type SpectatorPayload } from "./types";

/** Steps either side of the current one to keep on screen. */
const STEP_WINDOW = 3;

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

  const currentMap = state.games[state.currentGameIndex]?.map;
  const step = state.currentStep;
  const stepName = step ? t(`step.${step.type}`) : "";
  const heading =
    state.turn === "host"
      ? t("turn.randomDraw")
      : state.simultaneous || !state.turn
      ? t("spec.bothTurn", { step: stepName })
      : t("spec.turnOf", { name: names[state.turn as Seat], step: stepName });

  // Six across reads best, but a full 23-civ pool at that width runs off the
  // bottom of the canvas. Widen the grid instead of shrinking the whole board.
  const poolCols = state.civs.length <= 12 ? 6 : state.civs.length <= 24 ? 8 : 10;

  const from = Math.max(0, Math.min(state.currentStepIndex - STEP_WINDOW, state.stepBar.length - STEP_WINDOW * 2 - 1));
  const steps = state.stepBar.slice(from, from + STEP_WINDOW * 2 + 1);

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(1300px 640px at 50% -12%, rgba(216,178,74,.12), transparent 62%), var(--background)" }}
    >
      {/* ---- Header ---- */}
      <div
        className="absolute left-0 right-0 top-0 grid h-[118px] grid-cols-[1fr_auto_1fr] items-center px-12"
        style={{
          borderBottom: "2px solid rgba(138,106,50,.6)",
          background: "linear-gradient(180deg, rgba(32,36,45,.9), rgba(15,17,21,.9))",
        }}
      >
        <div className="min-w-0">
          <div className="truncate font-display text-[22px] font-semibold leading-tight text-foreground">{roomName}</div>
          <div className="mt-1 font-sans text-[15px] font-semibold tracking-[.18em] text-muted">
            {t("spec.format", { n: state.bestOf, g: state.currentGameIndex + 1 })}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[26px]">
          <div className="text-right font-display text-[38px] font-bold leading-none" style={{ color: OWNER.player1 }}>
            {names.player1}
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[50px] font-bold leading-none" style={{ color: OWNER.player1 }}>{state.score.player1}</span>
            <span className="font-display text-[30px] font-bold leading-none text-bronze">—</span>
            <span className="font-display text-[50px] font-bold leading-none" style={{ color: OWNER.player2 }}>{state.score.player2}</span>
          </div>
          <div className="text-left font-display text-[38px] font-bold leading-none" style={{ color: OWNER.player2 }}>
            {names.player2}
          </div>
        </div>
        <div className="flex items-center justify-end gap-[18px]">
          {payload.status === "paused" ? (
            <span className="font-display text-[40px] font-bold leading-none text-danger">{t("spec.paused")}</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-[9px] font-sans text-[16px] font-semibold tracking-[.18em] text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--urgent)" }} />
                {t("spec.live")}
              </span>
              <Countdown deadlineTs={payload.deadlineTs} clockOffset={clockOffset} />
            </>
          )}
        </div>
      </div>

      {/* ---- Step bar ---- */}
      <div
        className="absolute left-0 right-0 top-[118px] flex h-[74px] items-center justify-center gap-2.5 px-12"
        style={{ borderBottom: "1px solid rgba(58,51,38,.8)" }}
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

      {/* ---- Player columns ---- */}
      {(["player1", "player2"] as Seat[]).map((seat) => (
        <PlayerColumn
          key={seat}
          seat={seat}
          name={names[seat]}
          hand={(seat === "player1" ? state.draftedByP1 : state.draftedByP2).map((id) => civById.get(id)).filter(Boolean) as PoolView[]}
          used={usedBy(seat)}
          civBans={state.civBans.filter((b) => b.by === seat).map((b) => civById.get(b.id)).filter(Boolean) as PoolView[]}
          mapBans={state.maps.filter((m) => m.state === "banned" && m.by === seat)}
          picking={state.awaiting[seat]}
          t={t}
        />
      ))}

      {/* ---- The pool ---- */}
      <div className="absolute left-[436px] right-[436px] top-[232px]">
        <div className="text-center">
          <div className="truncate font-display text-[40px] font-bold leading-tight text-gold-bright">{heading}</div>
          <div className="mt-1.5 font-sans text-[16px] font-semibold tracking-[.2em] text-muted">
            {t("spec.gameMap", {
              n: state.currentGameIndex + 1,
              map: (currentMap ? mapById.get(currentMap)?.name ?? "—" : "—").toUpperCase(),
            })}
          </div>
        </div>
        <div className="mt-6 grid gap-3.5" style={{ gridTemplateColumns: `repeat(${poolCols}, minmax(0, 1fr))` }}>
          {state.civs.map((c) => {
            const owner: Seat | null = c.state === "drafted" && (c.by === "player1" || c.by === "player2") ? c.by : null;
            const out = !owner && banned.has(c.id);
            return (
              <div
                key={c.id}
                className="relative rounded-[10px] p-2"
                style={{
                  border: owner ? `2px solid ${OWNER[owner]}` : out ? "2px solid rgba(58,51,38,.9)" : "2px solid rgba(138,106,50,.85)",
                  background: owner ? `rgba(${OWNER_RGB[owner]},.12)` : "var(--surface-2)",
                  opacity: out ? 0.32 : 1,
                }}
              >
                <Thumb src={c.imageUrl} alt={c.name} className={`block aspect-square w-full object-contain ${out ? "grayscale" : ""}`} />
                <div
                  className="mt-1 truncate text-center font-sans text-[14px] font-semibold leading-tight"
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
        <div className="mt-[22px] flex items-center justify-center gap-[26px] font-sans text-[15px] font-semibold text-muted">
          <Legend swatch={{ border: "2px solid var(--bronze)" }} label={t("spec.legendPool")} />
          <Legend swatch={{ background: "var(--danger)" }} label={t("spec.legendBanned")} />
          <Legend swatch={{ border: `2px solid ${OWNER.player1}` }} label={t("spec.legendHeld", { name: names.player1 })} />
          <Legend swatch={{ border: `2px solid ${OWNER.player2}` }} label={t("spec.legendHeld", { name: names.player2 })} />
        </div>
      </div>

      {/* ---- Games so far ---- */}
      <div
        className="absolute bottom-[34px] left-12 right-12 flex items-center justify-center gap-[34px] pt-[22px]"
        style={{ borderTop: "2px solid rgba(138,106,50,.5)" }}
      >
        {state.games.map((g) => {
          const live = g.gameIndex === state.currentGameIndex && !g.winner;
          const m = g.map ? mapById.get(g.map) : undefined;
          if (!g.winner && !live) return null;
          const tag = `G${g.gameIndex + 1} ${(m?.name ?? "—").toUpperCase()}`;
          if (live) {
            return (
              <div key={g.gameIndex} className="flex items-center gap-3 rounded-[10px] px-[18px] py-2.5"
                style={{ border: "1px solid var(--gold)", background: "rgba(216,178,74,.1)" }}>
                <span className="font-sans text-[15px] font-semibold tracking-[.14em] text-gold-bright">
                  {tag} · {t("spec.drafting")}
                </span>
              </div>
            );
          }
          return (
            <div key={g.gameIndex} className="flex items-center gap-3 rounded-[10px] px-[18px] py-2.5"
              style={{ border: "1px solid rgba(58,51,38,.9)" }}>
              <span className="font-sans text-[15px] font-semibold tracking-[.14em] text-muted">{tag}</span>
              <GameCiv id={g.civP1} civById={civById} won={g.winner === "player1"} />
              <span className="font-sans text-[14px] text-muted">vs</span>
              <GameCiv id={g.civP2} civById={civById} won={g.winner === "player2"} flip />
            </div>
          );
        })}
      </div>
    </div>
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

function GameCiv({ id, civById, won, flip }: { id?: string; civById: Map<string, PoolView>; won: boolean; flip?: boolean }) {
  const c = id ? civById.get(id) : undefined;
  const img = (
    <Thumb src={c?.imageUrl} alt={c?.name ?? ""} className={`h-11 w-11 object-contain ${won ? "" : "opacity-50 grayscale"}`} />
  );
  const crown = won ? <span className="font-display text-[17px] font-bold leading-none text-gold-bright">👑</span> : null;
  return <span className="flex items-center gap-2">{flip ? <>{img}{crown}</> : <>{img}{crown}</>}</span>;
}

/** A player's own side of the draft: what they hold, and what they struck out. */
function PlayerColumn({
  seat, name, hand, used, civBans, mapBans, picking, t,
}: {
  seat: Seat;
  name: string;
  hand: PoolView[];
  used: Set<string>;
  civBans: PoolView[];
  mapBans: PoolView[];
  picking: boolean;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const right = seat === "player2";
  const remaining = hand.filter((c) => !used.has(c.id)).length;
  const heading = (label: string, colour: string) => (
    <div className="mt-6 font-sans text-[15px] font-semibold tracking-[.18em]" style={{ color: colour }}>{label}</div>
  );
  return (
    <div className={`absolute top-[232px] w-[352px] ${right ? "right-12 text-right" : "left-12"}`}>
      <div className={`flex items-center gap-3 pb-3 ${right ? "justify-end" : ""}`} style={{ borderBottom: `3px solid ${OWNER[seat]}` }}>
        {right && <span className="font-sans text-[15px] font-semibold tracking-[.14em] text-muted">P2</span>}
        <span className="truncate font-display text-[34px] font-bold leading-none" style={{ color: OWNER[seat] }}>{name}</span>
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
                    className={`aspect-square w-full rounded-lg object-contain ${spent ? "grayscale opacity-35" : ""}`}
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
              <div key={c.id} className="relative h-[70px] w-[70px]">
                <Thumb src={c.imageUrl} alt={c.name} className="h-[70px] w-[70px] object-contain grayscale brightness-[.55]" />
                <span className="ovl-slash absolute left-0 right-0 top-1/2 h-1" style={{ background: "var(--danger)" }} />
              </div>
            ))}
          </div>
        </>
      )}

      {mapBans.length > 0 && (
        <>
          {heading(t("spec.mapsBanned"), "var(--muted)")}
          <div className={`mt-3 flex flex-wrap gap-3 ${right ? "justify-end" : ""}`}>
            {mapBans.map((m) => (
              <div key={m.id} className="relative w-[112px]">
                <Thumb src={m.imageUrl} alt={m.name} className="h-[70px] w-[112px] rounded-md object-cover grayscale brightness-50" />
                <span className="ovl-slash-lg absolute left-0 right-0 top-[44%] h-1" style={{ background: "var(--danger)" }} />
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
  if (!deadlineTs) return <span className="font-display text-[40px] font-bold leading-none text-muted">—</span>;
  const remain = Math.max(0, Math.ceil((deadlineTs - (now + clockOffset)) / 1000));
  const urgent = remain <= 10;
  return (
    <span
      className={`font-display text-[40px] font-bold leading-none tabular-nums ${urgent ? "ovl-pulse" : ""}`}
      style={{ color: urgent ? undefined : "var(--gold-bright)" }}
    >
      {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, "0")}
    </span>
  );
}

export type { DerivedState };
