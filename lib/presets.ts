import type { PresetConfig } from "@/lib/draft/schema";

export interface ClientPreset {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  isPublic: boolean;
  config: PresetConfig;
  isOwner: boolean;
  updatedAt?: string;
}

type RawPreset = {
  _id: unknown;
  ownerId: unknown;
  name: string;
  description?: string;
  isPublic?: boolean;
  config: PresetConfig;
  updatedAt?: Date;
};

export function toClientPreset(doc: RawPreset, viewerId?: string): ClientPreset {
  const ownerId = String(doc.ownerId);
  return {
    id: String(doc._id),
    ownerId,
    name: doc.name,
    description: doc.description ?? "",
    isPublic: Boolean(doc.isPublic),
    config: doc.config,
    isOwner: viewerId === ownerId,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}
