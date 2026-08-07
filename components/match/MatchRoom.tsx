"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { GUEST_ACCESS } from "@/lib/features";
import { getGuestToken, guestName, setGuestName } from "@/lib/guest";
import { Thumb } from "@/components/Thumb";
import { getSocket } from "@/lib/socket/client";
import { C2S, S2C } from "@/lib/socket/events";
import { useI18n } from "@/lib/i18n";
import { CIVS } from "@/data/civs";
import { DEFAULT_MAPS } from "@/data/maps";
import type { DerivedState, PoolView, SeatRole, CivDuel, GameRec } from "@/lib/draft/engine";

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
/** Shared empty set, so callers don't allocate one per render. */
const EMPTY_IDS: Set<string> = new Set();
const GRID_MAP = { gridTemplateColumns: "repeat(auto-fit, minmax(176px, 1fr))" };

/** Frosted plate for a name laid over artwork: the picture stays a picture. */
const GLASS: React.CSSProperties = {
  background: "rgba(15,17,21,.42)",
  backdropFilter: "blur(7px)",
  WebkitBackdropFilter: "blur(7px)",
};

type Seat = { id: string; name?: string; ready?: boolean; guest?: boolean; bot?: boolean } | null;
interface Payload {
  matchId: string;
  status: string;
  publicHover: boolean;
  resultMode?: "vote" | "host";
  pausable?: boolean;
  anonymous?: boolean;
  deadlineTs: number | null;
  /** Seconds the current step was given, so the display can never exceed it. */
  limitSec?: number | null;
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
  const ticketRef = useRef<string | undefined>(undefined);
  // The panel the player acts on, and the step it was last scrolled for.
  const actionRef = useRef<HTMLDivElement>(null);
  const lastStepRef = useRef<number | null>(null);
  // Whether the board has scrolled off the top, which is exactly when the sticky
  // strip has something to stand in for.
  const [scrolledPast, setScrolledPast] = useState(false);
  const stripObserver = useRef<IntersectionObserver | null>(null);
  // A ref callback rather than an effect: the sentinel doesn't exist until the
  // draft is running, and an effect that ran once in the lobby would never see it.
  const watchSentinel = useCallback((el: HTMLDivElement | null) => {
    stripObserver.current?.disconnect();
    stripObserver.current = null;
    if (!el) { setScrolledPast(false); return; }
    const io = new IntersectionObserver(
      // A clean handoff: the strip appears the moment the end of the board goes
      // under the step bar, and not before. The strip covers the top of the page
      // rather than sitting in the margin, so showing it early would put a second
      // clock directly above the one still on screen.
      // Only upward — a sentinel below the fold means the whole page fits anyway.
      ([e]) => setScrolledPast(!e.isIntersecting && e.boundingClientRect.top < 60),
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" }
    );
    io.observe(el);
    stripObserver.current = io;
  }, []);
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
    const el = actionRef.current;
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
  // Whether the step is one where the player is working a pool. Those are the
  // steps where the board should get out of the way and give the height to what
  // is being clicked; the rest (calling a game, the confirm gate, the end of the
  // series) are moments to look up, and the board can have the room.
  const poolStep = !state.finished && !ackPending && Boolean(step)
    && step!.type !== "GAME_RESULT" && step!.type !== "SYNC_CONFIRM";

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

  const civById = (id?: string) => civsView.find((c) => c.id === id);
  const mapById = (id?: string) => mapsView.find((m) => m.id === id);
  // Civs the opponent closed off against YOU specifically. A ban with "opponent"
  // scope never changes the civ's global state — it is still the banner's to take —
  // so the pool grid had no way of knowing it was dead to you, and drew it exactly
  // like an open civ. Every EGC ban is this kind, which is why "banned" and "still
  // available" were indistinguishable in the format that leans on them hardest.
  const blockedForMe = opp
    ? state.civBans.filter((b) => b.scope === "opponent" && b.by === opp).map((b) => b.id)
    : [];

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
      {/* The one thing that stays on screen. The board below it says everything,
          but it scrolls away exactly when the draft gets busy — so what you need
          in order to act, and nothing else, rides along at the top: the clock,
          the map you are drafting for, whose turn, and the score. */}
      <div className="sticky top-0 z-30 -mx-4 bg-background/95 backdrop-blur">
        {scrolledPast && !state.finished && payload!.status === "running" && (
          <TurnStrip
            state={state} payload={payload!} p1Name={p1Name} p2Name={p2Name}
            map={mapById(currentMap)} mapName={currentMapName} clockOffsetRef={clockOffsetRef}
            youAwaiting={!spectator && !!youPlayer && state.awaiting[youPlayer] && !ackPending}
            t={t}
          />
        )}
        <StepBar steps={state.stepBar} currentIndex={state.currentStepIndex} finished={state.finished} />
      </div>

