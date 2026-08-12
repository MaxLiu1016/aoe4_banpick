/**
 * End-to-end check that a simultaneous ban is actually HIDDEN on the wire —
 * the engine holding it back is only half the guarantee, the socket layer must
 * not ship the opponent's pending bans to the other player or to spectators.
 *
 *   npx tsx --env-file=.env.local scripts/test-simulban-socket.ts
 */
import mongoose from "mongoose";
import { io, type Socket } from "socket.io-client";
import { Preset } from "../lib/models/Preset";
import { Match } from "../lib/models/Match";
import { User } from "../lib/models/User";
import { buildDefaultConfig } from "../lib/draft/defaultPreset";
import { C2S, S2C } from "../lib/socket/events";
import { signTicket } from "../lib/socket/ticket";
import type { DerivedState } from "../lib/draft/engine";

const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aoe4banpick";
const BASE = "http://localhost:3000";
let failures = 0;
const ok = (c: boolean, m: string) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) failures++; };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Payload { you?: string; status: string; state: DerivedState }
type S = Socket & { latest?: Payload };
function mkSocket(): S {
  const s = io(BASE, { transports: ["websocket"], forceNew: true }) as S;
  s.on(S2C.STATE, (p: Payload) => { s.latest = { ...(s.latest ?? {} as Payload), ...p }; });
  s.on(S2C.ERROR, (e: { message: string }) => console.log("    [err]", e.message));
  return s;
}
function waitUntil(s: S, pred: (p: Payload) => boolean, ms = 8000) {
  return new Promise<void>((res, rej) => {
    if (s.latest && pred(s.latest)) return res();
    const h = (p: Payload) => { if (pred(p)) { s.off(S2C.STATE, h); res(); } };
    s.on(S2C.STATE, h);
    setTimeout(() => { s.off(S2C.STATE, h); rej(new Error("timeout")); }, ms);
  });
}

async function main() {
  await mongoose.connect(URI);
  const sfx = Date.now().toString(36);
  const config = buildDefaultConfig(3);
  // Replace the two sequential map bans with ONE simultaneous 2-per-player step.
  config.steps = [
    { ...config.steps[0], simultaneous: true, count: 2, },
    ...config.steps.slice(2),
  ];

  const [a, b] = await Promise.all([
    User.create({ username: `sb_a_${sfx}`, email: `sb_a_${sfx}@t.co`, passwordHash: "x" }),
    User.create({ username: `sb_b_${sfx}`, email: `sb_b_${sfx}@t.co`, passwordHash: "x" }),
  ]);
  const preset = await Preset.create({ ownerId: a._id, name: "Simul ban", config });
  const match = await Match.create({
    presetId: preset._id, hostId: a._id, config, status: "lobby",
    player1Id: a._id, player1Name: "Alice", shareCode: `sb${sfx}`,
  });
  const matchId = String(match._id);

  const P1 = mkSocket(), P2 = mkSocket(), SPEC = mkSocket();
  await Promise.all([P1, P2, SPEC].map((s) => new Promise<void>((r) => s.on("connect", () => r()))));
  P1.emit(C2S.JOIN, { matchId, ticket: signTicket({ uid: String(a._id), name: "Alice" }) });
  P2.emit(C2S.JOIN, { matchId, ticket: signTicket({ uid: String(b._id), name: "Bob" }), seat: "player2" });
  SPEC.emit(C2S.JOIN, { matchId });
  await sleep(700);
  P1.emit(C2S.READY, { matchId, ready: true });
  P2.emit(C2S.READY, { matchId, ready: true });
  await waitUntil(P1, (p) => p.status === "running");

  console.log("Simultaneous ban over the wire:");
  ok(P1.latest!.state.simultaneous === true, "step arrives flagged simultaneous");
  ok(P1.latest!.state.turn === null, "no turn assigned");

  // P1 bans two maps. Nothing may reach P2 or the spectator.
  P1.emit(C2S.ACTION, { matchId, target: "dry-arabia" });
  P1.emit(C2S.ACTION, { matchId, target: "lipany" });
  await waitUntil(P1, (p) => p.state.pendingBans.player1.length === 2);
  // Synchronise on P2's OWN stream before asserting on it — broadcasts reach the
  // two sockets independently, so P2's `latest` can still be a frame behind P1's.
  await waitUntil(P2, (p) => p.state.awaiting.player1 === false);
  await waitUntil(SPEC, (p) => p.state.awaiting.player1 === false);

  ok(P1.latest!.state.pendingBans.player1.includes("dry-arabia"), "P1 sees their OWN pending bans");
  ok(P2.latest!.state.pendingBans.player1.length === 0, "P2 does NOT receive P1's pending bans");
  ok(SPEC.latest!.state.pendingBans.player1.length === 0, "spectator does NOT receive P1's pending bans");
  ok(P2.latest!.state.maps.find((m) => m.id === "dry-arabia")?.state === "available", "map still shows available to P2");
  ok(P2.latest!.state.awaiting.player1 === false, "but P2 CAN see that P1 has finished submitting");
  ok(P2.latest!.state.awaiting.player2 === true, "and that P2 themselves is still owed");

  // P2 completes -> simultaneous reveal to everyone.
  P2.emit(C2S.ACTION, { matchId, target: "high-view" });
  P2.emit(C2S.ACTION, { matchId, target: "altai" });
  await waitUntil(SPEC, (p) => p.state.currentStepIndex > 0);

  const banned = (s: S, id: string) => s.latest!.state.maps.find((m) => m.id === id)?.state === "banned";
  ok(banned(P2, "dry-arabia") && banned(P2, "lipany"), "P1's bans revealed to P2 after both submitted");
  ok(banned(P1, "high-view") && banned(P1, "altai"), "P2's bans revealed to P1");
  ok(banned(SPEC, "dry-arabia") && banned(SPEC, "altai"), "spectator sees all four");
  ok(SPEC.latest!.state.pendingBans.player1.length === 0 && SPEC.latest!.state.pendingBans.player2.length === 0, "pendingBans emptied after reveal");

  P1.close(); P2.close(); SPEC.close();
  await mongoose.disconnect();
  console.log(failures === 0 ? "\nALL PASS ✓" : `\n${failures} FAILURE(S) ✗`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
