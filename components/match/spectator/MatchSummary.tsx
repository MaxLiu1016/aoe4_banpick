"use client";

import { Thumb } from "@/components/Thumb";
import { useI18n } from "@/lib/i18n";
import type { PoolView } from "@/lib/draft/engine";
import { OWNER, seatNames, type Seat, type SpectatorPayload } from "./types";

/**
 * The picture at the end of a series: who won, what was played on each map, and
 * what each side struck out on the way there. Static and screenshot-shaped — no
 * animation, nothing that has to be caught at the right moment.
 */
export function MatchSummary({ payload, roomName }: { payload: SpectatorPayload; roomName: string }) {
  const { t } = useI18n();
  const { state } = payload;
  const names = seatNames(payload, { player1: t("match.p1"), player2: t("match.p2") });

  const byId = (pool: PoolView[]) => new Map(pool.map((e) => [e.id, e]));
  const civ = byId(state.civs);
  const map = byId(state.maps);

  const played = state.games.filter((g) => g.winner);
  const seriesWinner: Seat | null =
    state.score.player1 === state.score.player2 ? null : state.score.player1 > state.score.player2 ? "player1" : "player2";

  // Beyond five games the design's four-across cards can't fit the canvas twice
  // over, so the row drops its full-bleed map shot and tightens up rather than
  // spilling off the bottom. Every game still gets a card.
  const cols = Math.min(Math.max(played.length, 1), 5);
  const compact = played.length > 5;

  const bans = (seat: Seat) => ({
    civs: state.civBans.filter((b) => b.by === seat).map((b) => civ.get(b.id)).filter(Boolean) as PoolView[],
    maps: state.maps.filter((m) => m.state === "banned" && m.by === seat),
  });

  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(1200px 600px at 50% -10%, rgba(216,178,74,.15), transparent 62%), var(--background)" }}
    >
      {/* Title + final score */}
      <div className="absolute left-0 right-0 top-[46px] text-center">
        <span className="font-sans text-[19px] font-semibold tracking-[.34em] text-muted">{roomName}</span>
        <div className="mt-5 flex items-center justify-center gap-[34px]">
          <span className="font-display text-[60px] font-bold leading-none" style={{ color: OWNER.player1 }}>
            {names.player1}
            {seriesWinner === "player1" && <span className="ml-3 text-[34px]">👑</span>}
          </span>
          <span
            className="font-display text-[72px] font-bold leading-none text-gold-bright"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,.7)" }}
          >
            {state.score.player1} — {state.score.player2}
          </span>
          <span className="font-display text-[60px] font-bold leading-none" style={{ color: OWNER.player2 }}>
            {seriesWinner === "player2" && <span className="mr-3 text-[34px]">👑</span>}
            {names.player2}
          </span>
        </div>
      </div>

      {/* One card per game played */}
      <div
        className="absolute left-[70px] right-[70px] top-[262px] grid gap-6"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {played.map((g) => {
          const winner = g.winner as Seat;
          const m = g.map ? map.get(g.map) : undefined;
          const line = (seat: Seat) => {
            const c = seat === "player1" ? g.civP1 : g.civP2;
            const entry = c ? civ.get(c) : undefined;
            const won = winner === seat;
            return (
              <div className={`flex items-center gap-3 ${won ? "" : "opacity-45"}`}>
                <Thumb
                  src={entry?.imageUrl}
                  alt={entry?.name ?? ""}
                  className={`${compact ? "h-[50px] w-[50px]" : "h-[66px] w-[66px]"} shrink-0 object-contain ${won ? "" : "grayscale"}`}
                />
                <div className="min-w-0">
                  <div
                    className={`truncate font-display leading-tight ${compact ? "text-[17px]" : "text-[21px]"} ${
                      won ? "font-bold text-gold-bright" : "font-semibold text-muted"
                    }`}
                  >
                    {entry?.name ?? "—"}
                    {won && " 👑"}
                  </div>
                  <div
                    className="mt-[3px] truncate font-sans text-[14px] font-semibold"
                    style={{ color: won ? OWNER[seat] : "var(--muted)" }}
                  >
                    {names[seat]}
                  </div>
                </div>
              </div>
            );
          };
          return (
            <div
              key={g.gameIndex}
              className="overflow-hidden rounded-[14px]"
              style={{ border: `2px solid ${OWNER[winner]}`, background: "rgba(24,27,34,.85)" }}
            >
              {m && (
                <Thumb
                  src={m.imageUrl}
                  alt={m.name}
                  className={`block w-full object-cover ${compact ? "h-[110px]" : "h-[206px]"}`}
                />
              )}
              <div className={compact ? "p-3.5" : "p-[18px]"}>
                <div className="truncate font-sans text-[16px] font-semibold tracking-[.16em] text-muted">
                  {t("spec.gameMap", { n: g.gameIndex + 1, map: (m?.name ?? "—").toUpperCase() })}
                </div>
                <div className={compact ? "mt-2.5 space-y-2" : "mt-3.5 space-y-2.5"}>
                  {line("player1")}
                  {line("player2")}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* What each side struck out, for the whole series */}
      <div
        className="absolute bottom-[60px] left-[70px] right-[70px] grid grid-cols-2 gap-[60px] pt-[30px]"
        style={{ borderTop: "2px solid rgba(138,106,50,.55)" }}
      >
        {(["player1", "player2"] as Seat[]).map((seat) => {
          const b = bans(seat);
          const right = seat === "player2";
          return (
            <div key={seat} className={right ? "text-right" : ""}>
              <div className="font-sans text-[16px] font-semibold tracking-[.18em]" style={{ color: OWNER[seat] }}>
                {t("spec.draftOf", { name: names[seat] })}
              </div>
              <div className={`mt-3.5 flex items-start gap-[26px] ${right ? "flex-row-reverse" : ""}`}>
                <div>
                  <div className="mb-2 font-sans text-[14px] font-semibold tracking-[.14em] text-danger">{t("spec.banned")}</div>
                  <div className={`flex gap-2.5 ${right ? "flex-row-reverse" : ""}`}>
                    {b.civs.length === 0 && <span className="font-sans text-[16px] text-muted">—</span>}
                    {b.civs.map((c) => (
                      <Thumb key={c.id} src={c.imageUrl} alt={c.name}
                        className="h-[52px] w-[52px] object-contain grayscale brightness-[.55]" />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 font-sans text-[14px] font-semibold tracking-[.14em] text-muted">{t("spec.mapsBanned")}</div>
                  <div className="font-display text-[18px] font-semibold leading-[1.4] text-foreground">
                    {b.maps.map((m) => m.name).join(" · ") || "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
