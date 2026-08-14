/**
 * Checks the SYNC_CONFIRM gate — who it asks, what it is called, and which
 * presets are allowed to declare one.
 *
 * A gate reads two ways. Unnamed it asks everybody; naming an actor ("the
 * winner acknowledges the map the loser just picked") asks ONE seat. Three
 * things got that wrong at once and none of them was covered by a test:
 *
 *   - the room read `!awaiting` as "has confirmed", but `awaiting` is false for
 *     the seat that answered AND for the seat nobody asked, so the player who
 *     was never given a button was drawn with a tick and the word "Confirmed";
 *   - the step bar called every gate "both players confirm", including the ones
 *     that ask one side;
 *   - LOSER/WINNER in the FIRST game resolve against a previous game that does
 *     not exist, which turns a gate into a both-sides one silently and a
 *     MAP_SELECT into a draft that can never move — no turn, nobody awaited,
 *     and therefore (see `scheduleTimer`) no clock to time out and rescue it.
 *
 *   npx tsx scripts/test-confirm-gate.ts
 *
 * Pure engine + validation; no server and no database.
 */
import { validatePreset } from "@/lib/draft/validate";
import { stepLabel } from "@/lib/draft/stepLabel";
import { deriveState, gameIndexOfSteps, type EngineAction } from "@/lib/draft/engine";
import { isSimultaneousStep } from "@/lib/draft/schema";
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

const shell = {
  civs: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
  maps: [{ id: "m1", name: "M1" }, { id: "m2", name: "M2" }, { id: "m3", name: "M3" }],
  options: { bestOf: 1, publicHover: false, defaultTimeLimitSec: 0, pausable: false, resultMode: "vote", anonymous: false },
};
const withSteps = (steps: Step[]) => ({ ...shell, steps }) as PresetConfig;
const codes = (c: PresetConfig) => validatePreset(c).map((e) => e.code);

// --- Who the gate asks -------------------------------------------------------
console.log("\nThe gate reports who it asked separately from who answered");
{
  const cfg = withSteps([
    mk({ type: "MAP_BAN", actor: "PLAYER1" }),
    mk({ type: "MAP_BAN", actor: "PLAYER2" }),
    mk({ type: "MAP_SELECT", actor: "HOST_DRAW", mapScope: "shared" }),
    mk({ type: "SYNC_CONFIRM", actor: "PLAYER1", pool: "civ" }),
    mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
    mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
  ]);
  const upToGate: EngineAction[] = [
    { seq: 0, stepIndex: 0, actor: "player1", actionType: "ban", pool: "map", target: "m1" },
    { seq: 1, stepIndex: 1, actor: "player2", actionType: "ban", pool: "map", target: "m3" },
    { seq: 2, stepIndex: 2, actor: "host", actionType: "select", pool: "map", target: "m2", gameIndex: 0 },
  ];
  const g = deriveState(cfg, upToGate, "running").confirmGate;
  ok(!!g, "a SYNC_CONFIRM step reports a gate");
  ok(g!.asked.player1 && !g!.asked.player2, "a gate naming P1 asks P1 and nobody else");
  // The whole bug: P2 is not awaited, and that is NOT agreement. P2 banned the
  // last map and was shown a green tick for a button they never saw.
  ok(!g!.confirmed.player1 && !g!.confirmed.player2, "nobody has confirmed yet — including the seat that was never asked");

  const gDone = deriveState(cfg, [...upToGate,
    { seq: 3, stepIndex: 3, actor: "player1", actionType: "confirm", target: "confirm", gameIndex: 0 },
  ], "running").confirmGate;
  ok(gDone === null, "once the named seat confirms, the step advances and the gate is gone");
}
{
  const cfg = withSteps([
    mk({ type: "MAP_SELECT", actor: "HOST_DRAW", mapScope: "shared" }),
    mk({ type: "SYNC_CONFIRM", actor: "HOST_DRAW", pool: "civ" }),
    mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
    mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
  ]);
  const acts: EngineAction[] = [
    { seq: 0, stepIndex: 0, actor: "host", actionType: "select", pool: "map", target: "m2", gameIndex: 0 },
    { seq: 1, stepIndex: 1, actor: "player1", actionType: "confirm", target: "confirm", gameIndex: 0 },
  ];
  const st = deriveState(cfg, acts, "running");
  ok(!!st.confirmGate?.asked.player1 && !!st.confirmGate?.asked.player2, "an unnamed gate asks both seats");
  ok(st.confirmGate!.confirmed.player1 && !st.confirmGate!.confirmed.player2, "one seat confirmed, the other has not — and they read differently");
  ok(!st.awaiting.player1 && st.awaiting.player2, "`awaiting` still tracks only the seats actually owed");
}

