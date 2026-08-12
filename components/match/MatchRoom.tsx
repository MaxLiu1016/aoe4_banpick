"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { GUEST_ACCESS } from "@/lib/features";
import { getGuestToken, guestName, setGuestName } from "@/lib/guest";
import { Thumb } from "@/components/Thumb";
import { useChangeStamp } from "./useChangeStamp";
import { useCivMarks } from "@/lib/useCivMarks";
import { StrikeBar, TileBadge } from "./TileMark";
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
  player1: { text: "text-p1", border: "border-p1", borderL: "border-l-p1", ring: "ring-p1", bg: "bg-p1/10" },
  player2: { text: "text-p2", border: "border-p2", borderL: "border-l-p2", ring: "ring-p2", bg: "bg-p2/10" },
};
function ownerOf(by?: string) {
  return by === "player1" ? OWNER.player1 : by === "player2" ? OWNER.player2 : null;
}

// Pool grid sizing. auto-fill + a minimum cell keeps every entry on one screen at
// 1200px while making each icon far bigger than the old fixed 48px — the pool is
// scanned at a glance during a draft, so "see them all" beats "see them huge".
// 100, not 112, and the page is 1360 wide rather than 1200. The two numbers go
// together. auto-fill takes as many columns as `n*min + (n-1)*gap` fits, so at a
// 1328 content box: 112 gives 11 columns, 100 gives 12 — and 12 is the column
// that puts twenty-three civs on two rows instead of three. A row is the unit
// this page runs out of, so it is worth the width. The tiles still come out
// ~103px, because the last column's slack is shared back by `1fr`.
const GRID_CIV = { gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" };
/**
 * Three rows of civ tiles, as a floor.
 *
 * Filtering the pool down to four used to shrink the panel and pull everything
 * under it up the page — then put it all back the moment you cleared the filter.
 * The page moving is the thing this whole layout exists to stop, and a filter
 * that rearranges the screen is a filter people stop using.
 *
 * Three because that is what an unfiltered pool of twenty-three sits at on a
 * narrower window, so the panel is the same height whether or not the filter is
 * doing anything, at any width.
 *
 * Measured at the grid's own minimum column (100px wide, 16:10 tall) plus the
 * gaps, so it is a floor and never a ceiling: at the real column width the rows
 * are taller than this and the content wins.
 */
const CIV_POOL_ROWS = 3;
const CIV_POOL_FLOOR = CIV_POOL_ROWS * Math.round(100 * 0.625) + (CIV_POOL_ROWS - 1) * 8;
/**
 * The hand you choose from during an offer.
 *
 * Capped, and centred rather than stretched. `GRID_CIV` maxes each track at
 * `1fr`, and auto-fit collapses the tracks nothing lands in — so a five-card
 * hand spread those five across the whole panel and each flag came out nearly
 * three times the size of a pool tile. The cards you are picking BETWEEN do not
 * need to be the biggest thing on the screen.
 */
const GRID_HAND: React.CSSProperties = {
  gridTemplateColumns: "repeat(auto-fit, minmax(84px, 104px))",
  justifyContent: "center",
};
// Maps sit smaller in the choosing grid than they do once picked or banned: the
// grid is a menu you scan, the strips below the score are the record you keep
// coming back to.
/** Shared empty set, so callers don't allocate one per render. */
const EMPTY_IDS: Set<string> = new Set();
/**
 * The map grid, sized to put the pool on one row when it can.
 *
 * A fixed 176px minimum wrapped a nine-map tournament pool onto two rows and a
 * full pool onto seven, and rows are what the page runs out of — one row of
 * slightly smaller maps costs nothing you were reading. The calc is the exact
 * width of one column out of `n`; the max() floor is what lets a narrow window
 * out of it, because auto-fill will then place fewer columns and wrap.
 */
const gridMap = (n: number): React.CSSProperties => ({
  gridTemplateColumns: `repeat(auto-fill, minmax(max(120px, calc((100% - ${(n - 1) * 8}px) / ${Math.max(n, 1)})), 1fr))`,
});

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
  // Your own marks on the pool — local to this browser, never sent anywhere.
  const marks = useCivMarks(matchId);
  // What YOU are hovering. It already went out over the wire for the opponent's
  // benefit; keeping it here is what lets the slot it would land in show it.
  const [myHover, setMyHover] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const ticketRef = useRef<string | undefined>(undefined);
  // Whether the board is folded down to a strip.
  //
  // Two players, independently, asked the page to stop moving: the draft used to
  // scroll itself to whatever you had to click next, which is a fix for a page
  // taller than a window. Folding the board is the other fix — it makes the page
  // shorter than the window instead, and then nothing has to move at all.
  //
  // null = follow the draft. Anything else is a manual choice, and it sticks —
  // right up until the series ends, which is the one moment the board stops
  // being a thing you fold out of the way and becomes the result.
  const [foldChoice, setFoldChoice] = useState<boolean | null>(null);
  const [sawFinish, setSawFinish] = useState(false);
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
  function setOptions(p: { anonymous?: boolean; publicHover?: boolean; playAll?: boolean; headStart?: { player1: number; player2: number } }) {
    emit(C2S.SET_OPTIONS, { matchId, ...p });
  }
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
        target={state.target}
        headStart={state.headStart ?? { player1: 0, player2: 0 }}
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
  // Nobody is drafting while a game is being played. The step has an actor —
  // whoever calls the result first — but it is not a turn, and treating it as one
  // put "your move" and a lit screen edge in front of somebody who was in-game.
  const inGame = state.currentStep?.type === "GAME_RESULT";
  const myTurn = !spectator && you === state.turn && state.status === "running" && !ackPending && !inGame;
  const isHost = amHost;

  const showMaps = step?.type === "MAP_BAN" || step?.type === "MAP_PICK" || step?.type === "MAP_SELECT";
  const showCivs = step?.type === "CIV_BAN" || step?.type === "CIV_PICK";
  const showOffer = step?.type === "CIV_OFFER";
  const showSnipeOpp = step?.type === "CIV_SNIPE_OPPONENT";
  const showConfirm = step?.type === "SYNC_CONFIRM";
  const showResult = step?.type === "GAME_RESULT";
  // Folded by default. The height is worth more to the thing being clicked than
  // to a board restating what the step bar and the prompt already say, and the
  // whole point of the fold is that the page then fits a window.
  //
  // Somebody winning throws the fold away and opens the board. Not merely
  // "default to open" — a player who collapsed it an hour ago would otherwise
  // reach the end of the series and be shown a strip. Dropping the choice rather
  // than overriding it means the button still works afterwards, so it opens
  // once and they can shut it again if they want.
  // Detected here rather than in an effect: an effect would paint the folded
  // frame first and then open it, which is the page jumping at exactly the
  // moment everybody is looking at it.
  if (state.finished !== sawFinish) {
    setSawFinish(state.finished);
    if (state.finished && foldChoice !== null) setFoldChoice(null);
  }
  const folded = foldChoice ?? !state.finished;

  // Duel helpers
  const youPlayer: "player1" | "player2" | null = you === "player1" || you === "player2" ? you : null;
  const opp = youPlayer === "player1" ? "player2" : youPlayer === "player2" ? "player1" : null;
  const duel = state.civDuel;
  const canActDuel = !spectator && !!youPlayer && state.awaiting[youPlayer] && payload!.status === "running" && !ackPending;
  // "This is running against you" — the one thing the prompt row raises its voice
  // for. Same test the board used before the clock moved down here.
  const myPrompt = !spectator && !!youPlayer && state.awaiting[youPlayer]
    && payload!.status === "running" && !ackPending && !inGame;
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
  const seriesWinnerSeat: "player1" | "player2" | null = state.score.player1 === state.score.player2
    ? null
    : state.score.player1 > state.score.player2 ? "player1" : "player2";
  const seriesWinner = seriesWinnerSeat === "player1" ? p1Name : seriesWinnerSeat === "player2" ? p2Name : null;

  return (
    <div className="space-y-5">
      {/* Not pinned any more. Sticking it to the ceiling was insurance against a
          page that scrolled; the page doesn't scroll, so the insurance was just a
          band taking height off the top of every screen. */}
      <div className="-mx-4">
        <StepBar steps={state.stepBar} currentIndex={state.currentStepIndex} finished={state.finished} />
      </div>

      {error && <div className="rounded border border-danger/60 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}

      <OverviewBand
        state={state} payload={payload!} folded={folded} onFold={setFoldChoice} you={you}
        p1Name={p1Name} p2Name={p2Name} civById={civById} mapById={mapById}
        preview={myTurn || canActDuel ? myHover : null}
        outcome={{ seat: seriesWinnerSeat, name: seriesWinner ?? "" }}
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
      {payload!.status === "running" && !state.finished && !ackPending && !inGame &&
        createPortal(
          <>
            {(["player1", "player2"] as const)
              .filter((seat) => (state.simultaneous ? state.awaiting[seat] : state.turn === seat))
              .map((seat) => (
                <div key={seat} aria-hidden className={`turn-glow fixed inset-y-0 z-10 w-[220px] ${seat === "player1" ? "left-0" : "right-0"}`}
                  style={{
                    // Straight off the ownership token. The glow used to carry its
                    // own rgb triple, which is how a colour change quietly leaves
                    // one surface behind.
                    background: `linear-gradient(to ${seat === "player1" ? "right" : "left"}, color-mix(in srgb, var(--${
                      seat === "player1" ? "p1" : "p2"
                    }) 40%, transparent), transparent)`,
                  }} />
              ))}
          </>,
          document.body
        )}


      {/* Everything you actually act on, under one anchor. The board above carries
          whose turn it is and how long is left, so what is left down here is the
          thing to click — and that is what the page should bring to you when the
          step changes, not a caption about it. */}
      <div className="space-y-4">
        {/* What you are about to do, and the map you are about to do it for.
            The strip at the top of the window carries the same map small, for when
            this has scrolled away; here it gets to be a picture, right beside the
            instruction and directly above the pool being clicked — which is where
            the eye already is. */}
        {step && !state.finished && (
          <div className="flex items-center justify-center gap-5">
            {currentMap && step.type !== "GAME_RESULT" && (
              <div className="relative shrink-0" style={{ width: 112, height: 70 }}>
                <Thumb src={mapById(currentMap)?.imageUrl} alt={currentMapName ?? ""}
                  className="h-full w-full rounded-md border-2 border-gold bg-surface-2 object-cover" />
                <MapLabel name={currentMapName} size={11} />
              </div>
            )}
            <div className={currentMap ? "min-w-0 text-left" : "text-center"}>
              <p className="font-display text-lg aoe-gold-text">
                {step.type === "GAME_RESULT" ? t("match.gameN", { n: state.currentGameIndex + 1 }) : (step.label || step.type)}
              </p>
              {/* Whose move and how long is left, on the thing they are about. */}
              {!inGame && (
                <div className={`mt-1 flex items-center gap-4 ${currentMap ? "" : "justify-center"}`}>
                  {/* Whose move, said the same way whether it is yours or theirs:
                      the name, in that player's colour. Yours used to read "Your
                      move." — a different sentence in a different colour for the
                      same fact, so the one line that answers "who now?" was the
                      one line that changed shape depending on the answer. It is
                      louder when it is you; the words are the same. */}
                  <span className={myPrompt ? "font-display text-lg text-gold-bright" : "text-[13px] font-semibold text-gold-bright"}>
                    {state.simultaneous && !myPrompt ? t("turn.simultaneous")
                      : myPrompt || state.turn === "player1" || state.turn === "player2" ? (
                        <>
                          {t("turn.now")}{" "}
                          <span className={`font-display ${myPrompt ? "text-lg" : "text-[15px]"} ${
                            OWNER[myPrompt && youPlayer ? youPlayer : (state.turn as "player1" | "player2")].text
                          }`}>
                            {(myPrompt && youPlayer ? youPlayer : state.turn) === "player1" ? p1Name : p2Name}
                          </span>
                        </>
                      ) : state.turn === "host" ? t("turn.randomDraw") : t("turn.awaitResult")}
                  </span>
                  {payload!.status !== "paused" && (
                    <BigCountdown deadlineTs={payload!.deadlineTs} limitSec={payload!.limitSec}
                      clockOffsetRef={clockOffsetRef} size={34} live={myPrompt} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      {/* A simultaneous ban used to get a panel of its own here, restating what
          the pool and the board already say: the tiles you have locked wear a
          gold padlock, the slots you still owe are the ones breathing gold, and
          the turn glow on each side goes out as that player commits. */}
      {/* Pools — hover tints red for a ban step, gold for a pick step */}
      {(showMaps) && (
        <Pool title={t("match.maps")} entries={mapsView} clickable={clickable} onPick={act} kind="map"
          pendingIds={simulBan ? myPendingBans : undefined}
          marked={marks.marked} onMark={marks.toggle} onClearMarks={marks.clear}
          oppHover={oppHover} onHover={(id) => { setMyHover(id); sendHover("map", id); }}
          tone={step?.type === "MAP_BAN" ? "ban" : step?.type === "MAP_PICK" ? "pick" : "neutral"}
          highlightSelectable={step?.type === "MAP_SELECT" ? state.selectableMapIds : undefined} />
      )}
      {showCivs && (
        <Pool title={t("match.civs")} entries={civsView} clickable={clickable} onPick={act}
          pendingIds={simulBan ? myPendingBans : undefined}
          blockedIds={blockedForMe}
          marked={marks.marked} onMark={marks.toggle} onClearMarks={marks.clear}
          oppHover={oppHover} onHover={(id) => { setMyHover(id); sendHover("civ", id); }}
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
 * Two states. Folded, it is a strip: the score and the maps of the series, and
 * nothing else — the hands and the strikes move out to the rails, and the page
 * becomes short enough to fit a window, which is the whole point. Open, it is the
 * board, and it is worth the height when nothing is waiting on a click.
 */
function OverviewBand({
  state, payload, folded, onFold, you, p1Name, p2Name, civById, mapById,
  preview, outcome, canTake, needsName, onTake, canPause, onPause, t,
}: {
  state: DerivedState;
  payload: Payload;
  /** Down to a strip, so the page fits a window and never has to move. */
  folded: boolean;
  onFold: (v: boolean | null) => void;
  you: SeatRole | "spectator";
  p1Name: string;
  p2Name: string;
  civById: (id?: string) => PoolView | undefined;
  mapById: (id?: string) => PoolView | undefined;
  /** What the viewer is hovering in the pool, while they are the one acting. */
  preview: string | null;
  /** Who took the series, so the line that says so can wear their colour. */
  outcome: { seat: "player1" | "player2" | null; name: string };
  canTake: boolean;
  needsName: boolean;
  onTake: (seat: "player1" | "player2", name?: string) => void;
  canPause: boolean;
  onPause: () => void;
  t: TFn;
}) {
  const seats = ["player1", "player2"] as const;
  const step = state.currentStep;
  // A game being played is nobody's turn. The step has an actor — whoever calls
  // the result — but underlining their name while they are in-game says they owe
  // this screen something, and they don't.
  const acting = state.finished || step?.type === "GAME_RESULT"
    ? []
    : state.simultaneous
      ? seats.filter((s) => state.awaiting[s])
      : state.turn === "player1" || state.turn === "player2" ? [state.turn] : [];

  // How many entries a seat will be asked for across the whole draft. This is what
  // lets the pick band draw its empty slots up front instead of growing a tile at a
  // time and shoving the pool down the page mid-reach.
  // A simultaneous step has no actor because both sides are the actor, so it
  // counts towards each of them.
  const mine = (s: DerivedState["stepBar"][number], seat: "player1" | "player2") =>
    s.actor === null || s.actor === seat;
  const reserved = (type: string, seat: "player1" | "player2") =>
    state.stepBar.filter((s) => s.type === type && mine(s, seat)).reduce((n, s) => n + s.count, 0);

  /**
   * Which slots of a row the step in progress is about to fill.
   *
   * Counted off the step list rather than off the actions taken, because steps
   * finish in order: everything of this type before the current step is done, so
   * the live step starts where those left off. Returns null when the current
   * step isn't filling this row at all.
   */
  const active = (type: string, seat: "player1" | "player2") => {
    let before = 0;
    for (let i = 0; i < state.stepBar.length; i++) {
      const s = state.stepBar[i];
      if (s.type !== type || !mine(s, seat)) continue;
      if (i === state.currentStepIndex) return { from: before, to: before + s.count };
      if (i > state.currentStepIndex) break;
      before += s.count;
    }
    return null;
  };
  const live = payload.status === "running" && !state.finished && !payload.awaitingAck;
  const at = (type: string, seat: "player1" | "player2") => (live ? active(type, seat) : null);

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

  const duel = state.civDuel;
  const hidden = step?.type === "CIV_OFFER" && duel?.offerHidden;
  // A hidden offer that has been handed in: you know their hand, you don't know
  // which of it is in play. That is exactly one fact, and it is a count.
  const mystery = (seat: "player1" | "player2") =>
    hidden && duel!.offered[seat].length === 0 && !state.awaiting[seat] ? duel!.offerTarget[seat] : 0;

  const size = 76;
  const names = { player1: p1Name, player2: p2Name };

  // "{name} wins!" with the name in that player's colour. Built by splitting the
  // translated sentence on a placeholder rather than by assuming the name comes
  // first — it does in all three locales today, and that is exactly the kind of
  // thing a fourth locale breaks.
  const MARK = "\u0000";
  const outcomeLine = outcome.seat
    ? t("match.winner", { name: MARK }).split(MARK).flatMap((part, i) =>
        i === 0
          ? [part]
          : [<span key="n" className={OWNER[outcome.seat as "player1" | "player2"].text}>{outcome.name}</span>, part])
    : t("match.drawn");

  // Folded, the map section is the whole band, so it carries the names; expanded,
  // the civ section below already prints them and a second copy is just noise.
  // The preview lands in your own row only — seeing a flag appear on the other
  // side of the midline would say the opposite of what it means.
  const previewFor = (s: "player1" | "player2") => (you === s ? preview : null);
  // A select step is the one move that lands in neither player's row: the map
  // goes to the GAME. So its preview belongs in the game's own box.
  // Only on a select step. `selectableMapIds` is populated ahead of time, so
  // without the step check a map you were hovering to BAN also appeared in the
  // middle — claiming it was about to be played rather than struck out.
  const selectGhost = preview && step?.type === "MAP_SELECT" && state.selectableMapIds.includes(preview)
    ? mapById(preview)
    : undefined;
  const mw = folded ? 84 : 112, mh = folded ? 52 : 70;
  const mapSide = (s: "player1" | "player2") => {
    const left = s === "player1";
    const align = left ? "right" : "left";
    return (
      <div className={`flex min-w-0 flex-col gap-1 ${left ? "items-end pr-1" : "items-start pl-1"}`}>
        {folded && <span className={`truncate font-display text-sm ${OWNER[s].text}`}>{names[s]}</span>}
        <SlotRow align={align} ids={s === "player1" ? state.mapsByP1 : state.mapsByP2}
          slots={reserved("MAP_PICK", s)} active={at("MAP_PICK", s)} preview={previewFor(s)}
          entry={mapById} kind="map" ring={OWNER[s].border} w={mw} h={mh} dim={played} dimTitle={t("match.used")} />
        <SlotRow align={align} ids={s === "player1" ? state.mapBansByP1 : state.mapBansByP2}
          slots={reserved("MAP_BAN", s)} active={at("MAP_BAN", s)} preview={previewFor(s)}
          pending={mapPhase ? state.pendingBans[s] : undefined}
          entry={mapById} kind="map" ring="border-[rgba(154,145,125,.45)]" w={mw} h={mh} struck />
      </div>
    );
  };

  return (
    <div className="aoe-panel rounded-xl px-4 py-3">
      {/* Title line. Three columns so the score stays dead centre with the fold
          control hard right — in the flow rather than absolutely placed, so it
          can never land on top of the title on a narrow window. */}
      <div className="grid items-center gap-3" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
        <span aria-hidden />
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
        {/* Where the series stands, when that is a thing rather than a turn. */}
        {state.finished ? (
          <span className="font-display text-lg aoe-gold-text">{outcomeLine}</span>
        ) : state.currentStep?.type === "GAME_RESULT" ? (
          <span className="font-display text-lg aoe-gold-text">
            {t("spec.gameInProgress", { n: state.currentGameIndex + 1 })}
          </span>
        ) : payload.status === "paused" ? (
          <span className="font-display text-lg text-danger">{t("match.paused")}</span>
        ) : null}
        {canPause && (
          <button onClick={onPause} className="font-sans text-[11px] text-muted hover:text-gold-bright">
            {payload.status === "paused" ? `▶ ${t("match.resume")}` : `⏸ ${t("match.pause")}`}
          </button>
        )}
        </div>
        {/* Folding is a choice, and once made it is kept — a board that refolded
            itself every step would be the scrolling problem in another costume. */}
        <button onClick={() => onFold(!folded)}
          className="justify-self-end rounded border border-bronze px-3 py-1.5 font-sans text-[13px] font-semibold whitespace-nowrap text-gold-bright hover:brightness-125">
          {folded ? `⤢ ${t("match.expand")}` : `▭ ${t("match.minimize")}`}
        </button>
      </div>

      {/* The maps, laid out the way the hands are: each side's own on their own
          side, converging on the middle, where the game being played for sits.
          One centred run put "mine", "theirs", "the series" and "still free" into
          a single row of pictures that all looked alike, and three people
          separately said they couldn't read it.
          Folded, this is only here during the map steps — the band follows what
          is being done, and while civs are being drafted the civ rows have the
          space instead. */}
      {(!folded || mapPhase) && (
        <div className="mt-2 grid items-center gap-3" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
          {mapSide("player1")}
          <div className="flex items-end gap-1.5 border-x border-bronze/40 px-3">
            {(folded ? state.games.filter((g) => g.gameIndex === state.currentGameIndex) : state.games.slice(0, shownGames))
              .map((g) => (
                <GameCell key={g.gameIndex} game={g} current={!state.finished && g.gameIndex === state.currentGameIndex}
                  map={mapById(g.map)} names={names} compact={folded} civById={civById}
                  preview={g.gameIndex === state.currentGameIndex ? selectGhost : undefined} t={t} />
              ))}
          </div>
          {mapSide("player2")}
        </div>
      )}

      {!folded && <div className="aoe-rule my-2.5" />}

      {/* Folded, the hands stay here in miniature. They used to move out to rails
          in the margins, but a rail only exists on a wide enough window and the
          page is supposed to work on all of them — a row costs less than a board
          and is in the same place every time.
          Not during the map steps: the band follows the action, and a row of
          empty civ slots under a map draft is answering a question nobody has
          got to yet. */}
      {folded && !mapPhase && (
        <div className="mt-2 grid items-start gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {seats.map((s, i) => {
            const left = i === 0;
            const ids = s === "player1" ? state.draftedByP1 : state.draftedByP2;
            const usedIds = new Set(state.games.map((g) => (s === "player1" ? g.civP1 : g.civP2)).filter(Boolean) as string[]);
            const align = left ? "right" : "left";
            return (
              <div key={s} className={`${left ? "items-end pr-4" : "items-start border-l border-bronze/40 pl-4"} flex min-w-0 flex-col gap-1`}>
                <span className={`truncate font-display text-sm ${OWNER[s].text}`}>{names[s]}</span>
                <SlotRow align={align} ids={ids} slots={reserved("CIV_PICK", s)} active={at("CIV_PICK", s)}
                  preview={previewFor(s)} dimTitle={t("match.used")}
                  entry={civById} kind="civ" ring={OWNER[s].border} w={60} h={60} dim={usedIds} />
                <SlotRow align={align} ids={state.civBans.filter((b) => b.by === s).map((b) => b.id)}
                  slots={reserved("CIV_BAN", s)} active={at("CIV_BAN", s)} preview={previewFor(s)}
                  pending={mapPhase ? undefined : state.pendingBans[s]}
                  entry={civById} kind="civ" ring="border-[rgba(154,145,125,.45)]" w={50} h={50} struck />
              </div>
            );
          })}
        </div>
      )}

      {/* The two hands, converging. The clock used to sit between them and it has
          gone down to the panel it is running against, so there is nothing left
          in the middle to hold them apart. Folded away, they are in the rails. */}
      {!folded && (
      <div className="grid items-stretch" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {seats.map((s, i) => {
          const left = i === 0;
          const ids = s === "player1" ? state.draftedByP1 : state.draftedByP2;
          const usedIds = new Set(state.games.map((g) => (s === "player1" ? g.civP1 : g.civP2)).filter(Boolean) as string[]);
          const slots = Math.max(reserved("CIV_PICK", s), ids.length);
          // A long hand shrinks rather than wrapping into a shape nobody reads.
          const tile = slots > 8 ? Math.round(size * 0.8) : size;
          return (
            // A midline. Reserved slots are colourless on both sides, so without
            // it the two hands run together into one row of fifteen tiles.
            <div key={s} className={`${left ? "items-end pr-6" : "items-start border-l border-bronze/40 pl-6"} flex min-w-0 flex-col gap-1.5`}>
              <SeatName seat={s} name={names[s]} you={you} occupied={Boolean(payload.seats[s])}
                crowned={state.finished && state.score[s] > state.score[s === "player1" ? "player2" : "player1"]}
                acting={acting.includes(s)} canTake={canTake && !payload.seats[s]} needsName={needsName}
                onTake={(n) => onTake(s, n)} align={left ? "right" : "left"} t={t} />
              <SlotRow align={left ? "right" : "left"} ids={ids} slots={slots} active={at("CIV_PICK", s)}
                preview={previewFor(s)}
                entry={civById} kind="civ" ring={OWNER[s].border} w={tile} h={tile} dim={usedIds}
                dimTitle={t("match.used")} pop
                after={Array.from({ length: mystery(s) }, (_, n) => <MysterySlot key={`m${n}`} h={tile} w={tile} />)} />
              {/* Maps have their own section above. Wrapped in with the civs
                  they formed one ragged run of mixed shapes, and "which of these
                  were maps?" is not a question a row should be asking. */}
              <SlotRow align={left ? "right" : "left"} ids={state.civBans.filter((b) => b.by === s).map((b) => b.id)}
                slots={reserved("CIV_BAN", s)} active={at("CIV_BAN", s)} preview={previewFor(s)}
                pending={mapPhase ? undefined : state.pendingBans[s]}
                entry={civById} kind="civ" ring="border-[rgba(154,145,125,.45)]" w={44} h={44} struck />
            </div>
          );
        })}

      </div>
      )}
    </div>
  );
}

/** One game of the series: the map it was played on, and who took it. */
function GameCell({ game, current, map, names, compact, civById, preview, t }: {
  game: GameRec; current: boolean; map?: PoolView;
  names: { player1: string; player2: string }; compact: boolean;
  civById: (id?: string) => PoolView | undefined;
  /** A map the viewer is hovering and could select for this game. */
  preview?: PoolView;
  t: TFn;
}) {
  const won = game.winner ?? null;
  const w = compact ? 116 : 150;
  const h = Math.round(w * 0.62);
  // No map yet is the normal state for every game but the first: the loser of the
  // previous one picks it, and that has not happened. A dashed box says "not yet"
  // where a grey thumbnail would say "missing".
  if (!game.map) {
    return (
      <div style={{ width: w, height: h }}
        className="relative flex items-center justify-center overflow-hidden rounded-md border border-dashed border-bronze/60 font-display text-base text-bronze"
        title={preview?.name ?? t("match.gameN", { n: game.gameIndex + 1 })}>
        <GameTag n={game.gameIndex + 1} compact={compact} t={t} />
        {preview ? (
          <>
            <Thumb src={preview.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            <MapLabel name={preview.name} size={compact ? 10 : 12} dim />
          </>
        ) : "?"}
      </div>
    );
  }
  const tone = won ? OWNER[won] : null;
  return (
    <div className="flex flex-col items-center" style={{ width: w }}>
      <div className={`relative overflow-hidden rounded-md border-2 ${
        won ? tone!.border : current ? "border-gold ovl-glow" : "border-border"
      }`} style={{ width: w, height: h, opacity: won ? 0.75 : 1 }}>
        <Thumb src={map?.imageUrl} alt={map?.name ?? ""} className="h-full w-full object-cover" />
        <GameTag n={game.gameIndex + 1} compact={compact} t={t} />
        <MapLabel name={map?.name} size={compact ? 11 : 12} dim={Boolean(won)} />
      </div>
      {/* What was fielded, either side of the caption. Left is P1 and right is P2
          everywhere else on this page, so the side says whose without a label,
          and the loser's goes grey — the result, for no extra height.
          The caption is not 10px any more: it carries the one thing this row of
          maps is for, and it was the smallest text on the page. */}
      <div className="flex w-full items-center gap-1">
        <GameCiv civ={civById(game.civP1)} small={compact} lost={won === "player2"} />
        <span className={`min-w-0 flex-1 truncate text-center font-semibold leading-tight ${compact ? "text-[12px]" : "text-[14px]"} ${
          won ? tone!.text : current ? "text-gold-bright" : "text-muted"
        }`}>
          {/* Which game it is moved onto the picture, so this line is free to be
              the result and nothing else — "G3 · Bella" spent half its width
              saying something the tag above already said.
              No crown: one per game plus one for the series put five of them on
              a board with exactly one winner, and the colour says who took it. */}
          {won ? names[won] : "—"}
        </span>
        <GameCiv civ={civById(game.civP2)} small={compact} lost={won === "player1"} />
      </div>
    </div>
  );
}


function TileRow({ align, children }: { align: "left" | "right"; children: React.ReactNode }) {
  return <div className={`flex flex-wrap gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>{children}</div>;
}

/**
 * Which game this is, laid across the top of its own map.
 *
 * SAS asked for "GAME 1" rather than "G1", to make it easier to catch. On the
 * picture rather than in the caption because this row is the tightest thing on
 * the board — over the artwork it costs nothing, and the map's own name plate
 * already holds the bottom edge.
 */
function GameTag({ n, compact, t }: { n: number; compact: boolean; t: TFn }) {
  return (
    <span
      className="pointer-events-none absolute left-[2px] right-[2px] top-[2px] truncate rounded-t px-1 text-center font-sans font-bold uppercase tracking-[.14em] text-gold-bright"
      style={{ ...GLASS, fontSize: compact ? 9 : 11, lineHeight: compact ? "15px" : "18px" }}
    >
      {t("match.gameN", { n })}
    </span>
  );
}

/**
 * A civ fielded in one game, beside that game's map.
 *
 * Keeps its box when there is no civ yet, so the caption between the two stays
 * centred whether nobody, one side, or both have been revealed.
 */
function GameCiv({ civ, small, lost }: { civ?: PoolView; small: boolean; lost: boolean }) {
  const box = small ? "h-[20px] w-[20px]" : "h-[26px] w-[26px]";
  if (!civ) return <span className={`shrink-0 ${box}`} aria-hidden />;
  return (
    <span title={civ.name} className={`shrink-0 ${box}`}>
      <Thumb src={civ.imageUrl} alt={civ.name}
        className={`h-full w-full rounded object-contain ${lost ? "opacity-45 grayscale" : ""}`} />
    </span>
  );
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

function BandTile({ entry, kind, ring, h, w, dim, dimLabel, struck, pop, title }: {
  entry?: PoolView; kind: "civ" | "map"; ring: string; h: number; w: number;
  dim?: boolean;
  /** Said out loud on a dimmed tile. Grey on its own is not a word — it could
      mean spent, banned, or unavailable, and the board uses grey for more than
      one of those elsewhere. */
  dimLabel?: string;
  struck?: boolean; pop?: boolean; title?: string;
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
      {/* Along the top, so a map's own name plate along the bottom stays put —
          and inset by the border, like that plate is. The frame is the one part
          of the tile that says whose it is; a label flush to the edge cuts the
          top out of it. */}
      {dim && dimLabel && w >= 40 && (
        <span className="pointer-events-none absolute left-[2px] right-[2px] top-[2px] truncate rounded-t px-1 text-center font-sans text-[9px] font-bold uppercase tracking-wider text-muted"
          style={GLASS}>
          {dimLabel}
        </span>
      )}
    </div>
  );
}

/**
 * A slot this player still owes. Reserving it is what keeps the page still.
 *
 * A ban and a pick are opposite acts and their empty slots say so: the ban slot
 * carries the same line across the middle that a banned tile does, so an empty
 * row reads as "two bans go here" rather than as more of the row above it.
 */
function EmptySlot({ h, w, active, intent = "pick", kind = "civ", preview }: {
  h: number; w: number; active?: boolean; intent?: "pick" | "ban";
  kind?: "civ" | "map";
  /** What the viewer is about to put here. */
  preview?: PoolView;
}) {
  const ban = intent === "ban";
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded border-2 ${ban ? "border-dotted" : "border-dashed"} ${
        active ? `border-gold ${ban ? "slot-wait-ban" : "slot-wait-pick"}` : "border-border"
      }`}
      // A wash of the colour of the act. Two empty rows of identical grey boxes
      // said "something goes here" twice; this one says which something.
      style={{ width: w, height: h, background: ban ? "rgba(181,72,47,.13)" : "color-mix(in srgb, var(--pick) 13%, transparent)" }}
      aria-hidden
    >
      {/* The thing under your cursor, in the box it would land in. A pool of
          twenty-three tiles and a row of empty slots are far apart on screen,
          and "which of these am I filling" was a question you had to hold in
          your head between the two. */}
      {preview && (
        <Thumb src={preview.imageUrl} alt=""
          className={`h-full w-full opacity-40 ${kind === "civ" ? "object-contain" : "object-cover"}`} />
      )}
      {ban && (
        <span
          className="absolute left-1/2 top-1/2 h-0.5 -translate-x-1/2 -translate-y-1/2 rounded"
          style={{ width: Math.round(w * 0.6), background: active ? "rgba(241,207,108,.45)" : "rgba(154,145,125,.3)" }}
        />
      )}
    </div>
  );
}

/**
 * A row of slots, drawn to its full length from the moment the draft starts.
 *
 * Two things come out of that. The row stops growing a tile at a time and
 * shoving the pool down the page mid-reach — and the slots the step in progress
 * is about to fill can be marked, gold and breathing, so "where am I acting, and
 * how many times" is answered by the shape of the row instead of by a sentence
 * underneath it.
 */
function SlotRow({ align, ids, slots, active, pending, preview, entry, kind, ring, w, h, dim, dimTitle, struck, pop, after }: {
  align: "left" | "right";
  /** What has been taken, in the order it was taken. */
  ids: string[];
  /** How many this seat will be asked for across the whole draft. */
  slots: number;
  /** The half-open slot range the current step fills, or null if it fills none. */
  active: { from: number; to: number } | null;
  /** Bans this viewer has locked in on a simultaneous step, which nobody else
      can see yet. Redacted per recipient upstream, so for a spectator — and for
      the opponent's row — this is always empty. */
  pending?: string[];
  /** An id the viewer is hovering in the pool. Shown in the slot it would take,
      and only in this row if this row is the one that would take it. */
  preview?: string | null;
  entry: (id?: string) => PoolView | undefined;
  kind: "civ" | "map";
  ring: string;
  w: number;
  h: number;
  /** Entries already spent — greyed, not gone. */
  dim?: Set<string>;
  dimTitle?: string;
  struck?: boolean;
  pop?: boolean;
  after?: React.ReactNode;
}) {
  // Your own held bans sit in the row as if they were public, because to you
  // they are: you clicked them, and the next one you click goes in the slot
  // after them. Only this viewer's own are ever in here.
  const held = pending ?? [];
  const filled = held.length ? [...ids, ...held] : ids;
  const secret = new Set(held);
  const total = Math.max(slots, filled.length, active?.to ?? 0);
  if (total === 0 && !after) return null;
  // The first slot the step has not filled yet — where the thing under your
  // cursor would actually go. Resolved against this row's own pool, so a civ
  // hovered during a civ step never turns up in the map row.
  // Only something still in the pool. Running the cursor over a tile that is
  // already banned or already taken previewed it into the slot, promising a move
  // that isn't available.
  const hovered = preview ? entry(preview) : undefined;
  const ghost = hovered?.state === "available" ? hovered : undefined;
  const landing = ghost && active ? Math.max(active.from, filled.length) : -1;
  const cells = Array.from({ length: total }, (_, n) => {
    const id = filled[n];
    if (!id) {
      return (
        <EmptySlot key={`e${n}`} h={h} w={w} intent={struck ? "ban" : "pick"} kind={kind}
          preview={n === landing ? ghost : undefined}
          active={Boolean(active) && n >= active!.from && n < active!.to} />
      );
    }
    const spent = Boolean(dim?.has(id));
    // Gold for one you are holding — the same gold the pool tile's padlock
    // and the waiting slot wear. It is yours and it is not out yet.
    return (
      <BandTile key={id} entry={entry(id)} kind={kind} ring={secret.has(id) ? "border-gold" : ring}
        h={h} w={w} dim={spent} dimLabel={spent ? dimTitle : undefined} struck={struck} pop={pop}
        title={spent && dimTitle ? `${entry(id)?.name} (${dimTitle})` : undefined} />
    );
  });
  // Both sides grow away from the middle, oldest first. The left-hand row is
  // packed against the midline, so laying it out in draft order put the FIRST
  // pick furthest away and pushed the whole row outwards on every pick — the two
  // sides read in opposite directions and nothing stayed where you last saw it.
  // Reversing the left row's markup makes the midline the start line for both.
  const mirrored = align === "right";
  return (
    <TileRow align={align}>
      {mirrored ? after : null}
      {mirrored ? [...cells].reverse() : cells}
      {mirrored ? null : after}
    </TileRow>
  );
}

/**
 * Your hand, during an offer. One component for both kinds of offer — the open
 * one and the hidden one — because when they were two copies only the hidden one
 * learned to mark what you had already put up, and the open one (which is the
 * kind that asks for two civs one at a time) left a chosen civ looking exactly
 * like a fresh one you could still click.
 */
function OfferHand({ hand, count, offered, used, onOffer, onHover, disabled, t }: {
  hand: PoolView[];
  count: number;
  /** Civs you have already put up for this game. */
  offered: Set<string>;
  /** Civs already played in an earlier game, when the format forbids repeats. */
  used: Set<string>;
  onOffer: (id: string) => void;
  /** What the cursor is over, so the slot it would fill can show it. */
  onHover?: (id: string | null) => void;
  /** Not your turn. The hand stays on screen — see the panel's own note. */
  disabled?: boolean;
  t: TFn;
}) {
  return (
    <div className={`mt-4 ${disabled ? "pointer-events-none opacity-45" : ""}`}>
      <div className="mb-2 text-xs text-muted">{disabled ? t("offer.yourHand") : t("offer.chooseHand", { n: count })}</div>
      <div className="grid gap-2" style={GRID_HAND}>
        {hand.map((c) => {
          const isUsed = used.has(c.id);
          const isOffered = offered.has(c.id);
          return (
            <button key={c.id} disabled={disabled || isUsed || isOffered} onClick={() => onOffer(c.id)}
              onMouseEnter={() => onHover?.(disabled || isUsed || isOffered ? null : c.id)}
              onMouseLeave={() => onHover?.(null)}
              className={`relative flex flex-col items-center overflow-hidden rounded-lg border-2 transition ${
                // Chosen keeps its colour and its brightness: it is in play, not
                // spent. Used is the one that gets drained.
                isOffered ? "border-gold bg-gold/10 ring-2 ring-gold"
                  : isUsed ? "border-border"
                  : "cursor-pointer border-bronze hover:border-gold hover:bg-surface-2"}`}
              title={c.name}>
              {/* Same shape as a pool tile — 16:10 with the name on the picture.
                  A square card with the name underneath cost a row of height per
                  card and made the hand the tallest thing in the panel. */}
              <Thumb src={c.imageUrl} alt={c.name}
                className={`aspect-[16/10] w-full object-contain ${isUsed ? "opacity-25 saturate-0" : ""}`} />
              <span className={`absolute inset-x-0 bottom-0 truncate px-1.5 py-0.5 text-center text-[11px] font-semibold leading-tight ${
                isOffered ? "text-gold-bright" : isUsed ? "text-muted" : "text-foreground"}`} style={GLASS}>
                {c.name}
              </span>
              {/* Big enough to read at a glance. These were 9px words in the
                  corner of a card, on an element the "used" fade was already
                  drawing at three-tenths alpha. */}
              {isOffered && <TileBadge mark="check" size={26} label={t("offer.picked")} className="text-gold-bright" />}
              {isUsed && (
                <span className="absolute right-1 top-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted"
                  style={{ background: "rgba(15,17,21,.82)" }}>
                  {t("match.used")}
                </span>
              )}
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
      <span className={`truncate font-display text-base ${OWNER[seat].text} ${acting ? "underline decoration-gold decoration-2 underline-offset-4" : ""}`}>{name}</span>
      {/* Tilted and overlapping, so it sits on the name the way a crown sits on
          a head rather than queueing up beside it. */}
      {crowned && (
        <span className="relative -ml-3 inline-block -translate-y-[9px] rotate-[20deg] text-base leading-none"
          title={t("match.matchWinner")}>👑</span>
      )}
      {you === seat && <span className="text-[10px] text-muted">({t("match.you")})</span>}
    </div>
  );
}

/**
 * The size of a card that has already been played.
 *
 * A card on the table is what everybody is looking at; the hand is what you are
 * choosing between. That was backwards — the played cards were 64px thumbnails
 * under a hand of 180px tiles, and in the snipe step your own offer was 52px
 * against a 190px target. One number for every played card fixes both: the two
 * sides of a snipe are now identical, and an offered civ does not change size
 * when the step it was offered in ends.
 */
const PLAYED = 128;

function CivChip({ civ, size = PLAYED, dim, mark, animate }: {
  civ?: PoolView; size?: number; dim?: boolean; mark?: "x" | "check"; animate?: boolean;
}) {
  if (!civ) return null;
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md border-2 border-bronze bg-surface-2 ${dim ? "opacity-40" : ""} ${mark === "x" ? "saturate-0" : ""} ${animate ? "civ-pop" : ""}`}
      style={{ width: size }}
      title={civ.name}
    >
      <Thumb src={civ.imageUrl} alt={civ.name}
        className={`aspect-[16/10] w-full object-contain ${mark === "x" ? "opacity-45 grayscale" : ""}`} />
      <span className="absolute inset-x-0 bottom-0 truncate px-1.5 py-0.5 text-center text-[11px] font-semibold leading-tight text-foreground"
        style={GLASS}>
        {civ.name}
      </span>
      {mark === "x" && <StrikeBar />}
      {mark === "check" && <TileBadge mark="check" size={22} label={civ.name} className="text-gold-bright" />}
    </div>
  );
}

/**
 * The same footprint as a played card, before you know what it is.
 *
 * `active` is the one you are about to fill: gold and breathing, the same as a
 * waiting slot on the board, so "where does this land" has one answer everywhere
 * on the page. `preview` is what is under your cursor right now.
 */
function EmptyPlayed({ size = PLAYED, hidden, active, preview }: {
  size?: number; hidden?: boolean; active?: boolean; preview?: PoolView;
}) {
  return (
    <div
      style={{ width: size, height: Math.round(size * 0.625) }}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-dashed font-display ${
        active ? "border-gold slot-wait-pick text-gold-bright" : "border-border text-muted"
      } ${hidden ? "bg-surface-2/40" : "bg-surface-2/30"}`}
    >
      {preview ? (
        <>
          <Thumb src={preview.imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain opacity-40" />
          <span className="absolute inset-x-0 bottom-0 truncate px-1.5 py-0.5 text-center text-[11px] font-semibold leading-tight text-foreground"
            style={GLASS}>
            {preview.name}
          </span>
        </>
      ) : hidden ? "?" : ""}
    </div>
  );
}

// One side of a turn-based offer draft: face-up, under that player's own name,
// with empty slots for what they still owe this phase.
function OpenOfferSide({ name, ids, target, tone, civById, active, preview }: {
  name: string;
  ids: string[];
  target: number;
  tone: "sky" | "rose";
  civById: (id?: string) => PoolView | undefined;
  /** This side is the one being asked for a card right now. */
  active?: boolean;
  preview?: PoolView;
}) {
  return (
    <div className={tone === "rose" ? "text-right" : ""}>
      <div className={`text-xs uppercase tracking-wide ${tone === "sky" ? "text-p1" : "text-p2"}`}>
        {name} ({ids.length}/{target})
      </div>
      <div className={`mt-1 flex gap-1.5 ${tone === "rose" ? "justify-end" : ""}`}>
        {ids.map((id) => <CivChip key={id} civ={civById(id)} animate />)}
        {Array.from({ length: Math.max(0, target - ids.length) }).map((_, i) => (
          <EmptyPlayed key={i} active={active} preview={i === 0 ? preview : undefined} />
        ))}
      </div>
    </div>
  );
}

function HiddenSlot({ size = PLAYED, active, preview }: {
  size?: number; active?: boolean; preview?: PoolView;
}) {
  return <EmptyPlayed size={size} hidden active={active} preview={preview} />;
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
  // Which card of your hand the cursor is on. It belongs to this panel rather
  // than to the room: the hand and the slots it fills are both in here, and
  // nothing outside needs to know.
  const [hovered, setHovered] = useState<string | null>(null);
  const ghost = hovered && canAct ? civById(hovered) : undefined;
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
      <div className={DUEL_SLOT}>
        <section className={DUEL_BLOCK}>
        <h3 className="font-display text-lg aoe-gold-text text-center">{t("offer.titleOpen", { n: duel.offerCount })}</h3>
        <div className="aoe-rule my-3" />
        <div className="grid grid-cols-2 gap-4">
          <OpenOfferSide name={p1Name} ids={duel.offered.player1} target={duel.offerTarget.player1} tone="sky"
            civById={civById} active={canAct && youPlayer === "player1"} preview={youPlayer === "player1" ? ghost : undefined} />
          <OpenOfferSide name={p2Name} ids={duel.offered.player2} target={duel.offerTarget.player2} tone="rose"
            civById={civById} active={canAct && youPlayer === "player2"} preview={youPlayer === "player2" ? ghost : undefined} />
        </div>
        <OfferHand hand={hand} count={duel.offerCount} offered={offeredSet} disabled={!canAct}
          used={excludeUsed ? usedSet : EMPTY_IDS} onOffer={onOffer} onHover={setHovered} t={t} />
        <DuelNote>{canAct ? null : youPlayer ? t("offer.oppChoosing") : t("offer.secret")}</DuelNote>
      </section>
      </div>
    );
  }

  return (
    <div className={DUEL_SLOT}>
      <section className={DUEL_BLOCK}>
      <h3 className="font-display text-lg aoe-gold-text text-center">{t("offer.title", { n: duel.offerCount })}</h3>
      <div className="aoe-rule my-3" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{t("offer.yourOffer")} {youSubmitted ? t("offer.locked") : `(${myOffered.length}/${targetOf(youPlayer)})`}</div>
          <div className="mt-1 flex gap-1.5">
            {myOffered.map((id) => <CivChip key={id} civ={civById(id)} animate />)}
            {Array.from({ length: Math.max(0, targetOf(youPlayer) - myOffered.length) }).map((_, i) => (
              <HiddenSlot key={i} active={canAct} preview={i === 0 ? ghost : undefined} />
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted">{oppSubmitted ? t("offer.oppReady") : t("offer.oppChoosing")}</div>
          <div className="mt-1 flex justify-end gap-1.5">
            {Array.from({ length: targetOf(opp) }).map((_, i) => <HiddenSlot key={i} />)}
          </div>
        </div>
      </div>

      <OfferHand hand={hand} count={duel.offerCount} offered={offeredSet} disabled={!canAct}
        used={excludeUsed ? usedSet : EMPTY_IDS} onOffer={onOffer} onHover={setHovered} t={t} />
      <DuelNote gold={Boolean(youPlayer)}>
        {canAct ? null : youPlayer ? t("offer.lockedWait") : t("offer.secret")}
      </DuelNote>
    </section>
    </div>
  );
}

/**
 * The line under a duel panel that says why you cannot act.
 *
 * A fixed row, empty or not. The panel used to swap the whole hand grid for one
 * sentence every time the turn passed, so a three-step offer resized the page
 * three times — and the pool you were reading moved each time with it.
 */
/**
 * The floor the offer and the snipe both stand on.
 *
 * They are consecutive steps in one exchange, and they were two panels of
 * different heights — so the page resized underneath the player between them, and
 * again inside each of them. Every state of both is a known shape, so the space
 * claims the tallest of them up front and only grows past it for a hand longer
 * than any format has yet asked for.
 *
 * The floor belongs to the space, not to the panel. On the panel it painted the
 * slack in panel colours — a slab of grey under a short offer with nothing in it,
 * which is the page holding still at the price of looking broken.
 */
const DUEL_SLOT = "min-h-[520px]";
const DUEL_BLOCK = "aoe-panel rounded-xl p-5";

function DuelNote({ gold, children }: { gold?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`mt-3 flex h-6 items-center justify-center text-sm ${gold ? "text-gold-bright" : "text-muted"}`}>
      {children}
    </div>
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
      <div className={DUEL_SLOT}>
        <section className={DUEL_BLOCK}>
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
      </div>
    );
  }

  const oppTone = opp ? OWNER[opp] : OWNER.player2;
  const locked = !canAct;
  return (
    <div className={DUEL_SLOT}>
      <section className={DUEL_BLOCK}>
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
              style={{ width: PLAYED }}
              className={`relative overflow-hidden rounded-[10px] border-2 text-center transition ${
                marked
                  ? `border-gold bg-gold/10 ring-2 ring-gold/50 ${urgent ? "ovl-pulse" : ""}`
                  : `${oppTone.border} ${oppTone.bg} ${locked ? "" : "cursor-pointer hover:border-danger hover:bg-danger/[.14]"}`
              }`}
              title={civ?.name}
            >
              <Thumb src={civ?.imageUrl} alt={civ?.name ?? ""}
                className={`aspect-[16/10] w-full object-contain ${marked ? "opacity-50 grayscale" : ""}`} />
              <span className="absolute inset-x-0 bottom-0 truncate px-1.5 py-0.5 text-center text-[12px] font-semibold leading-tight text-foreground"
                style={GLASS}>
                {civ?.name}
              </span>
              {/* Marked for the snipe: the same line a ban wears, and the same
                  padlock a held simultaneous ban wears. It is both of those. */}
              {marked && (
                <>
                  <StrikeBar />
                  <TileBadge mark="lock" size={22} label={t("snipe.yourTarget")} className="text-gold-bright" />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Fixed height, so committing does not collapse the panel under the cards
          you are still looking at. */}
      <div className="mt-4 flex h-[68px] flex-col items-center justify-center gap-1">
        {locked ? (
          <p className="text-center text-sm text-gold-bright">{t("snipe.lockedWait")}</p>
        ) : (
          <>
            <button onClick={send} disabled={staged.length < need}
              className={`aoe-btn rounded px-5 py-2 font-display disabled:opacity-40 ${urgent ? "ovl-pulse" : ""}`}>
              {t("snipe.confirm", { n: staged.length, total: need })}
            </button>
            <span className={`text-[11px] ${urgent ? "font-semibold text-danger" : "text-muted"}`}>
              {urgent ? t("snipe.autoSend") : t("snipe.noUndo")}
            </span>
          </>
        )}
      </div>

      {/* What you put up, so the whole trade is readable from one place. */}
      <div className="mt-5 flex flex-col items-center gap-1.5 border-t border-border/60 pt-3">
        <span className="text-[10px] uppercase tracking-wide text-muted">{t("snipe.yourOfferShort")}</span>
        {/* The same card as the row above it. Yours used to be a 52px thumbnail
            against their 190px target — the two halves of one trade, drawn at
            three and a half times the difference. */}
        <div className="flex flex-wrap justify-center gap-3">
          {myOffer.map((id) => <CivChip key={id} civ={civById(id)} />)}
        </div>
      </div>
    </section>
    </div>
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
    <div ref={ref} className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-4 py-2">
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
                "flex shrink-0 items-center gap-2 rounded-lg border border-l-4 px-3 py-1 whitespace-nowrap transition",
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

function Lobby({ seats, you, amHost, canPlay, loggedIn, bestOf, target, headStart, inviteUrl, copied, anonymous, publicHover, playAll, onCopy, onTake, onAddBot, onReady, onRename, onStart, onOptions, error }: {
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
  /** Wins needed to take the series — the ceiling on a head start. */
  target: number;
  headStart: { player1: number; player2: number };
  onCopy: () => void;
  onTake: (seat: "player1" | "player2", name?: string) => void;
  onAddBot: (seat: "player1" | "player2") => void;
  onReady: (ready: boolean) => void;
  onRename: (name: string) => void;
  onStart: () => void;
  onOptions: (p: { anonymous?: boolean; publicHover?: boolean; playAll?: boolean; headStart?: { player1: number; player2: number } }) => void;
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
        <HeadStart
          value={headStart} max={Math.max(0, target - 1)} disabled={!amHost}
          p1Name={seats.player1?.name || t("match.p1")} p2Name={seats.player2?.name || t("match.p2")}
          onChange={(v) => onOptions({ headStart: v })} t={t}
        />
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

/**
 * The score the series starts at.
 *
 * Set here rather than in the preset because it belongs to one match, not to a
 * format: the same grand-final rules get used for the loser's-bracket side too,
 * and they arrive level. Capped one below the target, so a handicap can never
 * finish a series nobody has played.
 */
function HeadStart({ value, max, disabled, p1Name, p2Name, onChange, t }: {
  value: { player1: number; player2: number };
  max: number;
  disabled: boolean;
  p1Name: string;
  p2Name: string;
  onChange: (v: { player1: number; player2: number }) => void;
  t: TFn;
}) {
  const level = value.player1 === 0 && value.player2 === 0;
  const bump = (seat: "player1" | "player2", by: number) => {
    const n = Math.max(0, Math.min(max, value[seat] + by));
    if (n !== value[seat]) onChange({ ...value, [seat]: n });
  };
  const side = (seat: "player1" | "player2", name: string) => (
    <div className="flex items-center gap-2">
      <span className={`w-24 truncate text-right font-display text-sm ${OWNER[seat].text}`}>{name}</span>
      <button type="button" disabled={disabled || value[seat] === 0} onClick={() => bump(seat, -1)}
        className="h-7 w-7 rounded border border-bronze font-display text-gold-bright disabled:opacity-30">−</button>
      <span className="w-6 text-center font-display text-lg text-gold-bright">{value[seat]}</span>
      <button type="button" disabled={disabled || value[seat] >= max} onClick={() => bump(seat, 1)}
        className="h-7 w-7 rounded border border-bronze font-display text-gold-bright disabled:opacity-30">+</button>
    </div>
  );
  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-sm text-foreground">{t("match.headStart")}</span>
        {level && <span className="text-xs text-muted">{t("match.headStartLevel")}</span>}
      </div>
      <p className="mt-1 text-xs text-muted">{t("match.headStartHint")}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-2">
        {side("player1", p1Name)}
        {side("player2", p2Name)}
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

function Pool({ title, entries, clickable, onPick, onHover, oppHover, highlightSelectable, pendingIds, blockedIds, marked, onMark, onClearMarks, kind = "civ", tone = "neutral" }: {
  title: string; entries: PoolView[]; clickable: (e: PoolView) => boolean; onPick: (id: string) => void;
  onHover: (id: string | null) => void; oppHover: string | null; highlightSelectable?: string[]; kind?: "civ" | "map";
  /** Your own not-yet-revealed simultaneous bans — shown only to you. */
  pendingIds?: string[];
  /** Entries you have marked for yourself. Local; nobody else ever sees these. */
  marked?: Set<string>;
  onMark?: (id: string) => void;
  onClearMarks?: () => void;
  /** Entries the opponent banned against you alone: dead to you, still theirs to take. */
  blockedIds?: string[];
  tone?: "ban" | "pick" | "neutral";
}) {
  const { t } = useI18n();
  const isMap = kind === "map";
  const pending = new Set(pendingIds ?? []);
  const blocked = new Set(blockedIds ?? []);

  // Open, filtering nothing. A control nobody can see is a control nobody uses,
  // and this one earns its row: late in a draft, half the pool is spent and you
  // are hunting for one name. Showing it costs a line; hiding it costs the
  // feature. It still starts inert — the pool you see on arrival is the whole
  // pool, every time.
  const [openFilter, setOpenFilter] = useState(true);
  const [q, setQ] = useState("");
  // One switch, not three. Banned, taken, and closed-to-you are three different
  // rules with one consequence — you cannot have it — and the consequence is the
  // only thing anybody would filter on. Offering them separately made the reader
  // work out which rule applied before they could pick a checkbox.
  //
  // Civs only. On a MAP_SELECT step the maps you may choose are the ones already
  // PICKED into a pool, so "only what you can take" tested for the wrong state
  // and emptied the grid — it was not merely useless once a match was under way,
  // it was wrong. The search box stays: a forty-map pool is worth searching.
  const [onlyOpen, setOnlyOpen] = useState(false);
  const canFilterState = !isMap;
  const needle = q.trim().toLowerCase();
  const shown = entries.filter((e) => {
    if (canFilterState && onlyOpen && (e.state !== "available" || blocked.has(e.id))) return false;
    return !needle || e.name.toLowerCase().includes(needle);
  });
  const filtered = shown.length !== entries.length;
  const clear = () => { setQ(""); setOnlyOpen(false); };

  // Everything the rules would accept from you right now. `clickable` is the
  // same predicate the tiles use, so this can never offer a move a tile would
  // have refused — the button and the grid cannot drift apart.
  const legal = entries.filter((e) => clickable(e));

  return (
    // No heading. The line directly above this panel already says which pool it
    // is and what to do with it — "P1 · Ban map" over a heading reading "Maps" is
    // a row of height spent saying it twice.
    <section className="aoe-panel rounded-xl p-4" aria-label={title}>
      {/* One line when shut. It sits above the grid rather than below it because
          a control that changes what you are looking at belongs before the thing
          it changes. */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {/* Right-click is invisible until somebody tells you, so this line is
            the feature's only discovery surface. It doubles as the way out once
            the pool is covered in marks. */}
        {onMark && (
          <span className="text-muted">
            {t("match.markHint")}
            {marked && marked.size > 0 && (
              <>
                {" · "}
                <button onClick={onClearMarks} className="underline hover:text-gold-bright">
                  {t("match.markClear")} ({marked.size})
                </button>
              </>
            )}
          </span>
        )}
        <button
          onClick={() => { if (openFilter) clear(); setOpenFilter(!openFilter); }}
          className={`rounded border px-2 py-1 transition ${
            openFilter || filtered ? "border-gold text-gold-bright" : "border-border text-muted hover:text-gold-bright"
          }`}
        >
          ⌕ {t("match.filter")}
        </button>
        {openFilter && (
          <>
            <input
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
              placeholder={t("match.filterSearch")}
              className="w-48 rounded border border-border bg-surface-2 px-2 py-1 text-foreground outline-none focus:border-gold"
            />
            {canFilterState && (
              <FilterChip on={onlyOpen} onClick={() => setOnlyOpen(!onlyOpen)} label={t("match.filterOnly")} />
            )}
            {filtered && (
              <>
                <span className="text-muted">{t("match.filterCount", { n: shown.length, total: entries.length })}</span>
                <button onClick={clear} className="text-muted underline hover:text-gold-bright">{t("match.filterClear")}</button>
              </>
            )}
          </>
        )}
      </div>
      {shown.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">{t("match.filterNone")}</p>
      )}
      {/* auto-FILL, not auto-fit. auto-fit collapses the tracks nothing lands
          in and lets `1fr` hand their width to the survivors, so filtering a
          pool down to four made those four enormous. auto-fill keeps the empty
          tracks, so a tile is the same size whatever the filter says and the
          ones still showing stay exactly where they were. */}
      {/* alignContent:start so the floor is empty space at the BOTTOM, not taller
          rows. A grid's default align-content behaves as stretch, which would
          hand the spare height to the auto-sized rows and pull the tiles apart —
          the panel would keep its shape by changing the thing inside it. */}
      <div className="grid gap-2"
        style={isMap
          // Counted in, or the map row it is joining wraps: gridMap sizes the
          // columns from how many things have to fit on one line.
          ? gridMap(entries.length + (legal.length > 0 ? 1 : 0))
          : { ...GRID_CIV, minHeight: CIV_POOL_FLOOR, alignContent: "start" }}>
        {/* First, and in the grid with everything else, because what it returns
            is one of these tiles — it is the cell that stands for "any of them".
            As a button in the toolbar it read as a setting rather than a move.
            It survives the filter on purpose: filtering is about finding one
            thing, and this is the choice not to. */}
        {legal.length > 0 && (
          <RandomTile isMap={isMap} tone={tone}
            onPick={() => onPick(legal[Math.floor(Math.random() * legal.length)].id)} t={t} />
        )}
        {shown.map((e) => (
          <PoolTile
            key={e.id}
            e={e}
            isMap={isMap}
            can={clickable(e)}
            tone={tone}
            // During a select step (highlightSelectable given), only those entries are highlighted.
            isSelectStep={highlightSelectable != null}
            selectable={highlightSelectable ? highlightSelectable.includes(e.id) : true}
            isPending={pending.has(e.id)}
            blocked={blocked.has(e.id)}
            oppHovered={oppHover === e.id}
            marked={Boolean(marked?.has(e.id))}
            onMark={onMark}
            onPick={onPick}
            onHover={onHover}
            t={t}
          />
        ))}
      </div>

    </section>
  );
}

/**
 * Let the draft decide.
 *
 * Built as a tile because it stands in for one: the same 16:10 frame and frosted
 * name plate the pool wears, with a question mark where the flag would be. The
 * border is dashed for the reason every dashed edge on this board is — nothing
 * has landed there yet.
 *
 * It draws from `legal`, the same predicate the tiles use, so it can never cast
 * a move a tile would have refused. And it is a real move with real consequences,
 * which is why it takes a deliberate click on a labelled thing rather than a key.
 */
function RandomTile({ isMap, tone, onPick, t }: {
  isMap: boolean; tone: "ban" | "pick" | "neutral"; onPick: () => void; t: TFn;
}) {
  return (
    <button
      onClick={onPick}
      title={t("match.randomHint")}
      className={`relative flex w-full cursor-pointer flex-col items-center overflow-hidden rounded-lg border-2 border-dashed bg-surface-2 transition ${
        tone === "ban"
          ? "border-danger/50 text-danger hover:border-danger hover:bg-danger/10"
          : "border-gold/50 text-gold-bright hover:border-gold hover:bg-gold/10"
      }`}
    >
      {/* Nudged up by the height of the plate that covers the bottom of the
          frame, so the mark reads as centred in the tile rather than in the
          rectangle before the name was laid over it. */}
      <span className={`flex w-full items-center justify-center pb-4 font-display leading-none ${
        isMap ? "aspect-[16/10] text-[40px]" : "aspect-[16/10] text-[32px]"
      }`}>
        ?
      </span>
      <span className="absolute inset-x-0 bottom-0 truncate px-2 py-1 text-center text-sm font-semibold leading-tight"
        style={GLASS}>
        {t("match.random")}
      </span>
    </button>
  );
}

/** A filter that is on says so by looking like the thing it is filtering for. */
function FilterChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-2 py-1 transition ${
        on ? "border-gold bg-gold/10 text-gold-bright" : "border-border text-muted hover:text-gold-bright"
      }`}
    >
      {on ? "✓ " : ""}{label}
    </button>
  );
}

/**
 * One entry in the pool, and the moment it stops being available.
 *
 * A ban is the most consequential thing anyone does on this screen and it used to
 * be the least visible: the tile simply became grey between two frames, somewhere
 * in a grid of twenty-three. It flinches now, and throws a ring in the colour of
 * whatever just happened to it, so the eye is pulled to WHERE — which is the part
 * that is actually hard to find.
 *
 * The stamp is what keeps that honest. Animations play on change, never on mount,
 * so opening a draft that is already half-banned does not replay every ban at once.
 */
function PoolTile({ e, isMap, can, tone, isSelectStep, selectable, isPending, blocked, oppHovered, marked, onMark, onPick, onHover, t }: {
  e: PoolView; isMap: boolean; can: boolean; tone: "ban" | "pick" | "neutral";
  isSelectStep: boolean; selectable: boolean; isPending: boolean; blocked: boolean;
  oppHovered: boolean;
  /** Marked by this viewer, for this viewer. */
  marked: boolean;
  onMark?: (id: string) => void;
  onPick: (id: string) => void; onHover: (id: string | null) => void; t: TFn;
}) {
  const banned = e.state === "banned";
  const taken = e.state === "picked" || e.state === "drafted";
  const own = taken ? ownerOf(e.by) : null;
  const isBlocked = !banned && !taken && blocked;

  const stamp = useChangeStamp(`${e.state}:${e.by ?? ""}:${isBlocked ? "b" : ""}:${isPending ? "p" : ""}`);
  const struck = banned || isBlocked;
  const fresh = stamp > 0 && (struck || taken);
  const ringColour = struck ? "var(--danger)" : e.by === "player1" ? "var(--p1)" : e.by === "player2" ? "var(--p2)" : "var(--gold)";

  return (
    <div className="relative">
      {/* Outside the button on purpose: the button clips its own overflow so the
          artwork can bleed to the edges, and that clipped the ring away too. */}
      {fresh && (
        <span key={stamp} aria-hidden className="tile-ring pointer-events-none absolute inset-0 z-10 rounded-lg"
          style={{ boxShadow: `0 0 0 3px ${ringColour}, 0 0 20px 3px ${ringColour}` }} />
      )}
    <button
      disabled={!can}
      onClick={() => can && onPick(e.id)}
      onMouseEnter={() => onHover(e.id)}
      onMouseLeave={() => onHover(null)}
      // Right-click marks. Left-click is the draft action and cannot be shared:
      // a modifier would be worse, because the cost of getting it wrong is a
      // ban you did not mean to cast.
      onContextMenu={onMark ? (ev) => { ev.preventDefault(); onMark(e.id); } : undefined}
      className={[
        "relative flex w-full flex-col items-center overflow-hidden rounded-lg border-2 transition",
        fresh ? (struck ? "tile-strike" : "tile-take") : "",
        // Layered rather than one chain: whose an entry is has to survive
        // every other state, or a map somebody picked reads as dead stock.
        // Banned entries are colourless on purpose — grey and struck through.
        // The fade lives on the artwork, not here: it used to be on the button,
        // which is the parent of every mark, so the ✕ that said "banned" was
        // itself drawn at 30% alpha.
        banned ? "border-border bg-surface-2"
          // Owned by someone: their border and their tint, always. A select
          // step used to overwrite this, so during "loser picks the map" the
          // maps each player had picked looked unavailable rather than theirs.
          : taken ? (own ? `${own.border} ${own.bg}` : "border-bronze bg-surface-2")
          // Banned for you alone. Deliberately NOT the greyed-out ban look:
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
        oppHovered ? (tone === "ban" ? "ring-2 ring-danger bg-danger/20" : "ring-2 ring-gold-bright bg-gold/10") : "",
      ].join(" ")}
      title={isBlocked ? t("match.blockedHint", { name: e.name }) : e.name}
    >
      {/* Contained, not cropped, for a civ: a flag cut off at the edges stops
          being the thing you recognise it by. Maps are photographs and crop
          fine. Both are 16:10 now — a square civ cell spent a third of its
          height on the background either side of a flag. */}
      {/* The fade for a mark goes on the artwork, never on the button — the
          button is the parent of every badge, and dimming it would take the
          mark down with the thing it is marking. Same trap the ✕ fell into. */}
      <Thumb src={e.imageUrl} alt={e.name}
        className={`w-full aspect-[16/10] ${isMap ? "object-cover" : "object-contain"} ${
          banned ? "opacity-35 grayscale" : marked ? "opacity-40 saturate-50" : ""
        }`} />
      {/* The name rides on the picture, behind frosted glass, for civs the same
          as for maps: under it, the caption was a row of height the picture
          could have had, times twenty-three. The colour still carries the
          state — at this cell size the border alone is a few pixels, and a
          taken civ used to read as dead because its label looked identical to
          a banned one's. */}
      <span
        className={`absolute inset-x-0 bottom-0 truncate px-2 py-1 text-center text-sm font-semibold leading-tight ${
          banned ? "text-muted"
            : isBlocked ? "text-danger"
            : taken && own ? own.text
            : "text-foreground"
        }`}
        style={GLASS}
      >
        {e.name}
      </span>
      {/* What happened to it, top right; what YOU did to it, top left. Never
          along the bottom — the name plate lives there.
          There used to be a legend under the pool explaining these by colour
          swatch. It cost a row of the one screen this page is allowed, to say
          in words what the tile can say on itself. */}
      {banned && (
        <>
          <StrikeBar animate={stamp > 0} />
          <TileBadge mark="ban" label={t("match.legendBanned")}
            className={`text-danger ${stamp > 0 ? "badge-pop" : ""}`} />
        </>
      )}
      {/* Same glyph as a ban, deliberately: both are "you can't have this". Both
          get the line too, because a player pointed out that from where he sits
          the consequence is identical — but his is short, and his tile keeps its
          colour, because the civ is still live for the opponent who cast it. */}
      {isBlocked && (
        <>
          <StrikeBar short animate={stamp > 0} />
          <TileBadge mark="ban" label={t("match.legendBlocked")} className="text-danger" />
        </>
      )}
      {taken && (
        <TileBadge mark="check" label={t("match.legendTaken")}
          className={`${own?.text ?? "text-gold-bright"} ${stamp > 0 ? "badge-pop" : ""}`} />
      )}
      {isPending && (
        <TileBadge mark="lock" corner="tl" label={t("match.pendingBan")} className="text-gold-bright" />
      )}
      {/* Top LEFT, which is this board's corner for "a note of your own" — the
          same corner the padlock uses. Muted rather than coloured, because every
          colour on this tile already means something the rules decided. */}
      {marked && !isPending && (
        <TileBadge mark="check" size={20} corner="tl" label={t("match.marked")} className="text-muted" />
      )}
    </button>
    </div>
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
      <div className={`text-xs uppercase tracking-wide ${tone === "sky" ? "text-p1" : "text-p2"}`}>
        {name || (tone === "sky" ? t("match.p1") : t("match.p2"))}
      </div>
      <div className="relative mt-2">
        {won && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl leading-none">👑</span>}
        <div className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full ring-2 ${won ? "ring-gold-bright" : tone === "sky" ? "ring-p1/70" : "ring-p2/70"}`}>
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
        style={{ background: "linear-gradient(105deg, rgba(92,201,221,0.14) 0%, transparent 42%, transparent 58%, rgba(196,138,208,0.14) 100%)" }}
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
