import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Match } from "@/lib/models/Match";
import { MatchAction } from "@/lib/models/MatchAction";

/**
 * Everything needed to replay a finished draft from the beginning.
 *
 * The engine is a pure function of (config, actions), so handing those two
 * things to a browser lets it reconstruct any moment of the draft without the
 * server deriving a state per frame. That is the whole reason this is two
 * fields and not a hundred snapshots.
 *
 * **Finished matches only, and that is a security boundary, not a nicety.** A
 * running draft's action log contains things `redactFor` is actively hiding —
 * a simultaneous ban nobody has revealed, an offer still face down. Once the
 * series is over there is nothing left to hide, which is what makes shipping
 * the raw log safe here and unsafe anywhere else. Do not relax this to "any
 * match" without rebuilding the redaction on top of it.
 *
 * Public, like the spectator page it serves: a draft link is meant to be
 * shareable after the fact, and this exposes nothing `/watch/[id]` did not
 * already show while the match was live.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dbConnect();
  const match = await Match.findById(id).select("config status").lean<{
    config: unknown;
    status: string;
  }>();
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (match.status !== "finished") {
    return NextResponse.json({ error: "Replay is available once the series is over." }, { status: 409 });
  }

  const docs = await MatchAction.find({ matchId: id }).sort({ seq: 1 }).lean();
  const actions = docs.map((d) => ({
    seq: d.seq as number,
    stepIndex: d.stepIndex as number,
    actor: d.actor as string,
    actionType: d.actionType as string,
    pool: d.pool as string | undefined,
    target: d.target as string,
    scope: d.scope as string | undefined,
    gameIndex: d.gameIndex as number | undefined,
  }));

  return NextResponse.json(
    { config: match.config, actions },
    // A finished draft never changes again, so this is the one thing in the app
    // that can be cached hard.
    { headers: { "cache-control": "public, max-age=3600, immutable" } }
  );
}