// --- What the gate is called -------------------------------------------------
console.log("\nA gate that asks one seat is not called “both players confirm”");
{
  const table: Record<string, string> = {
    "step.SYNC_CONFIRM": "BOTH", "step.SYNC_CONFIRM_one": "Confirm",
    "actorShort.WINNER": "Winner", "actorShort.PLAYER1": "P1",
    "step.byActor": "{actor} · {step}",
  };
  const t = (k: string, v?: Record<string, string | number>) => {
    let s = table[k] ?? k;
    for (const [kk, vv] of Object.entries(v ?? {})) s = s.replaceAll(`{${kk}}`, String(vv));
    return s;
  };
  const label = (actor: string) => stepLabel(t, { type: "SYNC_CONFIRM", actor } as Step);
  ok(label("WINNER") === "Winner · Confirm", `actor=WINNER → "${label("WINNER")}"`);
  ok(label("PLAYER1") === "P1 · Confirm", `actor=PLAYER1 → "${label("PLAYER1")}"`);
  ok(label("HOST_DRAW") === "BOTH", `no named actor → "${label("HOST_DRAW")}"`);
}

// --- LOSER / WINNER need a previous game -------------------------------------
console.log("\nLOSER / WINNER in the first game is rejected before anyone plays it");
ok(codes(withSteps([
  mk({ type: "MAP_SELECT", actor: "LOSER" }),
  mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
  mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
])).includes("actorNoPrevGame"), "MAP_SELECT by the LOSER of game 0 — the deadlock");
ok(codes(withSteps([
  mk({ type: "MAP_SELECT", actor: "HOST_DRAW" }),
  mk({ type: "SYNC_CONFIRM", actor: "WINNER", pool: "civ" }),
  mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
  mk({ type: "GAME_RESULT", actor: "HOST_DRAW" }),
])).includes("actorNoPrevGame"), "SYNC_CONFIRM by the WINNER of game 0 — the silent degrade");
ok(!codes(withSteps([
  mk({ type: "MAP_SELECT", actor: "HOST_DRAW" }),
  mk({ type: "SYNC_CONFIRM", actor: "PLAYER1", pool: "civ" }),
  mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "civ", count: 1 }),
  // A result's actor is only "whoever calls it first", never a turn — and every
  // shipped EGC format declares WINNER on all of them, game 1 included.
  mk({ type: "GAME_RESULT", actor: "WINNER" }),
])).includes("actorNoPrevGame"), "a named seat is fine, and GAME_RESULT is exempt");

console.log("\nEvery shipped preset still passes the new rule");
const shipped: [string, PresetConfig][] = [
  ...EGC_PRESETS.map((p) => [p.name, p.config as PresetConfig] as [string, PresetConfig]),
  ...DEMO_PRESETS.map((p) => [`demo: ${p.name}`, p.config as PresetConfig] as [string, PresetConfig]),
  ["buildDefaultConfig(3)", buildDefaultConfig(3)],
  ["buildDefaultConfig(5)", buildDefaultConfig(5)],
];
for (const [name, cfg] of shipped) {
  const hit = validatePreset(cfg).filter((e) => e.code === "actorNoPrevGame");
  ok(hit.length === 0, `${name}${hit.length ? ` → ${JSON.stringify(hit)}` : ""}`);
}

// --- The gate between the two halves -----------------------------------------
// The map draft ends in a server draw, and the civ half opens on a blind ban.
// The gate in between exists so BOTH players get to see the drawn map before
// that clock starts. Three shipped formats had `actor: "PLAYER1"` on it —
// filler, because the step type demands an actor — which asked P1 alone and
// started P2's blind ban the instant P1 pressed it. Nothing caught it because
// the step bar called every gate "both players confirm" regardless.
//
// Not a `validatePreset` rule: a one-sided gate in game 1 is a legitimate thing
// for somebody to build. It is these presets that must not have one.
console.log("\nNo shipped preset asks one seat to open the civ half alone");
for (const [name, cfg] of shipped) {
  const gameOf = gameIndexOfSteps(cfg.steps);
  const oneSided = cfg.steps
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => s.type === "SYNC_CONFIRM" && gameOf[i] === 0 && !isSimultaneousStep(s));
  ok(oneSided.length === 0,
    `${name}${oneSided.length ? ` → step ${oneSided.map(({ s, i }) => `${i + 1} (${s.actor})`).join(", ")}` : ""}`);
}

console.log(failures === 0 ? "\nALL PASS ✓" : `\n${failures} FAILURE(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
