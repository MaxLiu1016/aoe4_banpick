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
import { DEFAULT_MAPS } from "../data/maps";
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
  // buildDefaultConfig ships an empty map pool on purpose — a new preset is
  // meant to fail validation until a human picks the season's maps. Nobody is
  // here to pick, so take the catalogue.
  const config = { ...buildDefaultConfig(3), maps: DEFAULT_MAPS };
  const preset = await Preset.create({ ownerId: alice._id, name: "Visual check Bo3", config });
  const match = await Match.create({
    presetId: preset._id, hostId: alice._id, config, status: "lobby",
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

  /** Whatever the rules will accept right now, for whoever is being asked. */
  function legal(p: Payload, role: "player1" | "player2"): string | null {
    const st = p.state;
    const step = st.currentStep;
    if (!step) return null;
    const free = (xs: { id: string; state: string }[]) => xs.filter((x) => x.state === "available").map((x) => x.id);
    switch (step.type) {
      case "MAP_BAN":
      case "MAP_PICK": return free(st.maps)[0] ?? null;
      case "MAP_SELECT": return st.selectableMapIds[0] ?? null;
      case "CIV_BAN": {
        const mine = new Set([...st.civBans.filter((b) => b.by === role).map((b) => b.id), ...st.pendingBans[role]]);
        return free(st.civs).find((id) => !mine.has(id)) ?? null;
      }
      case "CIV_PICK": return st.civPickableIds[0] ?? null;
      case "CIV_OFFER": {
        const hand = role === "player1" ? st.offerableP1 : st.offerableP2;
        const out = new Set(st.civDuel?.offered[role] ?? []);
        return hand.find((id) => !out.has(id)) ?? null;
      }
      case "CIV_SNIPE_OPPONENT": {
        const opp = role === "player1" ? "player2" : "player1";
        const seen = new Set(st.civDuel?.snipedBy[role] ?? []);
        return (st.civDuel?.offered[opp] ?? []).find((id) => !seen.has(id)) ?? null;
      }
      case "SYNC_CONFIRM": return "confirm";
      default: return null;
    }
  }

  /**
   * Walk the draft forward until it reaches `PHASE`, always playing whatever is
   * legal at the moment rather than a script of ids. The ids in a preset change
   * — maps get renamed, pools get edited — and a hard-coded walk breaks silently
   * the next time somebody touches the data.
   */
  try {
    const PHASE_STEP: Record<string, string> = {
      mapban: "MAP_BAN", mappick: "MAP_PICK", civban: "CIV_BAN",
      civpick: "CIV_PICK", offer: "CIV_OFFER", snipe: "CIV_SNIPE_OPPONENT",
    };
    const want = PHASE_STEP[PHASE] ?? "CIV_PICK";
    for (let guard = 0; guard < 400; guard++) {
      const p = P1.latest;
      const step = p?.state?.currentStep;
      if (!step) { await sleep(200); continue; }
      if (step.type === want) break;
      let moved = false;
      for (const [s, role] of [[P1, "player1"], [P2, "player2"]] as const) {
        if (!s.latest?.state?.awaiting[role]) continue;
        const target = legal(s.latest, role);
        if (!target) continue;
        s.emit(C2S.ACTION, { matchId, target });
        moved = true;
        await sleep(140);
      }
      if (!moved) await sleep(200);
    }
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
