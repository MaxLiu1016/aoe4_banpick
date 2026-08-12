import type { PresetConfig, Step } from "@/lib/draft/schema";
import { CIVS } from "@/data/civs";

let counter = 0;
const sid = (t: string) => `${t}-${counter++}`;

/**
 * Builds a default config that mirrors the current 3-site workflow:
 *   1. Map ban/pick      → narrows the map pool
 *   2. Civ ban/pick      → builds the match's available civ pool
 *   3. Per game:
 *        - Map select    (game 1: host draws random un-banned; later: loser picks)
 *        - Civ snipe draft (both players pick a civ from the drafted pool,
 *                           excluding civs already used, shown the current map)
 *        - Game result
 */
export function buildDefaultConfig(bestOf = 5): PresetConfig {
  counter = 0;
  const steps: Step[] = [];

  const mk = (s: Omit<Step, "id">): Step => ({ id: sid(s.type), ...s });

  // --- Map BP: ban a couple, then EACH player picks maps into their OWN pool.
  // The loser selects from their own pool each game. ---
  steps.push(mk({ type: "MAP_BAN", actor: "PLAYER1", pool: "map", count: 1, timeLimitSec: 30, showCurrentMap: false, excludeUsedCivs: false, pausable: false, }));
  steps.push(mk({ type: "MAP_BAN", actor: "PLAYER2", pool: "map", count: 1, timeLimitSec: 30, showCurrentMap: false, excludeUsedCivs: false, pausable: false, }));
  const mapsPerPlayer = Math.max(1, Math.ceil(bestOf / 2));
  steps.push(mk({ type: "MAP_PICK", actor: "PLAYER1", pool: "map", count: mapsPerPlayer, timeLimitSec: 45, showCurrentMap: false, excludeUsedCivs: false, pausable: false, }));
  steps.push(mk({ type: "MAP_PICK", actor: "PLAYER2", pool: "map", count: mapsPerPlayer, timeLimitSec: 45, showCurrentMap: false, excludeUsedCivs: false, pausable: false, }));

  // --- Civ BP (build the match civ pool) ---
  steps.push(mk({ type: "CIV_BAN", actor: "PLAYER1", pool: "civ", count: 1, timeLimitSec: 30, showCurrentMap: false, excludeUsedCivs: false, banScope: "opponent", pausable: false, }));
  steps.push(mk({ type: "CIV_BAN", actor: "PLAYER2", pool: "civ", count: 1, timeLimitSec: 30, showCurrentMap: false, excludeUsedCivs: false, banScope: "opponent", pausable: false, }));
  // Each player drafts a persistent "hand" of civs. Sized so they never run out
  // (each game plays 1 distinct civ; offers need spares): bestOf + offerSize - 1.
  const handSize = bestOf + 1;
  steps.push(mk({ type: "CIV_PICK", actor: "PLAYER1", pool: "civ", count: handSize, timeLimitSec: 60, showCurrentMap: false, excludeUsedCivs: false, pausable: false, }));
  steps.push(mk({ type: "CIV_PICK", actor: "PLAYER2", pool: "civ", count: handSize, timeLimitSec: 60, showCurrentMap: false, excludeUsedCivs: false, pausable: false, }));

  // --- Per-game loop: pick map, simultaneous offer (2), simultaneous counter-snipe (1), result ---
  for (let g = 0; g < bestOf; g++) {
    const mapActor = g === 0 ? "HOST_DRAW" : "LOSER";
    steps.push(mk({ type: "MAP_SELECT", actor: mapActor, pool: "map", count: 1, timeLimitSec: 30, showCurrentMap: false, excludeUsedCivs: false, pausable: false, }));
    // The other side acknowledges the map before the civs for it are chosen.
    // Game 1's map comes out of a draw, so there is nothing to acknowledge.
    if (g > 0) {
      steps.push(mk({ type: "SYNC_CONFIRM", actor: "WINNER", pool: "map", count: 1, timeLimitSec: 60, showCurrentMap: true, excludeUsedCivs: false, pausable: false, }));
    }
    steps.push(mk({ type: "CIV_OFFER", actor: "PLAYER1", pool: "drafted_civ", count: 2, timeLimitSec: 45, showCurrentMap: true, excludeUsedCivs: true, pausable: false, }));
    steps.push(mk({ type: "CIV_SNIPE_OPPONENT", actor: "PLAYER1", pool: "drafted_civ", count: 1, timeLimitSec: 30, showCurrentMap: true, excludeUsedCivs: false, pausable: false, }));
    steps.push(mk({ type: "GAME_RESULT", actor: "HOST_DRAW", pool: "map", count: 1, timeLimitSec: 0, showCurrentMap: true, excludeUsedCivs: false, pausable: false, }));
  }

  return {
    // Every civ in, no map in. The two pools are not symmetric in practice: the
    // civ list only changes when the game ships a civ, so starting from "all of
    // them" and banning down is the normal move — and starting from base-only
    // silently dropped the 11 variant civs from any new preset. Map pools rotate
    // every season and every tournament, so there is no set that is right by
    // default; shipping last season's would just look authoritative while being
    // wrong. A new preset therefore opens with a "pick your maps" validation
    // error, which is the intended nudge.
    civs: CIVS,
    maps: [],
    steps,
    options: { bestOf, publicHover: false, defaultTimeLimitSec: 30, pausable: false, resultMode: "vote", anonymous: false },
  };
}
