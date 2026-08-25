import type { Server, Socket } from "socket.io";
import { C2S, S2C, ROOM, type Role } from "./events";
import { dbConnect } from "../mongoose";
import { Match } from "../models/Match";
import { MatchAction } from "../models/MatchAction";
import { MatchGame } from "../models/MatchGame";
import { deriveState, validateAction, type EngineAction, type SeatRole, type DerivedState } from "../draft/engine";
import type { PresetConfig } from "../draft/schema";
import { verifyTicket } from "./ticket";
import { BOT_ID, BOT_NAME, BOT_THINK_MS, botDelay, botTargetFor } from "../bot";
import { DEFAULT_MAPS } from "../../data/maps";
import { CIVS } from "../../data/civs";

type JoinPayload = { matchId: string; ticket?: string; seat?: "player1" | "player2" };

// In-memory per-match countdown state. Keyed by matchId.
interface TimerEntry { token: string; deadlineTs: number; handle: ReturnType<typeof setTimeout> | null }
const timers = new Map<string, TimerEntry>();

async function loadEngineActions(matchId: string): Promise<EngineAction[]> {
  const docs = await MatchAction.find({ matchId }).sort({ seq: 1 }).lean();
  return docs.map((d) => ({
    seq: d.seq as number,
    stepIndex: d.stepIndex as number,
    actor: d.actor as SeatRole,
    actionType: d.actionType as EngineAction["actionType"],
    pool: d.pool as EngineAction["pool"],
    target: d.target as string,
    scope: d.scope as EngineAction["scope"],
    gameIndex: d.gameIndex as number | undefined,
  }));
}

interface MatchLean {
  config: PresetConfig;
  status: "lobby" | "running" | "paused" | "finished";
  hostId: unknown;
  player1Id?: unknown;
  player2Id?: unknown;
  player1Name?: string;
  player2Name?: string;
  player1Ready?: boolean;
  player2Ready?: boolean;
  player1IsGuest?: boolean;
  player2IsGuest?: boolean;
  player1IsBot?: boolean;
  player2IsBot?: boolean;
}

/** Which seat, if any, a practice opponent is sitting in. */
const botSeatOf = (m: MatchLean): "player1" | "player2" | null =>
  m.player1IsBot ? "player1" : m.player2IsBot ? "player2" : null;

async function getCtx(matchId: string): Promise<{ match: MatchLean; state: DerivedState } | null> {
  const match = await Match.findById(matchId).lean<MatchLean>();
  if (!match) return null;
  const actions = await loadEngineActions(matchId);
  const state = deriveState(match.config, actions, match.status);
  return { match, state };
}

/** Pictures for everything the catalogue knows, by id. */
const ARTWORK = new Map<string, string>(
  [...DEFAULT_MAPS, ...CIVS].filter((e) => e.imageUrl).map((e) => [e.id, e.imageUrl as string])
);

/**
 * Fill in artwork the match's own config is missing.
 *
 * A match stores a snapshot of the preset it was started from, which is what keeps
 * a running draft stable while the preset is edited underneath it. The cost is that
 * a gap in that snapshot is permanent: some demo presets shipped map entries with
 * no picture, and every draft ever started from one shows blank tiles for those
 * maps for as long as it exists.
 *
 * Looked up by id, so a custom entry the catalogue has never heard of is left alone
 * — an author who added a map with no image still gets a map with no image.
 */
function withArtwork<T extends { id: string; imageUrl?: string }>(pool: T[]): T[] {
  return pool.map((e) => (e.imageUrl || !ARTWORK.has(e.id) ? e : { ...e, imageUrl: ARTWORK.get(e.id) }));
}

