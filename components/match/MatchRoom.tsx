"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Thumb } from "@/components/Thumb";
import { getSocket } from "@/lib/socket/client";
import { C2S, S2C } from "@/lib/socket/events";
import { useI18n } from "@/lib/i18n";
import { CIVS } from "@/data/civs";
import { DEFAULT_MAPS } from "@/data/maps";
import type { DerivedState, PoolView, SeatRole, CivDuel } from "@/lib/draft/engine";

// Resolve images from the CURRENT data by id, so even matches created before an
// asset update (frozen snapshot) still show up-to-date thumbnails.
const CIV_IMG = new Map(CIVS.map((c) => [c.id, c.imageUrl]));
const MAP_IMG = new Map(DEFAULT_MAPS.map((m) => [m.id, m.imageUrl]));

type Seat = { id: string; name?: string; ready?: boolean } | null;
interface Payload {
  matchId: string;
  status: string;
  publicHover: boolean;
  deadlineTs: number | null;
  seats: { host: string; player1: Seat; player2: Seat };
  votes: Record<number, { player1?: string; player2?: string }>;
  state: DerivedState;
  you?: SeatRole | "spectator";
  youAreHost?: boolean;
  // Set after a game is decided: the next game's clock is held until both players ack.
  awaitingAck?: { gameIndex: number; winner: "player1" | "player2"; by: { player1: boolean; player2: boolean } } | null;
}
type Hover = { role: string; pool: string; targetId: string | null };

