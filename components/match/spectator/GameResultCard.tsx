"use client";

import { Thumb } from "@/components/Thumb";
import { useI18n } from "@/lib/i18n";
import type { PoolView } from "@/lib/draft/engine";
import { OWNER, other, seatNames, type Seat, type SpectatorPayload } from "./types";

/**
 * The beat between games: what each side fielded, on what map, and who took it.
 *
 * Covers both halves of that beat. While the result is still being called there is
 * no winner yet, so both civs stand level and the card asks the question instead of
 * answering it; once it is in, the winner is crowned and the loser desaturates.
 * Same layout either way — the picture doesn't jump when the answer arrives.
 */
export function GameResultCard({ payload }: { payload: SpectatorPayload }) {
  const { t } = useI18n();
  const { state } = payload;
  const names = seatNames(payload, { player1: t("match.p1"), player2: t("match.p2") });
  const civById = new Map(state.civs.map((c) => [c.id, c]));
  const mapById = new Map(state.maps.map((m) => [m.id, m]));

  // Once a result is committed the engine has already moved to the next game's
  // first step, so the game being celebrated is the one held by the ack gate.
  const idx = payload.awaitingAck ? payload.awaitingAck.gameIndex : state.currentGameIndex;
  const game = state.games[idx];
  if (!game) return null;
  const winner: Seat | null = (game.winner as Seat | undefined) ?? null;

  const map = game.map ? mapById.get(game.map) : undefined;
  const civOf = (seat: Seat) => civById.get((seat === "player1" ? game.civP1 : game.civP2) ?? "");

  // The headline. "Won game 3" is a fact; "took the lead" is the story, and the
  // score already knows which one this was.
  //
  // Nothing at all until there is a winner: the headline slot is for the result,
  // and filling it with "who took it?" is a caption asking the audience a question
  // they are already watching the answer to. It sits above everything else, so
  // appearing late moves nothing.
  const headline = !winner
    ? null
    : state.score[winner] > state.score[other(winner)]
    ? t("spec.tookLead", { name: names[winner] })
    : state.score[winner] === state.score[other(winner)]
    ? t("spec.levelled", { name: names[winner] })
    : t("spec.wonGame", { name: names[winner], n: idx + 1 });

  // Who opens the next game — the engine has already resolved LOSER/WINNER on the
  // step bar, so this is a lookup rather than a second guess at the rules.
  const nextIdx = idx + 1;
  const nextOpener = state.stepBar.find((s) => s.gameIndex === nextIdx && (s.actor === "player1" || s.actor === "player2"))?.actor as Seat | undefined;
  const nextMap = state.games[nextIdx]?.map;
  const showNext = !state.finished && nextIdx < state.games.length;

  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(105deg, rgba(56,189,248,.16) 0%, var(--background) 42%, var(--background) 58%, rgba(251,113,133,.16) 100%)",
      }}
    >
      <div className="absolute left-0 right-0 top-[58px] text-center">
        <div className="font-sans text-[19px] font-semibold tracking-[.4em] text-muted">
          {t("spec.gameOf", { n: idx + 1, total: state.bestOf, map: (map?.name ?? "—").toUpperCase() })}
        </div>
        {headline && <div className="mt-3.5 font-display text-[62px] font-bold leading-none text-gold-bright">{headline}</div>}
      </div>

      <div className="absolute left-0 right-0 top-[250px] grid grid-cols-[1fr_340px_1fr] items-center gap-6 px-[90px]">
        <Fighter seat="player1" name={names.player1} civ={civOf("player1")} winner={winner} t={t} />

        <div className="text-center">
          <div className="font-display text-[96px] font-bold leading-none text-gold" style={{ textShadow: "0 3px 14px rgba(0,0,0,.8)" }}>VS</div>
          {map && (
            <Thumb src={map.imageUrl} alt={map.name}
              className="mx-auto mt-[26px] h-[176px] w-[280px] rounded-xl border-[3px] border-bronze object-cover" />
          )}
          <div className="mt-3 font-display text-[30px] font-bold leading-tight text-foreground">{map?.name ?? "—"}</div>
          <div className="mt-[26px] flex items-baseline justify-center gap-4">
            <span className="font-display text-[72px] font-bold leading-none" style={{ color: OWNER.player1 }}>{state.score.player1}</span>
            <span className="font-display text-[40px] font-bold leading-none text-bronze">—</span>
            <span className="font-display text-[72px] font-bold leading-none" style={{ color: OWNER.player2 }}>{state.score.player2}</span>
          </div>
        </div>

        <Fighter seat="player2" name={names.player2} civ={civOf("player2")} winner={winner} t={t} />
      </div>

      <div className="absolute bottom-[52px] left-0 right-0 text-center font-sans text-[22px] font-semibold tracking-[.14em] text-muted">
        {!winner ? (
          // Says what is happening, not what happened — and no clock, because a
          // result step is never timed: the server will not call a game for you.
          t("result.voteWatch")
        ) : showNext ? (
          <>
            {t("spec.nextGame", { n: nextIdx + 1 })}
            {nextMap && ` · ${(mapById.get(nextMap)?.name ?? "").toUpperCase()}`}
            {nextOpener && <span className="text-gold-bright"> · {t("spec.picksFirst", { name: names[nextOpener] })}</span>}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** One side's civ for this game: crowned, beaten, or still waiting to find out. */
function Fighter({ seat, name, civ, winner, t }: {
  seat: Seat;
  name: string;
  civ?: PoolView;
  winner: Seat | null;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const won = winner === seat;
  const lost = winner !== null && !won;
  return (
    <div className="text-center">
      <div className="font-display text-[44px] font-bold leading-none" style={{ color: OWNER[seat] }}>{name}</div>
      <div className="relative mx-auto mt-[22px] h-[300px] w-[300px]">
        <div
          className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface-2 ${won ? "ovl-glow" : ""}`}
          style={{
            border: `6px solid ${won ? "var(--gold-bright)" : lost ? `color-mix(in srgb, ${OWNER[seat]} 55%, transparent)` : OWNER[seat]}`,
            filter: lost ? "saturate(.5) brightness(.75)" : undefined,
          }}
        >
          <Thumb src={civ?.imageUrl} alt={civ?.name ?? ""} className="h-[82%] w-[82%] object-contain" />
        </div>
        {won && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[66px] leading-none">👑</span>}
      </div>
      <div className={`mt-[22px] font-display text-[40px] font-bold leading-tight ${won ? "text-gold-bright" : "text-foreground"}`}>
        {civ?.name ?? "—"}
      </div>
      {winner && (
        <div className="mt-2 font-sans text-[19px] font-semibold tracking-[.16em] text-muted">
          {t(won ? "spec.winner" : "spec.defeated")}
        </div>
      )}
    </div>
  );
}
