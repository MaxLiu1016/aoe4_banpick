import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongoose";
import { Preset } from "@/lib/models/Preset";
import { getCurrentUser } from "@/lib/session";
import { buildDefaultConfig } from "@/lib/draft/defaultPreset";
import { toClientPreset } from "@/lib/presets";
import { isValidObjectId } from "mongoose";

// List the viewer's presets plus any public ones.
export async function GET() {
  const user = await getCurrentUser();
  await dbConnect();

  const filter = user
    ? { $or: [{ ownerId: user.id }, { isPublic: true }] }
    : { isPublic: true };

  const docs = await Preset.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
  return NextResponse.json(docs.map((d) => toClientPreset(d as never, user?.id)));
}

const CreateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  bestOf: z.number().int().min(1).max(15).optional(),
  fromId: z.string().optional(), // clone an existing preset (owned or public)
});

// Create a new preset — either seeded with the default flow, or cloned from `fromId`.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await dbConnect();

  // Clone path.
  if (parsed.data.fromId) {
    if (!isValidObjectId(parsed.data.fromId)) return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    const src = await Preset.findById(parsed.data.fromId).lean<{
      ownerId: unknown; name: string; description?: string; config: unknown; isPublic?: boolean;
    }>();
    if (!src) return NextResponse.json({ error: "Source preset not found" }, { status: 404 });
    if (!src.isPublic && String(src.ownerId) !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const clone = await Preset.create({
      ownerId: user.id,
      name: parsed.data.name?.trim() || `${src.name} (copy)`,
      description: src.description ?? "",
      config: src.config,
      isPublic: false,
    });
    return NextResponse.json(toClientPreset(clone.toObject() as never, user.id), { status: 201 });
  }

  // Default-create path.
  const bestOf = parsed.data.bestOf ?? 5;
  const doc = await Preset.create({
    ownerId: user.id,
    name: parsed.data.name?.trim() || `Bo${bestOf} Draft`,
    description: "",
    config: buildDefaultConfig(bestOf),
    isPublic: false,
  });

  return NextResponse.json(toClientPreset(doc.toObject() as never, user.id), { status: 201 });
}