export function MatchRoom({ matchId, spectator = false }: { matchId: string; spectator?: boolean }) {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oppHover, setOppHover] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const ticketRef = useRef<string | undefined>(undefined);

  const you = payload?.you ?? "spectator";
  const amHost = payload?.youAreHost ?? false;
  const state = payload?.state;

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/match/${matchId}`);
  }, [matchId]);

  useEffect(() => {
    const socket = getSocket();
    const onState = (p: Payload) => { setPayload((prev) => ({ ...prev, ...p })); };
    const onError = (e: { message: string }) => { setError(e.message); setTimeout(() => setError(null), 3000); };
    const onHover = (h: Hover) => { if (h.role !== you) setOppHover(h.targetId); };

    socket.on(S2C.STATE, onState);
    socket.on(S2C.ERROR, onError);
    socket.on(S2C.HOVER, onHover);

    let cancelled = false;
    const join = () => socket.emit(C2S.JOIN, { matchId, ticket: ticketRef.current });
    (async () => {
      // Fetch a session-bound ticket so the server can trust our identity.
      if (session?.user && !spectator) {
        try {
          const r = await fetch("/api/socket-token");
          if (r.ok) ticketRef.current = (await r.json()).ticket;
        } catch { /* spectate as fallback */ }
      }
      if (cancelled) return;
      if (socket.connected) join(); else socket.once("connect", join);
    })();

    return () => {
      cancelled = true;
      socket.off(S2C.STATE, onState);
      socket.off(S2C.ERROR, onError);
      socket.off(S2C.HOVER, onHover);
      socket.off("connect", join);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, session?.user]);

  function emit(event: string, data: object) { getSocket().emit(event, data); }
  function takeSeat(seat: "player1" | "player2") {
    emit(C2S.JOIN, { matchId, ticket: ticketRef.current, seat });
  }
  function act(target: string) { emit(C2S.ACTION, { matchId, target }); }
  function setReady(ready: boolean) { emit(C2S.READY, { matchId, ready }); }
  function ackResult(gameIndex: number) { emit(C2S.RESULT_ACK, { matchId, gameIndex }); }
  function rename(name: string) { emit(C2S.RENAME, { matchId, name }); }
  function forceStart() { emit(C2S.START, { matchId }); }
  function copyInvite() {
    navigator.clipboard?.writeText(inviteUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  function sendHover(pool: string, targetId: string | null) {
    if (payload?.publicHover && (you === "player1" || you === "player2")) {
      emit(C2S.HOVER, { matchId, role: you, pool, targetId });
    }
  }

  if (!state) {
    return <div className="aoe-panel rounded-xl p-8 text-center text-muted">{error ?? t("match.connecting")}</div>;
  }

  // Lobby: show seats, invite link and ready-up before the draft begins.
  if (payload!.status === "lobby") {
    return (
      <Lobby
        seats={payload!.seats}
        you={you}
        amHost={amHost}
        loggedIn={!!session}
        bestOf={state.bestOf}
        inviteUrl={inviteUrl}
        copied={copied}
        onCopy={copyInvite}
        onTake={takeSeat}
        onReady={setReady}
        onRename={rename}
        onStart={forceStart}
        error={error}
      />
    );
  }

  const step = state.currentStep;
  const myTurn = !spectator && you === state.turn && state.status === "running";
  const isHost = amHost;

  const showMaps = step?.type === "MAP_BAN" || step?.type === "MAP_PICK" || step?.type === "MAP_SELECT";
  const showCivs = step?.type === "CIV_BAN" || step?.type === "CIV_PICK";
  const showOffer = step?.type === "CIV_OFFER";
  const showSnipeOpp = step?.type === "CIV_SNIPE_OPPONENT";
  const showResult = step?.type === "GAME_RESULT";

  // Duel helpers
  const youPlayer: "player1" | "player2" | null = you === "player1" || you === "player2" ? you : null;
  const opp = youPlayer === "player1" ? "player2" : youPlayer === "player2" ? "player1" : null;
  const duel = state.civDuel;
  const canActDuel = !spectator && !!youPlayer && state.awaiting[youPlayer] && payload!.status === "running";
  const usedByYou = youPlayer
    ? state.games.filter((g) => g.gameIndex < state.currentGameIndex).map((g) => (youPlayer === "player1" ? g.civP1 : g.civP2)).filter(Boolean) as string[]
    : [];
  // For the offer UI: a player's drafted hand, or the full available pool when no hand was drafted (easy flow).
  const handIds = youPlayer === "player1" ? state.offerableP1 : youPlayer === "player2" ? state.offerableP2 : [];

  function clickable(entry: PoolView): boolean {
    if (!myTurn || !step) return false;
    if (step.type === "MAP_BAN" || step.type === "MAP_PICK") return entry.state === "available";
    if (step.type === "MAP_SELECT") return state!.selectableMapIds.includes(entry.id);
    if (step.type === "CIV_BAN") return entry.state === "available";
    if (step.type === "CIV_PICK") return state!.civPickableIds.includes(entry.id);
    return false;
  }

  // Entries enriched with current images (decoupled from the frozen snapshot).
  const civsView: PoolView[] = state.civs.map((c) => ({ ...c, imageUrl: CIV_IMG.get(c.id) ?? c.imageUrl }));
  const mapsView: PoolView[] = state.maps.map((m) => ({ ...m, imageUrl: MAP_IMG.get(m.id) ?? m.imageUrl }));

  const currentMap = state.games[state.currentGameIndex]?.map;
  const currentMapName = mapsView.find((m) => m.id === currentMap)?.name;

  // Pool 1 (each player's persistent "hand"), shown under the player; played civs marked used.
  const civById = (id?: string) => civsView.find((c) => c.id === id);
  const usedP1 = new Set(state.games.map((g) => g.civP1).filter(Boolean) as string[]);
  const usedP2 = new Set(state.games.map((g) => g.civP2).filter(Boolean) as string[]);
  const p1Hand = state.draftedByP1.map((id) => ({ key: id, civ: civById(id), used: usedP1.has(id) }));
  const p2Hand = state.draftedByP2.map((id) => ({ key: id, civ: civById(id), used: usedP2.has(id) }));
  // Civs each player banned (any scope — pool or opponent).
  const p1Banned = state.civBans.filter((b) => b.by === "player1").map((b) => ({ key: b.id, civ: civById(b.id), banned: true }));
  const p2Banned = state.civBans.filter((b) => b.by === "player2").map((b) => ({ key: b.id, civ: civById(b.id), banned: true }));
  // Per-player map pools (played maps marked used).
  const mapById = (id?: string) => mapsView.find((m) => m.id === id);
  const playedMaps = new Set(state.games.map((g) => g.map).filter(Boolean) as string[]);
  const p1Maps = state.mapsByP1.map((id) => ({ key: id, civ: mapById(id), used: playedMaps.has(id) }));
  const p2Maps = state.mapsByP2.map((id) => ({ key: id, civ: mapById(id), used: playedMaps.has(id) }));

  // Display names (fall back to "Player 1/2" when a seat is unnamed).
  const p1Name = payload!.seats.player1?.name || t("match.p1");
  const p2Name = payload!.seats.player2?.name || t("match.p2");

  return (
    <div className="space-y-5">
      {error && <div className="rounded border border-danger/60 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}

      {/* Scoreboard */}
      <div className="aoe-panel rounded-xl p-4">
        <div className="grid grid-cols-3 items-center">
          <SeatCard label={t("match.p1")} seat={payload!.seats.player1} role="player1" you={you} turn={state.turn}
            score={state.score.player1} canTake={!spectator && !payload!.seats.player1 && you === "spectator" && !!session}
            onTake={() => takeSeat("player1")} crowned={state.finished && state.score.player1 > state.score.player2} />
          <div className="text-center">
            <div className="font-display text-3xl aoe-gold-text">{state.score.player1} — {state.score.player2}</div>
            <div className="text-xs text-muted">{t("match.bestOf", { n: state.bestOf, t: state.target })}</div>
            <div className="mt-1">
              {state.finished ? (
                <span className="font-display text-xl aoe-gold-text">
                  {t("match.winner", { name: state.score.player1 > state.score.player2 ? p1Name : p2Name })}
                </span>
              ) : payload!.status === "paused" ? (
                <span className="text-xs text-danger">{t("match.paused")}</span>
              ) : (
                <span className={`text-xs ${stepTone(state.currentStep?.type)}`}>{turnLabel(state, t)}</span>
              )}
            </div>
          </div>
          <SeatCard label={t("match.p2")} seat={payload!.seats.player2} role="player2" you={you} turn={state.turn}
            score={state.score.player2} canTake={!spectator && !payload!.seats.player2 && you === "spectator" && !!session}
            onTake={() => takeSeat("player2")} right
            crowned={state.finished && state.score.player2 > state.score.player1} />
        </div>

        {/* Each player's hand (Pool 1) shown under them; used civs are dimmed */}
        {(p1Hand.length > 0 || p2Hand.length > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/50 pt-3">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">{t("match.handP1")}</div>
              <CivStrip items={p1Hand} align="left" />
            </div>
            <div className="text-right">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">{t("match.handP2")}</div>
              <CivStrip items={p2Hand} align="right" />
            </div>
          </div>
        )}

        {/* Each player's map pool */}
        {(p1Maps.length > 0 || p2Maps.length > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/50 pt-3">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">{t("match.mapsP1")}</div>
              <CivStrip items={p1Maps} align="left" />
            </div>
            <div className="text-right">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">{t("match.mapsP2")}</div>
              <CivStrip items={p2Maps} align="right" />
            </div>
          </div>
        )}

        {/* Civs each player banned */}
        {(p1Banned.length > 0 || p2Banned.length > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/50 pt-3">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-danger/80">{t("match.bannedP1")}</div>
              <CivStrip items={p1Banned} align="left" />
            </div>
            <div className="text-right">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-danger/80">{t("match.bannedP2")}</div>
              <CivStrip items={p2Banned} align="right" />
            </div>
          </div>
        )}

        {(you === "player1" || you === "player2" || isHost) && !state.finished && (
          <div className="mt-3 flex justify-center">
            <button onClick={() => emit(C2S.PAUSE, { matchId, paused: payload!.status !== "paused" })}
              className="rounded border border-border px-3 py-1 text-xs text-muted hover:text-gold-bright">
              {payload!.status === "paused" ? t("match.resume") : t("match.pause")}
            </button>
          </div>
        )}
      </div>

      {/* Per-game overview: map, civs played and winner for each game — moved up
          to the top so the current standing & matchup is clear at a glance. */}
      <MatchOverview state={state} p1Name={p1Name} p2Name={p2Name} civById={civById} mapById={mapById} />

      {/* Between-games gate: hold the clock until both players acknowledge the result */}
      {payload!.awaitingAck && !state.finished && (
        <AckGate
          info={payload!.awaitingAck}
          p1Name={p1Name}
          p2Name={p2Name}
          you={you}
          onAck={() => ackResult(payload!.awaitingAck!.gameIndex)}
        />
      )}

      {/* Current step prompt */}
      {step && !state.finished && (
        <div className="text-center">
          <h2 className={`font-display text-xl ${stepTone(step.type)}`}>{step.label || `${step.type}`}</h2>
          {step.showCurrentMap && currentMap && (
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted">
              {mapById(currentMap)?.imageUrl && (
                <Thumb src={mapById(currentMap)?.imageUrl} alt={currentMapName ?? ""} className="h-8 w-8 rounded object-cover ring-1 ring-bronze" />
              )}
              <span>{t("match.currentMap")} <span className="text-foreground">{currentMapName}</span></span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-center gap-3 text-sm">
            {myTurn && <span className="text-gold-bright">{t("match.yourMove")}</span>}
            {payload!.status !== "paused" && <Countdown deadlineTs={payload!.deadlineTs} />}
          </div>
        </div>
      )}

      {/* Pools */}
      {(showMaps) && (
        <Pool title={t("match.maps")} entries={mapsView} clickable={clickable} onPick={act}
          oppHover={oppHover} onHover={(id) => sendHover("map", id)}
          highlightSelectable={step?.type === "MAP_SELECT" ? state.selectableMapIds : undefined} />
      )}
      {showCivs && (
        <Pool title={t("match.civs")} entries={civsView} clickable={clickable} onPick={act}
          oppHover={oppHover} onHover={(id) => sendHover("civ", id)}
          highlightSelectable={step?.type === "CIV_PICK" ? state.civPickableIds : undefined} />
      )}
      {/* Two-pool duel: simultaneous hidden offer */}
      {showOffer && duel && (
        <OfferPhase
          duel={duel}
          youPlayer={youPlayer}
          opp={opp}
          spectator={spectator}
          canAct={canActDuel}
          hand={civsView.filter((c) => handIds.includes(c.id))}
          usedByYou={usedByYou}
          excludeUsed={Boolean(step?.excludeUsedCivs)}
          onOffer={act}
          civById={civById}
        />
      )}
      {/* Two-pool duel: simultaneous hidden counter-snipe of opponent's offer */}
      {showSnipeOpp && duel && (
        <SnipePhase
          duel={duel}
          youPlayer={youPlayer}
          opp={opp}
          spectator={spectator}
          canAct={canActDuel}
          onSnipe={act}
          civById={civById}
        />
      )}

      {/* Result: the clash — civ banners vs each other across the map */}
      {showResult && (
        <>
          <VersusBanner
            game={state.games[state.currentGameIndex]}
            p1Name={payload!.seats.player1?.name}
            p2Name={payload!.seats.player2?.name}
            civById={civById}
            mapById={mapById}
          />
          <ResultControls
            gameIndex={state.currentGameIndex}
            isHost={amHost}
            currentWinner={state.games[state.currentGameIndex]?.winner ?? null}
            p1Name={p1Name}
            p2Name={p2Name}
            onDecide={(w) => emit(C2S.RESULT_OVERRIDE, { matchId, gameIndex: state.currentGameIndex, winner: w })}
          />
        </>
      )}

    </div>
  );
}

function CivChip({ civ, dim, mark, animate }: { civ?: PoolView; dim?: boolean; mark?: "x" | "check"; animate?: boolean }) {
  if (!civ) return null;
  return (
    <div className={`relative flex w-14 flex-col items-center rounded-md border border-bronze bg-surface-2 px-1 py-1 text-center ${dim ? "opacity-40" : ""} ${animate ? "civ-pop" : ""}`} title={civ.name}>
      <Thumb src={civ.imageUrl} alt={civ.name} className={`h-8 w-8 object-contain ${mark === "x" ? "grayscale" : ""}`} />
      <span className="mt-0.5 w-full truncate text-[9px] leading-tight text-muted">{civ.name}</span>
      {mark === "x" && <span className="absolute inset-0 flex items-center justify-center text-lg text-danger">✕</span>}
      {mark === "check" && <span className="absolute right-0.5 top-0.5 text-[10px] text-gold-bright">●</span>}
    </div>
  );
}

function HiddenSlot() {
  return <div className="flex h-[52px] w-14 items-center justify-center rounded-md border border-dashed border-border bg-surface-2/40 text-muted">?</div>;
}

function OfferPhase({ duel, youPlayer, opp, canAct, hand, usedByYou, excludeUsed, onOffer, civById }: {
  duel: CivDuel;
  youPlayer: "player1" | "player2" | null;
  opp: "player1" | "player2" | null;
  spectator: boolean;
  canAct: boolean;
  hand: PoolView[];
  usedByYou: string[];
  excludeUsed: boolean;
  onOffer: (id: string) => void;
  civById: (id?: string) => PoolView | undefined;
}) {
  const { t } = useI18n();
  const myOffered = youPlayer ? duel.offered[youPlayer] : [];
  const youSubmitted = youPlayer ? duel.submitted[youPlayer] : false;
  const oppSubmitted = opp ? duel.submitted[opp] : false;
  const offeredSet = new Set(myOffered);
  const usedSet = new Set(usedByYou);

  return (
    <section className="aoe-panel rounded-xl p-5">
      <h3 className="font-display text-lg aoe-gold-text text-center">{t("offer.title", { n: duel.offerCount })}</h3>
      <div className="aoe-rule my-3" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{t("offer.yourOffer")} {youSubmitted ? t("offer.locked") : `(${myOffered.length}/${duel.offerCount})`}</div>
          <div className="mt-1 flex gap-1.5">
            {myOffered.map((id) => <CivChip key={id} civ={civById(id)} animate />)}
            {Array.from({ length: Math.max(0, duel.offerCount - myOffered.length) }).map((_, i) => <HiddenSlot key={i} />)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted">{oppSubmitted ? t("offer.oppReady") : t("offer.oppChoosing")}</div>
          <div className="mt-1 flex justify-end gap-1.5">
            {Array.from({ length: duel.offerCount }).map((_, i) => <HiddenSlot key={i} />)}
          </div>
        </div>
      </div>

      {canAct ? (
        <div className="mt-4">
          <div className="mb-2 text-xs text-muted">{t("offer.chooseHand", { n: duel.offerCount })}</div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {hand.map((c) => {
              const used = excludeUsed && usedSet.has(c.id);
              const offered = offeredSet.has(c.id);
              const disabled = used || offered;
              return (
                <button key={c.id} disabled={disabled} onClick={() => onOffer(c.id)}
                  className={`relative flex flex-col items-center rounded-lg border p-2 transition ${
                    offered ? "border-gold bg-surface-2" : used ? "border-border opacity-30" : "border-bronze hover:border-gold hover:bg-surface-2 cursor-pointer"}`}
                  title={c.name}>
                  <Thumb src={c.imageUrl} alt={c.name} className="h-9 w-9 object-contain" />
                  <span className="mt-1 text-[10px] leading-tight text-muted">{c.name}</span>
                  {used && <span className="absolute right-1 top-1 text-[8px] text-danger">{t("match.used")}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : youPlayer ? (
        <p className="mt-4 text-center text-sm text-gold-bright">{t("offer.lockedWait")}</p>
      ) : (
        <p className="mt-4 text-center text-sm text-muted">{t("offer.secret")}</p>
      )}
    </section>
  );
}

function SnipePhase({ duel, youPlayer, opp, canAct, onSnipe, civById }: {
  duel: CivDuel;
  youPlayer: "player1" | "player2" | null;
  opp: "player1" | "player2" | null;
  spectator: boolean;
  canAct: boolean;
  onSnipe: (id: string) => void;
  civById: (id?: string) => PoolView | undefined;
}) {
  const { t } = useI18n();
  const myOffer = youPlayer ? duel.offered[youPlayer] : [];
  const oppOffer = opp ? duel.offered[opp] : [];
  const mySnipes = new Set(youPlayer ? duel.snipedBy[youPlayer] : []);

  return (
    <section className="aoe-panel rounded-xl p-5">
      <h3 className="font-display text-lg aoe-gold-text text-center">{t("snipe.title", { n: duel.snipeCount })}</h3>
      <p className="mt-1 text-center text-xs text-muted">{t("snipe.hint")}</p>
      <div className="aoe-rule my-3" />

      {youPlayer ? (
        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">{t("snipe.oppOffered", { n: duel.snipeCount })}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {oppOffer.map((id) => {
                const sniped = mySnipes.has(id);
                return (
                  <button key={id} disabled={!canAct || sniped} onClick={() => onSnipe(id)}
                    className={`rounded-md transition ${canAct && !sniped ? "hover:scale-105 cursor-pointer" : ""} ${sniped ? "ring-2 ring-danger" : ""}`}>
                    <CivChip civ={civById(id)} mark={sniped ? "x" : undefined} />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">{t("snipe.yourOfferSurvivor")}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {myOffer.map((id) => <CivChip key={id} civ={civById(id)} />)}
            </div>
          </div>
          {!canAct && <p className="text-center text-sm text-gold-bright">{t("snipe.lockedWait")}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">{t("snipe.p1offered")}</div>
            <div className="mt-1 flex flex-wrap gap-2">{duel.offered.player1.map((id) => <CivChip key={id} civ={civById(id)} />)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">{t("snipe.p2offered")}</div>
            <div className="mt-1 flex flex-wrap gap-2">{duel.offered.player2.map((id) => <CivChip key={id} civ={civById(id)} />)}</div>
          </div>
          <p className="col-span-2 text-center text-xs text-muted">{t("snipe.secret")}</p>
        </div>
      )}
    </section>
  );
}

function CivStrip({ items, align, wide = false }: { items: { key: string; civ?: PoolView; used?: boolean; banned?: boolean }[]; align: "left" | "right"; wide?: boolean }) {
  return (
    <div className={`flex flex-wrap items-end gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {items.map((it) =>
        it.civ ? (
          <div
            key={it.key}
            className={`civ-pop relative flex flex-col items-center rounded-md border text-center ${wide ? "w-16 overflow-hidden" : "w-12 px-1 py-1"} ${
              it.banned ? "border-danger/50 bg-danger/5 opacity-60" : it.used ? "border-border bg-surface-2/40 opacity-45" : "border-bronze bg-surface-2"
            }`}
            title={it.banned ? `${it.civ.name} (banned)` : it.used ? `${it.civ.name} (used)` : it.civ.name}
          >
            <Thumb src={it.civ.imageUrl} alt={it.civ.name} className={`${wide ? "h-9 w-full object-cover" : "h-7 w-7 object-contain"} ${it.used || it.banned ? "grayscale" : ""}`} />
            <span className={`w-full truncate text-[9px] leading-tight text-muted ${wide ? "px-1 py-0.5" : "mt-0.5"}`}>{it.civ.name}</span>
            {it.banned ? <span className="absolute right-0.5 top-0.5 text-[10px] text-danger">✕</span> : it.used ? <span className="absolute right-0.5 top-0.5 text-[8px] text-danger">used</span> : null}
          </div>
        ) : null
      )}
    </div>
  );
}

