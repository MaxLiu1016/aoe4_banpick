import { cache } from "react";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Match } from "@/lib/models/Match";
import { Preset } from "@/lib/models/Preset";

export type RoomMeta = { name: string; description: string; bestOf?: number };

/**
 * Resolve a match's display name + description for the page heading and the
 * shareable link's <title>/description. Prefers the snapshot stored on the
 * match; older matches created before the snapshot fall back to the live preset.
 * Wrapped in React cache() so the page render and generateMetadata share one read.
 */
export const getRoomMeta = cache(async (id: string): Promise<RoomMeta | null> => {
  if (!isValidObjectId(id)) return null;
  await dbConnect();
  const match = await Match.findById(id).lean<{
    name?: string;
    description?: string;
    presetId?: unknown;
    config?: { options?: { bestOf?: number } };
  }>();
  if (!match) return null;

  let name = (match.name ?? "").trim();
  let description = (match.description ?? "").trim();

  if (!name && match.presetId) {
    const preset = await Preset.findById(match.presetId).lean<{ name?: string; description?: string }>();
    if (preset) {
      name = (preset.name ?? "").trim();
      if (!description) description = (preset.description ?? "").trim();
    }
  }

  return {
    name: name || "Ban/Pick Match",
    description,
    bestOf: match.config?.options?.bestOf,
  };
});
