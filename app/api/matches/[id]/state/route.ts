import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Match } from "@/lib/models/Match";
import { MatchAction } from "@/lib/models/MatchAction";
import { deriveState, type EngineAction, type SeatRole } from "@/lib/draft/engine";
import type { PresetConfig } from "@/lib/draft/schema";

/**
 * A read-only projection of a draft's derived state, for an external consumer
 * polling for results — a Discord tournament bot, in the first instance.
 */

const RATE_PER_MINUTE = 120;
const requestsByIp = new Map<string, number[]>();

function rateLimited(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const cutoff = Date.now() - 60 * 1000;
  const recent = (requestsByIp.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_PER_MINUTE) {
    requestsByIp.set(ip, recent);
    return true;
  }
  recent.push(Date.now());
  requestsByIp.set(ip, recent);
  return false;
}

async function loadActions(matchId: string): Promise<EngineAction[]> {
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
  player1Id?: unknown;
  player2Id?: unknown;
  actionSeq: number;
  updatedAt: Date;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rateLimited(req)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  await dbConnect();
  const match = await Match.findById(id)
    .select("config status player1Id player2Id actionSeq updatedAt")
    .lean<MatchLean>();
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // `actionSeq` moves on every persisted action; `updatedAt` also moves on
  // writes that touch neither, like a seat being claimed. Together they cover
  // everything this projection can show.
  const etag = `W/"${match.actionSeq}-${new Date(match.updatedAt).getTime()}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag, "cache-control": "no-cache" } });
  }

  const actions = await loadActions(id);
  const state = deriveState(match.config, actions, match.status);

  const games = state.games.map((g) => ({
    number: g.gameIndex + 1,
    map: g.map ?? null,
    civBySlot: { "1": g.civP1 ?? null, "2": g.civP2 ?? null },
    winnerSlot: g.winner === "player1" ? 1 : g.winner === "player2" ? 2 : null,
  }));

  const body = {
    id,
    status: match.status,
    finished: state.finished,
    updatedAt: new Date(match.updatedAt).toISOString(),
    seats: [
      { slot: 1, claimed: Boolean(match.player1Id) },
      { slot: 2, claimed: Boolean(match.player2Id) },
    ],
    bestOf: state.bestOf,
    target: state.target,
    playAll: state.playAll,
    // Wins only — `state.score` is head-start-inclusive (`lib/draft/engine.ts`),
    // which would silently disagree with a consumer counting `games[]` itself.
    headStart: { "1": state.headStart.player1, "2": state.headStart.player2 },
    score: {
      "1": state.score.player1 - state.headStart.player1,
      "2": state.score.player2 - state.headStart.player2,
    },
    games,
  };

  return NextResponse.json(body, { headers: { etag, "cache-control": "no-cache" } });
}
