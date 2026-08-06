/**
 * Guest identity. The endpoint that hands these out takes no authentication, so
 * the rules about WHICH id it will sign are the whole security story:
 *
 *   - the id is always generated here, never read from the request;
 *   - a token that still verifies keeps its id, which is how a guest keeps their
 *     seat across a reload;
 *   - a signed-in user's socket ticket verifies too, and must NOT be adoptable —
 *     renewing one as a guest would hand the caller that user's identity.
 *
 * No database and no server needed; the route is called directly.
 *
 *   npx tsx scripts/test-guest.ts
 */
process.env.AUTH_SECRET ||= "test-secret-for-guest-tickets";

import { POST } from "../app/api/guest/route";
import { signTicket, verifyTicket } from "../lib/socket/ticket";
import { GUEST_TOKEN_TTL_SEC } from "../lib/features";

let failures = 0;
const ok = (c: boolean, m: string) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) failures++; };

const call = async (body: unknown): Promise<{ token: string; uid: string; name: string | null }> => {
  const res = await POST(new Request("http://localhost/api/guest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
  return res.json();
};

async function main() {
  console.log("A fresh caller gets a fresh identity:");
  const a = await call({});
  ok(/^[a-f0-9]{24}$/.test(a.uid), "the id is a real ObjectId, so it drops straight into a match's seat field");
  const va = verifyTicket(a.token);
  ok(va?.uid === a.uid, "the token it signs carries that id");
  ok(va?.guest === true, "and is marked as a guest");

  const b = await call({});
  ok(b.uid !== a.uid, "two callers are two different people");

  console.log("\nA valid token keeps its identity — that is what holds the seat:");
  const renewed = await call({ token: a.token });
  ok(renewed.uid === a.uid, "renewing returns the same id");
  ok(renewed.token !== a.token, "but a new token, so the clock restarts");
  const named = await call({ token: renewed.token, name: "Askallad" });
  ok(named.uid === a.uid, "naming yourself doesn't change who you are");
  ok(verifyTicket(named.token)?.name === "Askallad", "and the name rides in the token");
  const kept = await call({ token: named.token });
  ok(kept.name === "Askallad", "a later renewal keeps the name it already had");

  console.log("\nAnything else starts over rather than being trusted:");
  ok((await call({ token: "not-a-token" })).uid !== a.uid, "garbage is not adopted");
  ok((await call({ token: a.token.slice(0, -4) + "aaaa" })).uid !== a.uid, "nor is a token whose signature was edited");
  const expired = signTicket({ uid: "aaaaaaaaaaaaaaaaaaaaaaaa", guest: true }, -1);
  ok((await call({ token: expired })).uid !== "aaaaaaaaaaaaaaaaaaaaaaaa", "nor an expired one");

  // The one that matters: /api/socket-token signs { uid, name } with no guest
  // flag for a REAL user. If this route adopted that id, anyone could paste a
  // captured user ticket in and be handed a 30-day token for that account.
  console.log("\nA signed-in user's ticket cannot be laundered into a guest identity:");
  const userTicket = signTicket({ uid: "0123456789abcdef01234567", name: "Max" }, 3600);
  const laundered = await call({ token: userTicket });
  ok(laundered.uid !== "0123456789abcdef01234567", "the user's id is not adopted");
  ok(verifyTicket(laundered.token)?.guest === true, "what comes back is a plain new guest");

  console.log("\nThe token lasts as long as it claims:");
  const days = Math.round((GUEST_TOKEN_TTL_SEC * 1000) / 86_400_000);
  const life = Math.round((JSON.parse(Buffer.from(a.token.split(".")[0], "base64url").toString()).exp - Date.now()) / 86_400_000);
  ok(life === days, `${days} days`);

  console.log(failures === 0 ? "\nALL PASS ✓" : `\n${failures} FAILURE(S) ✗`);
  process.exit(failures === 0 ? 0 : 1);
}
main();
