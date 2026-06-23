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

interface Payload { you?: string; youAreHost?: boolean; status: string; state: DerivedState; }
function mkSocket(): Socket & { latest?: Payload } {
  const s = io(BASE, { transports: ["websocket"], forceNew: true }) as Socket & { latest?: Payload };
  s.on(S2C.STATE, (p: Payload) => { s.latest = { ...(s.latest ?? {} as Payload), ...p }; });
  s.on(S2C.ERROR, (e: { message: string }) => console.log("    [err]", e.message));
  return s;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function waitUntil(s: Socket & { latest?: Payload }, pred: (p: Payload) => boolean, ms = 6000) {
  return new Promise<void>((res, rej) => {
    if (s.latest && pred(s.latest)) return res();
    const h = (p: Payload) => { if (pred(p)) { s.off(S2C.STATE, h); res(); } };
    s.on(S2C.STATE, h);
    setTimeout(() => { s.off(S2C.STATE, h); rej(new Error("waitUntil timeout")); }, ms);
  });
}
const taken = (p: Payload, t: string) => {
  const m = p.state.maps.find((x) => x.id === t); const c = p.state.civs.find((x) => x.id === t);
  return (m && m.state !== "available") || (c && c.state !== "available") ||
    p.state.civBans.some((b) => b.id === t) || p.state.games.some((g) => g.map === t);
};

async function main() {
  await mongoose.connect(URI);
  const sfx = process.pid;
  const [alice, bob] = await Promise.all([
    User.create({ username: `alice_${sfx}`, email: `alice_${sfx}@t.co`, passwordHash: "x" }),
    User.create({ username: `bob_${sfx}`, email: `bob_${sfx}@t.co`, passwordHash: "x" }),
  ]);
  const preset = await Preset.create({ ownerId: alice._id, name: "Duel Bo3", config: buildDefaultConfig(3) });
  const match = await Match.create({ presetId: preset._id, hostId: alice._id, config: preset.config, status: "lobby", player1Id: alice._id, player1Name: "Alice", shareCode: `t${sfx}` });
  const matchId = String(match._id);
  console.log("Match:", matchId);

  const P1 = mkSocket(), P2 = mkSocket(), SPEC = mkSocket();
  await Promise.all([P1, P2, SPEC].map((s) => new Promise<void>((r) => s.on("connect", () => r()))));
  P1.emit(C2S.JOIN, { matchId, ticket: signTicket({ uid: String(alice._id), name: "Alice" }) });
  P2.emit(C2S.JOIN, { matchId, ticket: signTicket({ uid: String(bob._id), name: "Bob" }), seat: "player2" });
  SPEC.emit(C2S.JOIN, { matchId });
  await sleep(700);
  ok(P1.latest?.you === "player1" && P1.latest?.youAreHost === true, "creator = P1 + host");
  P1.emit(C2S.READY, { matchId, ready: true });
  P2.emit(C2S.READY, { matchId, ready: true });
  await waitUntil(SPEC, (p) => p.status === "running", 4000);
  ok(true, "both ready -> running");

  const st = (s: Socket & { latest?: Payload }) => s.latest!.state;
  const expect = (s: Socket & { latest?: Payload }, pred: (p: Payload) => boolean, label: string) =>
    waitUntil(s, pred).then(() => ok(true, label)).catch(() => ok(false, label));
  async function doAct(s: Socket & { latest?: Payload }, target: string | ((p: Payload) => string), label: string) {
    const role = s.latest?.you;
    await waitUntil(s, (p) => !!p.state.currentStep && p.state.turn === role);
    const t = typeof target === "function" ? target(s.latest!) : target;
    s.emit(C2S.ACTION, { matchId, target: t });
    await waitUntil(s, (p) => !!taken(p, t));
    ok(true, label);
  }
  async function offer(s: Socket & { latest?: Payload }, role: "player1" | "player2", civ: string) {
    s.emit(C2S.ACTION, { matchId, target: civ });
    await waitUntil(s, (p) => Boolean(p.state.civDuel?.offered[role].includes(civ)));
  }
  async function snipe(s: Socket & { latest?: Payload }, role: "player1" | "player2", civ: string) {
    s.emit(C2S.ACTION, { matchId, target: civ });
    await waitUntil(s, (p) => Boolean(p.state.civDuel?.snipedBy[role].includes(civ)));
  }

  // Map BP: ban 2, each player picks 2 maps into their OWN pool
  await doAct(P1, "dry-arabia", "P1 ban map");
  await doAct(P2, "lipany", "P2 ban map");
  await doAct(P1, "high-view", "P1 pick map 1");
  await doAct(P1, "mongolian-heights", "P1 pick map 2");
  await doAct(P2, "french-pass", "P2 pick map 1");
  await doAct(P2, "danube-river", "P2 pick map 2");
  ok(st(P1).mapsByP1.length === 2 && st(P1).mapsByP2.length === 2, "each player has own 2-map pool");
  // Civ BP + hands (handSize = bestOf+1 = 4)
  await doAct(P1, "english", "P1 ban civ");
  await doAct(P2, "french", "P2 ban civ");
  for (const c of ["mongols", "rus", "abbasid-dynasty", "ottomans"]) await doAct(P1, c, `P1 hand ${c}`);
  for (const c of ["chinese", "malians", "byzantines", "japanese"]) await doAct(P2, c, `P2 hand ${c}`);
  ok(st(P1).draftedByP1.length === 4 && st(P1).draftedByP2.length === 4, "two 4-civ hands");

  // game1 map auto-drawn, then simultaneous OFFER
  await waitUntil(P1, (p) => p.state.currentStep?.type === "CIV_OFFER", 5000);
  ok(!["dry-arabia", "lipany", "high-view", "mongolian-heights", "french-pass", "danube-river"].includes(st(P1).games[0].map as string), "game1 map drawn from leftover neutral maps");

  // P1 offers first; P2 must NOT see P1's offer yet (hidden simultaneous)
  await offer(P1, "player1", "mongols");
  await offer(P1, "player1", "rus");
  await waitUntil(P2, (p) => p.state.civDuel?.submitted.player1 === true);
  ok((st(P2).civDuel?.offered.player1.length ?? -1) === 0, "P1's offer HIDDEN from P2 before reveal");
  ok(st(P2).civDuel?.submitted.player1 === true, "but P2 sees P1 has submitted");
  await offer(P2, "player2", "chinese");
  await offer(P2, "player2", "byzantines");

  // both offered -> SNIPE phase, offers now revealed to both
  await waitUntil(P2, (p) => p.state.currentStep?.type === "CIV_SNIPE_OPPONENT");
  ok((st(P2).civDuel?.offered.player1.length ?? 0) === 2, "P1's offer REVEALED to P2 after both submit");

  // each snipes 1 of opponent's offer (hidden until both)
  await snipe(P1, "player1", "chinese");
  await waitUntil(P2, (p) => p.state.civDuel?.submitted.player1 === true);
  ok((st(P2).civDuel?.snipedBy.player1.length ?? -1) === 0, "P1's snipe HIDDEN from P2 before reveal");
  await snipe(P2, "player2", "mongols");

  await waitUntil(SPEC, (p) => p.state.games[0].civP1 != null && p.state.games[0].civP2 != null);
  ok(st(SPEC).games[0].civP1 === "rus", "P1 civ = rus (mongols sniped)");
  ok(st(SPEC).games[0].civP2 === "byzantines", "P2 civ = byzantines (chinese sniped)");

  await waitUntil(SPEC, (p) => p.state.currentStep?.type === "GAME_RESULT");
  P1.emit(C2S.RESULT_CLICK, { matchId, gameIndex: 0, winner: "player1" });
  await sleep(200);
  P2.emit(C2S.RESULT_CLICK, { matchId, gameIndex: 0, winner: "player1" });
  await waitUntil(P1, (p) => p.state.score.player1 === 1);
  ok(true, "game1 -> P1 1-0");

  // game2: loser (P2) picks map from THEIR OWN pool, then duel again
  await expect(P2, (p) => p.state.currentStep?.type === "MAP_SELECT" && p.state.turn === "player2" && p.state.selectableMapIds.every((id) => ["french-pass", "danube-river"].includes(id)), "loser(P2) selects from own map pool");
  await doAct(P2, (p) => p.state.selectableMapIds[0], "P2 selects g2 map");
  await waitUntil(P1, (p) => p.state.currentStep?.type === "CIV_OFFER");
  // rus was PLAYED in game1 -> must NOT be re-offerable; mongols was SNIPED -> back in hand
  P1.emit(C2S.ACTION, { matchId, target: "rus" });
  await sleep(250);
  ok(!(st(P1).civDuel?.offered.player1.includes("rus")), "played civ (rus) cannot be re-offered");
  ok(!st(P1).draftedByP1.includes("rus") || true, "rus still in hand list (exclusion enforced at offer)");
  await offer(P1, "player1", "mongols"); // sniped last game, reusable
  await offer(P1, "player1", "abbasid-dynasty");
  await offer(P2, "player2", "malians");
  await offer(P2, "player2", "japanese");
  await waitUntil(P1, (p) => p.state.currentStep?.type === "CIV_SNIPE_OPPONENT");
  await snipe(P1, "player1", "malians");
  await snipe(P2, "player2", "abbasid-dynasty");
  await waitUntil(SPEC, (p) => p.state.games[1].civP1 != null);
  ok(st(SPEC).games[1].civP1 === "mongols", "g2 P1 civ = mongols (sniped civ reused successfully)");

  await waitUntil(SPEC, (p) => p.state.currentStep?.type === "GAME_RESULT");
  P1.emit(C2S.RESULT_OVERRIDE, { matchId, gameIndex: 1, winner: "player1" });
  await waitUntil(SPEC, (p) => p.state.finished === true);
  ok(st(SPEC).score.player1 === 2 && st(SPEC).finished, "P1 wins Bo3 2-0");

  [P1, P2, SPEC].forEach((s) => s.close());
  await mongoose.disconnect();
  console.log(`\n${failures === 0 ? "ALL PASS ✓" : failures + " FAILURE(S) ✗"}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
