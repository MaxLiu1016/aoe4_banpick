import { Schema, model, models, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true }, // the "account" — free-form, unique
    email: { type: String, lowercase: true, trim: true }, // optional/legacy; no longer used for login

    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User = models.User || model("User", UserSchema);
