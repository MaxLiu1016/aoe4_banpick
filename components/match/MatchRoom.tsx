"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { GUEST_ACCESS } from "@/lib/features";
import { getGuestToken, guestName, setGuestName } from "@/lib/guest";
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

// Colour means OWNERSHIP, not action: P1 is blue, P2 is red, everywhere an entry
// is attributed to a player. Bans are deliberately colourless (greyscale + ✕) so
// red always reads as "player 2" — players were misreading the old green "pick"
// tint as "it's my turn". Gold is reserved for "you are the one acting now".
type OwnerTone = { text: string; border: string; borderL: string; ring: string; bg: string };
const OWNER: Record<"player1" | "player2", OwnerTone> = {
  player1: { text: "text-sky-400", border: "border-sky-400", borderL: "border-l-sky-400", ring: "ring-sky-400", bg: "bg-sky-400/10" },
  player2: { text: "text-rose-400", border: "border-rose-400", borderL: "border-l-rose-400", ring: "ring-rose-400", bg: "bg-rose-400/10" },
};
function ownerOf(by?: string) {
  return by === "player1" ? OWNER.player1 : by === "player2" ? OWNER.player2 : null;
}

// Pool grid sizing. auto-fit + a minimum cell keeps every entry on one screen at
// 1200px while making each icon far bigger than the old fixed 48px — the pool is
// scanned at a glance during a draft, so "see them all" beats "see them huge".
const GRID_CIV = { gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))" };
// Maps sit smaller in the choosing grid than they do once picked or banned: the
// grid is a menu you scan, the strips below the score are the record you keep
// coming back to.
const GRID_MAP = { gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" };

type Seat = { id: string; name?: string; ready?: boolean; guest?: boolean; bot?: boolean } | null;
interface Payload {
  matchId: string;
  status: string;
  publicHover: boolean;
  resultMode?: "vote" | "host";
  pausable?: boolean;
  anonymous?: boolean;
  deadlineTs: number | null;
  serverNow?: number;
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
  const [minimized, setMinimized] = useState(false);
  const ticketRef = useRef<string | undefined>(undefined);
  // The current-step prompt, and the step it was last scrolled for.
  const promptRef = useRef<HTMLDivElement>(null);
  const lastStepRef = useRef<number | null>(null);
  // Estimated server-minus-client clock offset (ms). Set from each payload's
  // serverNow so the countdown tracks the server's real deadline, not the local
  // (possibly skewed) clock. Slightly conservative by the one-way network delay,
  // which is the safe direction (display reaches 0 a hair before the server).
  const clockOffsetRef = useRef(0);

  const you = payload?.you ?? "spectator";
  const amHost = payload?.youAreHost ?? false;
  const state = payload?.state;
  // Taking a seat no longer needs an account, just an identity the server signed.
  const canPlay = !!session?.user || GUEST_ACCESS;

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/match/${matchId}`);
  }, [matchId]);

  // Bring the turn to the player. A draft grows downward — scoreboard, map board,
  // both hands — so by the time the maps are done the thing you actually click is
  // off the bottom of the screen, and the page doesn't move on its own when the
  // step changes. You end up hunting for your own turn.
  //
  // Only on a step change, only when the step is YOURS, and only when the prompt
  // isn't already sitting near the top — a page that jumps while you're reading
  // is worse than one that doesn't move.
  useEffect(() => {
    const st = payload?.state;
    const seat = payload?.you === "player1" || payload?.you === "player2" ? payload.you : null;
    if (!st || payload?.status !== "running") return;
    const idx = st.currentStepIndex;
    if (lastStepRef.current === idx) return;
    const firstSight = lastStepRef.current === null;
    lastStepRef.current = idx;
    // Never on arrival: landing mid-draft shouldn't yank you somewhere you didn't ask for.
    if (firstSight || spectator || !seat || !st.awaiting[seat] || payload.awaitingAck) return;
    const el = promptRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top >= 0 && rect.top < window.innerHeight * 0.4) return; // already in view, leave it
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [payload, spectator]);

  useEffect(() => {
    const socket = getSocket();
    // Ignore broadcasts for a different match — the shared singleton socket can
    // briefly still receive a stale room's payload right after navigating here.
    const onState = (p: Payload) => {
      if (p.matchId !== matchId) return;
      if (typeof p.serverNow === "number") clockOffsetRef.current = p.serverNow - Date.now();
      setPayload((prev) => ({ ...prev, ...p }));
    };
    const onError = (e: { message: string }) => { setError(e.message); setTimeout(() => setError(null), 3000); };
    const onHover = (h: Hover) => { if (h.role !== you) setOppHover(h.targetId); };

    socket.on(S2C.STATE, onState);
    socket.on(S2C.ERROR, onError);
    socket.on(S2C.HOVER, onHover);

    let cancelled = false;
    // (Re)join on EVERY connect — not just the first. The socket auto-reconnects
    // after an idle drop or a long wait (e.g. a 30-min game between rounds), and
    // each reconnect is a fresh server-side socket with no role, so we must
    // re-send JOIN to restore our seat/host power. Refresh the identity ticket
    // first: the old one may have expired while away, which would otherwise
    // silently demote us to spectator and make every control stop working.
    const joinRoom = async () => {
      if (!spectator) {
        try {
          // Signed in, the ticket is minted from the session. Signed out, it comes
          // from the token in this browser — which is the whole no-account story:
          // the seat is held by something the server signed, not by an account.
          if (session?.user) {
            const r = await fetch("/api/socket-token");
            if (r.ok) ticketRef.current = (await r.json()).ticket;
          } else if (GUEST_ACCESS) {
            ticketRef.current = await getGuestToken();
          }
        } catch { /* fall back to spectating */ }
      }
      if (cancelled) return;
      socket.emit(C2S.JOIN, { matchId, ticket: ticketRef.current });
    };

    socket.on("connect", joinRoom);
    if (socket.connected) joinRoom();

    return () => {
      cancelled = true;
      socket.off(S2C.STATE, onState);
      socket.off(S2C.ERROR, onError);
      socket.off(S2C.HOVER, onHover);
      socket.off("connect", joinRoom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, session?.user?.id]);

  function emit(event: string, data: object) { getSocket().emit(event, data); }
  async function takeSeat(seat: "player1" | "player2", name?: string) {
    // A guest's name lives in their token, and the seat is stamped with whatever
    // the token says at the moment they sit down — so the rename has to land
    // BEFORE the JOIN, not after it.
    if (!session?.user && name) ticketRef.current = (await setGuestName(name)) ?? ticketRef.current;
    emit(C2S.JOIN, { matchId, ticket: ticketRef.current, seat });
  }
  function addBot(seat: "player1" | "player2") { emit(C2S.ADD_BOT, { matchId, seat }); }
  function act(target: string) { emit(C2S.ACTION, { matchId, target }); }
  function setReady(ready: boolean) { emit(C2S.READY, { matchId, ready }); }
  function ackResult(gameIndex: number) { emit(C2S.RESULT_ACK, { matchId, gameIndex }); }
  function voteResult(gameIndex: number, winner: "player1" | "player2") { emit(C2S.RESULT_CLICK, { matchId, gameIndex, winner }); }
  function rename(name: string) { emit(C2S.RENAME, { matchId, name }); }
  function forceStart() { emit(C2S.START, { matchId }); }
  function setOptions(p: { anonymous?: boolean; publicHover?: boolean; playAll?: boolean }) { emit(C2S.SET_OPTIONS, { matchId, ...p }); }
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
        canPlay={canPlay}
        loggedIn={!!session?.user}
        bestOf={state.bestOf}
        inviteUrl={inviteUrl}
        copied={copied}
        anonymous={Boolean(payload!.anonymous)}
        publicHover={Boolean(payload!.publicHover)}
        playAll={Boolean(state.playAll)}
        onCopy={copyInvite}
        onTake={takeSeat}
        onAddBot={addBot}
        onReady={setReady}
        onRename={rename}
        onStart={forceStart}
        onOptions={setOptions}
        error={error}
      />
    );
  }

  const step = state.currentStep;
  // While the between-games result gate is up, nobody may act until both players ack.
  const ackPending = !!payload!.awaitingAck && !state.finished;
  const myTurn = !spectator && you === state.turn && state.status === "running" && !ackPending;
  const isHost = amHost;

  const showMaps = step?.type === "MAP_BAN" || step?.type === "MAP_PICK" || step?.type === "MAP_SELECT";
  const showCivs = step?.type === "CIV_BAN" || step?.type === "CIV_PICK";
  const showOffer = step?.type === "CIV_OFFER";
  const showSnipeOpp = step?.type === "CIV_SNIPE_OPPONENT";
  const showConfirm = step?.type === "SYNC_CONFIRM";
  const showResult = step?.type === "GAME_RESULT";

  // Duel helpers
  const youPlayer: "player1" | "player2" | null = you === "player1" || you === "player2" ? you : null;
  const opp = youPlayer === "player1" ? "player2" : youPlayer === "player2" ? "player1" : null;
  const duel = state.civDuel;
  const canActDuel = !spectator && !!youPlayer && state.awaiting[youPlayer] && payload!.status === "running" && !ackPending;
  // Simultaneous ban: there is no "turn" — both players act at once, gated on
  // `awaiting`, and each other's picks stay hidden until both have submitted.
  const simulBan = Boolean(step?.simultaneous) && (step?.type === "MAP_BAN" || step?.type === "CIV_BAN");
  const myPendingBans = youPlayer ? state.pendingBans[youPlayer] : [];
  const canSimulBan = simulBan && canActDuel;
  const usedByYou = youPlayer
    ? state.games.filter((g) => g.gameIndex < state.currentGameIndex).map((g) => (youPlayer === "player1" ? g.civP1 : g.civP2)).filter(Boolean) as string[]
    : [];
  // For the offer UI: a player's drafted hand, or the full available pool when no hand was drafted (easy flow).
  const handIds = youPlayer === "player1" ? state.offerableP1 : youPlayer === "player2" ? state.offerableP2 : [];

  function clickable(entry: PoolView): boolean {
    if (!step) return false;
    if (simulBan) {
      return canSimulBan && entry.state === "available" && !myPendingBans.includes(entry.id);
    }
    if (!myTurn) return false;
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
  // Maps each player banned. These were only ever visible in the big pool grid,
  // which disappears as soon as the map phase is over — so "who banned what" was
  // unanswerable for the rest of the draft.
  const p1MapBans = mapsView.filter((m) => m.state === "banned" && m.by === "player1").map((m) => ({ key: m.id, civ: m, banned: true }));
  const p2MapBans = mapsView.filter((m) => m.state === "banned" && m.by === "player2").map((m) => ({ key: m.id, civ: m, banned: true }));

  // Display names (fall back to "Player 1/2" when a seat is unnamed).
  const p1Name = payload!.seats.player1?.name || t("match.p1");
  const p2Name = payload!.seats.player2?.name || t("match.p2");
  // Playing every game makes a level series reachable (an even best-of ending all
  // square), so "whoever isn't player 1" stops being a safe read of the winner.
  const seriesWinner = state.score.player1 === state.score.player2
    ? null
    : state.score.player1 > state.score.player2 ? p1Name : p2Name;
  const outcomeLabel = seriesWinner ? t("match.winner", { name: seriesWinner }) : t("match.drawn");

  return (
    <div className="space-y-5">
      <StepBar steps={state.stepBar} currentIndex={state.currentStepIndex} finished={state.finished} />

      {error && <div className="rounded border border-danger/60 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}

      {/* Scoreboard — collapsible to a compact status bar so the area below stays roomy */}
      <div className="aoe-panel rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-muted">
            {t("match.scoreboard")}
            {payload!.anonymous && <span className="ml-2 rounded border border-bronze px-1.5 py-0.5 text-gold-bright" title={t("match.anonymousHint")}>🕶 {t("match.anonymous")}</span>}
          </span>
          <button onClick={() => setMinimized((m) => !m)}
            className="inline-flex items-center gap-1.5 rounded-md border border-bronze bg-surface-2 px-3 py-1 text-xs font-display text-gold-bright shadow hover:brightness-110">
            {minimized ? <>⤢ {t("match.expand")}</> : <>▭ {t("match.minimize")}</>}
          </button>
        </div>

        {minimized && (
          <MiniScoreboard
            state={state} p1Name={p1Name} p2Name={p2Name} civById={civById}
            p1Hand={p1Hand} p2Hand={p2Hand} p1Banned={p1Banned} p2Banned={p2Banned}
            status={state.finished ? outcomeLabel : payload!.status === "paused" ? t("match.paused") : turnLabel(state, t)}
            statusTone={payload!.status === "paused" && !state.finished ? "text-danger" : "aoe-gold-text"}
          />
        )}

        {!minimized && (
        <>
        <div className="grid grid-cols-3 items-center">
          <SeatCard label={t("match.p1")} seat={payload!.seats.player1} role="player1" you={you} turn={state.turn}
            score={state.score.player1} canTake={!spectator && !payload!.seats.player1 && you === "spectator" && canPlay}
            onTake={() => takeSeat("player1")} crowned={state.finished && state.score.player1 > state.score.player2} />
          <div className="text-center">
            <div className="font-display text-3xl aoe-gold-text">{state.score.player1} — {state.score.player2}</div>
            <div className="text-xs text-muted">
              {state.playAll ? t("match.bestOfAll", { n: state.bestOf }) : t("match.bestOf", { n: state.bestOf, t: state.target })}
            </div>
            <div className="mt-1">
              {state.finished ? (
                <span className="font-display text-xl aoe-gold-text">
                  {outcomeLabel}
                </span>
              ) : payload!.status === "paused" ? (
                <span className="text-xs text-danger">{t("match.paused")}</span>
              ) : (
                <span className="text-sm aoe-gold-text">{turnLabel(state, t)}</span>
              )}
            </div>
          </div>
          <SeatCard label={t("match.p2")} seat={payload!.seats.player2} role="player2" you={you} turn={state.turn}
            score={state.score.player2} canTake={!spectator && !payload!.seats.player2 && you === "spectator" && canPlay}
            onTake={() => takeSeat("player2")} right
            crowned={state.finished && state.score.player2 > state.score.player1} />
        </div>

        {/* Games overview — merged into the scoreboard, right under the score */}
        <MatchOverview state={state} p1Name={p1Name} p2Name={p2Name} civById={civById} mapById={mapById} />

        {/* Each player's civ pool (collapsible) */}
        {(p1Hand.length > 0 || p2Hand.length > 0) && (
          <CollapsibleSection title={t("match.civPoolTitle")}>
            <div className="grid grid-cols-2 gap-3">
              <CivStrip items={p1Hand} align="left" />
              <div className="text-right"><CivStrip items={p2Hand} align="right" /></div>
            </div>
          </CollapsibleSection>
        )}

        {/* Everything about maps in one place: what each side picked, what they
            banned directly underneath, and the map actually being played. That
            last one can be a neutral draw belonging to neither side, so it used
            to appear nowhere but the step header — which read as the map pool
            being one short. */}
        {(p1Maps.length > 0 || p2Maps.length > 0 || p1MapBans.length > 0 || p2MapBans.length > 0 || currentMap) && (
          <CollapsibleSection title={t("match.mapPoolTitle")}>
            {currentMap && (
              <div className="mb-3 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wide text-muted">{t("match.currentMap")}</span>
                <div className="mt-1 w-36 overflow-hidden rounded-md border-2 border-gold bg-surface-2 text-center">
                  <Thumb src={mapById(currentMap)?.imageUrl} alt={currentMapName ?? ""} className="aspect-[16/10] w-full object-cover" />
                  <span className="block w-full truncate px-1 py-0.5 text-[11px] leading-tight text-gold-bright">{currentMapName}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <MapSide picked={p1Maps} banned={p1MapBans} align="left" />
              <MapSide picked={p2Maps} banned={p2MapBans} align="right" />
            </div>
          </CollapsibleSection>
        )}

        {/* Civs each player banned (collapsible) */}
        {(p1Banned.length > 0 || p2Banned.length > 0) && (
          <CollapsibleSection title={t("match.bannedTitle")} danger>
            <div className="grid grid-cols-2 gap-3">
              <CivStrip items={p1Banned} align="left" />
              <div className="text-right"><CivStrip items={p2Banned} align="right" /></div>
            </div>
          </CollapsibleSection>
        )}

        {(you === "player1" || you === "player2" || isHost) && !state.finished
          && (payload!.pausable !== false || payload!.status === "paused") && (
          <div className="mt-3 flex justify-center">
            <button onClick={() => emit(C2S.PAUSE, { matchId, paused: payload!.status !== "paused" })}
              className="rounded border border-border px-3 py-1 text-xs text-muted hover:text-gold-bright">
              {payload!.status === "paused" ? t("match.resume") : t("match.pause")}
            </button>
          </div>
        )}
        </>
        )}
      </div>

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

      {/* Current step prompt — leans to the acting player's side (P1 left, P2 right);
          neutral prompts (simultaneous / random draw) stay centered. */}
      {step && !state.finished && (
        <div ref={promptRef} className={`scroll-mt-6 flex flex-col ${
          state.turn === "player1" ? "items-start text-left" :
          state.turn === "player2" ? "items-end text-right" :
          "items-center text-center"
        }`}>
          {(state.turn === "player1" || state.turn === "player2") && (
            <span className={`font-display text-base ${OWNER[state.turn as "player1" | "player2"].text}`}>
              {state.turn === "player1" ? `${p1Name} ▸` : `◂ ${p2Name}`}
            </span>
          )}
          {/* Always gold: this used to turn green on any pick-type step, which
              players read as "it's my turn" rather than "this is a pick step". */}
          <h2 className="font-display text-2xl aoe-gold-text">
            {step.type === "GAME_RESULT" ? t("match.gameN", { n: state.currentGameIndex + 1 }) : (step.label || `${step.type}`)}
          </h2>
          {/* The map you are picking a civ FOR, right next to the prompt telling you
              to pick one. The map board higher up carries the same thing, and that
              repetition is the point: by the time you are choosing, the board is
              usually scrolled off, and the one fact you need is which map this is. */}
          {currentMap && (
            <div className="mt-1 flex items-center gap-2 text-sm text-muted">
              {mapById(currentMap)?.imageUrl && (
                <Thumb src={mapById(currentMap)?.imageUrl} alt={currentMapName ?? ""} className="h-8 w-8 rounded object-cover ring-1 ring-bronze" />
              )}
              <span>{t("match.currentMap")} <span className="text-foreground">{currentMapName}</span></span>
            </div>
          )}
          <div className="mt-1 flex items-center gap-3 text-sm">
            {myTurn && <span className="text-gold-bright">{t("match.yourMove")}</span>}
            {payload!.status !== "paused" && <Countdown deadlineTs={payload!.deadlineTs} clockOffsetRef={clockOffsetRef} />}
          </div>
        </div>
      )}

      {/* Simultaneous ban: show your own held bans and whether the opponent is done */}
      {simulBan && step && (
        <SimulBanStatus
          count={step.count}
          mine={myPendingBans}
          youAwaited={youPlayer ? state.awaiting[youPlayer] : false}
          oppAwaited={opp ? state.awaiting[opp] : true}
          isPlayer={!!youPlayer && !spectator}
          entryById={step.type === "MAP_BAN" ? mapById : civById}
        />
      )}

      {/* Pools — hover tints red for a ban step, gold for a pick step */}
      {(showMaps) && (
        <Pool title={t("match.maps")} entries={mapsView} clickable={clickable} onPick={act} kind="map"
          pendingIds={simulBan ? myPendingBans : undefined}
          oppHover={oppHover} onHover={(id) => sendHover("map", id)}
          tone={step?.type === "MAP_BAN" ? "ban" : step?.type === "MAP_PICK" ? "pick" : "neutral"}
          highlightSelectable={step?.type === "MAP_SELECT" ? state.selectableMapIds : undefined} />
      )}
      {showCivs && (
        <Pool title={t("match.civs")} entries={civsView} clickable={clickable} onPick={act}
          pendingIds={simulBan ? myPendingBans : undefined}
          oppHover={oppHover} onHover={(id) => sendHover("civ", id)}
          tone={step?.type === "CIV_BAN" ? "ban" : "pick"} />
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
          p1Name={p1Name}
          p2Name={p2Name}
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

      {/* Synchronized gate: both players must press confirm before the draft proceeds */}
      {showConfirm && (
        <ConfirmGate
          p1Name={p1Name}
          p2Name={p2Name}
          p1Confirmed={!state.awaiting.player1}
          p2Confirmed={!state.awaiting.player2}
          you={you}
          canConfirm={canActDuel}
          onConfirm={() => act("confirm")}
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
          {you !== "spectator" && (
            <ResultControls
              gameIndex={state.currentGameIndex}
              mode={payload!.resultMode ?? "vote"}
              isHost={amHost}
              you={you}
              votes={payload!.votes?.[state.currentGameIndex]}
              currentWinner={state.games[state.currentGameIndex]?.winner ?? null}
              p1Name={p1Name}
              p2Name={p2Name}
              onVote={(w) => voteResult(state.currentGameIndex, w)}
              onDecide={(w) => emit(C2S.RESULT_OVERRIDE, { matchId, gameIndex: state.currentGameIndex, winner: w })}
            />
          )}
        </>
      )}

    </div>
  );
}

function CivChip({ civ, dim, mark, animate }: { civ?: PoolView; dim?: boolean; mark?: "x" | "check"; animate?: boolean }) {
  if (!civ) return null;
  return (
    <div className={`relative flex w-16 flex-col items-center rounded-md border-2 border-bronze bg-surface-2 px-1 py-1 text-center ${dim ? "opacity-40" : ""} ${mark === "x" ? "opacity-60 saturate-0" : ""} ${animate ? "civ-pop" : ""}`} title={civ.name}>
      <Thumb src={civ.imageUrl} alt={civ.name} className={`aspect-square w-full object-contain ${mark === "x" ? "grayscale" : ""}`} />
      <span className="mt-0.5 w-full truncate text-[10px] leading-tight text-muted">{civ.name}</span>
      {mark === "x" && <span className="absolute inset-0 flex items-center justify-center text-2xl text-muted/70">✕</span>}
      {mark === "check" && <span className="absolute right-0.5 top-0.5 text-[10px] text-gold-bright">●</span>}
    </div>
  );
}

// One side of a turn-based offer draft: face-up, under that player's own name,
// with empty slots for what they still owe this phase.
function OpenOfferSide({ name, ids, target, tone, civById }: {
  name: string;
  ids: string[];
  target: number;
  tone: "sky" | "rose";
  civById: (id?: string) => PoolView | undefined;
}) {
  return (
    <div className={tone === "rose" ? "text-right" : ""}>
      <div className={`text-xs uppercase tracking-wide ${tone === "sky" ? "text-sky-400" : "text-rose-400"}`}>
        {name} ({ids.length}/{target})
      </div>
      <div className={`mt-1 flex gap-1.5 ${tone === "rose" ? "justify-end" : ""}`}>
        {ids.map((id) => <CivChip key={id} civ={civById(id)} animate />)}
        {Array.from({ length: Math.max(0, target - ids.length) }).map((_, i) => (
          <div key={i} className="h-[84px] w-16 rounded-md border-2 border-dashed border-border bg-surface-2/30" />
        ))}
      </div>
    </div>
  );
}

function HiddenSlot() {
  return <div className="flex h-[84px] w-16 items-center justify-center rounded-md border-2 border-dashed border-border bg-surface-2/40 text-muted">?</div>;
}

function OfferPhase({ duel, youPlayer, opp, canAct, hand, usedByYou, excludeUsed, onOffer, civById, p1Name, p2Name }: {
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
  p1Name: string;
  p2Name: string;
}) {
  const { t } = useI18n();
  const myOffered = youPlayer ? duel.offered[youPlayer] : [];
  const youSubmitted = youPlayer ? duel.submitted[youPlayer] : false;
  const oppSubmitted = opp ? duel.submitted[opp] : false;
  const offeredSet = new Set(myOffered);
  const usedSet = new Set(usedByYou);
  // Target for the whole offer phase, not just this step: with an alternating
  // draft the two sides can be several picks apart mid-phase and the slots should
  // show where each is heading.
  const targetOf = (p: "player1" | "player2" | null) =>
    p ? duel.offerTarget[p] : Math.max(duel.offerTarget.player1, duel.offerTarget.player2);

  // Turn-based: the draft is public, so both sides are shown face-up under their
  // own name — hiding the opponent's would leave you drafting against nothing.
  if (!duel.offerHidden) {
    return (
      <section className="aoe-panel rounded-xl p-5">
        <h3 className="font-display text-lg aoe-gold-text text-center">{t("offer.titleOpen", { n: duel.offerCount })}</h3>
        <div className="aoe-rule my-3" />
        <div className="grid grid-cols-2 gap-4">
          <OpenOfferSide name={p1Name} ids={duel.offered.player1} target={duel.offerTarget.player1} tone="sky" civById={civById} />
          <OpenOfferSide name={p2Name} ids={duel.offered.player2} target={duel.offerTarget.player2} tone="rose" civById={civById} />
        </div>
        {canAct && (
          <div className="mt-4">
            <div className="mb-2 text-xs text-muted">{t("offer.chooseHand", { n: duel.offerCount })}</div>
            <div className="grid gap-2" style={GRID_CIV}>
              {hand.map((c) => {
                const used = excludeUsed && usedSet.has(c.id);
                return (
                  <button key={c.id} disabled={used} onClick={() => onOffer(c.id)}
                    className={`relative flex flex-col items-center rounded-lg border-2 p-2 transition ${
                      used ? "border-border opacity-30 saturate-0" : "border-bronze hover:border-gold hover:bg-surface-2 cursor-pointer"}`}
                    title={c.name}>
                    <Thumb src={c.imageUrl} alt={c.name} className="aspect-square w-full object-contain" />
                    <span className="mt-1.5 w-full truncate text-xs leading-tight text-foreground">{c.name}</span>
                    {used && <span className="absolute right-1 top-1 text-[9px] text-muted">{t("match.used")}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="aoe-panel rounded-xl p-5">
      <h3 className="font-display text-lg aoe-gold-text text-center">{t("offer.title", { n: duel.offerCount })}</h3>
      <div className="aoe-rule my-3" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{t("offer.yourOffer")} {youSubmitted ? t("offer.locked") : `(${myOffered.length}/${targetOf(youPlayer)})`}</div>
          <div className="mt-1 flex gap-1.5">
            {myOffered.map((id) => <CivChip key={id} civ={civById(id)} animate />)}
            {Array.from({ length: Math.max(0, targetOf(youPlayer) - myOffered.length) }).map((_, i) => <HiddenSlot key={i} />)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted">{oppSubmitted ? t("offer.oppReady") : t("offer.oppChoosing")}</div>
          <div className="mt-1 flex justify-end gap-1.5">
            {Array.from({ length: targetOf(opp) }).map((_, i) => <HiddenSlot key={i} />)}
          </div>
        </div>
      </div>

      {canAct ? (
        <div className="mt-4">
          <div className="mb-2 text-xs text-muted">{t("offer.chooseHand", { n: duel.offerCount })}</div>
          <div className="grid gap-2" style={GRID_CIV}>
            {hand.map((c) => {
              const used = excludeUsed && usedSet.has(c.id);
              const offered = offeredSet.has(c.id);
              const disabled = used || offered;
              return (
                <button key={c.id} disabled={disabled} onClick={() => onOffer(c.id)}
                  className={`relative flex flex-col items-center rounded-lg border-2 p-2 transition ${
                    offered ? "border-gold bg-surface-2 ring-2 ring-gold" : used ? "border-border opacity-30 saturate-0" : "border-bronze hover:border-gold hover:bg-surface-2 cursor-pointer"}`}
                  title={c.name}>
                  <Thumb src={c.imageUrl} alt={c.name} className="aspect-square w-full object-contain" />
                  <span className="mt-1.5 w-full truncate text-xs leading-tight text-foreground">{c.name}</span>
                  {used && <span className="absolute right-1 top-1 text-[9px] text-muted">{t("match.used")}</span>}
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
                    className={`rounded-md transition ${canAct && !sniped ? "hover:scale-105 cursor-pointer" : ""} ${sniped ? "ring-2 ring-gold" : ""}`}>
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

// Every call site lays P1 out on the left and P2 on the right, so the side IS the
// owner — no need to thread a separate prop through.
/**
 * Always-visible strip of the whole draft flow with the current step marked —
 * players asked for the aoe2cm-style bar so they can see what is coming and how
 * far along the draft is without having to remember the format. Sticks to the
 * top and auto-scrolls the current step into view.
 */
function StepBar({ steps, currentIndex, finished }: {
  steps: DerivedState["stepBar"];
  currentIndex: number;
  finished: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const bar = ref.current;
    const el = bar?.querySelector<HTMLElement>('[data-current="1"]');
    if (!bar || !el) return;
    // Measured against the strip's own visible box, so this doesn't depend on
    // which ancestor happens to be the offsetParent.
    const barBox = bar.getBoundingClientRect();
    const elBox = el.getBoundingClientRect();
    const offsetInView = elBox.left - barBox.left;
    // Leave the strip alone while the current step is already fully in view —
    // early on the highlight should just walk to the right without the whole bar
    // sliding under it. Only once the step falls off an edge do we centre it.
    if (offsetInView >= 0 && offsetInView + elBox.width <= bar.clientWidth) return;
    // Scroll the strip itself rather than scrollIntoView(), which also scrolls
    // every scrollable ancestor and can drag the sticky bar's page along with it.
    const target = bar.scrollLeft + offsetInView - (bar.clientWidth - elBox.width) / 2;
    bar.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [currentIndex]);

  if (steps.length === 0) return null;
  return (
    <div ref={ref} className="no-scrollbar sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      {steps.map((s, i) => {
        const done = finished || i < currentIndex;
        const current = !finished && i === currentIndex;
        const own = ownerOf(s.actor ?? undefined);
        const newGame = i > 0 && s.gameIndex !== steps[i - 1].gameIndex;
        return (
          <div key={i} className="flex shrink-0 items-center gap-2">
            {newGame && <span className="mx-1 h-8 w-px bg-border" aria-hidden />}
            <div
              data-current={current ? "1" : undefined}
              title={s.label}
              className={[
                // Same shape as a step row in the preset editor: rounded card with
                // a thick left edge in the acting player's colour.
                "flex shrink-0 items-center gap-2 rounded-lg border border-l-4 px-3 py-2 whitespace-nowrap transition",
                own ? own.borderL : "border-l-bronze",
                current ? "border-gold bg-gold/15 ring-1 ring-gold"
                  : done ? "border-border/60 bg-surface-2/40 opacity-50"
                  : "border-border bg-surface-2/30",
              ].join(" ")}
            >
              <span className={`font-display text-sm ${current ? "text-gold-bright" : "text-muted"}`}>
                {done && !current ? "✓" : i + 1}
              </span>
              <span className={`text-sm leading-tight ${current ? "font-semibold text-gold-bright" : done ? "text-muted" : "text-foreground"}`}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Header for a simultaneous ban step: your own locked-in bans (nobody else can
// see them) plus whether the opponent has finished. Deliberately shows the
// opponent's *progress* only — never their targets.
function SimulBanStatus({ count, mine, youAwaited, oppAwaited, isPlayer, entryById }: {
  count: number;
  mine: string[];
  youAwaited: boolean;
  oppAwaited: boolean;
  isPlayer: boolean;
  entryById: (id?: string) => PoolView | undefined;
}) {
  const { t } = useI18n();
  return (
    <section className="aoe-panel rounded-xl p-5">
      <h3 className="font-display text-lg aoe-gold-text text-center">{t("simulban.title", { n: count })}</h3>
      <p className="mt-1 text-center text-xs text-muted">{t("simulban.hint")}</p>
      <div className="aoe-rule my-3" />
      {isPlayer ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">
              {t("simulban.yours")} {youAwaited ? `(${mine.length}/${count})` : t("offer.locked")}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {mine.map((id) => <CivChip key={id} civ={entryById(id)} mark="x" animate />)}
              {Array.from({ length: Math.max(0, count - mine.length) }).map((_, i) => <HiddenSlot key={i} />)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted">
              {oppAwaited ? t("offer.oppChoosing") : t("offer.oppReady")}
            </div>
            <div className="mt-1 flex justify-end gap-1.5">
              {Array.from({ length: count }).map((_, i) => <HiddenSlot key={i} />)}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted">{t("simulban.secret")}</p>
      )}
      {isPlayer && !youAwaited && <p className="mt-4 text-center text-sm text-gold-bright">{t("simulban.lockedWait")}</p>}
    </section>
  );
}

function CivStrip({ items, align, wide = false }: { items: { key: string; civ?: PoolView; used?: boolean; banned?: boolean }[]; align: "left" | "right"; wide?: boolean }) {
  const own = align === "left" ? OWNER.player1 : OWNER.player2;
  return (
    <div className={`flex flex-wrap items-end gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {items.map((it) =>
        it.civ ? (
          <div
            key={it.key}
            className={`civ-pop relative flex flex-col items-center rounded-md border-2 text-center ${wide ? "w-28 overflow-hidden" : "w-16 px-1 py-1"} ${
              it.banned ? "border-border bg-surface-2/40 opacity-50 saturate-0" : it.used ? "border-border bg-surface-2/40 opacity-45" : `${own.border} bg-surface-2`
            }`}
            title={it.banned ? `${it.civ.name} (banned)` : it.used ? `${it.civ.name} (used)` : it.civ.name}
          >
            <Thumb src={it.civ.imageUrl} alt={it.civ.name} className={`w-full ${wide ? "aspect-[16/10] object-cover" : "aspect-square object-contain"} ${it.used || it.banned ? "grayscale" : ""}`} />
            <span className={`w-full truncate text-[10px] leading-tight text-muted ${wide ? "px-1 py-0.5" : "mt-0.5"}`}>{it.civ.name}</span>
            {it.banned ? <span className="absolute inset-0 flex items-center justify-center text-2xl text-muted/70">✕</span> : it.used ? <span className="absolute right-0.5 top-0.5 text-[8px] text-muted">used</span> : null}
          </div>
        ) : null
      )}
    </div>
  );
}

