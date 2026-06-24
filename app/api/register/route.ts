import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/lib/models/User";
import { InviteCode } from "@/lib/models/InviteCode";
import { INVITE_ONLY_REGISTRATION } from "@/lib/features";

const RegisterSchema = z.object({
  // The account is a free-form identifier — any non-empty string, just unique.
  username: z.string().trim().min(1).max(32),
  password: z.string().min(8).max(100),
  // Only required while invite-only registration is enabled.
  inviteCode: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { username, password, inviteCode } = parsed.data;

  await dbConnect();

  // Registration is invite-only only while the flag is on: the code must exist
  // and be unused. When open, the invite is ignored entirely.
  let invite = null;
  if (INVITE_ONLY_REGISTRATION) {
    invite = await InviteCode.findOne({ code: (inviteCode ?? "").trim() });
    if (!inviteCode || !invite || invite.usedBy) {
      return NextResponse.json({ error: "Invalid or already-used invite code" }, { status: 403 });
    }
  }

  const existing = await User.findOne({ username }).lean();
  if (existing) {
    return NextResponse.json({ error: "That account name is already taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash });

  if (invite) {
    invite.usedBy = user._id;
    invite.usedAt = new Date();
    await invite.save();
  }

  return NextResponse.json({ id: String(user._id), username: user.username }, { status: 201 });
}
