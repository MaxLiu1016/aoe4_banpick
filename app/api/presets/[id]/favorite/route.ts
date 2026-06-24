import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Preset } from "@/lib/models/Preset";
import { Favorite } from "@/lib/models/Favorite";
import { getCurrentUser } from "@/lib/session";

// Add the preset to the current user's favorites (a reference, not a copy).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dbConnect();
  const preset = await Preset.findById(id).lean<{ ownerId: unknown; isPublic?: boolean }>();
  if (!preset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!preset.isPublic) return NextResponse.json({ error: "Only public presets can be favorited." }, { status: 403 });
  if (String(preset.ownerId) === user.id) return NextResponse.json({ error: "You already own this preset." }, { status: 400 });

  // Idempotent: unique (userId, presetId) index makes re-favoriting a no-op.
  await Favorite.updateOne({ userId: user.id, presetId: id }, { $setOnInsert: { userId: user.id, presetId: id } }, { upsert: true });
  return NextResponse.json({ ok: true, favorite: true });
}

// Remove the preset from the current user's favorites.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dbConnect();
  await Favorite.deleteOne({ userId: user.id, presetId: id });
  return NextResponse.json({ ok: true, favorite: false });
}
