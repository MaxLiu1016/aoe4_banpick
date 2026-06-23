import { Schema, model, models, type InferSchemaType } from "mongoose";

// Per-game record within a best-of series: chosen map, each side's civ, and result.
const MatchGameSchema = new Schema(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true, index: true },
    gameIndex: { type: Number, required: true },
    map: { type: String }, // map slug
    civP1: { type: String }, // civ slug
    civP2: { type: String },
    winner: { type: String, enum: ["player1", "player2", null], default: null },
    // Who has clicked the result; host can override. e.g. { player1: "player2", player2: "player2" }
    confirmedBy: { type: Schema.Types.Mixed, default: {} },
    overriddenByHost: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MatchGameSchema.index({ matchId: 1, gameIndex: 1 }, { unique: true });

export type MatchGameDoc = InferSchemaType<typeof MatchGameSchema>;
export const MatchGame = models.MatchGame || model("MatchGame", MatchGameSchema);
