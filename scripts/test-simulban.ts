/**
 * Engine test for simultaneous bans (both players ban at once, hidden until
 * both submit). Pure engine — no server or DB needed:
 *
 *   npx tsx scripts/test-simulban.ts
 */
import { buildDefaultConfig } from "../lib/draft/defaultPreset";
import { deriveState, validateAction, type EngineAction, type SeatRole } from "../lib/draft/engine";

const config = buildDefaultConfig(3);
// Turn the two leading one-at-a-time map bans into ONE simultaneous step where
// each player bans 2 maps at the same time.
config.steps = [
  { ...config.steps[0], simultaneous: true, count: 2, },
  ...config.steps.slice(2),
];

const actions: EngineAction[] = [];
let seq = 0;
let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { console.error("  ✗ FAIL:", msg); failures++; } else console.log("  ✓", msg);
}
const state = () => deriveState(config, actions, "running");
function act(role: SeatRole, target: string, label: string, wantErr = false) {
  const s = state();
  const v = validateAction(s, role, target);
  if (wantErr) { assert(!v.ok, `${label} -> rejected (${v.error ?? ""})`); return; }
  if (!v.ok || !v.resolved) { assert(false, `${label} -> ${v.error}`); return; }
  actions.push({ seq: seq++, stepIndex: s.currentStepIndex, actor: role, actionType: v.resolved.actionType, pool: v.resolved.pool, target, scope: v.resolved.scope, gameIndex: v.resolved.gameIndex });
  assert(true, label);
}
const mapState = (id: string) => state().maps.find((m) => m.id === id)?.state;

console.log("Simultaneous ban:");
let s = state();
assert(s.simultaneous === true, "step is flagged simultaneous");
assert(s.turn === null, "no single turn during a simultaneous step");
assert(s.awaiting.player1 && s.awaiting.player2, "both players awaited");

// P1 bans both of theirs first; nothing may leak and the step must NOT advance.
act("player1", "dry-arabia", "P1 ban 1");
assert(mapState("dry-arabia") === "available", "P1's ban is NOT applied to the pool yet");
assert(state().pendingBans.player1.includes("dry-arabia"), "P1's ban is held in pendingBans");
assert(state().pendingBans.player2.length === 0, "P2 has banned nothing yet");

act("player1", "dry-arabia", "P1 re-bans same map", true);
act("player1", "lipany", "P1 ban 2");
s = state();
assert(s.currentStepIndex === 0, "step does NOT advance on one player alone");
assert(s.awaiting.player1 === false, "P1 no longer awaited");
assert(s.awaiting.player2 === true, "P2 still awaited");
act("player1", "altai", "P1 tries a third ban", true);
assert(mapState("lipany") === "available", "still nothing revealed while P2 is pending");

// P2 completes the step -> everything reveals at once and the step advances.
act("player2", "high-view", "P2 ban 1");
assert(mapState("dry-arabia") === "available", "still hidden after P2's first ban");
act("player2", "altai", "P2 ban 2");

s = state();
assert(s.currentStepIndex === 1, "step advances once BOTH players submitted");
assert(mapState("dry-arabia") === "banned", "P1 ban 1 revealed");
assert(mapState("lipany") === "banned", "P1 ban 2 revealed");
assert(mapState("high-view") === "banned", "P2 ban 1 revealed");
assert(mapState("altai") === "banned", "P2 ban 2 revealed");
assert(s.pendingBans.player1.length === 0 && s.pendingBans.player2.length === 0, "pendingBans cleared after reveal");
assert(s.maps.find((m) => m.id === "dry-arabia")?.by === "player1", "ban attribution kept (P1)");
assert(s.maps.find((m) => m.id === "altai")?.by === "player2", "ban attribution kept (P2)");
assert(s.simultaneous === false, "next step is back to turn-based");

console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
