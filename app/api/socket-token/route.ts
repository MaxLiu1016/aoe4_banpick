import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { signTicket } from "@/lib/socket/ticket";

// Issues a short-lived signed ticket the client hands to the Socket.IO server,
// binding the socket's identity to the authenticated session.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ticket = signTicket({ uid: user.id, name: user.name ?? undefined }, 600);
  return NextResponse.json({ ticket });
}
