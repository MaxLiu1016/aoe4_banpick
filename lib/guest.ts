"use client";

/**
 * The browser half of playing without an account: hold the server-signed guest
 * token, renew it, and hand it to whoever needs to prove who we are.
 *
 * localStorage rather than a cookie on purpose. The token is only ever sent when
 * this module puts it somewhere explicit — an `x-guest-token` header, or the
 * socket's JOIN payload — so it is never attached to a request we did not mean to
 * make, which is CSRF off the table rather than defended against.
 */

const KEY = "aoe4bp.guest";
/** Renew this far ahead of expiry so a long draft can't run past it mid-turn. */
const RENEW_BEFORE_MS = 24 * 60 * 60 * 1000;

interface Stored { token: string; uid: string; name: string | null }

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Stored;
    return v?.token && v?.uid ? v : null;
  } catch {
    return null;
  }
}

function write(v: Stored) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode, or full */ }
}

/** Expiry (epoch ms) baked into the token, or 0 if it can't be read. Not trusted
 *  for anything but deciding when to renew — the server checks it for real. */
function expiryOf(token: string): number {
  try {
    const body = token.split(".")[0];
    const json = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof json.exp === "number" ? json.exp : 0;
  } catch {
    return 0;
  }
}

async function mint(body: { token?: string; name?: string }): Promise<Stored | null> {
  try {
    const r = await fetch("/api/guest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null; // guest access switched off
    const j = (await r.json()) as { token: string; uid: string; name: string | null };
    const v = { token: j.token, uid: j.uid, name: j.name };
    write(v);
    return v;
  } catch {
    return null;
  }
}

/** The current guest identity, minting or renewing one if needed. */
export async function getGuest(): Promise<Stored | null> {
  const cur = read();
  if (cur && expiryOf(cur.token) - Date.now() > RENEW_BEFORE_MS) return cur;
  // Passing the old token keeps the same uid — and therefore the same seat.
  return (await mint({ token: cur?.token })) ?? cur;
}

export async function getGuestToken(): Promise<string | undefined> {
  return (await getGuest())?.token;
}

/** The name this guest shows under, or null if they haven't chosen one yet. */
export function guestName(): string | null {
  return read()?.name ?? null;
}

export async function setGuestName(name: string): Promise<string | undefined> {
  const cur = read();
  return (await mint({ token: cur?.token, name }))?.token;
}
