import type { PoolEntry, PresetConfig, Step } from "@/lib/draft/schema";
import { CIVS } from "./civs";
import { DEFAULT_MAPS } from "./maps";

/**
 * The EGC Masters (Elite Gaming Channel) rule set, qualifier through grand final.
 *
 * Built in code rather than pasted in as JSON because the six formats are the same
 * draft with four numbers changed, and a tournament that re-publishes its handbook
 * every season is a thing you want to re-generate, not re-type.
 *
 * Source: "EGS Masters Fall - Season 2 - Handbook.pdf" (26pp) linked from
 * elitegamingchannel.com, plus the seven aoe2cm.net draft presets the handbook
 * links to — those give the exact turn order, which the prose does not.
 *
 * Everything here is taken from those two sources EXCEPT the Main Event map draft,
 * which EGC had not published when this was written (the handbook's four Main Event
 * buttons are not yet hyperlinked). That one is reconstructed — see MAP_DRAFTS.
 */

// --- Pools -------------------------------------------------------------------

// 5.2.1.1 "Eight maps will be played in the Open Qualifiers, and three additional
// maps will join the Main Event."
const QUALIFIER_MAPS = [
  "egc-dry-arabia", "egc-dry-river", "egc-gorge", "egc-holy-island",
  "egc-kerlaugar", "egc-king-of-the-hill", "egc-mountain-clearing", "egc-silk-road",
];
const MAIN_EVENT_MAPS = [...QUALIFIER_MAPS, "egc-archipelago", "egc-danube-divide", "egc-golden-stream"];

const MAP_BY_ID = new Map(DEFAULT_MAPS.map((m) => [m.id, m]));
function maps(ids: string[]): PoolEntry[] {
  return ids.map((id) => {
    const m = MAP_BY_ID.get(id);
    // Loud on purpose: a typo here would silently seed a demo with a short pool.
    if (!m) throw new Error(`EGC preset references unknown map "${id}"`);
    return m;
  });
}

// The civ draft presets list all 23 civs, variants included.
const CIV_POOL: PoolEntry[] = CIVS.map(({ id, name, imageUrl }) => ({ id, name, imageUrl }));

// --- Step helpers ------------------------------------------------------------

type Seat = "PLAYER1" | "PLAYER2";
const other = (s: Seat): Seat => (s === "PLAYER1" ? "PLAYER2" : "PLAYER1");

/** aoe2cm runs the whole EGC draft on a 30s clock. */
const TIMER = 30;

type StepSpec = Omit<Step, "id" | "label" | "count" | "timeLimitSec" | "showCurrentMap" | "excludeUsedCivs" | "pausable">
  & Partial<Pick<Step, "count" | "timeLimitSec" | "showCurrentMap" | "excludeUsedCivs" | "pausable">>;

function mk(s: StepSpec): Omit<Step, "id"> {
  return { count: 1, timeLimitSec: TIMER, showCurrentMap: false, excludeUsedCivs: true, pausable: false, ...s };
}

// --- 5.2 Maps ----------------------------------------------------------------

/**
 * One entry per round of the map draft; each round is P1 then P2. A random draw
 * of the first map always follows.
 *
 * The two qualifier rows are the aoe2cm presets verbatim (DYuWr / FtKTM). The four
 * Main Event rows are RECONSTRUCTED: EGC had not published them yet, so they keep
 * the qualifier's shape — trade a ban round for a pick round as the series gets
 * longer, and always leave the draw a pot to pull from. On 11 maps that lands on
 * eight maps spent before the draw, against the qualifiers' six on eight maps.
 * Replace these the moment the real links go up.
 */
const MAP_DRAFTS: Record<string, ("ban" | "pick")[]> = {
  "qual-bo3": ["ban", "pick", "ban"],
  "qual-bo5": ["ban", "pick", "pick"],
  "main-bo3": ["ban", "ban", "ban", "pick"],
  "main-bo5": ["ban", "ban", "pick", "pick"],
  "main-bo7": ["ban", "pick", "pick", "pick"],
  "main-bo9": ["pick", "pick", "pick", "pick"],
};

