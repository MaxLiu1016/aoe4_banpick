import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Match } from "@/lib/models/Match";
import { getCurrentUser } from "@/lib/session";

// Lightweight match meta for the room/spectate pages (full live state comes via Socket.IO).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await dbConnect();
  const m = await Match.findById(id).lean<{
    _id: unknown;
    hostId: unknown;
    player1Id?: unknown;
    player2Id?: unknown;
    status: string;
    shareCode: string;
  }>();
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await getCurrentUser();
  return NextResponse.json({
    id: String(m._id),
    status: m.status,
    shareCode: m.shareCode,
    hostId: String(m.hostId),
    hasPlayer1: Boolean(m.player1Id),
    hasPlayer2: Boolean(m.player2Id),
    isHost: user ? String(m.hostId) === user.id : false,
    viewer: user ? { id: user.id, name: user.name } : null,
  });
}
