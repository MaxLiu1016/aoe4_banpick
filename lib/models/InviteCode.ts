import { Schema, model, models, type InferSchemaType } from "mongoose";

// Registration is invite-only: an admin generates codes; each code registers one user.
const InviteCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "" },
    usedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type InviteCodeDoc = InferSchemaType<typeof InviteCodeSchema>;
export const InviteCode = models.InviteCode || model("InviteCode", InviteCodeSchema);
