import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Preset } from "@/lib/models/Preset";
import { getCurrentUser } from "@/lib/session";
import { toClientPreset } from "@/lib/presets";
import { PresetConfigSchema } from "@/lib/draft/schema";

async function load(id: string) {
  if (!isValidObjectId(id)) return null;
  await dbConnect();
  return Preset.findById(id).lean();
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const doc = await load(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const preset = toClientPreset(doc as never, user?.id);
  if (!preset.isPublic && !preset.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(preset);
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(2000).optional(),
  isPublic: z.boolean().optional(),
  config: PresetConfigSchema.optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const existing = await Preset.findById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // The seeded demo presets are locked: nobody (not even their admin owner) may
  // edit them or flip them private — they stay public and pristine as starting points.
  if (existing.isDemo) {
    return NextResponse.json({ error: "Demo presets are locked and cannot be modified." }, { status: 403 });
  }
  if (String(existing.ownerId) !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  Object.assign(existing, parsed.data);
  await existing.save();

  return NextResponse.json(toClientPreset(existing.toObject() as never, user.id));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dbConnect();
  const existing = await Preset.findById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Demo presets are permanent — they cannot be deleted by anyone.
  if (existing.isDemo) {
    return NextResponse.json({ error: "Demo presets are locked and cannot be deleted." }, { status: 403 });
  }
  if (String(existing.ownerId) !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await existing.deleteOne();
  return NextResponse.json({ ok: true });
}