async function buildPayload(matchId: string) {
  const ctx = await getCtx(matchId);
  if (!ctx) return null;
  const { match } = ctx;
  const state = { ...ctx.state, maps: withArtwork(ctx.state.maps), civs: withArtwork(ctx.state.civs) };

  const gameDocs = await MatchGame.find({ matchId }).lean();
  const votes: Record<number, { player1?: string; player2?: string }> = {};
  for (const g of gameDocs) votes[g.gameIndex as number] = (g.confirmedBy as Record<string, string>) ?? {};

  const t = timers.get(matchId);
  const live = state.status === "running";
  const awaitingAck = live ? await awaitingAckInfo(matchId, state) : null;

  return {
    matchId,
    status: state.status,
    publicHover: Boolean(match.config?.options?.publicHover),
    resultMode: match.config?.options?.resultMode ?? "vote",
    pausable: match.config?.options?.pausable ?? true,
    anonymous: Boolean(match.config?.options?.anonymous),
    deadlineTs: live && t ? t.deadlineTs : null,
    // What the step was actually given. The deadline alone can round up to one
    // more than that on the client — the clock offset is measured before the
    // payload has finished travelling — and a 30-second step is not allowed to
    // put a 31 on screen.
    limitSec: live && t ? effectiveLimit(state, match.config) : null,
    // Client clocks are often skewed by seconds; send our wall-clock so the
    // client can correct the offset and display a countdown that matches when
    // the server timer actually fires (otherwise buttons "die" early/late).
    serverNow: Date.now(),
    awaitingAck,
    seats: {
      host: String(match.hostId),
      player1: match.player1Id ? { id: String(match.player1Id), name: match.player1Name, ready: Boolean(match.player1Ready), guest: Boolean(match.player1IsGuest), bot: Boolean(match.player1IsBot) } : null,
      player2: match.player2Id ? { id: String(match.player2Id), name: match.player2Name, ready: Boolean(match.player2Ready), guest: Boolean(match.player2IsGuest), bot: Boolean(match.player2IsBot) } : null,
    },
    votes,
    state,
  };
}

// Atomically reserve the next seq for this match (race-safe under concurrent writes).
async function nextSeq(matchId: string): Promise<number> {
  const m = await Match.findByIdAndUpdate(matchId, { $inc: { actionSeq: 1 } }, { new: true, select: "actionSeq" }).lean<{ actionSeq: number }>();
  return (m?.actionSeq ?? 1) - 1;
}

async function applyAction(matchId: string, role: SeatRole, target: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getCtx(matchId);
  if (!ctx) return { ok: false, error: "Match not found." };
  const v = validateAction(ctx.state, role, target);
  if (!v.ok || !v.resolved) return { ok: false, error: v.error };
  await MatchAction.create({
    matchId,
    stepIndex: ctx.state.currentStepIndex,
    actor: role,
    actionType: v.resolved.actionType,
    pool: v.resolved.pool,
    target,
    scope: v.resolved.scope,
    gameIndex: v.resolved.gameIndex,
    seq: await nextSeq(matchId),
  });
  if (ctx.match.status === "lobby") await Match.updateOne({ _id: matchId }, { status: "running" });
  return { ok: true };
}

function effectiveLimit(state: DerivedState, config: PresetConfig): number {
  const step = state.currentStep;
  if (!step || step.type === "GAME_RESULT") return 0; // results aren't auto-resolved
  return step.timeLimitSec > 0 ? step.timeLimitSec : config.options.defaultTimeLimitSec;
}

function randomLegalTarget(state: DerivedState): string | null {
  const step = state.currentStep;
  if (!step) return null;
  const pick = (arr: string[]) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
  switch (step.type) {
    case "MAP_BAN":
    case "MAP_PICK":
      return pick(state.maps.filter((m) => m.state === "available").map((m) => m.id));
    case "CIV_BAN": {
      // Legal bans = available civs the current player hasn't already banned
      // (matches validateAction, so the auto-fill never picks a rejected target).
      const bannedBySelf = new Set(state.civBans.filter((b) => b.by === state.turn).map((b) => b.id));
      return pick(state.civs.filter((c) => c.state === "available" && !bannedBySelf.has(c.id)).map((c) => c.id));
    }
    case "CIV_PICK":
      // Only the civs this player may actually draft (excludes opponent-banned, etc.).
      return pick(state.civPickableIds);
    case "MAP_SELECT":
      return pick(state.selectableMapIds);
    default:
      return null;
  }
}

function clearTimer(matchId: string) {
  const t = timers.get(matchId);
  if (t?.handle) clearTimeout(t.handle);
}

type AckInfo = { gameIndex: number; winner: "player1" | "player2"; by: { player1: boolean; player2: boolean } };

