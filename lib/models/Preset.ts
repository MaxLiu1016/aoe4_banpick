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
    // Which entry in data/demoPresets.ts this row is, and which revision of it.
    // The seed matches on demoKey so a demo can be renamed in code without
    // orphaning its row, and re-writes the row when the code's version is higher.
    demoKey: { type: String, index: true, sparse: true },
    demoVersion: { type: Number, default: 0 },
    // Where a demo sits in the list, low first. Defaulted high so anything the
    // seed hasn't given an explicit place to lands after the ones that have.
    demoOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

export type PresetDoc = InferSchemaType<typeof PresetSchema>;
export const Preset = models.Preset || model("Preset", PresetSchema);
