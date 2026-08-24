/**
 * Checks the random map draw — where it draws from, how many maps it takes, and
 * which presets are allowed to ask for one.
 *
 * Reported from a live Bo7 (match 6a8ad21b): the "random" first map was one of
 * player 1's own picks. Two faults, and the draft had to hit both to show it:
 *
 *   - the draft spent all 11 maps (4 banned, 6 picked by the players, 1 by a
 *     MAP_PICK the host owned), so the draw's pool was empty and the engine fell
 *     back to "anything not banned" — which is the players' picked maps;
 *   - the MAP_SELECT step carried `count: 2`, left over from when it was a
 *     MAP_PICK. The editor never shows a count for MAP_SELECT, but the engine
 *     honoured it, so the server drew twice. The second draw overwrote the
 *     first, and the first was STILL recorded as played — himeyama was burned
 *     without ever being seen, and sat out all seven games.
 *
 *   npx tsx scripts/test-map-draw.ts
 *
 * Pure engine + validation; no server and no database.
 */
import { validatePreset } from "@/lib/draft/validate";
import { deriveState, type EngineAction } from "@/lib/draft/engine";
import { buildDefaultConfig } from "@/lib/draft/defaultPreset";
import { EGC_PRESETS } from "@/data/egcPresets";
import { DEMO_PRESETS } from "@/data/demoPresets";
import type { PresetConfig, Step } from "@/lib/draft/schema";

let failures = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m);
  if (!c) failures++;
};

let n = 0;
const mk = (s: Partial<Step> & { type: string }): Step =>
  ({
    id: `${s.type}-${n++}`, actor: "PLAYER1", pool: "map", count: 1, timeLimitSec: 0,
    showCurrentMap: false, excludeUsedCivs: false, pausable: false, ...s,
  }) as Step;

const MAPS = ["m1", "m2", "m3", "m4"].map((id) => ({ id, name: id.toUpperCase() }));
const shell = {
  civs: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
  maps: MAPS,
  options: { bestOf: 1, publicHover: false, defaultTimeLimitSec: 0, pausable: false, resultMode: "vote", anonymous: false },
};
const withSteps = (steps: Step[], maps = MAPS) => ({ ...shell, maps, steps }) as PresetConfig;
const codes = (c: PresetConfig) => validatePreset(c).map((e) => e.code);

// --- Where the draw draws from -----------------------------------------------
console.log("\nA random draw only ever offers the maps neither player claimed");
{
  // 4 maps: P1 bans one, P1 and P2 pick one each, one is left over.
  const cfg = withSteps([
    mk({ type: "MAP_BAN", actor: "PLAYER1" }),
    mk({ type: "MAP_PICK", actor: "PLAYER1" }),
    mk({ type: "MAP_PICK", actor: "PLAYER2" }),
    mk({ type: "MAP_SELECT", actor: "HOST_DRAW", mapScope: "shared" }),
    mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
    mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
  ]);
  const upToDraw: EngineAction[] = [
    { seq: 0, stepIndex: 0, actor: "player1", actionType: "ban", pool: "map", target: "m1" },
    { seq: 1, stepIndex: 1, actor: "player1", actionType: "pick", pool: "map", target: "m2" },
    { seq: 2, stepIndex: 2, actor: "player2", actionType: "pick", pool: "map", target: "m3" },
  ];
  const st = deriveState(cfg, upToDraw, "running");
  ok(st.turn === "host", "the draw is the host's move");
  // `mapScope: "shared"` says "either player's picked maps" for a PLAYER actor.
  // It does not widen a random draw: the draw is the leftovers, and only those.
  ok(JSON.stringify(st.selectableMapIds) === JSON.stringify(["m4"]),
    `the draw sees only the leftover map — got ${JSON.stringify(st.selectableMapIds)}`);

  // The whole bug: spend the pool completely and the draw used to be handed
  // m2 and m3, the two maps the players had just claimed for themselves.
  const spent = withSteps([
    mk({ type: "MAP_BAN", actor: "PLAYER1" }),
    mk({ type: "MAP_PICK", actor: "PLAYER1" }),
    mk({ type: "MAP_PICK", actor: "PLAYER2" }),
    mk({ type: "MAP_PICK", actor: "HOST_DRAW" }),
    mk({ type: "MAP_SELECT", actor: "HOST_DRAW", mapScope: "shared" }),
    mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
    mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
  ]);
  const st2 = deriveState(spent, [...upToDraw,
    { seq: 3, stepIndex: 3, actor: "host", actionType: "pick", pool: "map", target: "m4" },
  ], "running");
  ok(st2.currentStep?.type === "MAP_SELECT" && st2.turn === "host", "…and with the pool spent, the draw is still the step");
  ok(st2.selectableMapIds.length === 0,
    `an empty hat stays empty — got ${JSON.stringify(st2.selectableMapIds)}`);
  ok(codes(spent).includes("drawNoMapsLeft"), "…and that preset is rejected before anyone plays it");
}

