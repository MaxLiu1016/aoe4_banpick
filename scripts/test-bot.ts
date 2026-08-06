/**
 * The practice bot. Two things have to hold, and neither is about it playing well:
 *
 *   - it never submits a move the rules reject, and
 *   - it never runs out of ideas mid-draft and leaves the series stuck.
 *
 * The second is the one that would actually ruin someone's evening. This drives a
 * full series with the bot in one seat against a trivial opponent in the other and
 * checks it reaches the end, asserting the legality of every single bot move on
 * the way through. No database, no socket.
 *
 *   npx tsx scripts/test-bot.ts
 */
import { deriveState, validateAction, type EngineAction, type SeatRole } from "../lib/draft/engine";
import { botTargetFor } from "../lib/bot";
import { EGC_PRESETS } from "../data/egcPresets";
import { DEMO_PRESETS } from "../data/demoPresets";
import type { PresetConfig } from "../lib/draft/schema";

let failures = 0;
const ok = (c: boolean, m: string) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) failures++; };

interface Run { finished: boolean; botMoves: number; illegal: number; stalled: string | null; sameCiv: boolean }

/** Play a whole series: the bot holds `botSeat`, a first-legal opponent the other. */
function play(config: PresetConfig, botSeat: "player1" | "player2"): Run {
  const actions: EngineAction[] = [];
  const human: SeatRole = botSeat === "player1" ? "player2" : "player1";
  let state = deriveState(config, actions);
  let seq = 0, botMoves = 0, illegal = 0;
  let stalled: string | null = null;

  for (let guard = 0; guard < 800 && !state.finished; guard++) {
    const step = state.currentStep;
    if (!step) break;

    // The bot has no game to have won, so the human calls it and the bot agrees —
    // exactly what the socket layer does with the vote.
    if (step.type === "GAME_RESULT") {
      const winner = state.currentGameIndex % 2 === 0 ? human : botSeat;
      actions.push({ seq: seq++, stepIndex: state.currentStepIndex, actor: "host", actionType: "result", target: winner, gameIndex: state.currentGameIndex });
      state = deriveState(config, actions);
      continue;
    }

    // Whose move is it? The bot answers for itself whenever it is awaited.
    if (state.awaiting[botSeat]) {
      const target = botTargetFor(state, botSeat);
      if (!target) { stalled = `bot had no move at step ${state.currentStepIndex} (${step.type})`; break; }
      const res = validateAction(state, botSeat, target);
      if (!res.ok || !res.resolved) { illegal++; stalled = `bot move rejected at step ${state.currentStepIndex}: ${res.error}`; break; }
      botMoves++;
      actions.push({ seq: seq++, stepIndex: state.currentStepIndex, actor: botSeat, target, ...res.resolved });
      state = deriveState(config, actions);
      continue;
    }

    const actor: SeatRole | undefined = state.turn ?? (state.awaiting[human] ? human : undefined);
    if (!actor) { stalled = `nobody owed a move at step ${state.currentStepIndex} (${step.type})`; break; }
    const pool = step.type.startsWith("MAP_") ? config.maps : config.civs;
    const chosen = pool.map((e) => e.id).find((id) => validateAction(state, actor, id).ok);
    if (!chosen) { stalled = `opponent had no move at step ${state.currentStepIndex} (${step.type})`; break; }
    const resolved = validateAction(state, actor, chosen).resolved!;
    actions.push({ seq: seq++, stepIndex: state.currentStepIndex, actor, target: chosen, ...resolved });
    state = deriveState(config, actions);
  }

  const botCivs = state.games.map((g) => (botSeat === "player1" ? g.civP1 : g.civP2)).filter(Boolean);
  return { finished: state.finished, botMoves, illegal, stalled, sameCiv: new Set(botCivs).size !== botCivs.length };
}

function main() {
  const formats: { name: string; config: PresetConfig }[] = [
    ...EGC_PRESETS.filter((p) => ["egc-qual-bo3", "egc-main-bo9"].includes(p.key)).map((p) => ({ name: p.name, config: p.config })),
    // Both BCC formats. The Bo5 is here because it used to be unfinishable: each
    // game carried two simultaneous offer rows, and a simultaneous row already
    // covers both players, so it quietly asked four civs a game from a hand of
    // seven and ran dry in game five. Only a series that went the distance ever
    // reached it, which is why nobody had hit it.
    ...DEMO_PRESETS.filter((d) => d.key === "bcc-bo3" || d.key === "bcc-bo5").map((d) => ({ name: d.name, config: d.config })),
  ];

  for (const f of formats) {
    console.log(`\n${f.name}`);
    for (const seat of ["player1", "player2"] as const) {
      // Both seats, because the draft is not symmetric — P1 opens most steps, and
      // a bot that only ever worked from the second chair would be half-tested.
      // Repeated because every choice is random: one clean run proves little.
      let worst: Run | null = null;
      for (let i = 0; i < 25; i++) {
        const r = play(f.config, seat);
        if (!worst || (!r.finished && worst.finished) || r.illegal > worst.illegal) worst = r;
      }
      const w = worst!;
      ok(w.illegal === 0, `${seat}: never played an illegal move`);
      ok(w.stalled === null, `${seat}: never got stuck${w.stalled ? ` — ${w.stalled}` : ""}`);
      ok(w.finished, `${seat}: series reached the end (${w.botMoves} bot moves)`);
      ok(!w.sameCiv, `${seat}: didn't field the same civ twice`);
    }
  }

  console.log("\nIt only moves when it's owed a move:");
  const cfg = EGC_PRESETS.find((p) => p.key === "egc-qual-bo3")!.config;
  const fresh = deriveState(cfg, []);
  // Step 1 of the EGC map draft belongs to P1 alone.
  ok(fresh.awaiting.player1 && !fresh.awaiting.player2, "only player 1 is awaited on the opening step");
  ok(botTargetFor(fresh, "player2") === null, "a bot in seat 2 has nothing to say yet");
  ok(botTargetFor(fresh, "player1") !== null, "a bot in seat 1 does");

  console.log(failures === 0 ? "\nALL PASS ✓" : `\n${failures} FAILURE(S) ✗`);
  process.exit(failures === 0 ? 0 : 1);
}
main();
