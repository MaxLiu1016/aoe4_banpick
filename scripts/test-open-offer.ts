/**
 * Turn-based ("open") civ offers: the format a tournament actually asked for is
 * P1 picks 1, P2 picks 2, P1 picks 1, then both snipe one of the opponent's —
 * an alternating draft off a shared table, not the classic hidden double-blind
 * offer. Several offer steps inside ONE game is the part that used to break, so
 * that is what this pins down. Pure engine + validator, no database:
 *
 *   npx tsx scripts/test-open-offer.ts
 */
import { deriveState, type EngineAction } from "../lib/draft/engine";
import { validatePreset } from "../lib/draft/validate";
import type { PresetConfig, Step } from "../lib/draft/schema";

let failures = 0;
const ok = (c: boolean, m: string) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) failures++; };

const CIVS = ["english", "french", "mongols", "rus", "hre", "abbasid"].map((id) => ({ id, name: id }));

const step = (s: Partial<Step> & Pick<Step, "type">): Step => ({
  id: `${s.type}-${Math.abs(JSON.stringify(s).length)}-${s.actor ?? ""}-${s.count ?? 1}`,
  actor: "HOST_DRAW", pool: "civ", count: 1, timeLimitSec: 0, showCurrentMap: false,
  excludeUsedCivs: false, pausable: false, ...s,
});

/** P1 1 → P2 2 → P1 1, then a simultaneous snipe of 1 each. */
function snakeDraft(): PresetConfig {
  return {
    civs: CIVS,
    maps: [{ id: "dry-arabia", name: "Dry Arabia" }],
    steps: [
      step({ type: "CIV_OFFER", actor: "PLAYER1", count: 1, simultaneous: false, id: "o1" }),
      step({ type: "CIV_OFFER", actor: "PLAYER2", count: 2, simultaneous: false, id: "o2" }),
      step({ type: "CIV_OFFER", actor: "PLAYER1", count: 1, simultaneous: false, id: "o3" }),
      step({ type: "CIV_SNIPE_OPPONENT", count: 1, id: "s1" }),
      step({ type: "MAP_SELECT", actor: "HOST_DRAW", pool: "map", id: "m1" }),
      step({ type: "GAME_RESULT", id: "r1" }),
    ],
    options: {
      bestOf: 1, publicHover: false, defaultTimeLimitSec: 0, pausable: false,
      resultMode: "vote", anonymous: false,
    },
  };
}

/** The classic: one simultaneous offer of 2, then snipe 1. Must not regress. */
function hiddenOffer(): PresetConfig {
  const c = snakeDraft();
  return {
    ...c,
    steps: [
      step({ type: "CIV_OFFER", count: 2, id: "o1" }),
      step({ type: "CIV_SNIPE_OPPONENT", count: 1, id: "s1" }),
      step({ type: "MAP_SELECT", actor: "HOST_DRAW", pool: "map", id: "m1" }),
      step({ type: "GAME_RESULT", id: "r1" }),
    ],
  };
}

let seq = 0;
const offer = (stepIndex: number, actor: "player1" | "player2", target: string): EngineAction =>
  ({ seq: seq++, stepIndex, actor, actionType: "offer", target, gameIndex: 0 });
const gsnipe = (stepIndex: number, actor: "player1" | "player2", target: string): EngineAction =>
  ({ seq: seq++, stepIndex, actor, actionType: "gsnipe", target, gameIndex: 0 });

