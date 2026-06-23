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

interface Payload { you?: string; status: string; deadlineTs: number | null; state: DerivedState; }
function mkSocket() {
  const s = io(BASE, { transports: ["websocket"], forceNew: true }) as Socket & { latest?: Payload };
  s.on(S2C.STATE, (p: Payload) => { s.latest = { ...(s.latest ?? {} as Payload), ...p }; });
  return s;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function waitUntil(s: Socket & { latest?: Payload }, pred: (p: Payload) => boolean, ms = 8000) {
  return new Promise<void>((res, rej) => {
    if (s.latest && pred(s.latest)) return res();
    const h = (p: Payload) => { if (pred(p)) { s.off(S2C.STATE, h); res(); } };
    s.on(S2C.STATE, h);
    setTimeout(() => { s.off(S2C.STATE, h); rej(new Error("timeout")); }, ms);
  });
}

async function main() {
  await mongoose.connect(URI);
  const sfx = process.pid;
  const [a, b] = await Promise.all([
    User.create({ username: `ta_${sfx}`, email: `ta_${sfx}@t.co`, passwordHash: "x" }),
    User.create({ username: `tb_${sfx}`, email: `tb_${sfx}@t.co`, passwordHash: "x" }),
  ]);

  // Minimal config: two 1-second map bans (no games), to trigger auto-resolve fast.
  const config = buildDefaultConfig(1);
  config.steps = [
    { id: "b1", type: "MAP_BAN", actor: "PLAYER1", pool: "map", count: 1, timeLimitSec: 1, showCurrentMap: false, excludeUsedCivs: false, pausable: true },
    { id: "b2", type: "MAP_BAN", actor: "PLAYER2", pool: "map", count: 1, timeLimitSec: 1, showCurrentMap: false, excludeUsedCivs: false, pausable: true },
  ];
  const preset = await Preset.create({ ownerId: a._id, name: "Timer test", config });
  const match = await Match.create({
    presetId: preset._id, hostId: a._id, config, status: "lobby",
    player1Id: a._id, player1Name: "A", shareCode: `tm${sfx}`,
  });
  const matchId = String(match._id);
  console.log("Timer match:", matchId);

  const P1 = mkSocket(), P2 = mkSocket(), SPEC = mkSocket();
  await Promise.all([P1, P2, SPEC].map((s) => new Promise<void>((r) => s.on("connect", () => r()))));

  P1.emit(C2S.JOIN, { matchId, ticket: signTicket({ uid: String(a._id), name: "A" }) });
  P2.emit(C2S.JOIN, { matchId, ticket: signTicket({ uid: String(b._id), name: "B" }), seat: "player2" });
  SPEC.emit(C2S.JOIN, { matchId });
  await sleep(400);
  // Ready up to start the draft (and the clock).
  P1.emit(C2S.READY, { matchId, ready: true });
  P2.emit(C2S.READY, { matchId, ready: true });
  await waitUntil(SPEC, (p) => p.status === "running", 4000);

  ok(SPEC.latest?.state.currentStepIndex === 0, "starts at step 0");
  ok(typeof SPEC.latest?.deadlineTs === "number", "countdown deadline is broadcast");

  // Nobody acts — server should auto-resolve step 0 (P1) within ~1s.
  await waitUntil(SPEC, (p) => p.state.currentStepIndex === 1, 5000);
  ok(SPEC.latest!.state.maps.filter((m) => m.state === "banned").length === 1, "step 0 auto-resolved (1 map auto-banned)");
  ok(true, "advanced to step 1 by timeout");

  // Then auto-resolve step 1 (P2) too -> draft complete.
  await waitUntil(SPEC, (p) => p.state.currentStep === null || p.state.currentStepIndex >= 2, 5000);
  ok(SPEC.latest!.state.maps.filter((m) => m.state === "banned").length === 2, "step 1 auto-resolved (2 maps banned)");

  [P1, P2, SPEC].forEach((s) => s.close());
  await mongoose.disconnect();
  console.log(`\n${failures === 0 ? "ALL PASS ✓" : failures + " FAILURE(S) ✗"}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