function RenameControl({ current, onRename }: { current: string; onRename: (name: string) => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(current);
  useEffect(() => setVal(current), [current]);
  const save = () => { const v = val.trim(); if (v) onRename(v); setEditing(false); };
  if (!editing) {
    return <button onClick={() => setEditing(true)} className="text-[11px] text-muted underline hover:text-gold-bright">{t("match.rename")}</button>;
  }
  return (
    <div className="flex justify-center gap-1">
      <input value={val} onChange={(e) => setVal(e.target.value)} maxLength={32} autoFocus
        onKeyDown={(e) => { if (e.key === "Enter") save(); }}
        className="w-28 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-gold" />
      <button onClick={save} className="rounded border border-bronze px-2 text-[11px] text-gold-bright">{t("match.save")}</button>
    </div>
  );
}

function Lobby({ seats, you, amHost, loggedIn, bestOf, inviteUrl, copied, onCopy, onTake, onReady, onRename, onStart, error }: {
  seats: { host: string; player1: Seat; player2: Seat };
  you: SeatRole | "spectator";
  amHost: boolean;
  loggedIn: boolean;
  bestOf: number;
  inviteUrl: string;
  copied: boolean;
  onCopy: () => void;
  onTake: (seat: "player1" | "player2") => void;
  onReady: (ready: boolean) => void;
  onRename: (name: string) => void;
  onStart: () => void;
  error: string | null;
}) {
  const { t } = useI18n();
  const bothSeated = !!seats.player1 && !!seats.player2;
  const youLabel = you === "player1" ? t("match.p1") : you === "player2" ? t("match.p2") : amHost ? t("match.referee") : t("match.spectator");

  const SeatPanel = ({ label, seat, role }: { label: string; seat: Seat; role: "player1" | "player2" }) => {
    const mine = you === role;
    return (
      <div className={`aoe-panel rounded-xl p-5 text-center ${mine ? "ring-1 ring-gold" : ""}`}>
        <div className="font-display text-xl leading-tight text-foreground">
          <span className="font-sans text-[11px] uppercase tracking-wide text-muted">{label}</span>
          {seat?.name ? <span> · {seat.name}</span> : <span className="text-muted"> · {t("match.open")}</span>}
        </div>
        {mine && <div className="mt-0.5 text-[10px] text-muted">({t("match.you")})</div>}
        {seat ? (
          <div className="mt-2">
            <span className={`rounded-full px-3 py-1 text-xs ${seat.ready ? "border border-gold text-gold-bright" : "border border-border text-muted"}`}>
              {seat.ready ? t("match.ready") : t("match.notReady")}
            </span>
            {mine && (
              <div className="mt-3 flex flex-col items-center gap-4">
                <button onClick={() => onReady(!seat.ready)} className="aoe-btn rounded px-4 py-2 font-display">
                  {seat.ready ? t("match.unready") : t("match.readyUp")}
                </button>
                <RenameControl current={seat.name ?? ""} onRename={onRename} />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3">
            {loggedIn && you === "spectator" ? (
              <button onClick={() => onTake(role)} className="aoe-btn rounded px-4 py-2 font-display">{t("match.takeSeat")}</button>
            ) : (
              <span className="text-xs text-muted">{t("match.waitingPlayer")}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {error && <div className="rounded border border-danger/60 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}
      <div className="aoe-panel rounded-xl p-6 text-center">
        <span className="rounded-full border border-bronze px-3 py-1 text-xs text-gold-bright">{t("match.lobby")}</span>
        <h1 className="mt-3 font-display text-2xl aoe-gold-text">{t("match.boTitle", { n: bestOf })}</h1>
        <p className="mt-1 text-sm text-muted">{t("match.youAre")} <span className="text-foreground">{youLabel}</span></p>
        {amHost && <p className="mt-1 text-xs text-bronze">{t("match.hostHint")}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SeatPanel label={t("match.p1")} seat={seats.player1} role="player1" />
        <SeatPanel label={t("match.p2")} seat={seats.player2} role="player2" />
      </div>

      {/* Invite link for Player 2 */}
      <div className="aoe-panel rounded-xl p-5">
        <h3 className="font-display text-sm uppercase tracking-wide text-muted">{t("match.invite")}</h3>
        <div className="mt-2 flex gap-2">
          <input readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground" />
          <button onClick={onCopy} className="aoe-btn shrink-0 rounded px-4 py-2 text-sm">{copied ? t("match.copied") : t("match.copyLink")}</button>
        </div>
        <p className="mt-2 text-xs text-muted">{t("match.shareHint")}</p>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted">
          {!bothSeated ? t("match.waitSeats") :
            (seats.player1?.ready && seats.player2?.ready) ? t("match.starting") : t("match.readyToBegin")}
        </p>
        {amHost && bothSeated && (
          <button onClick={onStart} className="mt-3 rounded border border-border px-4 py-2 text-sm text-muted hover:text-gold-bright">
            {t("match.forceStart")}
          </button>
        )}
      </div>
    </div>
  );
}

function Countdown({ deadlineTs }: { deadlineTs: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadlineTs) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadlineTs]);
  if (!deadlineTs) return null;
  const remain = Math.max(0, Math.ceil((deadlineTs - now) / 1000));
  return (
    <span className={`font-display tabular-nums ${remain <= 5 ? "text-danger" : "text-muted"}`}>
      ⏱ {remain}s
    </span>
  );
}

type TFn = (k: string, v?: Record<string, string | number>) => string;

// Colour cue: pick/select = green, ban/snipe = red, otherwise gold.
function stepTone(ty?: string): string {
  if (!ty) return "aoe-gold-text";
  if (ty.includes("BAN") || ty === "CIV_SNIPE_OPPONENT") return "text-danger";
  if (ty === "CIV_PICK" || ty === "MAP_PICK" || ty === "MAP_SELECT" || ty === "CIV_OFFER") return "text-emerald-400";
  return "aoe-gold-text";
}

function turnLabel(state: DerivedState, t: TFn): string {
  if (!state.currentStep) return "";
  if (state.simultaneous) return state.currentStep.type === "CIV_OFFER" ? t("turn.offerBoth") : t("turn.snipeBoth");
  if (state.turn === "host") return t("turn.randomDraw");
  if (!state.turn) return t("turn.awaitResult");
  const p = state.turn === "player1" ? t("match.p1") : t("match.p2");
  const key = state.currentStep.type.includes("BAN") ? "turn.toBan" : state.currentStep.type === "MAP_SELECT" ? "turn.toSelect" : "turn.toPick";
  return t(key, { p });
}

function SeatCard({ label, seat, role, you, turn, score, canTake, onTake, right, crowned }: {
  label: string; seat: Seat; role: SeatRole; you: string; turn: SeatRole | null; score: number;
  canTake: boolean; onTake: () => void; right?: boolean; crowned?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={right ? "text-right" : ""}>
      {crowned && <div className="text-2xl leading-none" title={t("match.matchWinner")}>👑</div>}
      <div className={`font-display text-lg leading-tight ${turn === role ? "text-gold-bright" : "text-foreground"}`}>
        <span className="font-sans text-[11px] uppercase tracking-wide text-muted">{label}</span>
        {seat?.name ? <span> · {seat.name}</span> : <span className="text-muted"> · —</span>}
      </div>
      {you === role && <div className="text-[10px] text-muted">({t("match.you")})</div>}
      {!seat && canTake && (
        <button onClick={onTake} className="aoe-btn mt-1 rounded px-2 py-1 text-xs">{t("match.takeSeat")}</button>
      )}
      <span className="sr-only">{score}</span>
    </div>
  );
}

function Pool({ title, entries, clickable, onPick, onHover, oppHover, highlightSelectable, kind = "civ" }: {
  title: string; entries: PoolView[]; clickable: (e: PoolView) => boolean; onPick: (id: string) => void;
  onHover: (id: string | null) => void; oppHover: string | null; highlightSelectable?: string[]; kind?: "civ" | "map";
}) {
  const isMap = kind === "map";
  return (
    <section className="aoe-panel rounded-xl p-4">
      <h3 className="mb-3 font-display text-sm uppercase tracking-wide text-muted">{title}</h3>
      <div className={`grid gap-2 ${isMap ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-6"}`}>
        {entries.map((e) => {
          const can = clickable(e);
          // During a select step (highlightSelectable given), only those entries are highlighted.
          const isSelectStep = highlightSelectable != null;
          const selectable = highlightSelectable ? highlightSelectable.includes(e.id) : true;
          const banned = e.state === "banned";
          const taken = e.state === "picked" || e.state === "drafted";
          return (
            <button
              key={e.id}
              disabled={!can}
              onClick={() => can && onPick(e.id)}
              onMouseEnter={() => onHover(e.id)}
              onMouseLeave={() => onHover(null)}
              className={[
                "relative flex flex-col items-center overflow-hidden rounded-lg border transition",
                isMap ? "" : "p-2",
                banned ? "border-danger/50 opacity-40" :
                  isSelectStep
                    ? (selectable
                        ? "border-gold bg-surface-2 ring-1 ring-gold" + (can ? " cursor-pointer hover:brightness-110" : "")
                        : "border-border opacity-25")
                    : (taken ? "border-emerald-500/70 bg-surface-2" :
                       can ? "border-bronze hover:border-gold hover:bg-surface-2 cursor-pointer" :
                       "border-border opacity-50"),
                oppHover === e.id ? "ring-2 ring-gold-bright" : "",
              ].join(" ")}
              title={e.name}
            >
              <Thumb src={e.imageUrl} alt={e.name} className={`${isMap ? "h-20 w-full object-cover" : "h-10 w-10 object-contain"} ${banned ? "grayscale" : ""}`} />
              <span className={`leading-tight text-muted ${isMap ? "w-full truncate px-2 py-1 text-[11px]" : "mt-1 text-[10px]"}`}>{e.name}</span>
              {banned && <span className="absolute right-1 top-1 text-danger">✕</span>}
              {(e.state === "drafted" || e.state === "picked") && <span className="absolute right-1 top-1 text-[9px] text-emerald-400">●</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function VersusBanner({ game, p1Name, p2Name, civById, mapById }: {
  game?: { civP1?: string; civP2?: string; map?: string; winner?: "player1" | "player2" | null };
  p1Name?: string;
  p2Name?: string;
  civById: (id?: string) => PoolView | undefined;
  mapById: (id?: string) => PoolView | undefined;
}) {
  const { t } = useI18n();
  const c1 = civById(game?.civP1);
  const c2 = civById(game?.civP2);
  const map = mapById(game?.map);
  const Side = ({ name, civ, tone, won }: { name?: string; civ?: PoolView; tone: "sky" | "rose"; won?: boolean }) => (
    <div className="flex flex-col items-center text-center">
      <div className={`text-xs uppercase tracking-wide ${tone === "sky" ? "text-sky-400" : "text-rose-400"}`}>
        {tone === "sky" ? t("match.p1") : t("match.p2")}{name ? ` · ${name}` : ""}
      </div>
      <div className="relative mt-2">
        {won && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl leading-none">👑</span>}
        <div className={`rounded-full p-1 ring-2 ${won ? "ring-gold-bright" : tone === "sky" ? "ring-sky-500/70" : "ring-rose-500/70"}`}>
          <Thumb src={civ?.imageUrl} alt={civ?.name ?? ""} className="civ-pop h-16 w-16 object-contain" />
        </div>
      </div>
      <div className={`mt-1 font-display ${won ? "aoe-gold-text" : "text-foreground"}`}>{civ?.name ?? "—"}</div>
    </div>
  );
  return (
    <section className="aoe-panel relative overflow-hidden rounded-xl p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: "linear-gradient(105deg, rgba(56,189,248,0.14) 0%, transparent 42%, transparent 58%, rgba(244,63,94,0.14) 100%)" }}
      />
      <div className="relative grid grid-cols-3 items-center gap-3">
        <Side name={p1Name} civ={c1} tone="sky" won={game?.winner === "player1"} />
        <div className="flex flex-col items-center">
          <div className="font-display text-3xl aoe-gold-text drop-shadow">VS</div>
          {map && <Thumb src={map.imageUrl} alt={map.name} className="mt-2 h-20 w-20 object-contain" />}
          <div className="mt-1 text-xs text-muted">{map?.name ?? ""}</div>
        </div>
        <Side name={p2Name} civ={c2} tone="rose" won={game?.winner === "player2"} />
      </div>
    </section>
  );
}

function ResultControls({ gameIndex, isHost, currentWinner, onDecide, p1Name, p2Name }: {
  gameIndex: number; isHost: boolean; currentWinner: "player1" | "player2" | null; onDecide: (w: "player1" | "player2") => void;
  p1Name: string; p2Name: string;
}) {
  const { t } = useI18n();
  return (
    <section className="aoe-panel rounded-xl p-5 text-center">
      <h3 className="font-display text-lg aoe-gold-text">{t("result.title", { n: gameIndex + 1 })}</h3>
      {isHost ? (
        <>
          <p className="mt-1 text-xs text-muted">{t("result.hostCall")}</p>
          <div className="mt-3 flex justify-center gap-3">
            {(["player1", "player2"] as const).map((w) => (
              <button
                key={w}
                onClick={() => onDecide(w)}
                className={`aoe-btn rounded px-5 py-2 font-display ${currentWinner === w ? "ring-2 ring-gold-bright" : ""}`}
              >
                {t("result.won", { name: w === "player1" ? p1Name : p2Name })}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">{t("result.waitingHost")}</p>
      )}
    </section>
  );
}

// Shown between games after a result is committed: the next game's clock is held
// until BOTH players click "Got it", so the loser knows exactly when it begins.
function AckGate({ info, p1Name, p2Name, you, onAck }: {
  info: { gameIndex: number; winner: "player1" | "player2"; by: { player1: boolean; player2: boolean } };
  p1Name: string; p2Name: string; you: SeatRole | "spectator"; onAck: () => void;
}) {
  const { t } = useI18n();
  const winnerName = info.winner === "player1" ? p1Name : p2Name;
  const seated = you === "player1" || you === "player2";
  const youAcked = you === "player1" || you === "player2" ? info.by[you] : false;
  const AckPip = ({ name, ready }: { name: string; ready: boolean }) => (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${ready ? "border-gold text-gold-bright" : "border-border text-muted"}`}>
      {ready ? "✓" : "…"} {name}
    </span>
  );
  return (
    <section className="aoe-panel rounded-xl border border-gold/60 p-5 text-center ring-1 ring-gold/30">
      <div className="text-2xl leading-none">👑</div>
      <h3 className="mt-1 font-display text-lg aoe-gold-text">{t("ack.title", { name: winnerName, n: info.gameIndex + 1 })}</h3>
      <p className="mt-1 text-sm text-muted">{t("ack.prompt")}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs">
        <AckPip name={p1Name} ready={info.by.player1} />
        <AckPip name={p2Name} ready={info.by.player2} />
      </div>
      {seated && !youAcked && (
        <button onClick={onAck} className="aoe-btn mt-4 rounded px-7 py-2.5 font-display">{t("ack.gotIt")}</button>
      )}
      {seated && youAcked && <p className="mt-3 text-sm text-gold-bright">{t("ack.youReady")}</p>}
      {!seated && <p className="mt-3 text-xs text-muted">{t("ack.waiting")}</p>}
    </section>
  );
}

// Per-game overview shown at the TOP of the match: one card per game with the
// map, both civs played, and a crown on the game's winner. Makes the current
// standing and matchup readable at a glance.
function MatchOverview({ state, p1Name, p2Name, civById, mapById }: {
  state: DerivedState;
  p1Name: string;
  p2Name: string;
  civById: (id?: string) => PoolView | undefined;
  mapById: (id?: string) => PoolView | undefined;
}) {
  const { t } = useI18n();
  const played = state.games.filter((g) => g.map || g.civP1 || g.civP2 || g.winner);
  if (played.length === 0) return null;
  return (
    <section className="aoe-panel rounded-xl p-4">
      <h3 className="mb-3 font-display text-sm uppercase tracking-wide text-muted">{t("match.games")}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {played.map((g) => {
          const isCurrent = !state.finished && g.gameIndex === state.currentGameIndex;
          const m = mapById(g.map);
          return (
            <div key={g.gameIndex}
              className={`rounded-lg border bg-surface-2/40 p-3 ${isCurrent ? "border-gold ring-1 ring-gold/40" : "border-border/70"}`}>
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
                <span>{t("match.gameN", { n: g.gameIndex + 1 })}</span>
                {m && (
                  <span className="flex items-center gap-1 normal-case text-foreground/80">
                    {m.imageUrl && <Thumb src={m.imageUrl} alt={m.name} className="h-4 w-4 rounded object-cover ring-1 ring-bronze" />}
                    {m.name}
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <GameSide name={p1Name} civ={civById(g.civP1)} won={g.winner === "player1"} tone="sky" />
                <div className="self-center font-display text-[10px] text-muted">VS</div>
                <GameSide name={p2Name} civ={civById(g.civP2)} won={g.winner === "player2"} tone="rose" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GameSide({ name, civ, won, tone }: { name: string; civ?: PoolView; won: boolean; tone: "sky" | "rose" }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
      <div className="relative">
        {won && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-base leading-none">👑</span>}
        <div className={`rounded-full p-0.5 ring-2 ${won ? "ring-gold-bright" : tone === "sky" ? "ring-sky-500/50" : "ring-rose-500/50"}`}>
          <Thumb src={civ?.imageUrl} alt={civ?.name ?? ""} className={`h-10 w-10 rounded-full object-cover ${civ ? "" : "opacity-30"}`} />
        </div>
      </div>
      <span className={`mt-1 max-w-full truncate text-[10px] ${won ? "aoe-gold-text" : "text-foreground/80"}`}>{civ?.name ?? "—"}</span>
      <span className="max-w-full truncate text-[9px] text-muted">{name}</span>
    </div>
  );
}
