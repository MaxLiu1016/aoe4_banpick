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
  /** Each side's drafted hand — the roster, plainly. */
  const pool = (seat: Seat) =>
    (seat === "player1" ? state.draftedByP1 : state.draftedByP2).map((id) => civ.get(id)).filter(Boolean) as PoolView[];
  const seriesWinner: Seat | null =
    state.score.player1 === state.score.player2 ? null : state.score.player1 > state.score.player2 ? "player1" : "player2";

  // Beyond five games the design's four-across cards can't fit the canvas twice
  // over, so the row drops its full-bleed map shot and tightens up rather than
  // spilling off the bottom. Every game still gets a card.
  const cols = Math.min(Math.max(played.length, 1), 5);
  const compact = played.length > 5;

  // What the other side took off them, per game. Only past games carry this —
  // the engine leaves the live one blank so a spectator can't read a secret.
  const snipedFrom = (g: (typeof played)[number], seat: Seat) =>
    ((seat === "player1" ? g.snipedByP2 : g.snipedByP1) ?? []).map((id) => civ.get(id)).filter(Boolean) as PoolView[];

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
        {/* Upper-case here and nowhere else: this is the poster line of a page
            built to be screenshotted, and the wide tracking needs the caps. */}
        <span className="font-sans text-[19px] font-semibold uppercase tracking-[.34em] text-muted">{roomName}</span>
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
            const lost = snipedFrom(g, seat);
            return (
              <div className={`flex items-center gap-3 ${won ? "" : "opacity-45"}`}>
                <Thumb
                  src={entry?.imageUrl}
                  alt={entry?.name ?? ""}
                  className={`${compact ? "h-[50px] w-[50px]" : "h-[66px] w-[66px]"} shrink-0 object-contain ${won ? "" : "grayscale"}`}
                />
                {/* What they offered and never got to play, small, right beside what they
                    did. Half of a two-pool game happens here and the card used to
                    record only the survivor. */}
                {lost.length > 0 && (
                  <span className="flex shrink-0 gap-1.5">
                    {lost.map((c) => (
                      <span key={c.id} className="relative" title={c.name}>
                        <Thumb src={c.imageUrl} alt={c.name}
                          className={`${compact ? "h-[24px] w-[24px]" : "h-[30px] w-[30px]"} rounded object-contain grayscale opacity-70`} />
                        <span className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2" style={{ background: "var(--danger)" }} />
                      </span>
                    ))}
                  </span>
                )}
                <div className="min-w-0">
                  <div
                    className={`truncate font-display leading-tight ${
                      compact ? (won ? "text-[17px]" : "text-[16px]") : won ? "text-[21px]" : "text-[20px]"
                    } ${won ? "font-bold text-gold-bright" : "font-semibold text-muted"}`}
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
              style={{
                // The winner's colour, held back a little: on a page of eight of
                // them a full-strength border competes with the art inside it.
                border: `2px solid color-mix(in srgb, ${OWNER[winner]} 85%, transparent)`,
                background: "rgba(24,27,34,.85)",
              }}
            >
              {/* Contained, not cropped. The map art is a diamond with its own
                  name plate along the bottom, and a full-bleed cover shot cut
                  that plate in half on every card. */}
              {m && (
                <Thumb
                  src={m.imageUrl}
                  alt={m.name}
                  className={`block w-full object-contain ${compact ? "h-[110px]" : "h-[196px]"}`}
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
              {/* The name and the hand they built read as one line: the hand is
                  what the whole civ draft was for, and the summary knew everything
                  about the series except what either player was holding. What they
                  struck out is the line under it — an account of what they stopped,
                  not of what they had. */}
              <div className={`flex items-center gap-5 ${right ? "flex-row-reverse" : ""}`}>
                <div className="shrink-0 font-sans text-[16px] font-semibold tracking-[.18em]" style={{ color: OWNER[seat] }}>
                  {t("spec.draftOf", { name: names[seat] })}
                </div>
                <div className="min-w-0">
                  <div className={`flex flex-wrap gap-2 ${right ? "flex-row-reverse" : ""}`}>
                    {pool(seat).length === 0 && <span className="font-sans text-[16px] text-muted">—</span>}
                    {pool(seat).map((c) => (
                      <Thumb key={c.id} src={c.imageUrl} alt={c.name}
                        className="h-[46px] w-[46px] shrink-0 rounded object-contain" />
                    ))}
                  </div>
                </div>
              </div>

              <div className={`mt-4 flex items-end gap-[26px] ${right ? "flex-row-reverse" : ""}`}>
                <div>
                  <div className="mb-2 font-sans text-[14px] font-semibold tracking-[.14em] text-danger">{t("spec.banned")}</div>
                  <div className={`flex gap-2.5 ${right ? "flex-row-reverse" : ""}`}>
                    {b.civs.length === 0 && <span className="font-sans text-[16px] text-muted">—</span>}
                    {b.civs.map((c) => (
                      <Thumb key={c.id} src={c.imageUrl} alt={c.name}
                        className="h-[52px] w-[52px] rounded border border-[rgba(154,145,125,.45)] bg-surface-2 object-contain grayscale brightness-[.55]" />
                    ))}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="mb-2 font-sans text-[14px] font-semibold tracking-[.14em] text-muted">{t("spec.mapsBanned")}</div>
                  {/* Pictures, like everything else on this page. A run of map
                      names in a row of thumbnails was the one place the summary
                      asked you to read instead of look. */}
                  <div className={`flex flex-wrap gap-2.5 ${right ? "flex-row-reverse" : ""}`}>
                    {b.maps.length === 0 && <span className="font-sans text-[16px] text-muted">—</span>}
                    {b.maps.map((m) => (
                      <div key={m.id} className="relative shrink-0" style={{ width: 84, height: 52 }}>
                        <Thumb src={m.imageUrl} alt={m.name}
                          className="h-full w-full rounded border border-[rgba(154,145,125,.45)] bg-surface-2 object-cover grayscale" />
                        <span className="ovl-slash absolute left-0 right-0 top-[42%] h-[3px]" style={{ background: "var(--danger)" }} />
                        <span className="pointer-events-none absolute bottom-[1px] left-[1px] right-[1px] truncate rounded-b px-1 text-center font-sans text-[10px] font-semibold leading-[14px] text-gold-bright/70"
                          style={{ background: "rgba(15,17,21,.42)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}>
                          {m.name}
                        </span>
                      </div>
                    ))}
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