// After a game's result is committed the next game's clock is held until BOTH
// players acknowledge ("Got it"), so the loser is never surprised by a running
// timer. Returns the pending game's ack status, or null when nothing is pending.
async function awaitingAckInfo(matchId: string, state: DerivedState): Promise<AckInfo | null> {
  if (state.finished) return null;
  const prevIdx = state.currentGameIndex - 1;
  const prev = prevIdx >= 0 ? state.games[prevIdx] : undefined;
  if (!prev?.winner) return null;
  const g = await MatchGame.findOne({ matchId, gameIndex: prevIdx }).lean<{ acknowledgedBy?: Record<string, boolean> }>();
  const ack = g?.acknowledgedBy ?? {};
  if (ack.player1 && ack.player2) return null;
  return { gameIndex: prevIdx, winner: prev.winner, by: { player1: !!ack.player1, player2: !!ack.player2 } };
}

/** Recompute the countdown for the current step. Resets when the turn token changes. */
async function scheduleTimer(io: Server, matchId: string) {
  const ctx = await getCtx(matchId);
  if (!ctx) { clearTimer(matchId); timers.delete(matchId); return; }
  const { match, state } = ctx;
  const limit = effectiveLimit(state, match.config);
  const noOneAwaiting = !state.awaiting.player1 && !state.awaiting.player2;

  if (match.status !== "running" || state.finished || !state.currentStep || limit <= 0 || state.turn === "host" || noOneAwaiting) {
    clearTimer(matchId);
    timers.delete(matchId);
    return;
  }

  // Hold the clock until both players acknowledge the previous game's result.
  if (await awaitingAckInfo(matchId, state)) {
    clearTimer(matchId);
    timers.delete(matchId);
    return;
  }

  const token = `${state.currentStepIndex}:${state.currentStepProgress}`;
  const existing = timers.get(matchId);
  if (existing && existing.token === token && existing.handle) return; // already running for this turn

  if (existing?.handle) clearTimeout(existing.handle);
  const ms = limit * 1000;
  // Display deadline the client counts down to, but fire the auto-fill a touch
  // later so a press sent right as the clock hits 0 (plus its network latency)
  // still lands instead of being beaten to it by the expiry.
  const GRACE_MS = 1200;
  const handle = setTimeout(() => { void onExpire(io, matchId, token); }, ms + GRACE_MS);
  timers.set(matchId, { token, deadlineTs: Date.now() + ms, handle });
}

async function onExpire(io: Server, matchId: string, token: string) {
  try {
    const ctx = await getCtx(matchId);
    if (!ctx) return;
    const { match, state } = ctx;
    if (match.status === "paused" || state.finished || !state.currentStep) return;
    if (`${state.currentStepIndex}:${state.currentStepProgress}` !== token) return; // stale
    // This timer has fired; drop its entry so the broadcast() below always lets
    // scheduleTimer() re-arm (even if the auto-action below didn't advance the step).
    timers.delete(matchId);

    if (state.simultaneous) {
      // Auto-fill any player who hasn't finished submitting — but ONLY for the
      // step that actually timed out. Offer and snipe are two adjacent
      // simultaneous steps; without this guard the loop would roll straight past
      // the offer into the snipe and auto-resolve it too, skipping the snipe phase
      // (and robbing a player who DID act on time of their snipe).
      const stepIdx = state.currentStepIndex;
      for (let i = 0; i < 50; i++) {
        const c = await getCtx(matchId);
        if (!c || !c.state.simultaneous || c.state.finished) break;
        if (c.state.currentStepIndex !== stepIdx) break; // advanced to the next step — let it get its own timer
        const role: "player1" | "player2" | null = c.state.awaiting.player1 ? "player1" : c.state.awaiting.player2 ? "player2" : null;
        if (!role) break;
        // One question — "what may this seat legally submit right now" — answered
        // in one place. It used to ask only about the duel steps, so a SIMULTANEOUS
        // ban that ran out of clock found no target and quietly filled nothing,
        // leaving the draft waiting on a player whose time was already up.
        const target = botTargetFor(c.state, role);
        if (!target) break;
        const res = await applyAction(matchId, role, target);
        if (!res.ok) break;
      }
      await broadcast(io, matchId);
      return;
    }

    const role = state.turn;
    if (role !== "player1" && role !== "player2" && role !== "host") return;
    // randomLegalTarget only knows the step types that existed before turn-based
    // offers did — it answers null for a CIV_OFFER or a snipe taken on someone's
    // turn. That null used to return here without broadcasting and without
    // re-arming, so the clock sat on zero for ever, the turn never passed, and
    // clicks kept working long after time was up. Ask the same question the bot
    // asks instead; it covers every step type. HOST_DRAW isn't a seat, so the
    // random draw keeps its own path.
    const target = role === "host" ? randomLegalTarget(state) : botTargetFor(state, role);
    // Even with nothing to play, say so: a silent return leaves every client
    // showing a dead clock with no idea whether the server is still there.
    if (!target) { await broadcast(io, matchId); return; }
    await applyAction(matchId, role, target);
    await broadcast(io, matchId);
  } catch {
    /* ignore */
  }
}

