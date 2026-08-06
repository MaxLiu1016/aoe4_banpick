import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { GUEST_ACCESS, GUEST_TOKEN_TTL_SEC } from "@/lib/features";
import { signTicket, verifyTicket } from "@/lib/socket/ticket";

/**
 * Hands out the identity a player with no account draws on: an id nothing else
 * points to, signed by the server, kept in the caller's browser.
 *
 * One route covers minting, renewing and renaming, because they are the same
 * operation from the client's side — "here is who I claim to be, give me a fresh
 * token". A token that still verifies keeps its `uid` so the holder keeps their
 * seat across a reload; anything else starts a new identity.
 *
 * The `uid` is ALWAYS generated here and never read from the request. That is the
 * whole security property: this endpoint takes no authentication, so if it signed
 * a caller-supplied id then anyone could mint a ticket impersonating any user.
 */
const Body = z.object({
  token: z.string().max(2048).optional(),
  name: z.string().max(32).optional(),
});

export async function POST(req: Request) {
  if (!GUEST_ACCESS) return NextResponse.json({ error: "Guest access is disabled" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const existing = verifyTicket(parsed.data.token);
  // Only a guest token may be renewed here. A signed-in user's socket ticket
  // verifies too, and renewing it as a guest would quietly downgrade them.
  const uid = existing?.guest ? existing.uid : new Types.ObjectId().toHexString();
  const name = parsed.data.name?.trim().slice(0, 32) || existing?.name;

  return NextResponse.json({
    token: signTicket({ uid, name, guest: true }, GUEST_TOKEN_TTL_SEC),
    uid,
    name: name ?? null,
  });
}
