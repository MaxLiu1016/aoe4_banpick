import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/mongoose";
import { InviteCode } from "@/lib/models/InviteCode";
import { getCurrentUser } from "@/lib/session";

const genCode = () => randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await dbConnect();
  const codes = await InviteCode.find().sort({ createdAt: -1 }).limit(300).lean();
  return NextResponse.json(
    codes.map((c) => ({ code: c.code as string, used: Boolean(c.usedBy), note: (c.note as string) ?? "" }))
  );
}

const CreateSchema = z.object({ count: z.number().int().min(1).max(50).optional(), note: z.string().max(100).optional() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body ?? {});
  const count = parsed.success ? parsed.data.count ?? 1 : 1;
  const note = parsed.success ? parsed.data.note ?? "" : "";

  await dbConnect();
  const created: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = genCode();
    await InviteCode.create({ code, createdBy: user.id, note });
    created.push(code);
  }
  return NextResponse.json({ created }, { status: 201 });
}