// Server auto-performs HOST_DRAW steps (e.g. the random first map) — no human needed.
async function autoResolve(matchId: string) {
  for (let i = 0; i < 200; i++) {
    const ctx = await getCtx(matchId);
    if (!ctx) return;
    if (ctx.match.status !== "running" || ctx.state.finished || !ctx.state.currentStep) return;
    if (ctx.state.turn !== "host") return;
    const target = randomLegalTarget(ctx.state);
    if (!target) return;
    const res = await applyAction(matchId, "host", target);
    if (!res.ok) return;
  }
}

type FullPayload = NonNullable<Awaited<ReturnType<typeof buildPayload>>>;

// Hide not-yet-revealed simultaneous info from each recipient. Note that
// `awaiting` is NOT redacted — the UI needs "opponent has submitted" without
// learning WHAT they submitted.
function redactFor(payload: FullPayload, role: Role, isHost: boolean): FullPayload {
  const hideOther = (obj: { player1: string[]; player2: string[] }) => {
    if (role === "player1") obj.player2 = [];
    else if (role === "player2") obj.player1 = [];
    else { obj.player1 = []; obj.player2 = []; }
  };

  let out = payload;

  // Anonymous mode: strip the seat names for anyone who is neither a player nor
  // the host. Clearing the name (rather than substituting text) lets the client
  // fall back to its own localised "Player 1" / "Player 2" labels.
  const isParticipant = role === "player1" || role === "player2" || isHost;
  if (payload.anonymous && !isParticipant) {
    out = {
      ...out,
      seats: {
        ...out.seats,
        player1: out.seats.player1 ? { ...out.seats.player1, name: undefined } : null,
        player2: out.seats.player2 ? { ...out.seats.player2, name: undefined } : null,
      },
    };
  }

  let state = out.state;
  let touched = false;

  // Simultaneous ban in progress: you may see your own held bans, nobody else's.
  const pb = state.pendingBans;
  if (pb && (pb.player1.length > 0 || pb.player2.length > 0)) {
    const next = { player1: [...pb.player1], player2: [...pb.player2] };
    hideOther(next);
    state = { ...state, pendingBans: next };
    touched = true;
  }

  const duel = state.civDuel;
  const cs = state.currentStep?.type;
  if (duel && (cs === "CIV_OFFER" || cs === "CIV_SNIPE_OPPONENT")) {
    const d = { ...duel, offered: { ...duel.offered }, snipedBy: { ...duel.snipedBy } };
    if (cs === "CIV_OFFER") {
      // Only the simultaneous offer is secret. A turn-based one is a draft off a
      // shared table: hiding it would make the next player pick blind against
      // something they are supposed to be responding to.
      if (d.offerHidden) hideOther(d.offered); // hidden until both submit (then the step advances)
      d.snipedBy = { player1: [], player2: [] };
    } else {
      // CIV_SNIPE_OPPONENT: offers are revealed by now, and a blind snipe stays
      // hidden until both have taken theirs. A turn-based one is open for the
      // same reason a turn-based offer is — the seat on the clock is answering
      // what the other one just did, and cannot answer what it cannot see.
      if (state.simultaneous) hideOther(d.snipedBy);
    }
    state = { ...state, civDuel: d };
    touched = true;
  }

  return touched ? { ...out, state } : out;
}

// Pending bot moves, keyed by matchId — same shape as the turn timers so a state
// change cancels a move that was queued against the old state.
const botMoves = new Map<string, { token: string; handle: ReturnType<typeof setTimeout> }>();

function clearBot(matchId: string) {
  const b = botMoves.get(matchId);
  if (b) clearTimeout(b.handle);
  botMoves.delete(matchId);
}