function mapDraft(rounds: ("ban" | "pick")[]): Omit<Step, "id">[] {
  const out: Omit<Step, "id">[] = [];
  for (const kind of rounds) {
    const type = kind === "ban" ? "MAP_BAN" : "MAP_PICK";
    // 5.2.3.6 "A player can pick from the opposing player's maps" — so a ban here
    // takes the map off the table for both, not just for the opponent.
    out.push(mk({ type, actor: "PLAYER1", pool: "map" }));
    out.push(mk({ type, actor: "PLAYER2", pool: "map" }));
  }
  // 5.2.3.3 "The last map drawn is always the first map played." The draw comes out
  // of what neither player claimed, which is what HOST_DRAW already does.
  out.push(mk({ type: "MAP_SELECT", actor: "HOST_DRAW", pool: "map", mapScope: "shared", pausable: true }));
  return out;
}

// --- 5.3 Civilizations -------------------------------------------------------

/**
 * The pool draft, straight from the aoe2cm presets: two hidden simultaneous ban
 * rounds revealed together, one pick each, one more hidden ban round, then a snake
 * of picks. `snake` is how many P2,P1,P1,P2 rounds follow; `tail` adds the odd
 * P1,P2 pair that only the Bo9 draft has.
 */
function civDraft(snake: number, tail: boolean): Omit<Step, "id">[] {
  const ban = (count: number) =>
    // EXCLUSIVE in aoe2cm = the ban only closes the civ to the opponent, which is
    // our banScope "opponent". Both sides ban blind and reveal together.
    mk({ type: "CIV_BAN", actor: "PLAYER1", pool: "civ", count, banScope: "opponent", simultaneous: true });
  const pick = (actor: Seat) => mk({ type: "CIV_PICK", actor, pool: "civ" });

  const out: Omit<Step, "id">[] = [ban(2), pick("PLAYER1"), pick("PLAYER2"), ban(1)];
  for (let i = 0; i < snake; i++) out.push(pick("PLAYER2"), pick("PLAYER1"), pick("PLAYER1"), pick("PLAYER2"));
  if (tail) out.push(pick("PLAYER1"), pick("PLAYER2"));
  return out;
}

/**
 * 5.3.2.2 "Players will be able to pick two civilizations before each map, and will
 * snipe one of the two selected civilizations from their opponent's pool. The
 * remaining civilization will be played on that map. Players must swap roles
 * between maps."
 *
 * The offer is drafted in the open, one civ at a time (host, guest, guest, host),
 * so it is three turn-based steps rather than one blind one. "Swap roles between
 * maps" is why the seat that opens alternates game by game.
 */
function series(bestOf: number): Omit<Step, "id">[] {
  const out: Omit<Step, "id">[] = [];
  for (let g = 0; g < bestOf; g++) {
    // Game 1's map came out of the draw at the end of the map draft.
    // 5.2.3.4 after that it is the loser's pick, from either player's maps.
    if (g > 0) {
      out.push(mk({ type: "MAP_SELECT", actor: "LOSER", pool: "map", mapScope: "shared" }));
      // The other side sees the map before anybody starts picking civs for it.
      // Only the winner is asked — the loser just chose it, and making them
      // confirm their own choice is a click that means nothing.
      out.push(mk({ type: "SYNC_CONFIRM", actor: "WINNER", pool: "map", count: 1 }));
    }
    const first: Seat = g % 2 === 0 ? "PLAYER1" : "PLAYER2";
    const offer = (actor: Seat, count: number) =>
      // 5.3.2.3 a civ already PLAYED is out; one that was only sniped comes back.
      mk({ type: "CIV_OFFER", actor, pool: "civ", count, simultaneous: false, showCurrentMap: true });
    out.push(offer(first, 1), offer(other(first), 2), offer(first, 1));
    out.push(mk({ type: "CIV_SNIPE_OPPONENT", actor: "PLAYER1", pool: "civ", count: 1, showCurrentMap: true }));
    out.push(mk({ type: "GAME_RESULT", actor: "WINNER", pool: "civ" }));
  }
  return out;
}

// --- The six formats ---------------------------------------------------------

interface EgcStage {
  key: string;
  name: string;
  description: string;
  bestOf: number;
  mapPool: string[];
  /** P2,P1,P1,P2 rounds in the civ pool snake. */
  snake: number;
  tail?: boolean;
}

