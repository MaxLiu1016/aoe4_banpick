import { Schema, model, models, type InferSchemaType } from "mongoose";

// config is validated by lib/draft/schema.ts (Zod) before saving; stored loosely here.
const PresetSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    config: { type: Schema.Types.Mixed, required: true },
    isPublic: { type: Boolean, default: false, index: true },
    isDemo: { type: Boolean, default: false }, // seeded demo presets, always present
  },
  { timestamps: true }
);

export type PresetDoc = InferSchemaType<typeof PresetSchema>;
export const Preset = models.Preset || model("Preset", PresetSchema);
