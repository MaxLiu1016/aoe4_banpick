import { buildDefaultConfig } from "../lib/draft/defaultPreset";
import { deriveState, validateAction, type EngineAction, type SeatRole } from "../lib/draft/engine";

const config = buildDefaultConfig(3); // handSize = 4
const actions: EngineAction[] = [];
let seq = 0;
let failures = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error("  ✗ FAIL:", msg); failures++; }
  else console.log("  ✓", msg);
}
const state = () => deriveState(config, actions, "running");

function act(role: SeatRole, target: string, label: string, wantErr = false) {
  const s = state();
  const v = validateAction(s, role, target);
  if (wantErr) { assert(!v.ok, `${label} -> rejected (${v.error ?? ""})`); return; }
  if (!v.ok || !v.resolved) { assert(false, `${label} -> ${v.error}`); return; }
  actions.push({ seq: seq++, stepIndex: s.currentStepIndex, actor: role, actionType: v.resolved.actionType, pool: v.resolved.pool, target, scope: v.resolved.scope, gameIndex: v.resolved.gameIndex });
  assert(true, `${label} (${v.resolved.actionType})`);
}
function result(gameIndex: number, winner: "player1" | "player2") {
  actions.push({ seq: seq++, stepIndex: -1, actor: "host", actionType: "result", target: winner, gameIndex });
}

console.log("Bo3 two-pool duel simulation:");

// Map BP: ban 2, then each player picks 2 maps into their OWN pool
act("player1", "dry-arabia", "P1 ban map");
act("player2", "lipany", "P2 ban map");
act("player1", "high-view", "P1 pick map 1");
act("player1", "mongolian-heights", "P1 pick map 2");
act("player2", "french-pass", "P2 pick map 1");
act("player2", "danube-river", "P2 pick map 2");
{
  const s0 = state();
  assert(s0.maps.filter((m) => m.state === "picked").length === 4, "4 maps in pool");
  assert(s0.mapsByP1.length === 2 && s0.mapsByP2.length === 2, "each player has own 2-map pool");
}
// Civ BP — default bans are OPPONENT-scope (P1's ban blocks P2, not P1)
act("player1", "english", "P1 ban civ (vs opponent)");
act("player2", "french", "P2 ban civ (vs opponent)");
{
  const sb = state();
  assert(sb.currentStep?.type === "CIV_PICK" && sb.turn === "player1", "now P1 drafts hand");
  assert(sb.civBans.length === 2 && sb.civBans.every((b) => b.scope === "opponent"), "two opponent-scope bans recorded");
  assert(!sb.civPickableIds.includes("french"), "P1 cannot pick french (P2 banned it against P1)");
  assert(sb.civPickableIds.includes("english"), "P1 CAN pick english (own opponent-ban doesn't block self)");
}
act("player1", "french", "P1 pick french (opp-banned, illegal)", true);

// Hands (4 each, exclusive)
["mongols", "rus", "abbasid-dynasty", "ottomans"].forEach((c, i) => act("player1", c, `P1 hand ${i + 1}`));
["chinese", "malians", "byzantines", "japanese"].forEach((c, i) => act("player2", c, `P2 hand ${i + 1}`));

let s = state();
assert(s.draftedByP1.length === 4 && s.draftedByP2.length === 4, "two 4-civ hands");
assert(s.currentStep?.type === "MAP_SELECT" && s.turn === "host", "game1 map = random (host draw)");

// host draws game1 map (random from LEFTOVER neutral maps — not banned, not in any pool)
{
  const reserved = ["dry-arabia", "lipany", "high-view", "mongolian-heights", "french-pass", "danube-river"];
  assert(s.selectableMapIds.length > 0 && s.selectableMapIds.every((id) => !reserved.includes(id)), "game1 random draws from leftover neutral maps");
}
act("host", s.selectableMapIds[0], "host random map g1");

// --- Game 1 offer (simultaneous) ---
s = state();
assert(s.currentStep?.type === "CIV_OFFER" && s.simultaneous, "game1 OFFER phase (simultaneous)");
assert(s.awaiting.player1 && s.awaiting.player2, "both players awaiting offer");
act("player2", "byzantines", "offer non-existent... actually valid own", false); // P2 offers byzantines (own)
act("player1", "mongols", "P1 offer mongols");
act("player1", "english", "P1 offer banned/non-hand civ (illegal)", true);
act("player1", "rus", "P1 offer rus");
act("player2", "chinese", "P2 offer chinese");
s = state();
assert(s.currentStep?.type === "CIV_SNIPE_OPPONENT", "both offered -> SNIPE phase");

// --- Game 1 snipe (simultaneous) ---
act("player1", "mongols", "P1 snipes own offer (illegal)", true); // must snipe opponent's
act("player1", "chinese", "P1 snipes P2's chinese");
act("player2", "mongols", "P2 snipes P1's mongols");
s = state();
assert(s.games[0].civP1 === "rus", "P1 civ = rus (mongols sniped, rus survives)");
assert(s.games[0].civP2 === "byzantines", "P2 civ = byzantines (chinese sniped)");
assert(s.currentStep?.type === "GAME_RESULT", "game1 awaiting result");
result(0, "player1");
assert(state().score.player1 === 1, "P1 leads 1-0");

// --- Game 2 ---
s = state();
assert(s.currentStep?.type === "MAP_SELECT" && s.turn === "player2", "game2 map = loser (P2)");
// Loser P2 may only pick from THEIR OWN map pool (prairie / danube-river), minus played.
assert(s.selectableMapIds.every((id) => ["french-pass", "danube-river"].includes(id)), "loser selects only from own map pool");
act("player2", s.selectableMapIds[0], "P2 selects g2 map from own pool");

s = state();
assert(s.currentStep?.type === "CIV_OFFER", "game2 OFFER");
// rus was PLAYED in g1 -> excluded; mongols was SNIPED -> returns to hand, offerable again
act("player1", "rus", "P1 re-offer used civ rus (illegal)", true);
act("player1", "mongols", "P1 re-offer sniped civ mongols (allowed)");
act("player1", "abbasid-dynasty", "P1 offer abbasid");
act("player2", "malians", "P2 offer malians (byzantines used -> still allowed? byz played g1)", false);
act("player2", "japanese", "P2 offer japanese");
s = state();
assert(s.currentStep?.type === "CIV_SNIPE_OPPONENT", "game2 snipe phase");
act("player1", "malians", "P1 snipes malians");
act("player2", "abbasid-dynasty", "P2 snipes abbasid");
s = state();
assert(s.games[1].civP1 === "mongols", "g2 P1 civ = mongols (abbasid sniped)");
assert(s.games[1].civP2 === "japanese", "g2 P2 civ = japanese (malians sniped)");
result(1, "player1");
s = state();
assert(s.score.player1 === 2 && s.finished, "P1 wins Bo3 2-0");

console.log(`\n${failures === 0 ? "ALL PASS ✓" : failures + " FAILURE(S) ✗"}`);
process.exit(failures === 0 ? 0 : 1);
