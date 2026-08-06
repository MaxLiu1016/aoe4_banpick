import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongoose";
import { Preset } from "@/lib/models/Preset";
import { Favorite } from "@/lib/models/Favorite";
import { User } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/session";
import { buildDefaultConfig } from "@/lib/draft/defaultPreset";
import { toClientPreset } from "@/lib/presets";
import { isValidObjectId } from "mongoose";

const MAX_PRESETS_PER_USER = 2;

// List presets with filter (scope=mine|public), search (q) and pagination.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? (user ? "mine" : "public");
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10) || 12));

  await dbConnect();

  // The viewer's favorites (bookmarks of others' public presets).
  const favIds = user ? await Favorite.find({ userId: user.id }).distinct("presetId") : [];
  const favSet = new Set(favIds.map(String));

  const cond: Record<string, unknown> = {};
  if (scope === "mine") {
    if (!user) return NextResponse.json({ items: [], total: 0, page, limit });
    // "My rules" = presets I own + public presets I've favorited (reference only).
    cond.$or = [{ ownerId: user.id }, { _id: { $in: favIds }, isPublic: true }];
  } else {
    cond.isPublic = true;
  }
  if (q) cond.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const total = await Preset.countDocuments(cond);
  const docs = await Preset.find(cond)
    // Demos first, in the order the data file gives them (EGC ahead of the rest),
    // then everything else newest-first. Without demoOrder the built-ins shuffled
    // themselves every time one was edited.
    .sort({ isDemo: -1, demoOrder: 1, updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Resolve author display names for the page of results.
  const ownerIds = [...new Set(docs.map((d) => String(d.ownerId)))];
  const owners = await User.find({ _id: { $in: ownerIds } }).select("username").lean<{ _id: unknown; username: string }[]>();
  const nameById = new Map(owners.map((o) => [String(o._id), o.username]));

  const items = docs.map((d) =>
    toClientPreset(d as never, user?.id, {
      ownerName: nameById.get(String(d.ownerId)),
      isFavorite: favSet.has(String(d._id)),
    })
  );
  return NextResponse.json({ items, total, page, limit });
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

  // Non-admins may own at most MAX_PRESETS_PER_USER presets (clones included).
  if (!user.isAdmin) {
    const owned = await Preset.countDocuments({ ownerId: user.id });
    if (owned >= MAX_PRESETS_PER_USER) {
      return NextResponse.json(
        { error: "limit", message: `You can have at most ${MAX_PRESETS_PER_USER} presets — delete one first.` },
        { status: 403 }
      );
    }
  }

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
