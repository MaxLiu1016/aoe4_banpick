/**
 * The EGC Masters demo presets. Two things are worth pinning down: that the six
 * formats still say what the handbook says (pool sizes, hand sizes, who bans when),
 * and that a whole series can actually be played start to finish — a preset can be
 * structurally valid and still deadlock halfway through game 4 when a hand runs dry.
 *
 *   npx tsx scripts/test-egc.ts
 */
import { deriveState, validateAction, type EngineAction, type SeatRole } from "../lib/draft/engine";
import { validatePreset } from "../lib/draft/validate";
import { EGC_PRESETS } from "../data/egcPresets";
import type { PresetConfig } from "../lib/draft/schema";

let failures = 0;
const ok = (c: boolean, m: string) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) failures++; };

const count = (c: PresetConfig, type: string) => c.steps.filter((s) => s.type === type).length;
const total = (c: PresetConfig, type: string) => c.steps.filter((s) => s.type === type).reduce((n, s) => n + s.count, 0);

/** Play a preset to the end, taking the first legal option at every turn. */
function playThrough(config: PresetConfig): { state: ReturnType<typeof deriveState>; steps: number } {
  const actions: EngineAction[] = [];
  let state = deriveState(config, actions);
  let seq = 0;
  // Generous: the Bo9 is ~130 steps and a few need two submissions.
  for (let guard = 0; guard < 600 && !state.finished; guard++) {
    const step = state.currentStep;
    if (!step) break;

    if (step.type === "GAME_RESULT") {
      // Alternate the winner so LOSER map selection is exercised from both seats.
      const winner = state.currentGameIndex % 2 === 0 ? "player1" : "player2";
      actions.push({ seq: seq++, stepIndex: state.currentStepIndex, actor: "host", actionType: "result", target: winner, gameIndex: state.currentGameIndex });
      state = deriveState(config, actions);
      continue;
    }

    const role: SeatRole | undefined = state.turn
      ?? (["player1", "player2"] as const).find((r) => state.awaiting[r]);
    if (!role) { ok(false, `nobody is on turn at step ${state.currentStepIndex} (${step.type})`); break; }

    const pool = step.type.startsWith("MAP_") ? config.maps : config.civs;
    const chosen = pool.map((e) => e.id).find((id) => validateAction(state, role, id).ok);
    if (!chosen) { ok(false, `no legal option for ${role} at step ${state.currentStepIndex} (${step.type})`); break; }

    const resolved = validateAction(state, role, chosen).resolved;
    if (!resolved) break;
    actions.push({ seq: seq++, stepIndex: state.currentStepIndex, actor: role, target: chosen, ...resolved });
    state = deriveState(config, actions);
  }
  return { state, steps: actions.length };
}

interface Expected { key: string; bestOf: number; maps: number; hand: number; mapBans: number; mapPicks: number }

// Straight off the handbook and the aoe2cm presets it links to.
const EXPECTED: Expected[] = [
  { key: "egc-qual-bo3", bestOf: 3, maps: 8, hand: 5, mapBans: 4, mapPicks: 2 },
  { key: "egc-qual-bo5", bestOf: 5, maps: 8, hand: 7, mapBans: 2, mapPicks: 4 },
  { key: "egc-main-bo3", bestOf: 3, maps: 11, hand: 5, mapBans: 6, mapPicks: 2 },
  { key: "egc-main-bo5", bestOf: 5, maps: 11, hand: 7, mapBans: 4, mapPicks: 4 },
  { key: "egc-main-bo7", bestOf: 7, maps: 11, hand: 9, mapBans: 2, mapPicks: 6 },
  { key: "egc-main-bo9", bestOf: 9, maps: 11, hand: 10, mapBans: 0, mapPicks: 8 },
];

function main() {
  ok(EGC_PRESETS.length === EXPECTED.length, `${EXPECTED.length} formats, qualifier through grand final`);

  for (const exp of EXPECTED) {
    const preset = EGC_PRESETS.find((p) => p.key === exp.key);
    if (!preset) { ok(false, `preset ${exp.key} exists`); continue; }
    const c = preset.config;
    console.log(`\n${preset.name}`);

    const issues = validatePreset(c);
    ok(issues.length === 0, `validates clean (got: ${issues.map((i) => i.code).join(", ") || "none"})`);

    ok(c.civs.length === 23, "all 23 civs are draftable, variants included");
    ok(c.maps.length === exp.maps, `${exp.maps}-map pool`);
    ok(c.options.bestOf === exp.bestOf && count(c, "GAME_RESULT") === exp.bestOf, `Bo${exp.bestOf} with ${exp.bestOf} games`);

    ok(total(c, "MAP_BAN") === exp.mapBans && total(c, "MAP_PICK") === exp.mapPicks,
      `map draft is ${exp.mapBans} bans + ${exp.mapPicks} picks`);
    // Every map the series can reach: the drawn one plus both players' picks.
    ok(1 + exp.mapPicks >= exp.bestOf, `the draft yields ${1 + exp.mapPicks} maps for ${exp.bestOf} games`);
    // 5.2.3.3 the drawn map is game 1's, so the draw needs something left to draw.
    ok(exp.maps - exp.mapBans - exp.mapPicks >= 2, "the random draw still has a pot to pull from");

    // 5.3 hands: the pool draft gives each player the same number of civs.
    ok(total(c, "CIV_PICK") === exp.hand * 2, `${exp.hand} civs in each hand`);
    ok(total(c, "CIV_BAN") === 3 && c.steps.every((s) => s.type !== "CIV_BAN" || s.banScope === "opponent"),
      "3 blind bans each, all against the opponent's pool");
    ok(c.steps.every((s) => s.type !== "CIV_BAN" || s.simultaneous === true), "civ bans are simultaneous");

    // 5.3.2.2 two civs offered per map, one sniped — drafted in the open, and the
    // seat that opens swaps every game.
    ok(count(c, "CIV_OFFER") === exp.bestOf * 3, "the offer is three open turns per game");
    ok(c.steps.every((s) => s.type !== "CIV_OFFER" || s.simultaneous === false), "and none of them is blind");
    ok(total(c, "CIV_SNIPE_OPPONENT") === exp.bestOf, "one snipe per game");
    const openers = c.steps.filter((s) => s.type === "CIV_OFFER").filter((_, i) => i % 3 === 0).map((s) => s.actor);
    ok(openers.every((a, i) => a === (i % 2 === 0 ? "PLAYER1" : "PLAYER2")), "players swap roles between maps");

    // 5.3.2.3 a civ that was played is gone; one that was only sniped comes back.
    ok(c.steps.every((s) => s.type !== "CIV_OFFER" || s.excludeUsedCivs), "a civ already played cannot be offered again");
    ok(exp.hand >= exp.bestOf + 1, `a ${exp.hand}-civ hand survives ${exp.bestOf} games of offer-two-lose-one`);

    const { state, steps } = playThrough(c);
    ok(state.finished, `a full series plays out (${steps} actions)`);
    ok(state.games.every((g) => !g.winner || (g.map && g.civP1 && g.civP2)),
      "every game played got a map and a civ for each side");
    const p1Civs = state.games.filter((g) => g.civP1).map((g) => g.civP1);
    ok(new Set(p1Civs).size === p1Civs.length, "and nobody fielded the same civ twice");
  }

  console.log(failures === 0 ? "\nALL PASS ✓" : `\n${failures} FAILURE(S) ✗`);
  process.exit(failures === 0 ? 0 : 1);
}
main();
