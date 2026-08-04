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
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([]);
  await dbConnect();
  const docs = await Match.find({
    $or: [{ hostId: user.id }, { player1Id: user.id }, { player2Id: user.id }],
  })
    .sort({ updatedAt: -1 })
    .limit(50)
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

  return NextResponse.json(
    docs.map((d) => {
      const id = String(d._id);
      const anonymous = Boolean((d.config as { options?: { anonymous?: boolean } })?.options?.anonymous);
      const asP1 = String(d.player1Id ?? "") === user.id;
      const asP2 = String(d.player2Id ?? "") === user.id;
      return {
        id,
        name: d.name || "",
        status: d.status,
        shareCode: d.shareCode,
        bestOf: (d.config as { options?: { bestOf?: number } })?.options?.bestOf,
        anonymous,
        // Your seat in that match — "host" only when you never took a seat.
        role: asP1 ? "player1" : asP2 ? "player2" : "host",
        player1Name: d.player1Name ?? null,
        player2Name: d.player2Name ?? null,
        score: scores.get(id) ?? { player1: 0, player2: 0 },
        updatedAt: d.updatedAt,
      };
    })
  );
}