/** Queue the practice opponent's next move, if it owes one. */
async function scheduleBot(io: Server, matchId: string) {
  const ctx = await getCtx(matchId);
  if (!ctx) { clearBot(matchId); return; }
  const { match, state } = ctx;
  const seat = botSeatOf(match);
  if (!seat || match.status !== "running" || state.finished) { clearBot(matchId); return; }

  // Between games nobody may act until both sides acknowledge the result. The bot
  // acknowledges too, or the draft would sit there waiting for a machine to nod.
  const ack = await awaitingAckInfo(matchId, state);
  const owesAck = ack ? !ack.by[seat] : false;
  // The bot nods in about three seconds; a human reads the result first. Between
  // those two moments the gate is still up, and only asking "do I owe an ack?"
  // let the bot answer no and go start the next step — so the draft moved on
  // underneath a player who was still looking at who won the last game.
  if (ack && !owesAck) { clearBot(matchId); return; }
  if (!owesAck && !botTargetFor(state, seat)) { clearBot(matchId); return; }

  const token = owesAck ? `ack:${ack!.gameIndex}` : `${state.currentStepIndex}:${state.currentStepProgress}`;
  const existing = botMoves.get(matchId);
  if (existing?.token === token) return; // already queued for this exact moment

  clearBot(matchId);
  const delay = owesAck ? BOT_THINK_MS : botDelay(effectiveLimit(state, match.config));
  const handle = setTimeout(() => { void botAct(io, matchId, token); }, delay);
  botMoves.set(matchId, { token, handle });
}

async function botAct(io: Server, matchId: string, token: string) {
  try {
    botMoves.delete(matchId);
    const ctx = await getCtx(matchId);
    if (!ctx) return;
    const seat = botSeatOf(ctx.match);
    if (!seat || ctx.match.status !== "running" || ctx.state.finished) return;

    if (token.startsWith("ack:")) {
      const gameIndex = Number(token.slice(4));
      await MatchGame.updateOne({ matchId, gameIndex }, { $set: { [`acknowledgedBy.${seat}`]: true } }, { upsert: true });
      await broadcast(io, matchId);
      return;
    }

    // The gate holds everyone, not just whoever has yet to press it. Checked here
    // as well as when the move was queued because the queue is three seconds long
    // and a game can be called inside it.
    if (await awaitingAckInfo(matchId, ctx.state)) return;

    // A step can owe the same seat several submissions (offer 2, ban 2). Deliver
    // them all for this step, then stop — the next step gets its own delay so the
    // draft doesn't sprint past a human trying to read it.
    const stepIdx = ctx.state.currentStepIndex;
    for (let i = 0; i < 50; i++) {
      const c = await getCtx(matchId);
      if (!c || c.state.finished || c.state.currentStepIndex !== stepIdx) break;
      const target = botTargetFor(c.state, seat);
      if (!target) break;
      const res = await applyAction(matchId, seat, target);
      if (!res.ok) break;
    }
    await broadcast(io, matchId);
  } catch {
    /* a failed bot move just leaves the turn to the timer */
  }
}

async function broadcast(io: Server, matchId: string) {
  await autoResolve(matchId);
  await scheduleTimer(io, matchId);
  await scheduleBot(io, matchId);
  const full = await buildPayload(matchId);
  if (!full) return;
  // "Finished" was only ever derived for the live payload, never written down, so
  // every completed draft sat in the database as "running" forever and the history
  // list said so. Persist it once, the moment the engine says the series is over.
  if (full.state.finished) {
    await Match.updateOne({ _id: matchId, status: { $ne: "finished" } }, { $set: { status: "finished" } });
  }
  const sockets = await io.in(ROOM(matchId)).fetchSockets();
  for (const s of sockets) {
    const role = (s.data.role as Role) ?? "spectator";
    const isHost = Boolean(s.data.isHost);
    s.emit(S2C.STATE, { ...redactFor(full, role, isHost), you: role, youAreHost: isHost });
  }
}

async function maybeStart(matchId: string): Promise<boolean> {
  const m = await Match.findById(matchId);
  if (!m || m.status !== "lobby") return false;
  if (m.player1Id && m.player2Id && m.player1Ready && m.player2Ready) {
    m.status = "running";
    await m.save();
    return true;
  }
  return false;
}

