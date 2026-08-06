import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tiny HMAC-signed ticket so the Socket.IO server can trust a client's identity.
 * Flow: an authenticated route signs { uid, name } with AUTH_SECRET; the client
 * passes the ticket on JOIN; the socket server verifies it. This prevents clients
 * from claiming an arbitrary userId in the socket payload.
 */

interface TicketPayload {
  uid: string;
  name?: string;
  /** Set for a player with no account. `uid` is then an id nothing else points to. */
  guest?: true;
  exp: number; // epoch ms
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is required to sign socket tickets");
  return s;
}

export function signTicket(data: { uid: string; name?: string; guest?: true }, ttlSec = 300): string {
  const payload: TicketPayload = { uid: data.uid, name: data.name, guest: data.guest, exp: Date.now() + ttlSec * 1000 };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyTicket(token: string | undefined): { uid: string; name?: string; guest?: true } | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TicketPayload;
    if (!payload.uid || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return { uid: payload.uid, name: payload.name, guest: payload.guest === true ? true : undefined };
  } catch {
    return null;
  }
}
