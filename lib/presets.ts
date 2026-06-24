import type { PresetConfig } from "@/lib/draft/schema";

export interface ClientPreset {
  id: string;
  ownerId: string;
  ownerName?: string;
  name: string;
  description: string;
  isPublic: boolean;
  config: PresetConfig;
  isOwner: boolean;
  isDemo: boolean;
  isFavorite: boolean;
  updatedAt?: string;
}

type RawPreset = {
  _id: unknown;
  ownerId: unknown;
  name: string;
  description?: string;
  isPublic?: boolean;
  isDemo?: boolean;
  config: PresetConfig;
  updatedAt?: Date;
};

export function toClientPreset(
  doc: RawPreset,
  viewerId?: string,
  extra?: { ownerName?: string; isFavorite?: boolean }
): ClientPreset {
  const ownerId = String(doc.ownerId);
  return {
    id: String(doc._id),
    ownerId,
    ownerName: extra?.ownerName,
    name: doc.name,
    description: doc.description ?? "",
    isPublic: Boolean(doc.isPublic),
    config: doc.config,
    isOwner: viewerId === ownerId,
    isDemo: Boolean(doc.isDemo),
    isFavorite: extra?.isFavorite ?? false,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}