async function commitResult(matchId: string, gameIndex: number, winner: "player1" | "player2", byHost: boolean) {
  await MatchGame.findOneAndUpdate({ matchId, gameIndex }, { $set: { winner, overriddenByHost: byHost } }, { upsert: true });
  await MatchAction.create({ matchId, stepIndex: -1, actor: "host", actionType: "result", target: winner, gameIndex, seq: await nextSeq(matchId) });
}

export function registerMatchHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on(C2S.JOIN, async (p: JoinPayload) => {
      try {
        if (!p?.matchId) return;
        await dbConnect();
        const match = await Match.findById(p.matchId);
        if (!match) { socket.emit(S2C.ERROR, { message: "Match not found." }); return; }

        socket.join(ROOM(p.matchId));
        // The browser reuses one shared socket across navigations; leave any other
        // match rooms it joined earlier so a stale broadcast (e.g. a timer firing)
        // from a match the user navigated away from can't bleed into this view.
        const keep = ROOM(p.matchId);
        for (const room of [...socket.rooms]) {
          if (room !== socket.id && room !== keep) socket.leave(room);
        }
        socket.data.matchId = p.matchId;

        // Identity comes ONLY from a verified ticket, never from the raw payload.
        const ident = verifyTicket(p.ticket);
        const userId = ident?.uid;
        socket.data.userId = userId;
        socket.data.isHost = !!userId && String(match.hostId) === userId;

        let role: Role = "spectator";
        if (p.seat && userId) {
          const seatField = p.seat === "player1" ? "player1Id" : "player2Id";
          const nameField = p.seat === "player1" ? "player1Name" : "player2Name";
          const guestField = p.seat === "player1" ? "player1IsGuest" : "player2IsGuest";
          const alreadyP1 = match.player1Id && String(match.player1Id) === userId;
          const alreadyP2 = match.player2Id && String(match.player2Id) === userId;
          if (!match[seatField] && !alreadyP1 && !alreadyP2) {
            match[seatField] = userId;
            match[nameField] = ident?.name ?? "Player";
            match[guestField] = ident?.guest === true;
            await match.save();
          }
          if (String(match[seatField]) === userId) role = p.seat;
        }
        // Seat membership decides the acting role; host power is a separate flag (isHost).
        if (role === "spectator" && userId) {
          if (match.player1Id && String(match.player1Id) === userId) role = "player1";
          else if (match.player2Id && String(match.player2Id) === userId) role = "player2";
        }
        socket.data.role = role;

        // Single redacted broadcast to everyone (including the joiner) with per-recipient identity.
        await broadcast(io, p.matchId);
      } catch (e) {
        socket.emit(S2C.ERROR, { message: e instanceof Error ? e.message : "Join failed." });
      }
    });

    socket.on(C2S.ACTION, async ({ matchId, target }: { matchId: string; target: string }) => {
      try {
        const role = socket.data.role as Role | undefined;
        if (!matchId || socket.data.matchId !== matchId) return;
        if (role !== "player1" && role !== "player2" && role !== "host") {
          socket.emit(S2C.ERROR, { message: "Spectators cannot act." });
          return;
        }
        await dbConnect();
        // Block ALL actions until the previous game's result is acknowledged by
        // both players — nobody may pick/ban while the between-games gate is up.
        const gateCtx = await getCtx(matchId);
        if (gateCtx && (await awaitingAckInfo(matchId, gateCtx.state))) {
          socket.emit(S2C.ERROR, { message: "Both players must confirm the previous result first." });
          return;
        }
        const res = await applyAction(matchId, role, target);
        if (!res.ok) { socket.emit(S2C.ERROR, { message: res.error ?? "Invalid action." }); return; }
        await broadcast(io, matchId);
      } catch (e) {
        socket.emit(S2C.ERROR, { message: e instanceof Error ? e.message : "Action failed." });
      }
    });

    socket.on(C2S.RESULT_CLICK, async ({ matchId, gameIndex, winner }: { matchId: string; gameIndex: number; winner: "player1" | "player2" }) => {
      try {
        const role = socket.data.role as Role | undefined;
        if ((role !== "player1" && role !== "player2") || socket.data.matchId !== matchId) return;
        await dbConnect();
        // Player voting only applies in "vote" mode; in "host" mode the host calls it.
        const m = await Match.findById(matchId).lean<{
          config?: { options?: { resultMode?: string } };
          player1IsBot?: boolean;
          player2IsBot?: boolean;
        }>();
        if ((m?.config?.options?.resultMode ?? "vote") !== "vote") return;
        // The bot has no game to have won or lost — nobody actually played one —
        // so it takes the human's word for it. Whoever you say won, won; that is
        // what makes it possible to practise a specific branch of the series.
        const botSeat = m?.player1IsBot ? "player1" : m?.player2IsBot ? "player2" : null;
        const votes: Record<string, string> = { [`confirmedBy.${role}`]: winner };
        if (botSeat && botSeat !== role) votes[`confirmedBy.${botSeat}`] = winner;

        const game = await MatchGame.findOneAndUpdate({ matchId, gameIndex }, { $set: votes }, { upsert: true, new: true });
        const cb = (game?.confirmedBy as Record<string, string>) ?? {};
        if (cb.player1 && cb.player1 === cb.player2) await commitResult(matchId, gameIndex, winner, false);
        await broadcast(io, matchId);
      } catch (e) {
        socket.emit(S2C.ERROR, { message: e instanceof Error ? e.message : "Result failed." });
      }
    });

    socket.on(C2S.RESULT_OVERRIDE, async ({ matchId, gameIndex, winner }: { matchId: string; gameIndex: number; winner: "player1" | "player2" }) => {
      try {
        if (!socket.data.isHost || socket.data.matchId !== matchId) return;
        await dbConnect();
        await commitResult(matchId, gameIndex, winner, true);
        await broadcast(io, matchId);
      } catch (e) {
        socket.emit(S2C.ERROR, { message: e instanceof Error ? e.message : "Override failed." });
      }
    });

    // A seated player acknowledges a decided game ("Got it"); once both players
    // have, the gate in scheduleTimer lifts and the next game's clock starts.
    socket.on(C2S.RESULT_ACK, async ({ matchId, gameIndex }: { matchId: string; gameIndex: number }) => {
      try {
        const role = socket.data.role as Role | undefined;
        if ((role !== "player1" && role !== "player2") || socket.data.matchId !== matchId) return;
        await dbConnect();
        await MatchGame.updateOne({ matchId, gameIndex }, { $set: { [`acknowledgedBy.${role}`]: true } }, { upsert: true });
        await broadcast(io, matchId);
      } catch (e) {
        socket.emit(S2C.ERROR, { message: e instanceof Error ? e.message : "Ack failed." });
      }
    });

    socket.on(C2S.PAUSE, async ({ matchId, paused }: { matchId: string; paused: boolean }) => {
      try {
        const role = socket.data.role as Role | undefined;
        if (!role || role === "spectator" || socket.data.matchId !== matchId) return;
        await dbConnect();
        const match = await Match.findById(matchId);
        if (!match || match.status === "finished") return;
        // Respect the preset's pause setting: if pausing is disabled, refuse to pause
        // (resuming an already-paused match is always allowed).
        const pauseAllowed = (match.config as { options?: { pausable?: boolean } })?.options?.pausable ?? true;
        if (paused && !pauseAllowed) {
          socket.emit(S2C.ERROR, { message: "Pausing is disabled for this draft." });
          return;
        }
        match.status = paused ? "paused" : "running";
        await match.save();
        await broadcast(io, matchId);
      } catch {
        /* ignore */
      }
    });

    socket.on(C2S.READY, async ({ matchId, ready }: { matchId: string; ready: boolean }) => {
      try {
        const role = socket.data.role as Role | undefined;
        if ((role !== "player1" && role !== "player2") || socket.data.matchId !== matchId) return;
        await dbConnect();
        const field = role === "player1" ? "player1Ready" : "player2Ready";
        await Match.updateOne({ _id: matchId }, { $set: { [field]: !!ready } });
        await maybeStart(matchId);
        await broadcast(io, matchId);
      } catch { /* ignore */ }
    });

    // Sit a practice opponent in an empty seat, so one person can walk a whole
    // format through. Anyone already in the room may call it — a lone player
    // waiting for someone who isn't coming is exactly who needs this.
    socket.on(C2S.ADD_BOT, async ({ matchId, seat }: { matchId: string; seat: "player1" | "player2" }) => {
      try {
        const role = socket.data.role as Role | undefined;
        const seated = role === "player1" || role === "player2" || socket.data.isHost;
        if (!seated || socket.data.matchId !== matchId) return;
        if (seat !== "player1" && seat !== "player2") return;
        await dbConnect();
        const m = await Match.findById(matchId);
        // Lobby only: dropping a bot into a draft already under way would rewrite
        // whose turn it is halfway through.
        if (!m || m.status !== "lobby") return;
        const idField = seat === "player1" ? "player1Id" : "player2Id";
        if (m[idField]) { socket.emit(S2C.ERROR, { message: "That seat is taken." }); return; }
        m[idField] = BOT_ID;
        m[seat === "player1" ? "player1Name" : "player2Name"] = BOT_NAME;
        m[seat === "player1" ? "player1IsBot" : "player2IsBot"] = true;
        // It is never not ready — there is nobody to wait for.
        m[seat === "player1" ? "player1Ready" : "player2Ready"] = true;
        await m.save();
        await maybeStart(matchId);
        await broadcast(io, matchId);
      } catch (e) {
        socket.emit(S2C.ERROR, { message: e instanceof Error ? e.message : "Could not add a bot." });
      }
    });

    socket.on(C2S.START, async ({ matchId }: { matchId: string }) => {
      try {
        if (!socket.data.isHost || socket.data.matchId !== matchId) return;
        await dbConnect();
        const m = await Match.findById(matchId);
        if (!m || m.status !== "lobby" || !m.player1Id || !m.player2Id) return;
        m.status = "running";
        await m.save();
        await broadcast(io, matchId);
      } catch { /* ignore */ }
    });

    // These are per-session, not per-format: a tournament preset is shared and
    // public, but "let me quietly practise it with you" — and "let's play the
    // dead rubbers anyway" — have to be settable without cloning the whole
    // preset. The preset's values are the defaults; the host can override them
    // here, and only while still in the lobby. Mid-draft would be worse than
    // useless: flipping anonymity would retroactively expose names spectators
    // had been shown, and flipping playAll would move the finish line under a
    // player who is already one game from taking the series.
    socket.on(C2S.SET_OPTIONS, async ({ matchId, anonymous, publicHover, playAll, headStart }: {
      matchId: string; anonymous?: boolean; publicHover?: boolean; playAll?: boolean;
      headStart?: { player1?: number; player2?: number };
    }) => {
      try {
        if (!socket.data.isHost || socket.data.matchId !== matchId) return;
        await dbConnect();
        const m = await Match.findById(matchId);
        if (!m || m.status !== "lobby") return;
        const set: Record<string, unknown> = {};
        if (typeof anonymous === "boolean") set["config.options.anonymous"] = anonymous;
        if (typeof publicHover === "boolean") set["config.options.publicHover"] = publicHover;
        if (typeof playAll === "boolean") set["config.options.playAll"] = playAll;
        if (headStart) {
          // Bounded here as well as in the engine. The engine clamps what it
          // reads so an old or hand-edited config cannot break a draft; this
          // stops a junk value being stored in the first place.
          const target = Math.floor(Number(m.config?.options?.bestOf ?? 1) / 2) + 1;
          const cap = (n: unknown) => Math.max(0, Math.min(target - 1, Math.floor(Number(n) || 0)));
          set["config.options.headStart"] = { player1: cap(headStart.player1), player2: cap(headStart.player2) };
        }
        if (!Object.keys(set).length) return;
        // config is a Mixed field, so a dotted $set is the way to touch one key
        // without rewriting (and racing on) the whole snapshot.
        await Match.updateOne({ _id: matchId }, { $set: set });
        await broadcast(io, matchId);
      } catch { /* ignore */ }
    });

    socket.on(C2S.RENAME, async ({ matchId, name }: { matchId: string; name: string }) => {
      try {
        const role = socket.data.role as Role | undefined;
        if ((role !== "player1" && role !== "player2") || socket.data.matchId !== matchId) return;
        const clean = String(name ?? "").trim().slice(0, 32);
        if (!clean) return;
        await dbConnect();
        const field = role === "player1" ? "player1Name" : "player2Name";
        await Match.updateOne({ _id: matchId }, { $set: { [field]: clean } });
        await broadcast(io, matchId);
      } catch { /* ignore */ }
    });

    socket.on(C2S.HOVER, (payload) => {
      if (!payload?.matchId) return;
      socket.to(ROOM(payload.matchId)).emit(S2C.HOVER, payload);
    });
  });
}