      {error && <div className="rounded border border-danger/60 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}

      <OverviewBand
        state={state} payload={payload!} focus={poolStep} you={you}
        youAwaiting={!spectator && !!youPlayer && state.awaiting[youPlayer] && payload!.status === "running" && !ackPending}
        p1Name={p1Name} p2Name={p2Name} civById={civById} mapById={mapById}
        clockOffsetRef={clockOffsetRef} outcomeLabel={outcomeLabel}
        canTake={!spectator && you === "spectator" && canPlay}
        needsName={!session?.user}
        onTake={takeSeat}
        canPause={(you === "player1" || you === "player2" || isHost) && !state.finished
          && (payload!.pausable !== false || payload!.status === "paused")}
        onPause={() => emit(C2S.PAUSE, { matchId, paused: payload!.status !== "paused" })}
        t={t}
      />

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

      {/* Whose turn it is, at the edge of the window. Portalled for the same reason
          as the rails: the page wrapper keeps a transform after its route animation,
          and a transformed ancestor is what position:fixed resolves against.
          Both sides light up on a simultaneous step, and each goes out as that
          player locks in — so the glow answers "who are we waiting for", not just
          "whose step is this". */}
      {payload!.status === "running" && !state.finished && !ackPending &&
        createPortal(
          <>
            {(["player1", "player2"] as const)
              .filter((seat) => (state.simultaneous ? state.awaiting[seat] : state.turn === seat))
              .map((seat) => (
                <div key={seat} aria-hidden className={`turn-glow fixed inset-y-0 z-10 w-[220px] ${seat === "player1" ? "left-0" : "right-0"}`}
                  style={{
                    background: `linear-gradient(to ${seat === "player1" ? "right" : "left"}, rgba(${
                      seat === "player1" ? "56,189,248" : "251,113,133"
                    },.4), transparent)`,
                  }} />
              ))}
          </>,
          document.body
        )}

      {/* Marks the end of the board. Once it passes the top of the window the
          sticky strip takes over carrying the clock and the map. */}
      <div ref={watchSentinel} aria-hidden className="h-px" />

      {/* Everything you actually act on, under one anchor. The board above carries
          whose turn it is and how long is left, so what is left down here is the
          thing to click — and that is what the page should bring to you when the
          step changes, not a caption about it. */}
      <div ref={actionRef} className="scroll-mt-28 space-y-5">
        {/* What you are about to do, and the map you are about to do it for.
            The strip at the top of the window carries the same map small, for when
            this has scrolled away; here it gets to be a picture, right beside the
            instruction and directly above the pool being clicked — which is where
            the eye already is. */}
        {step && !state.finished && (
          <div className="flex items-center justify-center gap-4">
            {currentMap && step.type !== "GAME_RESULT" && (
              <div className="relative shrink-0" style={{ width: 176, height: 110 }}>
                <Thumb src={mapById(currentMap)?.imageUrl} alt={currentMapName ?? ""}
                  className="h-full w-full rounded-md border-2 border-gold bg-surface-2 object-cover" />
                <MapLabel name={currentMapName} size={14} />
              </div>
            )}
            <p className={`font-display text-xl aoe-gold-text ${currentMap ? "text-left" : "text-center"}`}>
              {step.type === "GAME_RESULT" ? t("match.gameN", { n: state.currentGameIndex + 1 }) : (step.label || step.type)}
            </p>
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
          blockedIds={blockedForMe}
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
          // Every snipe step gets a fresh panel. Without this React reuses the one
          // instance across games, and game 2 opens with game 1's marks still
          // staged and its "already sent" latch down — a confirm button that does
          // nothing at all.
          key={state.currentStepIndex}
          duel={duel}
          youPlayer={youPlayer}
          opp={opp}
          spectator={spectator}
          canAct={canActDuel}
          onSnipe={act}
          civById={civById}
          deadlineTs={payload!.status === "paused" ? null : payload!.deadlineTs}
          clockOffsetRef={clockOffsetRef}
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
    </div>
  );
}

/**
 * The board: everything true about the series in one glance-sized block — which
 * maps, who holds what, whose turn it is, how long they have left.
 *
 * It replaces a scoreboard and three collapsible sections that between them said
 * the same things in five places, none of them where you were looking. The layout
 * comes from a wireframe a player drew: maps across the top, both hands converging
 * on the clock in the middle, bans underneath.
 *
 * Two heights. `focus` is on for every step where somebody is working a pool, and
 * it squeezes the board to roughly 150px so the grid being clicked stays on screen;
 * off it — calling a game, the confirm gate, the end of the series — nothing is
 * waiting on a click and the board can have the room.
 */
function OverviewBand({
  state, payload, focus, you, youAwaiting, p1Name, p2Name, civById, mapById,
  clockOffsetRef, outcomeLabel, canTake, needsName, onTake, canPause, onPause, t,
}: {
  state: DerivedState;
  payload: Payload;
  focus: boolean;
  you: SeatRole | "spectator";
  /** The viewer owes an input right now (their turn, or their half of a simultaneous step). */
  youAwaiting: boolean;
  p1Name: string;
  p2Name: string;
  civById: (id?: string) => PoolView | undefined;
  mapById: (id?: string) => PoolView | undefined;
  clockOffsetRef: React.RefObject<number>;
  outcomeLabel: string;
  canTake: boolean;
  needsName: boolean;
  onTake: (seat: "player1" | "player2", name?: string) => void;
  canPause: boolean;
  onPause: () => void;
  t: TFn;
}) {
  const seats = ["player1", "player2"] as const;
  const step = state.currentStep;
  const acting = state.finished
    ? []
    : state.simultaneous
      ? seats.filter((s) => state.awaiting[s])
      : state.turn === "player1" || state.turn === "player2" ? [state.turn] : [];

  // How many entries a seat will be asked for across the whole draft. This is what
  // lets the pick band draw its empty slots up front instead of growing a tile at a
  // time and shoving the pool down the page mid-reach.
  const reserved = (type: string, seat: "player1" | "player2") =>
    state.stepBar.filter((s) => s.type === type && s.actor === seat).reduce((n, s) => n + s.count, 0);

  // Only draw the games the series can still reach. A Bo9 decided at 5-0 never
  // plays games 6 to 9, and four empty boxes claiming otherwise is a worse lie
  // than a short row. Always at least far enough to include the game in progress.
  const decided = state.games.filter((g) => g.winner).length;
  const leader = Math.max(state.score.player1, state.score.player2);
  const shownGames = state.playAll
    ? state.bestOf
    : Math.min(state.bestOf, Math.max(state.currentGameIndex + 1, decided + (state.target - leader)));

  const played = new Set(state.games.map((g) => g.map).filter(Boolean) as string[]);
  const mapPhase = step?.type === "MAP_BAN" || step?.type === "MAP_PICK" || step?.type === "MAP_SELECT";
  // The unclaimed maps are worth showing once the map grid is gone — that grid is
  // where they live while it's up, and repeating it here would just be the same
  // pictures twice, one of them too small to use.
  const neutral = mapPhase ? [] : state.maps.filter((m) => m.state === "available").map((m) => m.id);

  const duel = state.civDuel;
  const hidden = step?.type === "CIV_OFFER" && duel?.offerHidden;
  // A hidden offer that has been handed in: you know their hand, you don't know
  // which of it is in play. That is exactly one fact, and it is a count.
  const mystery = (seat: "player1" | "player2") =>
    hidden && duel!.offered[seat].length === 0 && !state.awaiting[seat] ? duel!.offerTarget[seat] : 0;

  const size = focus ? 56 : 76;
  const names = { player1: p1Name, player2: p2Name };

  return (
    <div className="aoe-panel rounded-xl px-4 py-3">
      {/* Title line */}
      <div className="flex items-center justify-center gap-3 font-display">
        <span className="text-[13px] uppercase tracking-[.12em] text-gold-bright">
          {state.playAll ? t("match.bestOfAll", { n: state.bestOf }) : t("match.bestOf", { n: state.bestOf, t: state.target })}
        </span>
        <span className="text-xl">
          <span className={OWNER.player1.text}>{state.score.player1}</span>
          <span className="mx-1.5 text-bronze">—</span>
          <span className={OWNER.player2.text}>{state.score.player2}</span>
        </span>
        {payload.anonymous && (
          <span className="rounded border border-bronze px-1.5 py-0.5 font-sans text-[10px] text-gold-bright" title={t("match.anonymousHint")}>
            🕶 {t("match.anonymous")}
          </span>
        )}
      </div>

      {/* Maps: the games, then what is left to play them on */}
      <div className="mt-2 flex flex-wrap items-end justify-center gap-1.5">
        {state.games.slice(0, shownGames).map((g) => (
          <GameCell key={g.gameIndex} game={g} current={!state.finished && g.gameIndex === state.currentGameIndex}
            map={mapById(g.map)} names={names} focus={focus} t={t} />
        ))}
        {(state.mapsByP1.length > 0 || state.mapsByP2.length > 0 || neutral.length > 0 || mapPhase) && (
          <>
            <span className="mx-1.5 h-10 w-px self-center bg-bronze" aria-hidden />
            {seats.map((s) => (
              <MapPoolSeg key={s} seat={s} ids={s === "player1" ? state.mapsByP1 : state.mapsByP2}
                slots={reserved("MAP_PICK", s)} played={played} mapById={mapById} focus={focus} />
            ))}
            {neutral.map((id) => (
              <BandTile key={id} entry={mapById(id)} kind="map" ring="border-bronze" h={focus ? 58 : 70} w={focus ? 93 : 112} />
            ))}
          </>
        )}
      </div>

      <div className="aoe-rule my-2.5" />

      {/* Both hands converging on the clock, bans underneath. */}
      <div className="grid items-start gap-2" style={{ gridTemplateColumns: `1fr ${focus ? 190 : 220}px 1fr` }}>
        {seats.map((s, i) => {
          const left = i === 0;
          const ids = s === "player1" ? state.draftedByP1 : state.draftedByP2;
          const usedIds = new Set(state.games.map((g) => (s === "player1" ? g.civP1 : g.civP2)).filter(Boolean) as string[]);
          const slots = Math.max(reserved("CIV_PICK", s), ids.length);
          // A long hand shrinks rather than wrapping into a shape nobody reads.
          const tile = slots > 8 ? Math.round(size * 0.8) : size;
          return (
            <div key={s} className={`${left ? "order-1 items-end" : "order-3 items-start"} flex min-w-0 flex-col gap-1.5`}>
              <SeatName seat={s} name={names[s]} you={you} occupied={Boolean(payload.seats[s])}
                crowned={state.finished && state.score[s] > state.score[s === "player1" ? "player2" : "player1"]}
                acting={acting.includes(s)} canTake={canTake && !payload.seats[s]} needsName={needsName}
                onTake={(n) => onTake(s, n)} align={left ? "right" : "left"} t={t} />
              <TileRow align={left ? "right" : "left"}>
                {Array.from({ length: slots }, (_, n) => {
                  const id = ids[n];
                  return id
                    ? <BandTile key={id} entry={civById(id)} kind="civ" ring={OWNER[s].border} h={tile} w={tile}
                        dim={usedIds.has(id)} title={usedIds.has(id) ? `${civById(id)?.name} (${t("match.used")})` : undefined} pop />
                    : <EmptySlot key={`e${n}`} h={tile} w={tile} />;
                })}
                {Array.from({ length: mystery(s) }, (_, n) => <MysterySlot key={`m${n}`} h={tile} w={tile} />)}
              </TileRow>
              {/* Civ bans and map bans get a line each. Wrapped together they
                  formed one ragged run of mixed shapes, and "which of these were
                  maps?" is not a question the row should be asking. */}
              <TileRow align={left ? "right" : "left"}>
                {state.civBans.filter((b) => b.by === s).map((b) => (
                  <BandTile key={b.id} entry={civById(b.id)} kind="civ" ring="border-[rgba(154,145,125,.45)]" h={44} w={44} struck />
                ))}
              </TileRow>
              <TileRow align={left ? "right" : "left"}>
                {state.maps.filter((m) => m.state === "banned" && m.by === s).map((m) => (
                  <BandTile key={m.id} entry={m} kind="map" ring="border-[rgba(154,145,125,.45)]" h={58} w={93} struck />
                ))}
              </TileRow>
            </div>
          );
        })}

        {/* The clock, and who it is running against. */}
        <div className="order-2 flex flex-col items-center text-center">
          {state.finished ? (
            <span className="font-display text-lg aoe-gold-text">{outcomeLabel}</span>
          ) : (
            <>
              <span className={youAwaiting ? "font-display text-lg text-gold-bright" : "text-[13px] font-semibold text-gold-bright"}>
                {youAwaiting ? t("match.yourMove")
                  : state.simultaneous ? t("turn.simultaneous")
                  : acting.length === 1 ? (
                  <>
                    {acting[0] === "player1" ? "◀ " : ""}
                    {t("turn.now")} <span className={`font-display text-[15px] ${OWNER[acting[0]].text}`}>{names[acting[0]]}</span>
                    {acting[0] === "player2" ? " ▶" : ""}
                  </>
                ) : state.turn === "host" ? t("turn.randomDraw") : t("turn.awaitResult")}
              </span>
              {payload.status === "paused" ? (
                <span className="font-display text-2xl text-danger">{t("match.paused")}</span>
              ) : (
                <BigCountdown deadlineTs={payload.deadlineTs} limitSec={payload.limitSec} clockOffsetRef={clockOffsetRef}
                  size={focus ? 40 : 44} live={youAwaiting} />
              )}
              {/* Whose the clock belongs to, when it isn't yours. */}
              {!youAwaiting && acting.length > 0 && (
                <span className="text-[10px] uppercase tracking-[.16em] text-muted">{state.currentStep?.label || state.currentStep?.type}</span>
              )}
            </>
          )}
          {canPause && (
            <button onClick={onPause} className="mt-0.5 text-[10px] text-muted hover:text-gold-bright">
              {payload.status === "paused" ? `▶ ${t("match.resume")}` : `⏸ ${t("match.pause")}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * What you need in order to take your turn, pinned to the top of the page.
 *
 * The board carries all of this and more, but the board is where the page starts
 * and the pool is where it ends — by the time you are picking, the board is gone.
 * So this is the board reduced to the two facts you cannot act without: how long
 * you have, and which map you are drafting for. They are the biggest things on it
 * for that reason; the turn, the step and the score come along because they are
 * cheap to carry once the strip exists.
 */
function TurnStrip({ state, payload, p1Name, p2Name, map, mapName, clockOffsetRef, youAwaiting, t }: {
  state: DerivedState;
  payload: Payload;
  p1Name: string;
  p2Name: string;
  map?: PoolView;
  mapName?: string;
  clockOffsetRef: React.RefObject<number>;
  youAwaiting: boolean;
  t: TFn;
}) {
  const seats = ["player1", "player2"] as const;
  const acting = state.simultaneous
    ? seats.filter((s) => state.awaiting[s])
    : state.turn === "player1" || state.turn === "player2" ? [state.turn] : [];
  const names = { player1: p1Name, player2: p2Name };
  return (
    <div className="fade-in flex items-center justify-center gap-5 px-4 py-2">
      {/* Whose move, and what the move is. */}
      <div className="flex min-w-0 flex-col items-end leading-tight">
        <span className={`truncate font-display text-[15px] ${youAwaiting ? "text-gold-bright" : "text-foreground"}`}>
          {youAwaiting ? t("match.yourMove")
            : state.simultaneous ? t("turn.simultaneous")
            : acting.length === 1 ? (
              <><span className={OWNER[acting[0]].text}>{names[acting[0]]}</span></>
            ) : state.turn === "host" ? t("turn.randomDraw") : t("turn.awaitResult")}
        </span>
        <span className="max-w-[22ch] truncate text-[11px] text-muted">
          {state.currentStep?.label || state.currentStep?.type}
        </span>
      </div>

      {/* The map this is all for. Big, because a civ pick made against the wrong
          map is the one mistake this whole screen exists to prevent. */}
      {map && (
        <div className="relative shrink-0" style={{ width: 92, height: 58 }}>
          <Thumb src={map.imageUrl} alt={map.name} className="h-full w-full rounded border-2 border-gold bg-surface-2 object-cover" />
          <MapLabel name={mapName} size={10} />
        </div>
      )}

      {payload.status === "paused" ? (
        <span className="font-display text-2xl text-danger">{t("match.paused")}</span>
      ) : (
        <BigCountdown deadlineTs={payload.deadlineTs} limitSec={payload.limitSec} clockOffsetRef={clockOffsetRef} size={38} live={youAwaiting} />
      )}

      <span className="font-display text-base">
        <span className={OWNER.player1.text}>{state.score.player1}</span>
        <span className="mx-1 text-bronze">—</span>
        <span className={OWNER.player2.text}>{state.score.player2}</span>
      </span>
    </div>
  );
}

/** One game of the series: the map it was played on, and who took it. */
function GameCell({ game, current, map, names, focus, t }: {
  game: GameRec; current: boolean; map?: PoolView;
  names: { player1: string; player2: string }; focus: boolean; t: TFn;
}) {
  const won = game.winner ?? null;
  const w = focus ? (current ? 100 : 78) : 150;
  const h = Math.round(w * 0.62);
  // No map yet is the normal state for every game but the first: the loser of the
  // previous one picks it, and that has not happened. A dashed box says "not yet"
  // where a grey thumbnail would say "missing".
  if (!game.map) {
    return (
      <div style={{ width: w, height: h }}
        className="flex items-center justify-center rounded-md border border-dashed border-bronze/60 font-display text-base text-bronze"
        title={t("match.gameN", { n: game.gameIndex + 1 })}>?</div>
    );
  }
  const tone = won ? OWNER[won] : null;
  return (
    <div className="flex flex-col items-center" style={{ width: w }}>
      <div className={`relative overflow-hidden rounded-md border-2 ${
        won ? tone!.border : current ? "border-gold ovl-glow" : "border-border"
      }`} style={{ width: w, height: h, opacity: won ? 0.75 : 1 }}>
        <Thumb src={map?.imageUrl} alt={map?.name ?? ""} className="h-full w-full object-cover" />
        <MapLabel name={map?.name} size={focus ? 10 : 12} dim={Boolean(won)} />
        {won && <span className="absolute right-0.5 top-0 text-[11px] leading-tight">👑</span>}
      </div>
      <span className={`w-full truncate text-center text-[10px] leading-tight ${
        won ? tone!.text : current ? "text-gold-bright" : "text-muted"
      }`}>
        G{game.gameIndex + 1}{won ? ` · ${names[won]}` : ""}
      </span>
    </div>
  );
}

/** The maps one player put on the table, with the ones they still owe drawn empty. */
function MapPoolSeg({ seat, ids, slots, played, mapById, focus }: {
  seat: "player1" | "player2"; ids: string[]; slots: number;
  played: Set<string>; mapById: (id?: string) => PoolView | undefined; focus: boolean;
}) {
  const total = Math.max(slots, ids.length);
  if (total === 0) return null;
  const h = focus ? 58 : 70, w = focus ? 93 : 112;
  return (
    <div className="flex items-start gap-1">
      {Array.from({ length: total }, (_, i) => {
        const id = ids[i];
        return id
          ? <BandTile key={id} entry={mapById(id)} kind="map" ring={OWNER[seat].border} h={h} w={w} dim={played.has(id)} />
          : <EmptySlot key={`e${i}`} h={h} w={w} />;
      })}
    </div>
  );
}

function TileRow({ align, children }: { align: "left" | "right"; children: React.ReactNode }) {
  return <div className={`flex flex-wrap gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>{children}</div>;
}

/**
 * A map's name, on the map.
 *
 * Under the picture it costs a line of height everywhere it appears, and those
 * lines add up to the reason every map on this page was small. Over the picture
 * it costs nothing, so each one grows by exactly the caption it used to carry.
 * Inset by the border: the frame is what says whose map this is.
 */
function MapLabel({ name, size = 11, dim }: { name?: string; size?: number; dim?: boolean }) {
  if (!name) return null;
  return (
    <span
      className={`pointer-events-none absolute bottom-[2px] left-[2px] right-[2px] truncate rounded-b px-1 text-center font-semibold ${dim ? "text-gold-bright/60" : "text-gold-bright"}`}
      style={{ ...GLASS, fontSize: size, lineHeight: `${Math.round(size * 1.4)}px` }}
    >
      {name}
    </span>
  );
}

function BandTile({ entry, kind, ring, h, w, dim, struck, pop, title }: {
  entry?: PoolView; kind: "civ" | "map"; ring: string; h: number; w: number;
  dim?: boolean; struck?: boolean; pop?: boolean; title?: string;
}) {
  const img = (
    <div className="relative w-full" style={{ height: h }}>
      <Thumb src={entry?.imageUrl} alt={entry?.name ?? ""}
        className={`h-full w-full rounded border-2 bg-surface-2 ${ring} ${kind === "civ" ? "object-contain" : "object-cover"} ${
          struck ? "grayscale" : dim ? "opacity-40 grayscale" : ""
        } ${pop ? "civ-pop" : ""}`} />
      {struck && <span className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-danger" />}
    </div>
  );
  // Every map says its name; a civ flag is its own label. The name rides on the
  // picture, so the picture gets the height the caption used to take.
  return (
    <div className="relative shrink-0" style={{ width: w, height: h }} title={title ?? entry?.name}>
      {img}
      {kind === "map" && <MapLabel name={entry?.name} size={Math.max(9, Math.round(h * 0.19))} dim={struck || dim} />}
    </div>
  );
}

/** A slot this player still owes. Reserving it is what keeps the page still. */
function EmptySlot({ h, w }: { h: number; w: number }) {
  return <div className="shrink-0 rounded border-2 border-dashed border-border bg-surface-2/35" style={{ width: w, height: h }} aria-hidden />;
}

/**
 * Your hand, during an offer. One component for both kinds of offer — the open
 * one and the hidden one — because when they were two copies only the hidden one
 * learned to mark what you had already put up, and the open one (which is the
 * kind that asks for two civs one at a time) left a chosen civ looking exactly
 * like a fresh one you could still click.
 */
function OfferHand({ hand, count, offered, used, onOffer, t }: {
  hand: PoolView[];
  count: number;
  /** Civs you have already put up for this game. */
  offered: Set<string>;
  /** Civs already played in an earlier game, when the format forbids repeats. */
  used: Set<string>;
  onOffer: (id: string) => void;
  t: TFn;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-xs text-muted">{t("offer.chooseHand", { n: count })}</div>
      <div className="grid gap-2" style={GRID_CIV}>
        {hand.map((c) => {
          const isUsed = used.has(c.id);
          const isOffered = offered.has(c.id);
          return (
            <button key={c.id} disabled={isUsed || isOffered} onClick={() => onOffer(c.id)}
              className={`relative flex flex-col items-center rounded-lg border-2 p-2 transition ${
                // Chosen keeps its colour and its brightness: it is in play, not
                // spent. Used is the one that gets drained.
                isOffered ? "border-gold bg-gold/10 ring-2 ring-gold"
                  : isUsed ? "border-border opacity-30 saturate-0"
                  : "cursor-pointer border-bronze hover:border-gold hover:bg-surface-2"}`}
              title={c.name}>
              <Thumb src={c.imageUrl} alt={c.name} className="aspect-square w-full object-contain" />
              <span className={`mt-1.5 w-full truncate text-xs leading-tight ${isOffered ? "font-semibold text-gold-bright" : "text-foreground"}`}>{c.name}</span>
              {isOffered && (
                <span className="absolute right-1 top-1 rounded bg-surface/85 px-1 text-[9px] font-semibold text-gold-bright">
                  ✓ {t("offer.picked")}
                </span>
              )}
              {isUsed && <span className="absolute right-1 top-1 text-[9px] text-muted">{t("match.used")}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Handed in, not yet turned over. */
function MysterySlot({ h, w }: { h: number; w: number }) {
  return (
    <div style={{ width: w, height: h }}
      className="flex shrink-0 items-center justify-center rounded border-2 border-dashed border-gold/70 bg-gold/5 font-display text-gold">?</div>
  );
}

function SeatName({ seat, name, you, occupied, crowned, acting, canTake, needsName, onTake, align, t }: {
  seat: "player1" | "player2"; name: string; you: SeatRole | "spectator"; occupied: boolean;
  crowned: boolean; acting: boolean; canTake: boolean; needsName: boolean;
  onTake: (name?: string) => void; align: "left" | "right"; t: TFn;
}) {
  // An empty seat is still takeable after the draft has started — somebody has to
  // be able to step in when a player drops, and this row is the only place left
  // that knows a seat is empty.
  if (!occupied && canTake) {
    return <div className={align === "right" ? "self-end" : "self-start"}><TakeSeatButton needsName={needsName} onTake={onTake} /></div>;
  }
  return (
    <div className={`flex max-w-full items-baseline gap-1.5 ${align === "right" ? "self-end" : "self-start"}`}>
      {crowned && <span className="text-base leading-none" title={t("match.matchWinner")}>👑</span>}
      <span className={`truncate font-display text-base ${OWNER[seat].text} ${acting ? "underline decoration-gold decoration-2 underline-offset-4" : ""}`}>{name}</span>
      {you === seat && <span className="text-[10px] text-muted">({t("match.you")})</span>}
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
          <OfferHand hand={hand} count={duel.offerCount} offered={offeredSet}
            used={excludeUsed ? usedSet : EMPTY_IDS} onOffer={onOffer} t={t} />
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
        <OfferHand hand={hand} count={duel.offerCount} offered={offeredSet}
          used={excludeUsed ? usedSet : EMPTY_IDS} onOffer={onOffer} t={t} />
      ) : youPlayer ? (
        <p className="mt-4 text-center text-sm text-gold-bright">{t("offer.lockedWait")}</p>
      ) : (
        <p className="mt-4 text-center text-sm text-muted">{t("offer.secret")}</p>
      )}
    </section>
  );
}

/**
 * The counter-snipe: take one of the civs the opponent just put on the table away
 * from them, for this game only.
 *
 * Two stages rather than one. The cards are big now — a whole civ, named, at the
 * size you can read across a room — and a single click on one of those used to be
 * irreversible. So a click marks, and a second press commits.
 *
 * That leaves a gap the old design didn't have: chosen but not sent. If the clock
 * ran out there, the server would fill the step with a RANDOM target and quietly
 * throw away the one that had been picked — worse than the click-to-send it
 * replaced. So the clock hitting zero sends whatever has been marked. The server
 * gives the displayed deadline a grace period before it fills anything in
 * (GRACE_MS in the socket layer), and that grace exists for exactly this.
 */
function SnipePhase({ duel, youPlayer, opp, canAct, onSnipe, civById, deadlineTs, clockOffsetRef }: {
  duel: CivDuel;
  youPlayer: "player1" | "player2" | null;
  opp: "player1" | "player2" | null;
  spectator: boolean;
  canAct: boolean;
  onSnipe: (id: string) => void;
  civById: (id?: string) => PoolView | undefined;
  deadlineTs: number | null;
  clockOffsetRef: React.RefObject<number>;
}) {
  const { t } = useI18n();
  const myOffer = youPlayer ? duel.offered[youPlayer] : [];
  const oppOffer = opp ? duel.offered[opp] : [];
  const submitted = new Set(youPlayer ? duel.snipedBy[youPlayer] : []);
  const need = duel.snipeCount;

  const [staged, setStaged] = useState<string[]>([]);
  // Sending is one-way and two things can trigger it — the button and the clock.
  // Whichever gets there first locks the other out for good.
  const sentRef = useRef(false);

  const send = useCallback(() => {
    if (sentRef.current || staged.length === 0) return;
    sentRef.current = true;
    for (const id of staged) onSnipe(id);
  }, [onSnipe, staged]);

  // Armed off the deadline rather than watched every tick: a countdown that only
  // has to do something once doesn't need to re-render anything to do it.
  useEffect(() => {
    if (!deadlineTs || !canAct) return;
    const id = setTimeout(send, Math.max(0, deadlineTs - Date.now() - clockOffsetRef.current));
    return () => clearTimeout(id);
  }, [deadlineTs, canAct, send, clockOffsetRef]);

  // "The clock is about to answer for you" — raised once it is true, so the panel
  // never has to tick in order to know it.
  const [urgentFor, setUrgentFor] = useState<number | null>(null);
  useEffect(() => {
    if (!deadlineTs || !canAct) return;
    const id = setTimeout(() => setUrgentFor(deadlineTs), Math.max(0, deadlineTs - Date.now() - clockOffsetRef.current - 5000));
    return () => clearTimeout(id);
  }, [deadlineTs, canAct, clockOffsetRef]);
  const urgent = urgentFor === deadlineTs && staged.length > 0;

  const toggle = (id: string) => {
    if (!canAct) return;
    // Past the limit the oldest mark gives way, so a click always does something
    // rather than silently failing against a full hand.
    setStaged((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-need)));
  };

  if (!youPlayer) {
    return (
      <section className="aoe-panel rounded-xl p-5">
        <h3 className="text-center font-display text-lg aoe-gold-text">{t("snipe.title", { n: need })}</h3>
        <div className="aoe-rule my-3" />
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
      </section>
    );
  }

  const oppTone = opp ? OWNER[opp] : OWNER.player2;
  const locked = !canAct;
  return (
    <section className="aoe-panel rounded-xl p-5">
      <h3 className="text-center font-display text-lg aoe-gold-text">{t("snipe.title", { n: need })}</h3>
      <p className="mt-1 text-center text-xs text-muted">{locked ? t("snipe.hint") : t("snipe.pickThenConfirm")}</p>
      <div className="aoe-rule my-4" />

      <div className="flex flex-wrap justify-center gap-4">
        {oppOffer.map((id) => {
          const civ = civById(id);
          const marked = staged.includes(id) || submitted.has(id);
          return (
            <button
              key={id}
              disabled={locked}
              onClick={() => toggle(id)}
              style={{ width: 190 }}
              className={`relative rounded-[10px] border-2 p-3.5 text-center transition ${
                marked
                  ? `border-gold bg-gold/10 ring-2 ring-gold/50 ${urgent ? "ovl-pulse" : ""}`
                  : `${oppTone.border} ${oppTone.bg} ${locked ? "" : "cursor-pointer hover:border-danger hover:bg-danger/[.14]"}`
              }`}
              title={civ?.name}
            >
              <Thumb src={civ?.imageUrl} alt={civ?.name ?? ""}
                className={`mx-auto aspect-square w-[80%] object-contain ${marked ? "grayscale" : ""}`} />
              <span className="mt-1 block truncate font-display text-[19px] font-bold text-foreground">{civ?.name}</span>
              {marked && (
                <>
                  <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-[56px] leading-none"
                    style={{ color: "rgba(181,72,47,.85)" }}>✕</span>
                  <span className="absolute right-1.5 top-1.5 rounded bg-surface/80 px-1 text-[10px] text-gold-bright">
                    🔒 {t("snipe.yourTarget")}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {locked ? (
        <p className="mt-4 text-center text-sm text-gold-bright">{t("snipe.lockedWait")}</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-1">
          <button onClick={send} disabled={staged.length < need}
            className={`aoe-btn rounded px-5 py-2 font-display disabled:opacity-40 ${urgent ? "ovl-pulse" : ""}`}>
            {t("snipe.confirm", { n: staged.length, total: need })}
          </button>
          <span className={`text-[11px] ${urgent ? "font-semibold text-danger" : "text-muted"}`}>
            {urgent ? t("snipe.autoSend") : t("snipe.noUndo")}
          </span>
        </div>
      )}

      {/* What you put up, so the whole trade is readable from one place. */}
      <div className="mt-5 flex flex-col items-center gap-1.5 border-t border-border/60 pt-3">
        <span className="text-[10px] uppercase tracking-wide text-muted">{t("snipe.yourOfferShort")}</span>
        <div className="flex gap-2">
          {myOffer.map((id) => (
            <Thumb key={id} src={civById(id)?.imageUrl} alt={civById(id)?.name ?? ""}
              className={`h-[52px] w-[52px] rounded border-2 bg-surface-2 object-contain ${youPlayer ? OWNER[youPlayer].border : ""}`} />
          ))}
        </div>
      </div>
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
    // Sticky is on the wrapper now, so the turn strip and this ride up together.
    <div ref={ref} className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
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

/**
 * The context you lose by scrolling: this game's map, and what each side has
 * struck out. Floats clear of the page in the margin either side, appears once
 * the real thing has scrolled off the top, and gets out of the way again the
 * moment you scroll back up to it — it is a stand-in, not a second copy.
 *
 * Desktop only, and deliberately so: it lives in the empty space beside the
 * 1200px column, and below 2xl there is no empty space to live in. On a phone it
 * would be covering the very thing it is describing.
 */
/** One tile in a rail. Every entry — flag or map — gets the same box, so the
 *  column reads as a grid instead of a pile of different shapes. */
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

/** Seconds left in the turn, and — for whoever owes the move — what happens at zero. */
/**
 * The clock, at the size of the thing it is actually deciding.
 *
 * Big and gold while somebody is on it, grey and quiet when nobody is — a number
 * that always shouts stops meaning anything. `live` is "this is running against
 * you", which is when it earns the pulse and the warning underneath.
 */
function BigCountdown({ deadlineTs, limitSec, clockOffsetRef, size, live }: {
  deadlineTs: number | null;
  /** The step's own limit. Rounding up can otherwise show one second more. */
  limitSec?: number | null;
  clockOffsetRef: React.RefObject<number>;
  size: number;
  /** The viewer is one of the people this clock is running against. */
  live: boolean;
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadlineTs) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadlineTs]);
  // A fixed box for the same reason the broadcast clock has one: the display font
  // has no tabular figures, so a changing digit count nudges everything beside it.
  const w = size * 1.9;
  if (!deadlineTs) return <span className="inline-block text-center font-display text-muted" style={{ fontSize: size * 0.55, width: w }}>—</span>;
  // Compare against the server's clock (local clock + measured offset), so the
  // displayed seconds line up with when the server actually expires the turn.
  const serverNow = now + (clockOffsetRef.current ?? 0);
  const remain = clamp(Math.ceil((deadlineTs - serverNow) / 1000), limitSec);
  return (
    <>
      <span
        className={`inline-block text-center font-display leading-none ${live ? "text-gold-bright" : "text-muted"} ${live && remain <= 10 ? "ovl-pulse" : ""}`}
        style={{ fontSize: size, width: w }}
      >
        {remain}
      </span>
      {/* Running out of time doesn't forfeit the step — the server draws for you.
          That is worth knowing three seconds early, while you can still stop it. */}
      {live && remain <= AUTOPICK_WARN_SEC && (
        <span className="animate-pulse text-xs font-semibold text-danger">{t("match.autoPickSoon")}</span>
      )}
    </>
  );
}

/** How long before the clock runs out to say what the clock running out does. */
const AUTOPICK_WARN_SEC = 3;

/**
 * Seconds left, never more than the step was given.
 *
 * The deadline is the server's, corrected by an offset measured a round trip
 * before it is used, so `ceil` can land a whole second past the limit — a
 * 30-second ban opening on "31" and staying there for a beat.
 */
function clamp(remain: number, limitSec?: number | null): number {
  const capped = limitSec && limitSec > 0 ? Math.min(remain, limitSec) : remain;
  return Math.max(0, capped);
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

function Pool({ title, entries, clickable, onPick, onHover, oppHover, highlightSelectable, pendingIds, blockedIds, kind = "civ", tone = "neutral" }: {
  title: string; entries: PoolView[]; clickable: (e: PoolView) => boolean; onPick: (id: string) => void;
  onHover: (id: string | null) => void; oppHover: string | null; highlightSelectable?: string[]; kind?: "civ" | "map";
  /** Your own not-yet-revealed simultaneous bans — shown only to you. */
  pendingIds?: string[];
  /** Entries the opponent banned against you alone: dead to you, still theirs to take. */
  blockedIds?: string[];
  tone?: "ban" | "pick" | "neutral";
}) {
  const { t } = useI18n();
  const isMap = kind === "map";
  const pending = new Set(pendingIds ?? []);
  const blocked = new Set(blockedIds ?? []);
  // Which of the four states this pool actually contains. A legend that lists a
  // state nothing on screen is in teaches nothing and costs a line of noise —
  // most formats ban globally and never produce a "closed to you" entry at all.
  const has = { open: false, banned: false, blocked: false, taken: false };
  for (const e of entries) {
    if (e.state === "banned") has.banned = true;
    else if (e.state === "picked" || e.state === "drafted") has.taken = true;
    else if (blocked.has(e.id)) has.blocked = true;
    else has.open = true;
  }
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
          const isBlocked = !banned && !taken && blocked.has(e.id);
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
                // Layered rather than one chain: whose an entry is has to survive
                // every other state, or a map somebody picked reads as dead stock.
                // Banned entries are colourless on purpose — grey, faded, ✕.
                banned ? "border-border bg-surface-2 opacity-30 saturate-0"
                  // Owned by someone: their border and their tint, always. A select
                  // step used to overwrite this, so during "loser picks the map" the
                  // maps each player had picked looked unavailable rather than theirs.
                  : taken ? (own ? `${own.border} ${own.bg}` : "border-bronze bg-surface-2")
                  // Closed to you alone. Deliberately NOT the greyed-out ban look:
                  // this civ is still live, just not for you, and drawing it as dead
                  // stock would misreport what the opponent can still field.
                  // Dashed, because solid red is spoken for: in this app a colour is
                  // an owner, and a solid red border means "player 2 holds this".
                  // The dash is what says the border is a barrier, not a claim.
                  : isBlocked ? "border-dashed border-danger bg-danger/[.08]"
                  : "border-bronze bg-surface-2",
                // Select step: light up what may actually be chosen, dim the rest.
                // Runs after the ownership colours so it adds to them, not over them.
                isSelectStep
                  ? (selectable
                      // Bright gold for the player actually selecting; dimmer for
                      // a watcher (e.g. the winner while the loser picks the map).
                      ? (can ? "ring-2 ring-gold cursor-pointer hover:brightness-110" : "ring-1 ring-gold/30")
                      : "opacity-30")
                  : !banned && !taken
                    ? (can ? (tone === "ban"
                              // Ban hover stays red: it is transient, follows your own
                              // cursor, and can't be mistaken for "this is P2's".
                              ? "cursor-pointer hover:border-danger hover:bg-danger/10"
                              : "cursor-pointer hover:border-gold hover:bg-surface-2")
                           // A blocked entry keeps its colour: the fade is how "not
                           // your turn" is said, and saying it here would collapse
                           // two different reasons you can't click into one look.
                           : isBlocked ? "" : "opacity-50")
                    : "",
                // Your own pending simultaneous ban — locked in, not yet revealed.
                isPending ? "border-gold ring-2 ring-gold bg-gold/10 saturate-50" : "",
                oppHover === e.id
                  ? (tone === "ban" ? "ring-2 ring-danger bg-danger/20" : "ring-2 ring-gold-bright bg-gold/10")
                  : "",
              ].join(" ")}
              title={isBlocked ? t("match.blockedHint", { name: e.name }) : e.name}
            >
              <Thumb src={e.imageUrl} alt={e.name} className={`w-full ${isMap ? "aspect-[16/10] object-cover" : "aspect-square object-contain"} ${banned ? "grayscale" : ""}`} />
              {/* The name carries the state too. At this cell size the border alone
                  is a few pixels of colour, and a taken civ used to read as dead
                  because its label looked identical to a banned one's.
                  A map wears its name: the row underneath was height the picture
                  could have had, and the map is the thing being chosen. */}
              <span
                className={`truncate leading-tight ${
                  banned ? "text-muted"
                    : isBlocked ? "font-semibold text-danger"
                    : taken && own ? `font-semibold ${own.text}`
                    : "text-foreground"
                } ${isMap ? "absolute inset-x-0 bottom-0 px-2 py-1 text-center text-sm font-semibold" : "mt-1.5 w-full text-xs"}`}
                style={isMap ? GLASS : undefined}
              >
                {e.name}
              </span>
              {banned && <span className="absolute inset-0 flex items-center justify-center text-4xl text-muted/70">✕</span>}
              {taken && <span className={`absolute right-1 top-1 text-xs ${own?.text ?? "text-gold-bright"}`}>●</span>}
              {isBlocked && <span className="absolute right-1 top-1 text-xs">🚫</span>}
              {isPending && <span className="absolute left-1 top-1 text-sm text-gold-bright">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Four states is one more than anybody wants to infer from colour alone,
          and the newest of them ("closed to you") has no equivalent anywhere else
          in the app. Only the states actually present get a row. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
        {has.open && <LegendItem swatch="border-bronze bg-surface-2" label={t("match.legendAvailable")} />}
        {has.banned && <LegendItem swatch="border-border bg-surface-2 opacity-60 saturate-0" label={t("match.legendBanned")} />}
        {has.blocked && <LegendItem swatch="border-dashed border-danger bg-danger/20" label={t("match.legendBlocked")} />}
        {has.taken && (
          <span className="inline-flex items-center gap-1.5">
            {/* Two swatches, one label: "taken" has no colour of its own — the
                colour IS which player took it. */}
            <span className="inline-flex gap-0.5">
              <span className={`inline-block h-3 w-3 rounded-sm border-2 ${OWNER.player1.border} ${OWNER.player1.bg}`} />
              <span className={`inline-block h-3 w-3 rounded-sm border-2 ${OWNER.player2.border} ${OWNER.player2.bg}`} />
            </span>
            {t("match.legendTaken")}
          </span>
        )}
      </div>
    </section>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm border-2 ${swatch}`} />
      {label}
    </span>
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
      {/* The name, and only the name. Which seat they are in is already said by
          the colour, and by the side of the screen they are standing on. */}
      <div className={`text-xs uppercase tracking-wide ${tone === "sky" ? "text-sky-400" : "text-rose-400"}`}>
        {name || (tone === "sky" ? t("match.p1") : t("match.p2"))}
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
          {map && (
            <div className="relative mt-2" style={{ width: 168, height: 105 }}>
              <Thumb src={map.imageUrl} alt={map.name}
                className="h-full w-full rounded-md border-2 border-gold bg-surface-2 object-cover" />
              <MapLabel name={map.name} size={13} />
            </div>
          )}
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
