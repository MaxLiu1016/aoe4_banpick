/**
 * The "play all N" option only touches one thing — whether the series stops the
 * moment it is mathematically decided — so that is what this pins down. Pure
 * engine, no database, no server:
 *
 *   npx tsx scripts/test-playall.ts
 */
import { deriveState, type EngineAction } from "../lib/draft/engine";
import type { PresetConfig, Step } from "../lib/draft/schema";

let failures = 0;
const ok = (c: boolean, m: string) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) failures++; };

// A result action carries the winner in `target` and is stamped with stepIndex -1,
// exactly as commitResult() writes it.
let seq = 0;
const win = (gameIndex: number, who: "player1" | "player2"): EngineAction => ({
  seq: seq++, stepIndex: -1, actor: "host", actionType: "result", target: who, gameIndex,
});

/**
 * Five "Game result" steps and nothing else. A real preset's ban/pick steps would
 * have to be played through before the series could ever run out of steps, which
 * would drown the one behaviour under test; here a result action is the only
 * thing a step needs, so the series bookkeeping is all that moves.
 */
function bo5(playAll: boolean): PresetConfig {
  const steps: Step[] = Array.from({ length: 5 }, (_, g) => ({
    id: `result-${g}`, type: "GAME_RESULT", actor: "HOST_DRAW", pool: "map",
    count: 1, timeLimitSec: 0, showCurrentMap: false, excludeUsedCivs: false,
    pausable: false, label: `Game ${g + 1}: result`,
  }));
  return {
    civs: [{ id: "english", name: "English" }, { id: "french", name: "French" }],
    maps: [{ id: "dry-arabia", name: "Dry Arabia" }],
    steps,
    options: {
      bestOf: 5, publicHover: false, defaultTimeLimitSec: 0, pausable: false,
      resultMode: "vote", anonymous: false, playAll,
    },
  };
}

function main() {
  console.log("Best of 5, player 1 sweeps the first three games:");
  const sweep = [win(0, "player1"), win(1, "player1"), win(2, "player1")];

  const normal = deriveState(bo5(false), sweep);
  ok(normal.finished === true, "without playAll the series ends at 3-0");
  ok(normal.score.player1 === 3 && normal.score.player2 === 0, "score is 3-0");

  seq = 0;
  const all = deriveState(bo5(true), sweep);
  ok(all.finished === false, "with playAll a 3-0 is NOT the end");
  ok(all.playAll === true, "playAll is reported to the client");
  ok(all.currentStep !== null, "there is still a step to play");
  ok(all.currentGameIndex === 3, "play continues into game 4");

  console.log("\nAll five games played:");
  seq = 0;
  const full = deriveState(bo5(true), [
    win(0, "player1"), win(1, "player1"), win(2, "player1"), win(3, "player2"), win(4, "player2"),
  ]);
  ok(full.finished === true, "running out of games ends it even with playAll");
  ok(full.score.player1 === 3 && full.score.player2 === 2, "dead rubbers still count in the score (3-2)");

  console.log("\nThe target is unchanged — playAll moves the finish line, not the win condition:");
  seq = 0;
  ok(deriveState(bo5(true), []).target === 3, "target stays 3 for a Bo5");

  console.log(failures === 0 ? "\nALL PASS ✓" : `\n${failures} FAILURE(S) ✗`);
  process.exit(failures === 0 ? 0 : 1);
}
main();
