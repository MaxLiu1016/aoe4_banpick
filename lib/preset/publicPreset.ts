import { cache } from "react";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Preset } from "@/lib/models/Preset";
import { User } from "@/lib/models/User";
import type { PresetConfig } from "@/lib/draft/schema";

export interface PublicPreset {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName?: string;
  isPublic: boolean;
  isDemo: boolean;
  config: PresetConfig;
  updatedAt?: string;
}

/**
 * A format as anyone may see it: name, description, and the rules themselves.
 *
 * Wrapped in React's cache() so the page body and generateMetadata share one read
 * rather than querying twice for the same document — the same arrangement
 * getRoomMeta uses.
 *
 * Returns null for a private format rather than throwing a 403. Whether a private
 * format exists is not a public fact, and a 403 answers that question.
 */
export const getPublicPreset = cache(async (id: string): Promise<PublicPreset | null> => {
  if (!isValidObjectId(id)) return null;
  await dbConnect();
  const doc = await Preset.findById(id).lean<{
    _id: unknown;
    ownerId: unknown;
    name?: string;
    description?: string;
    isPublic?: boolean;
    isDemo?: boolean;
    config: PresetConfig;
    updatedAt?: Date;
  }>();
  if (!doc || !doc.isPublic) return null;

  const owner = await User.findById(doc.ownerId).select("username").lean<{ username?: string }>();
  return {
    id: String(doc._id),
    name: doc.name ?? "",
    description: doc.description ?? "",
    ownerId: String(doc.ownerId),
    ownerName: owner?.username,
    isPublic: true,
    isDemo: Boolean(doc.isDemo),
    config: doc.config,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
});

/** The one-line summary used as the page description when the author wrote none. */
export function presetSummary(p: PublicPreset): string {
  const c = p.config;
  const games = c.steps.filter((s) => s.type === "GAME_RESULT").length;
  return [
    `Best of ${c.options.bestOf}`,
    `${c.steps.length} draft steps`,
    `${c.civs.length} civilizations`,
    `${c.maps.length} maps`,
    games ? `${games} games` : null,
  ].filter(Boolean).join(" · ");
}