// --- How many maps the draw takes --------------------------------------------
console.log("\nA select takes one map however many the step claims to want");
{
  const cfg = withSteps([
    mk({ type: "MAP_SELECT", actor: "HOST_DRAW", mapScope: "shared", count: 2 }),
    mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
    mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
  ]);
  const st = deriveState(cfg, [
    { seq: 0, stepIndex: 0, actor: "host", actionType: "select", pool: "map", target: "m1", gameIndex: 0 },
  ], "running");
  ok(st.currentStepIndex === 1, `one select finishes the step — currentStepIndex ${st.currentStepIndex}`);
  ok(st.games[0].map === "m1", `the map drawn is the map played — got ${st.games[0].map}`);
  // The server auto-draws while `turn === "host"`. Leaving the step unfinished
  // is what let it come round again and throw the first map away.
  ok(st.turn !== "host", "the draw does not come round a second time");
}

// --- The rule, on its own ----------------------------------------------------
console.log("\nThe rule reads the draft in order, not in total");
ok(!codes(withSteps([
  mk({ type: "MAP_SELECT", actor: "HOST_DRAW" }),
  mk({ type: "MAP_BAN", actor: "PLAYER1", count: 3 }),
  mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
  mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
])).includes("drawNoMapsLeft"), "bans AFTER the draw do not starve it");
ok(!codes(withSteps([
  mk({ type: "MAP_BAN", actor: "PLAYER1", count: 3 }),
  mk({ type: "MAP_SELECT", actor: "HOST_DRAW" }),
  mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
  mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
])).includes("drawNoMapsLeft"), "one map left is enough — a draw of one is still legal");
ok(codes(withSteps([
  mk({ type: "MAP_BAN", actor: "PLAYER1", count: 2 }),
  mk({ type: "MAP_PICK", actor: "PLAYER2", count: 2 }),
  mk({ type: "MAP_SELECT", actor: "HOST_DRAW" }),
  mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
  mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
])).includes("drawNoMapsLeft"), "a pool spent to nothing before the draw is caught");
ok(!codes(withSteps([
  mk({ type: "MAP_BAN", actor: "PLAYER1", count: 2 }),
  mk({ type: "MAP_PICK", actor: "PLAYER2", count: 2 }),
  mk({ type: "MAP_SELECT", actor: "PLAYER1", mapScope: "shared" }),
  mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
  mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
])).includes("drawNoMapsLeft"), "a PLAYER choosing from the shared pool is not a draw and is fine");
{
  // A new preset opens with no maps at all, on purpose. "You have not chosen a
  // map pool" is the note to show there; a second one about the draw is noise.
  const bare = codes(withSteps([
    mk({ type: "MAP_SELECT", actor: "HOST_DRAW" }),
    mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
    mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
  ], []));
  ok(bare.includes("noMaps") && !bare.includes("drawNoMapsLeft"), `an empty map pool says so once — got ${JSON.stringify(bare)}`);
}