function main() {
  const cfg = snakeDraft();

  console.log("The preset itself is legal:");
  const issues = validatePreset(cfg);
  ok(issues.length === 0, `no validation issues (got: ${issues.map((i) => i.code).join(", ") || "none"})`);
  // The bug that started this: reading only the FIRST offer step called a 2-civ
  // offer a 1-civ one and rejected the preset for "offer − snipe < 1".
  ok(!issues.some((i) => i.code === "offerMinusSnipe"), "split offer steps add up instead of being read one at a time");

  console.log("\nTurns alternate, one step at a time:");
  seq = 0;
  const s0 = deriveState(cfg, []);
  ok(s0.turn === "player1", "step 1 belongs to player 1");
  ok(s0.simultaneous === false, "an open offer is not a simultaneous step");
  ok(s0.civDuel?.offerHidden === false, "and it is not hidden");
  ok(s0.civDuel?.offerTarget.player1 === 2 && s0.civDuel?.offerTarget.player2 === 2,
    "both sides end the phase with 2 civs (1+1 vs 2)");
  ok(s0.awaiting.player1 === true && s0.awaiting.player2 === false, "only player 1 is awaited");

  const a1 = [offer(0, "player1", "english")];
  const s1 = deriveState(cfg, a1);
  ok(s1.currentStepIndex === 1, "player 1 delivering 1 completes step 1");
  ok(s1.turn === "player2", "step 2 belongs to player 2");
  ok(!s1.offerableP2.includes("english"), "player 2 can no longer take the civ player 1 just took");
  ok(s1.offerableP1.includes("french"), "player 1's own pool is untouched by their pick");

  const a2 = [...a1, offer(1, "player2", "french")];
  const s2 = deriveState(cfg, a2);
  ok(s2.currentStepIndex === 1, "player 2 owes 2, so one is not enough to advance");
  ok(s2.turn === "player2", "and it is still their turn");

  const a3 = [...a2, offer(1, "player2", "mongols")];
  const s3 = deriveState(cfg, a3);
  ok(s3.currentStepIndex === 2, "the second one advances to step 3");
  ok(s3.turn === "player1", "which is player 1 again");
  ok(s3.civDuel?.offered.player2.length === 2, "player 2's two picks are on the table");

  const a4 = [...a3, offer(2, "player1", "rus")];
  const s4 = deriveState(cfg, a4);
  ok(s4.currentStepIndex === 3, "player 1's last pick ends the offer phase");
  ok(s4.currentStep?.type === "CIV_SNIPE_OPPONENT", "next up is the snipe");
  ok(s4.simultaneous === true, "which IS simultaneous");

  console.log("\nThe snipe resolves against what was drafted:");
  const a5 = [...a4, gsnipe(3, "player1", "french"), gsnipe(3, "player2", "english")];
  const s5 = deriveState(cfg, a5);
  ok(s5.games[0].civP1 === "rus", "player 1 fields the civ player 2 did not snipe");
  ok(s5.games[0].civP2 === "mongols", "player 2 likewise");

  console.log("\nThe classic hidden offer still behaves as before:");
  seq = 0;
  const hid = hiddenOffer();
  ok(validatePreset(hid).length === 0, "a single simultaneous offer of 2 validates");
  const h0 = deriveState(hid, []);
  ok(h0.simultaneous === true, "it is a simultaneous step");
  ok(h0.civDuel?.offerHidden === true, "and stays hidden");
  ok(h0.turn === null, "with no turn");
  ok(h0.awaiting.player1 && h0.awaiting.player2, "both players are awaited at once");
  const h1 = deriveState(hid, [offer(0, "player1", "english"), offer(0, "player1", "french")]);
  ok(h1.currentStepIndex === 0, "one player finishing does not advance the step");
  ok(h1.awaiting.player1 === false && h1.awaiting.player2 === true, "only the other side is still owed");
  // Both naming the same civ is the whole point of a blind offer.
  const h2 = deriveState(hid, [
    offer(0, "player1", "english"), offer(0, "player1", "french"),
    offer(0, "player2", "english"), offer(0, "player2", "mongols"),
  ]);
  ok(h2.currentStepIndex === 1, "both finishing advances to the snipe");
  ok(h2.civDuel?.offered.player2.includes("english") === true, "both sides may offer the same civ when blind");

  console.log(failures === 0 ? "\nALL PASS ✓" : `\n${failures} FAILURE(S) ✗`);
  process.exit(failures === 0 ? 0 : 1);
}
main();
