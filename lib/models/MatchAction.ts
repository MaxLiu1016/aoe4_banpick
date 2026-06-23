import { Schema, model, models, type InferSchemaType } from "mongoose";

// Append-only event log of every ban/pick/select action.
// This is the source of truth that spectators & reconnecting clients replay.
const MatchActionSchema = new Schema(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true, index: true },
    stepIndex: { type: Number, required: true },
    actor: { type: String, required: true }, // resolved concrete actor: PLAYER1 / PLAYER2 / HOST_DRAW
    actionType: { type: String, required: true }, // ban | pick | select | result
    pool: { type: String }, // map | civ | drafted_civ
    target: { type: String }, // entry id (civ/map slug) or winner id
    scope: { type: String }, // for civ bans: pool | opponent
    gameIndex: { type: Number }, // for per-game actions (select/snipe/result)
    seq: { type: Number, required: true }, // monotonically increasing within match
  },
  { timestamps: true }
);

MatchActionSchema.index({ matchId: 1, seq: 1 }, { unique: true });

export type MatchActionDoc = InferSchemaType<typeof MatchActionSchema>;
export const MatchAction = models.MatchAction || model("MatchAction", MatchActionSchema);
