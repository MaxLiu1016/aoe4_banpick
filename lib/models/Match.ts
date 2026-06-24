import { Schema, model, models, type InferSchemaType } from "mongoose";

// A live ban/pick session executing a preset's steps.
const MatchSchema = new Schema(
  {
    presetId: { type: Schema.Types.ObjectId, ref: "Preset", required: true },
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Snapshot of the preset's name/description + config at match-creation time
    // (so renaming or editing the preset later doesn't mutate a running match).
    name: { type: String, default: "" },
    description: { type: String, default: "" },
    config: { type: Schema.Types.Mixed, required: true },
    player1Id: { type: Schema.Types.ObjectId, ref: "User" },
    player2Id: { type: Schema.Types.ObjectId, ref: "User" },
    player1Name: { type: String },
    player2Name: { type: String },
    player1Ready: { type: Boolean, default: false },
    player2Ready: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["lobby", "running", "paused", "finished"],
      default: "lobby",
      index: true,
    },
    currentStepIndex: { type: Number, default: 0 },
    // Atomic counter for MatchAction.seq — incremented via $inc to avoid races.
    actionSeq: { type: Number, default: 0 },
    // Short human-shareable code for joining/spectating.
    shareCode: { type: String, unique: true, index: true },
  },
  { timestamps: true }
);

export type MatchDoc = InferSchemaType<typeof MatchSchema>;
export const Match = models.Match || model("Match", MatchSchema);
