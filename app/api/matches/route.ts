import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Match } from "@/lib/models/Match";
import { MatchGame } from "@/lib/models/MatchGame";
import { Preset } from "@/lib/models/Preset";
import { getCurrentUser } from "@/lib/session";
import { validatePreset } from "@/lib/draft/validate";
import type { PresetConfig } from "@/lib/draft/schema";

const CreateSchema = z.object({ presetId: z.string() });

function shareCode(): string {
  return randomBytes(4).toString("hex"); // 8 hex chars
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success || !isValidObjectId(parsed.data.presetId)) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
  }

  await dbConnect();
  const preset = await Preset.findById(parsed.data.presetId).lean<{
    _id: unknown;
    ownerId: unknown;
    isPublic?: boolean;
    name?: string;
    description?: string;
    config: unknown;
  }>();
  if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  if (!preset.isPublic && String(preset.ownerId) !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const problems = validatePreset(preset.config as PresetConfig);
  if (problems.length) {
    return NextResponse.json({ error: "Preset is not valid for play", issues: problems }, { status: 400 });
  }

  // The creator is the HOST / referee. They may take a player seat in the lobby,
  // or stay as referee. Either way the host calls the game results.
  const match = await Match.create({
    presetId: preset._id,
    hostId: user.id,
    name: preset.name ?? "", // snapshot the room name shown in the lobby / share preview
    description: preset.description ?? "",
    config: preset.config, // snapshot
    status: "lobby",
    currentStepIndex: 0,
    shareCode: shareCode(),
  });

  return NextResponse.json({ id: String(match._id), shareCode: match.shareCode }, { status: 201 });
}

/**
 * The signed-in user's draft history. "Participated" means they held a seat or
 * hosted the room — merely spectating a draft never puts it in your list.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const global = params.get("scope") === "global";
  const presetId = params.get("preset");
  // Capped because it goes into a regex: a long pattern against a large
  // collection is a cheap way to make the database work hard for nothing.
  const q = (params.get("q") ?? "").trim().slice(0, 60);
  const user = await getCurrentUser();
  if (!global && !user) return NextResponse.json([]);
  await dbConnect();

  // The global feed deliberately excludes anonymous drafts outright rather than
  // just masking the names. Someone who ticked "anonymous" is practising a format
  // they don't want scouted, and a public row saying WHEN and WHICH PRESET is
  // usually enough to work out who, names or no names. It also skips lobbies —
  // a room nobody has played in yet isn't a match.
  const filter: Record<string, unknown> = global
    ? { "config.options.anonymous": { $ne: true }, status: { $in: ["running", "paused", "finished"] }, player1Id: { $ne: null }, player2Id: { $ne: null } }
    : { $or: [{ hostId: user!.id }, { player1Id: user!.id }, { player2Id: user!.id }] };

  // Narrowing happens here rather than in the browser: the list is capped at the
  // most recent N, so filtering the page after it arrives would search only
  // whatever happened to be in that page — the older draft you were looking for
  // is exactly the one that never got sent.
  if (presetId && isValidObjectId(presetId)) filter.presetId = presetId;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    // $and, not $or: the signed-in list already spends $or on "my seat or my room".
    filter.$and = [{ $or: [{ name: rx }, { player1Name: rx }, { player2Name: rx }] }];
  }

  const docs = await Match.find(filter)
    .sort({ updatedAt: -1 })
    .limit(global ? 20 : 50)
    .lean();

  // Scores come from the per-game records in one batched query rather than
  // replaying every match's action log.
  const ids = docs.map((d) => d._id);
  const games = await MatchGame.find({ matchId: { $in: ids }, winner: { $ne: null } })
    .select("matchId winner")
    .lean<{ matchId: unknown; winner: "player1" | "player2" }[]>();
  const scores = new Map<string, { player1: number; player2: number }>();
  for (const g of games) {
    const k = String(g.matchId);
    const s = scores.get(k) ?? { player1: 0, player2: 0 };
    s[g.winner]++;
    scores.set(k, s);
  }

  // Drafts get abandoned mid-way — someone closes the tab and never comes back.
  // Calling those "finished" would be a lie; leaving them "in progress" forever is
  // worse. A day of silence is well past any real session, pauses included, and if
  // one does resume its updatedAt moves and the label reverts on its own. Judged
  // against the server's clock rather than the viewer's.
  const staleBefore = Date.now() - 24 * 60 * 60 * 1000;

  return NextResponse.json(
    docs.map((d) => {
      const id = String(d._id);
      const cfg = d.config as {
        options?: { anonymous?: boolean; bestOf?: number; playAll?: boolean };
        steps?: { type?: string }[];
      };
      const anonymous = Boolean(cfg?.options?.anonymous);
      // Worked out here rather than trusted from `status`: drafts finished before
      // the status was ever persisted are still stored as "running", and a
      // migration to fix them would be a lot of ceremony for a derived value.
      const score = scores.get(id) ?? { player1: 0, player2: 0 };
      const bestOf = cfg?.options?.bestOf ?? 0;
      const gamesInSeries = (cfg?.steps ?? []).filter((s) => s.type === "GAME_RESULT").length;
      // A missing bestOf must not make a 1-0 look decided, hence Infinity rather
      // than the 1 that floor(0 / 2) + 1 would give.
      const target = bestOf >= 1 ? Math.floor(bestOf / 2) + 1 : Infinity;
      const decided = d.status === "finished" || (cfg?.options?.playAll
        ? gamesInSeries > 0 && score.player1 + score.player2 >= gamesInSeries
        : Math.max(score.player1, score.player2) >= target);
      const asP1 = !!user && String(d.player1Id ?? "") === user.id;
      const asP2 = !!user && String(d.player2Id ?? "") === user.id;
      const asHost = !!user && String(d.hostId ?? "") === user.id;
      return {
        id,
        name: d.name || "",
        status: d.status,
        shareCode: d.shareCode,
        bestOf: bestOf || undefined,
        decided,
        stale: !decided && new Date(d.updatedAt as Date).getTime() < staleBefore,
        anonymous,
        // Your seat in that match — "host" only when you never took a seat, and
        // null in the global feed, where most rows have nothing to do with you.
        role: asP1 ? "player1" : asP2 ? "player2" : asHost ? "host" : null,
        player1Name: d.player1Name ?? null,
        player2Name: d.player2Name ?? null,
        score,
        updatedAt: d.updatedAt,
      };
    })
  );
}