// --- What "Random" is allowed to be asked to do ------------------------------
// The server can only perform a step whose result belongs to nobody. A ban does
// (it takes the map or civ off the table for both sides); a draft into a hand
// does not, and asking for one stops the draft dead — the server's pick list is
// only built for a player seat, neither player may act out of turn, and with
// nobody awaited there is not even a clock left to time out and move on.
console.log("\nRandom may ban, and may draw the map; it may not draft into a hand");
const only = (steps: Step[]) => codes(withSteps([
  ...steps,
  mk({ type: "MAP_SELECT", actor: "PLAYER1", mapScope: "shared" }),
  mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
  mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
])).filter((c) => c === "drawCannotPick");
ok(only([mk({ type: "MAP_BAN", actor: "HOST_DRAW" })]).length === 0, "a random map ban is fine");
ok(only([mk({ type: "CIV_BAN", actor: "HOST_DRAW", pool: "civ", banScope: "pool" })]).length === 0, "a random civ ban is fine");
ok(only([mk({ type: "CIV_PICK", actor: "HOST_DRAW", pool: "civ" })]).length === 1, "a random civ draft is rejected");
ok(only([mk({ type: "CIV_OFFER", actor: "HOST_DRAW", pool: "civ", simultaneous: false })]).length === 1,
  "a random turn-based offer is rejected");
// A simultaneous offer has no turn at all, so its `actor` is decoration and
// every preset written before turn-based offers existed carries HOST_DRAW there.
ok(only([mk({ type: "CIV_OFFER", actor: "HOST_DRAW", pool: "civ", simultaneous: true })]).length === 0,
  "a simultaneous offer ignores its actor and is left alone");
// Deliberately allowed: the map is orphaned, not stuck, and live presets do it.
ok(only([mk({ type: "MAP_PICK", actor: "HOST_DRAW" })]).length === 0,
  "a random map pick is odd but still permitted");
{
  // The stuck state itself, so the rule's reason is on the record and not just
  // in a comment: nobody's turn, nobody awaited, nothing the server can play.
  const st = deriveState(withSteps([
    mk({ type: "CIV_PICK", actor: "HOST_DRAW", pool: "civ" }),
    mk({ type: "MAP_SELECT", actor: "PLAYER1", mapScope: "shared" }),
    mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
    mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
  ]), [], "running");
  ok(st.turn === "host" && !st.awaiting.player1 && !st.awaiting.player2 && st.civPickableIds.length === 0,
    "…because it leaves the draft with no move for anyone");
}

// --- The shape that was actually played --------------------------------------
console.log("\nThe Bo7 that reported this is rejected, and the fixed shape is not");
{
  const eleven = Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const draft = (hostPick: boolean) => {
    const out: Step[] = [];
    for (const kind of ["ban", "pick", "ban", "pick", "pick"] as const) {
      const type = kind === "ban" ? "MAP_BAN" : "MAP_PICK";
      out.push(mk({ type, actor: "PLAYER1" }), mk({ type, actor: "PLAYER2" }));
    }
    if (hostPick) out.push(mk({ type: "MAP_PICK", actor: "HOST_DRAW" }));
    out.push(mk({ type: "MAP_SELECT", actor: "HOST_DRAW", mapScope: "shared" }));
    out.push(mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }));
    out.push(mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }));
    return withSteps(out, eleven);
  };
  ok(codes(draft(true)).includes("drawNoMapsLeft"), "11 maps, 4 banned and 7 picked → nothing to draw");
  ok(!codes(draft(false)).includes("drawNoMapsLeft"), "drop the host's MAP_PICK and the draw has its one map back");
}

console.log("\nEvery shipped preset still leaves its draw something to draw");
const shipped: [string, PresetConfig][] = [
  ...EGC_PRESETS.map((p) => [p.name, p.config as PresetConfig] as [string, PresetConfig]),
  ...DEMO_PRESETS.map((p) => [`demo: ${p.name}`, p.config as PresetConfig] as [string, PresetConfig]),
  ["buildDefaultConfig(3)", buildDefaultConfig(3)],
  ["buildDefaultConfig(5)", buildDefaultConfig(5)],
];
for (const [name, cfg] of shipped) {
  const hit = validatePreset(cfg).filter((e) => e.code === "drawNoMapsLeft" || e.code === "drawCannotPick");
  ok(hit.length === 0, `${name}${hit.length ? ` → ${JSON.stringify(hit)}` : ""}`);
}

console.log(failures === 0 ? "\nALL PASS ✓" : `\n${failures} FAILURE(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
