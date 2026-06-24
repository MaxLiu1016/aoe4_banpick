import { Schema, model, models, type InferSchemaType } from "mongoose";

// A user's bookmark of someone else's public preset. It's only a reference, not
// a copy: if the original preset is deleted, its favorites are removed too (and
// they're filtered out of listings when the preset no longer exists / is private).
const FavoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    presetId: { type: Schema.Types.ObjectId, ref: "Preset", required: true, index: true },
  },
  { timestamps: true }
);

FavoriteSchema.index({ userId: 1, presetId: 1 }, { unique: true });

export type FavoriteDoc = InferSchemaType<typeof FavoriteSchema>;
export const Favorite = models.Favorite || model("Favorite", FavoriteSchema);