// One player's maps: what they picked, with what they banned right below it —
// the two sit on the same side of the room so a glance answers "what did this
// player do to the map pool?" without cross-referencing anything.
function MapSide({ picked, banned, align }: {
  picked: MiniItem[];
  banned: MiniItem[];
  align: "left" | "right";
}) {
  const { t } = useI18n();
  const side = align === "right" ? "text-right" : "";
  return (
    <div className={`space-y-2 ${side}`}>
      {picked.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">{t("match.mapPickedTitle")}</div>
          <CivStrip items={picked} align={align} wide />
        </div>
      )}
      {banned.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-danger/80">{t("match.mapBannedTitle")}</div>
          <CivStrip items={banned} align={align} wide />
        </div>
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

/**
 * Sitting down without an account asks for a name first: the seat is stamped with
 * whatever the guest's token says at the moment they take it, so the name has to
 * exist before the seat does. Signed in, the account name is already there and the
 * button is just a button.
 *
 * Lazily reading the stored name inside the click handler rather than at render
 * keeps this safe to server-render — localStorage doesn't exist there, and seeding
 * state from it would hydrate to a different value than the server drew.
 */
function TakeSeatButton({ needsName, onTake }: { needsName: boolean; onTake: (name?: string) => void }) {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const clean = name.trim().slice(0, 32);

  if (!asking) {
    return (
      <button
        onClick={() => { if (!needsName) { onTake(); return; } setName(guestName() ?? ""); setAsking(true); }}
        className="aoe-btn rounded px-4 py-2 font-display"
      >
        {t("match.takeSeat")}
      </button>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (clean) onTake(clean); }} className="flex flex-col items-center gap-2">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={32}
        placeholder={t("match.guestName")}
        className="w-full rounded border border-border bg-surface-2 px-3 py-1.5 text-center text-sm text-foreground outline-none focus:border-gold" />
      <button type="submit" disabled={!clean} className="aoe-btn rounded px-4 py-2 font-display disabled:opacity-50">
        {t("match.takeSeat")}
      </button>
    </form>
  );
}

function Lobby({ seats, you, amHost, canPlay, loggedIn, bestOf, inviteUrl, copied, anonymous, publicHover, playAll, onCopy, onTake, onAddBot, onReady, onRename, onStart, onOptions, error }: {
  seats: { host: string; player1: Seat; player2: Seat };
  you: SeatRole | "spectator";
  amHost: boolean;
  /** Whether this viewer may take a seat at all (an account, or guest play being on). */
  canPlay: boolean;
  loggedIn: boolean;
  bestOf: number;
  inviteUrl: string;
  copied: boolean;
  anonymous: boolean;
  publicHover: boolean;
  playAll: boolean;
  onCopy: () => void;
  onTake: (seat: "player1" | "player2", name?: string) => void;
  onAddBot: (seat: "player1" | "player2") => void;
  onReady: (ready: boolean) => void;
  onRename: (name: string) => void;
  onStart: () => void;
  onOptions: (p: { anonymous?: boolean; publicHover?: boolean; playAll?: boolean }) => void;
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
          {seat?.name ? <span> · {seat.bot && "🤖 "}{seat.name}</span> : <span className="text-muted"> · {t("match.open")}</span>}
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
          <div className="mt-3 flex flex-col items-center gap-2">
            {canPlay && you === "spectator" ? (
              <TakeSeatButton needsName={!loggedIn} onTake={(name) => onTake(role, name)} />
            ) : (
              <span className="text-xs text-muted">{t("match.waitingPlayer")}</span>
            )}
            {/* Waiting for someone who may not be coming. You can walk the whole
                format through on your own instead. */}
            {(you === "player1" || you === "player2" || amHost) && (
              <button onClick={() => onAddBot(role)} className="rounded border border-border px-3 py-1.5 text-xs text-muted hover:text-gold-bright">
                {t("match.addBot")}
              </button>
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
        {/* Not a pitch for signing up — the header already has that button. Signed
            out, the thing holding your seat is a token in THIS browser, and the way
            to lose it is to move to another device mid-series. So say only that. */}
        {!loggedIn && <p className="mt-2 text-xs text-muted">{t("match.guestMode")}</p>}
        {(seats.player1?.bot || seats.player2?.bot) && (
          <p className="mx-auto mt-2 max-w-xl text-xs text-muted">{t("match.botHint")}</p>
        )}
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

      {/* Settings for THIS draft. The preset seeded these; the host can change
          them until the draft starts, so practising a shared tournament format
          quietly doesn't mean cloning the format. Everyone sees the current
          state — a player deserves to know whether they're being watched. */}
      <div className="aoe-panel rounded-xl p-5">
        <h3 className="font-display text-sm uppercase tracking-wide text-muted">{t("match.settings")}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <OptionToggle
            label={t("editor.anonymous")} hint={t("editor.anonymousHint")}
            checked={anonymous} disabled={!amHost}
            onChange={(v) => onOptions({ anonymous: v })}
          />
          <OptionToggle
            label={t("editor.publicHover")} hint={t("editor.publicHoverHint")}
            checked={publicHover} disabled={!amHost}
            onChange={(v) => onOptions({ publicHover: v })}
          />
          <OptionToggle
            label={t("match.playAll", { n: bestOf })} hint={t("match.playAllHint", { n: bestOf })}
            checked={playAll} disabled={!amHost}
            onChange={(v) => onOptions({ playAll: v })}
          />
        </div>
        {/* The host needs no explanation — the toggles say what they do, and they
            are live. A guest does need to know why they're greyed out. */}
        {!amHost && <p className="mt-3 text-xs text-muted">{t("match.privacyGuestHint")}</p>}
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

function OptionToggle({ label, hint, checked, disabled, onChange }: {
  label: string; hint: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex gap-2 rounded border border-border bg-surface-2/60 p-3 ${disabled ? "opacity-70" : "cursor-pointer hover:border-bronze"}`}>
      <input type="checkbox" className="mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}

function Countdown({ deadlineTs, clockOffsetRef }: { deadlineTs: number | null; clockOffsetRef: React.RefObject<number> }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadlineTs) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadlineTs]);
  if (!deadlineTs) return null;
  // Compare against the server's clock (local clock + measured offset), so the
  // displayed seconds line up with when the server actually expires the turn.
  const serverNow = now + (clockOffsetRef.current ?? 0);
  const remain = Math.max(0, Math.ceil((deadlineTs - serverNow) / 1000));
  return (
    <span className={`font-display tabular-nums ${remain <= 5 ? "text-danger" : "text-muted"}`}>
      ⏱ {remain}s
    </span>
  );
}

type TFn = (k: string, v?: Record<string, string | number>) => string;

// Colour cue: pick/select = green, ban/snipe = red, otherwise gold.
function ConfirmGate({ p1Name, p2Name, p1Confirmed, p2Confirmed, you, canConfirm, onConfirm }: {
  p1Name: string; p2Name: string; p1Confirmed: boolean; p2Confirmed: boolean;
  you: string; canConfirm: boolean; onConfirm: () => void;
}) {
  const { t } = useI18n();
  const isPlayer = you === "player1" || you === "player2";
  const youConfirmed = you === "player1" ? p1Confirmed : you === "player2" ? p2Confirmed : false;
  return (
    <div className="aoe-panel space-y-4 rounded-xl p-6 text-center">
      <div className="flex items-center justify-center gap-8">
        <ConfirmSeat name={p1Name} confirmed={p1Confirmed} tone={OWNER.player1} />
        <span className="font-display text-muted">vs</span>
        <ConfirmSeat name={p2Name} confirmed={p2Confirmed} tone={OWNER.player2} />
      </div>
      {isPlayer && (
        youConfirmed ? (
          <p className="text-sm text-muted">{t("match.confirmWaitingOpp")}</p>
        ) : (
          <div className="space-y-2">
            <button onClick={onConfirm} disabled={!canConfirm}
              className="aoe-btn rounded px-8 py-3 font-display text-lg disabled:opacity-50">
              ✓ {t("match.confirm")}
            </button>
            <p className="text-xs text-muted">{t("match.confirmWaitingYou")}</p>
          </div>
        )
      )}
    </div>
  );
}

// A confirmed seat lights up in that player's OWN colour rather than a generic
// green — same rule as everywhere else, and it keeps green off the draft screen.
function ConfirmSeat({ name, confirmed, tone }: { name: string; confirmed: boolean; tone: OwnerTone }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-3xl transition ${
        confirmed ? `${tone.border} ${tone.bg} ${tone.text}` : "border-border text-muted"
      }`}>
        {confirmed ? "✓" : "…"}
      </div>
      <span className={`font-display text-base ${tone.text}`}>{name}</span>
      <span className={`text-xs ${confirmed ? tone.text : "text-muted"}`}>{confirmed ? t("match.confirmed") : "—"}</span>
    </div>
  );
}

function turnLabel(state: DerivedState, t: TFn): string {
  if (!state.currentStep) return "";
  if (state.simultaneous) {
    const ty = state.currentStep.type;
    return ty === "CIV_OFFER" ? t("turn.offerBoth")
      : ty === "SYNC_CONFIRM" ? t("turn.confirmBoth")
      : ty === "MAP_BAN" || ty === "CIV_BAN" ? t("turn.banBoth")
      : t("turn.snipeBoth");
  }
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

function Pool({ title, entries, clickable, onPick, onHover, oppHover, highlightSelectable, pendingIds, kind = "civ", tone = "neutral" }: {
  title: string; entries: PoolView[]; clickable: (e: PoolView) => boolean; onPick: (id: string) => void;
  onHover: (id: string | null) => void; oppHover: string | null; highlightSelectable?: string[]; kind?: "civ" | "map";
  /** Your own not-yet-revealed simultaneous bans — shown only to you. */
  pendingIds?: string[];
  tone?: "ban" | "pick" | "neutral";
}) {
  const isMap = kind === "map";
  const pending = new Set(pendingIds ?? []);
  return (
    <section className="aoe-panel rounded-xl p-4">
      <h3 className="mb-3 font-display text-sm uppercase tracking-wide text-muted">{title}</h3>
      <div className="grid gap-2" style={isMap ? GRID_MAP : GRID_CIV}>
        {entries.map((e) => {
          const can = clickable(e);
          // During a select step (highlightSelectable given), only those entries are highlighted.
          const isSelectStep = highlightSelectable != null;
          const selectable = highlightSelectable ? highlightSelectable.includes(e.id) : true;
          const banned = e.state === "banned";
          const taken = e.state === "picked" || e.state === "drafted";
          const own = taken ? ownerOf(e.by) : null;
          const isPending = pending.has(e.id);
          return (
            <button
              key={e.id}
              disabled={!can}
              onClick={() => can && onPick(e.id)}
              onMouseEnter={() => onHover(e.id)}
              onMouseLeave={() => onHover(null)}
              className={[
                "relative flex flex-col items-center overflow-hidden rounded-lg border-2 transition",
                isMap ? "" : "p-2",
                // Banned entries are colourless on purpose — grey, faded, ✕.
                banned ? "border-border opacity-30 saturate-0" :
                  isSelectStep
                    ? (selectable
                        // Bright gold for the player actually selecting; dimmer for
                        // a watcher (e.g. the winner while the loser picks the map).
                        ? (can
                            ? "border-gold bg-surface-2 ring-2 ring-gold cursor-pointer hover:brightness-110"
                            : "border-gold/40 bg-surface-2/50 ring-1 ring-gold/30")
                        : "border-border opacity-25")
                    : (taken ? `${own ? `${own.border} ${own.bg}` : "border-bronze"} bg-surface-2` :
                       can ? (tone === "ban"
                              // Ban hover stays red: it is transient, follows your own
                              // cursor, and can't be mistaken for "this is P2's".
                              ? "border-bronze cursor-pointer hover:border-danger hover:bg-danger/10"
                              : "border-bronze cursor-pointer hover:border-gold hover:bg-surface-2") :
                       "border-border opacity-50"),
                // Your own pending simultaneous ban — locked in, not yet revealed.
                isPending ? "border-gold ring-2 ring-gold bg-gold/10 saturate-50" : "",
                oppHover === e.id
                  ? (tone === "ban" ? "ring-2 ring-danger bg-danger/20" : "ring-2 ring-gold-bright bg-gold/10")
                  : "",
              ].join(" ")}
              title={e.name}
            >
              <Thumb src={e.imageUrl} alt={e.name} className={`w-full ${isMap ? "aspect-[16/10] object-cover" : "aspect-square object-contain"} ${banned ? "grayscale" : ""}`} />
              <span className={`w-full truncate leading-tight ${banned ? "text-muted" : "text-foreground"} ${isMap ? "px-2 py-1.5 text-sm" : "mt-1.5 text-xs"}`}>{e.name}</span>
              {banned && <span className="absolute inset-0 flex items-center justify-center text-4xl text-muted/70">✕</span>}
              {taken && <span className={`absolute right-1 top-1 text-xs ${own?.text ?? "text-gold-bright"}`}>●</span>}
              {isPending && <span className="absolute left-1 top-1 text-sm text-gold-bright">🔒</span>}
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
        {won && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl leading-none">👑</span>}
        <div className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full ring-2 ${won ? "ring-gold-bright" : tone === "sky" ? "ring-sky-500/70" : "ring-rose-500/70"}`}>
          <Thumb src={civ?.imageUrl} alt={civ?.name ?? ""} className="civ-pop h-full w-full object-contain" />
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

function ResultControls({ gameIndex, mode, isHost, you, votes, currentWinner, onVote, onDecide, p1Name, p2Name }: {
  gameIndex: number;
  mode: "vote" | "host";
  isHost: boolean;
  you: SeatRole | "spectator";
  votes?: { player1?: string; player2?: string };
  currentWinner: "player1" | "player2" | null;
  onVote: (w: "player1" | "player2") => void;
  onDecide: (w: "player1" | "player2") => void;
  p1Name: string; p2Name: string;
}) {
  const { t } = useI18n();
  const nameOf = (w?: string) => (w === "player1" ? p1Name : w === "player2" ? p2Name : "—");
  const youPlayer = you === "player1" || you === "player2" ? you : null;
  const myVote = youPlayer ? votes?.[youPlayer] : undefined;
  const WinBtn = ({ w, vote, active }: { w: "player1" | "player2"; vote: boolean; active: boolean }) => (
    <button onClick={() => (vote ? onVote(w) : onDecide(w))}
      className={`aoe-btn rounded px-5 py-2 font-display ${active ? "ring-2 ring-gold-bright" : ""}`}>
      {t("result.won", { name: w === "player1" ? p1Name : p2Name })}
    </button>
  );

  return (
    <section className="aoe-panel rounded-xl p-5 text-center">
      <h3 className="font-display text-lg aoe-gold-text">{t("result.title", { n: gameIndex + 1 })}</h3>

      {mode === "vote" ? (
        <>
          {youPlayer ? (
            <>
              <p className="mt-1 text-xs text-muted">{t("result.voteHint")}</p>
              <div className="mt-3 flex justify-center gap-3">
                <WinBtn w="player1" vote active={myVote === "player1"} />
                <WinBtn w="player2" vote active={myVote === "player2"} />
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted">{t("result.voteWatch")}</p>
          )}
          <div className="mx-auto mt-4 max-w-xs space-y-1 border-t border-border/50 pt-3 text-xs">
            {(["player1", "player2"] as const).map((p) => (
              <div key={p} className="flex items-center justify-between gap-3">
                <span className="text-muted">{p === "player1" ? p1Name : p2Name}</span>
                <span className={votes?.[p] ? "text-gold-bright" : "text-muted"}>
                  {votes?.[p] ? t("result.votedFor", { name: nameOf(votes[p]) }) : t("result.noVote")}
                </span>
              </div>
            ))}
          </div>
          {votes?.player1 && votes?.player2 && votes.player1 !== votes.player2 && (
            <p className="mt-2 text-xs text-danger">{t("result.disagree")}</p>
          )}
          {isHost && (
            <div className="mt-3 border-t border-border/50 pt-3">
              <p className="text-xs text-muted">{t("result.hostResolve")}</p>
              <div className="mt-2 flex justify-center gap-2">
                {(["player1", "player2"] as const).map((w) => (
                  <button key={w} onClick={() => onDecide(w)}
                    className={`rounded border px-3 py-1.5 text-sm ${currentWinner === w ? "border-gold text-gold-bright" : "border-border text-muted hover:text-gold-bright"}`}>
                    {t("result.won", { name: w === "player1" ? p1Name : p2Name })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : isHost ? (
        <>
          <p className="mt-1 text-xs text-muted">{t("result.hostCall")}</p>
          <div className="mt-3 flex justify-center gap-3">
            <WinBtn w="player1" vote={false} active={currentWinner === "player1"} />
            <WinBtn w="player2" vote={false} active={currentWinner === "player2"} />
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

// Compact scoreboard shown when minimized: just colour dots + names + score,
// a short colour-toned status line, and each game's civs as flags (with a crown
// on the winner). Minimal text — the colours and flags carry the meaning.
type MiniItem = { key: string; civ?: PoolView; used?: boolean; banned?: boolean };
function MiniScoreboard({ state, p1Name, p2Name, civById, p1Hand, p2Hand, p1Banned, p2Banned, status, statusTone }: {
  state: DerivedState;
  p1Name: string;
  p2Name: string;
  civById: (id?: string) => PoolView | undefined;
  p1Hand: MiniItem[];
  p2Hand: MiniItem[];
  p1Banned: MiniItem[];
  p2Banned: MiniItem[];
  status: string;
  statusTone: string;
}) {
  const games = state.games.filter((g) => g.civP1 || g.civP2 || g.winner);
  const dot = (active: boolean, tone: string) =>
    `inline-block h-2.5 w-2.5 shrink-0 rounded-full ${active ? "bg-gold-bright ring-2 ring-gold-bright/30" : tone}`;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={dot(state.turn === "player1", "bg-sky-500")} />
          <span className="truncate font-display text-sm text-foreground">{p1Name}</span>
        </div>
        <div className="shrink-0 text-center">
          <div className="font-display text-2xl leading-none aoe-gold-text">{state.score.player1} — {state.score.player2}</div>
          <div className={`mt-0.5 text-[10px] ${statusTone}`}>{status}</div>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate font-display text-sm text-foreground">{p2Name}</span>
          <span className={dot(state.turn === "player2", "bg-rose-500")} />
        </div>
      </div>
      {games.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-border/40 pt-2">
          {games.map((g) => {
            const isCur = !state.finished && g.gameIndex === state.currentGameIndex;
            return (
              <div key={g.gameIndex} className={`flex items-center gap-1 rounded px-1 py-0.5 ${isCur ? "ring-1 ring-gold/50" : ""}`}>
                <MiniFlag civ={civById(g.civP1)} won={g.winner === "player1"} tone="sky" />
                <span className="text-[8px] text-muted">vs</span>
                <MiniFlag civ={civById(g.civP2)} won={g.winner === "player2"} tone="rose" />
              </div>
            );
          })}
        </div>
      )}
      {/* Picks — one row (P1 left, P2 right) */}
      {(p1Hand.length > 0 || p2Hand.length > 0) && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 border-t border-border/40 pt-2">
          <MiniIcons items={p1Hand} align="left" />
          <MiniIcons items={p2Hand} align="right" />
        </div>
      )}
      {/* Bans — separate row */}
      {(p1Banned.length > 0 || p2Banned.length > 0) && (
        <div className="mt-1 grid grid-cols-2 gap-x-3">
          <MiniIcons items={p1Banned} align="left" ban />
          <MiniIcons items={p2Banned} align="right" ban />
        </div>
      )}
    </div>
  );
}

// One compact icon row: civs picked (dim when already used) or banned (grayscale + ✕).
function MiniIcons({ items, align, ban }: { items: MiniItem[]; align: "left" | "right"; ban?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-0.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {items.map((it) => it.civ ? (
        ban ? (
          <span key={it.key} className="relative inline-flex" title={`${it.civ.name} (banned)`}>
            <Thumb src={it.civ.imageUrl} alt={it.civ.name} className="h-6 w-6 rounded object-contain opacity-60 grayscale" />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] text-muted">✕</span>
          </span>
        ) : (
          <span key={it.key} className="inline-flex" title={it.used ? `${it.civ.name} (used)` : it.civ.name}>
            <Thumb src={it.civ.imageUrl} alt={it.civ.name} className={`h-6 w-6 rounded object-contain ${it.used ? "opacity-40 grayscale" : ""}`} />
          </span>
        )
      ) : null)}
    </div>
  );
}

function MiniFlag({ civ, won, tone }: { civ?: PoolView; won: boolean; tone: "sky" | "rose" }) {
  return (
    <span className="relative inline-flex">
      {won && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] leading-none">👑</span>}
      <span className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-1 ${won ? "ring-gold-bright" : tone === "sky" ? "ring-sky-500/50" : "ring-rose-500/50"}`}>
        <Thumb src={civ?.imageUrl} alt={civ?.name ?? ""} className={`h-full w-full object-cover ${civ ? "" : "opacity-30"}`} />
      </span>
    </span>
  );
}

// A titled section in the scoreboard that can collapse to save space.
function CollapsibleSection({ title, danger, defaultOpen = true, children }: {
  title: string; danger?: boolean; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between text-[10px] uppercase tracking-wide hover:text-gold-bright ${danger ? "text-danger/80" : "text-muted"}`}>
        <span>{title}</span>
        <span className="text-muted">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

// Per-game overview, merged into the scoreboard right under the score: one card
// per game with both civs, a crown on the winner, and the map (image only,
// centered between the two civs).
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
    <div className="mt-3 border-t border-border/50 pt-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {played.map((g) => {
          const isCurrent = !state.finished && g.gameIndex === state.currentGameIndex;
          const m = mapById(g.map);
          return (
            <div key={g.gameIndex}
              className={`rounded-lg border bg-surface-2/40 p-3 ${isCurrent ? "border-gold ring-1 ring-gold/40" : "border-border/70"}`}>
              <div className="mb-2 text-center text-[11px] uppercase tracking-wide text-muted">{t("match.gameN", { n: g.gameIndex + 1 })}</div>
              <div className="flex items-center justify-between gap-1">
                <GameSide name={p1Name} civ={civById(g.civP1)} won={g.winner === "player1"} tone="sky" />
                <div className="flex shrink-0 flex-col items-center gap-0.5">
                  {m?.imageUrl ? (
                    <Thumb src={m.imageUrl} alt={m.name} className="h-14 w-20 rounded object-cover ring-1 ring-bronze" />
                  ) : (
                    <div className="h-14 w-20 rounded bg-surface-2/60 ring-1 ring-border" />
                  )}
                  {m && <span className="w-20 truncate text-center text-[9px] text-foreground/70" title={m.name}>{m.name}</span>}
                  <span className="font-display text-[10px] text-muted">VS</span>
                </div>
                <GameSide name={p2Name} civ={civById(g.civP2)} won={g.winner === "player2"} tone="rose" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GameSide({ name, civ, won, tone }: { name: string; civ?: PoolView; won: boolean; tone: "sky" | "rose" }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
      <div className="relative">
        {won && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-base leading-none">👑</span>}
        <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full ring-2 ${won ? "ring-gold-bright" : tone === "sky" ? "ring-sky-500/50" : "ring-rose-500/50"}`}>
          <Thumb src={civ?.imageUrl} alt={civ?.name ?? ""} className={`h-full w-full object-cover ${civ ? "" : "opacity-30"}`} />
        </div>
      </div>
      <span className={`mt-1 max-w-full truncate text-[10px] ${won ? "aoe-gold-text" : "text-foreground/80"}`}>{civ?.name ?? "—"}</span>
      <span className="max-w-full truncate text-[9px] text-muted">{name}</span>
    </div>
  );
}