const STAGES: EgcStage[] = [
  {
    key: "egc-qual-bo3",
    name: "EGC Qualifier Bo3",
    description: "EGC Masters Fall S2 — Open Qualifier, all rounds but the last. 8-map pool, blind civ bans, 5-civ hands, open 2-civ offer and simultaneous snipe per map.",
    bestOf: 3, mapPool: QUALIFIER_MAPS, snake: 2,
  },
  {
    key: "egc-qual-bo5",
    name: "EGC Qualifier Final Bo5",
    description: "EGC Masters Fall S2 — the qualifying round of the Open Qualifier. Same 8-map pool, 7-civ hands.",
    bestOf: 5, mapPool: QUALIFIER_MAPS, snake: 3,
  },
  {
    key: "egc-main-bo3",
    name: "EGC Main Event Bo3 (Group / QF)",
    description: "EGC Masters Fall S2 — GSL group stage and playoff quarterfinals. 11-map pool, 5-civ hands. Main Event map draft is reconstructed; EGC had not published it.",
    bestOf: 3, mapPool: MAIN_EVENT_MAPS, snake: 2,
  },
  {
    key: "egc-main-bo5",
    name: "EGC Main Event Bo5 (SF / Lower Final)",
    description: "EGC Masters Fall S2 — playoff semifinals and lower bracket final. 11-map pool, 7-civ hands. Main Event map draft is reconstructed; EGC had not published it.",
    bestOf: 5, mapPool: MAIN_EVENT_MAPS, snake: 3,
  },
  {
    key: "egc-main-bo7",
    name: "EGC Main Event Bo7 (Upper Final)",
    description: "EGC Masters Fall S2 — upper bracket final. 11-map pool, 9-civ hands. Main Event map draft is reconstructed; EGC had not published it.",
    bestOf: 7, mapPool: MAIN_EVENT_MAPS, snake: 4,
  },
  {
    key: "egc-main-bo9",
    name: "EGC Main Event Bo9 (Grand Final)",
    description: "EGC Masters Fall S2 — grand final. 11-map pool, 10-civ hands. Set the upper bracket player's one-map head start with the room's Head start control. Main Event map draft is reconstructed; EGC had not published it.",
    bestOf: 9, mapPool: MAIN_EVENT_MAPS, snake: 4, tail: true,
  },
];

function build(stage: EgcStage): PresetConfig {
  const draftKey = `${stage.mapPool === QUALIFIER_MAPS ? "qual" : "main"}-bo${stage.bestOf}`;
  const rounds = MAP_DRAFTS[draftKey];
  if (!rounds) throw new Error(`No EGC map draft defined for "${draftKey}"`);
  const steps = [
    // 5.1.1 "Players must draft maps before the civilizations".
    ...mapDraft(rounds),
    // A gate between the two halves. The map draft ends with a draw the server
    // resolves instantly, so without this the civ bans' clock starts before either
    // player has had a chance to see which map came out — and the first civ step is
    // a blind ban, the one you least want to rush. Generous but not open-ended: if
    // somebody walks away the timer confirms for them rather than hanging the draft.
    //
    // HOST_DRAW is how a confirm gate says "everybody", and it has to: naming a
    // seat is what makes a gate one-sided (`isSimultaneousStep`). This step used
    // to read PLAYER1 — filler, because StepSpec demands an actor — and that
    // filler quietly asked P1 alone, so the moment P1 pressed it the blind ban's
    // clock started on a P2 who might still have been reading the map. Which is
    // the exact thing the paragraph above says this step is here to prevent.
    mk({ type: "SYNC_CONFIRM", actor: "HOST_DRAW", pool: "civ", timeLimitSec: 60, pausable: true }),
    ...civDraft(stage.snake, stage.tail ?? false),
    ...series(stage.bestOf),
  ].map((s, i) => ({ ...s, id: `${stage.key}-${String(i + 1).padStart(2, "0")}` }));

  return {
    civs: CIV_POOL,
    maps: maps(stage.mapPool),
    steps,
    options: {
      bestOf: stage.bestOf,
      publicHover: false,
      anonymous: false,
      defaultTimeLimitSec: TIMER,
      pausable: false,
      resultMode: "vote",
    },
  };
}

/** Bump a preset's version to make the seed overwrite the copy in the database. */
export const EGC_PRESET_VERSION = 5;

export const EGC_PRESETS = STAGES.map((s, i) => ({
  key: s.key,
  name: s.name,
  description: s.description,
  // Front of the preset list, in the order a tournament is actually played:
  // qualifier first, grand final last. STAGES is already in that order.
  order: 10 + i,
  version: EGC_PRESET_VERSION,
  config: build(s),
}));
