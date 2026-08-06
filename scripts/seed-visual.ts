/**
 * Dev-only: seed a match and drive it to a named phase, then leave it sitting
 * there so the draft room can be inspected/screenshotted in a browser.
 *
 *   npx tsx scripts/seed-visual.ts civban
 *
 * Phases: mapban | mappick | civban | civpick | offer | snipe
 * Prints the /match and /watch URLs and exits (the match stays in the DB).
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
// This script invents throwaway accounts and leaves a half-played draft behind,
// which is fine on a laptop and litter anywhere else. MONGODB_URI is inherited
// from the shell, so pointing it at the real database is one exported variable
// away — refuse rather than find out afterwards.
if (!/(localhost|127\.0\.0\.1)/.test(URI)) {
  console.error(`Refusing to seed test data into a non-local database:
  ${URI.replace(/:[^:@/]*@/, ":***@")}`);
  process.exit(1);
}
const BASE = "http://localhost:3000";
const PHASE = (process.argv[2] || "civban") as string;

interface Payload { you?: string; status: string; state: DerivedState }
type S = Socket & { latest?: Payload };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mkSocket(): S {
  const s = io(BASE, { transports: ["websocket"], forceNew: true }) as S;
  s.on(S2C.STATE, (p: Payload) => { s.latest = { ...(s.latest ?? {} as Payload), ...p }; });
  s.on(S2C.ERROR, (e: { message: string }) => console.log("  [err]", e.message));
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
  const [alice, bob] = await Promise.all([
    User.create({ username: `vis_a_${sfx}`, email: `vis_a_${sfx}@t.co`, passwordHash: "x" }),
    User.create({ username: `vis_b_${sfx}`, email: `vis_b_${sfx}@t.co`, passwordHash: "x" }),
  ]);
  const preset = await Preset.create({ ownerId: alice._id, name: "Visual check Bo3", config: buildDefaultConfig(3) });
  const match = await Match.create({
    presetId: preset._id, hostId: alice._id, config: preset.config, status: "lobby",
    player1Id: alice._id, player1Name: "Alice", shareCode: `v${sfx}`,
  });
  const matchId = String(match._id);

  const P1 = mkSocket(), P2 = mkSocket();
  await Promise.all([P1, P2].map((s) => new Promise<void>((r) => s.on("connect", () => r()))));
  P1.emit(C2S.JOIN, { matchId, ticket: signTicket({ uid: String(alice._id), name: "Alice" }) });
  P2.emit(C2S.JOIN, { matchId, ticket: signTicket({ uid: String(bob._id), name: "Bob" }), seat: "player2" });
  await sleep(600);
  P1.emit(C2S.READY, { matchId, ready: true });
  P2.emit(C2S.READY, { matchId, ready: true });
  await waitUntil(P1, (p) => p.status === "running");

  const taken = (p: Payload, t: string) =>
    p.state.maps.some((x) => x.id === t && x.state !== "available") ||
    p.state.civs.some((x) => x.id === t && x.state !== "available") ||
    p.state.civBans.some((b) => b.id === t) ||
    p.state.draftedByP1.includes(t) || p.state.draftedByP2.includes(t);

  async function act(s: S, target: string) {
    const role = s.latest?.you;
    await waitUntil(s, (p) => !!p.state.currentStep && p.state.turn === role);
    s.emit(C2S.ACTION, { matchId, target });
    await waitUntil(s, (p) => taken(p, target));
  }
  async function offer(s: S, role: "player1" | "player2", civ: string) {
    s.emit(C2S.ACTION, { matchId, target: civ });
    await waitUntil(s, (p) => Boolean(p.state.civDuel?.offered[role].includes(civ)));
  }

  const stop = (phase: string) => { if (PHASE === phase) throw { done: true }; };
  try {
    stop("mapban");                                  // P1 about to ban a map
    await act(P1, "dry-arabia");
    await act(P2, "lipany");
    stop("mappick");                                 // P1 about to pick maps into own pool
    await act(P1, "high-view"); await act(P1, "mongolian-heights");
    await act(P2, "french-pass"); await act(P2, "danube-river");
    stop("civban");                                  // P1 about to ban a civ
    await act(P1, "english");
    await act(P2, "french");
    stop("civpick");                                 // P1 about to draft a hand
    for (const c of ["mongols", "rus", "abbasid-dynasty", "ottomans"]) await act(P1, c);
    for (const c of ["chinese", "malians", "byzantines", "japanese"]) await act(P2, c);
    await waitUntil(P1, (p) => p.state.currentStep?.type === "CIV_OFFER");
    stop("offer");                                   // simultaneous hidden offer
    await offer(P1, "player1", "mongols"); await offer(P1, "player1", "rus");
    await offer(P2, "player2", "chinese"); await offer(P2, "player2", "byzantines");
    await waitUntil(P2, (p) => p.state.currentStep?.type === "CIV_SNIPE_OPPONENT");
  } catch (e) {
    if (!(e as { done?: boolean })?.done) throw e;
  }

  await sleep(400);
  console.log(`\nphase=${PHASE}  step=${P1.latest?.state.currentStep?.type}`);
  console.log(`player : ${BASE}/match/${matchId}`);
  console.log(`watch  : ${BASE}/watch/${matchId}`);
  P1.close(); P2.close();
  await mongoose.disconnect();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
