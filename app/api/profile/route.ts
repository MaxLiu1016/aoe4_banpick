import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/session";

// The username is the only editable profile field.
const Schema = z.object({ username: z.string().min(2).max(32) });

export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid username (2–32 chars)" }, { status: 400 });
  }
  const username = parsed.data.username.trim();

  await dbConnect();
  const taken = await User.findOne({ username, _id: { $ne: me.id } }).lean();
  if (taken) return NextResponse.json({ error: "Username already taken" }, { status: 409 });

  await User.updateOne({ _id: me.id }, { $set: { username } });
  return NextResponse.json({ username });
}
