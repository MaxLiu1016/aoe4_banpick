/**
 * Checks `GET /api/matches/[id]/state` — the projection an external consumer
 * (a Discord tournament bot) polls for results.
 *
 * Builds match fixtures by writing `MatchAction` rows directly, the same
 * fields `applyAction`/`commitResult` would persist (`lib/socket/matchHandlers.ts`),
 * rather than driving the socket layer — `deriveState()` only ever reads those
 * fields, so this is the fixture-building `test-simulban.ts` already uses,
 * aimed at Mongo instead of an in-memory array.
 *
 *   npx tsx --env-file=.env.local scripts/test-state-endpoint.ts
 *
 * Needs `npm run dev` running.
 */
import mongoose, { Types } from "mongoose";
import { Match } from "../lib/models/Match";
import { MatchAction } from "../lib/models/MatchAction";

const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aoe4banpick";
const BASE = "http://localhost:3000";
let failures = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m);
  if (!c) failures++;
};

const baseOptions = {
  bestOf: 3,
  resultMode: "vote",
  publicHover: false,
  defaultTimeLimitSec: 0,
  pausable: true,
  anonymous: false,
  playAll: false,
};

function threeGameConfig(options: Partial<typeof baseOptions> = {}) {
  const step = (type: string, extra: Record<string, unknown> = {}) => ({
    id: `${type}-${Math.random().toString(36).slice(2)}`,
    type,
    actor: "HOST_DRAW",
    pool: "map",
    count: 1,
    timeLimitSec: 0,
    showCurrentMap: false,
    excludeUsedCivs: false,
    pausable: false,
    ...extra,
  });
  const steps: Record<string, unknown>[] = [];
  for (let g = 0; g < 3; g++) {
    if (g === 0) steps.push(step("MAP_BAN", { simultaneous: true, count: 1, pool: "map" }));
    steps.push(step("MAP_SELECT", { pool: "map" }));
    steps.push(step("CIV_OFFER", { pool: "drafted_civ", count: 2, actor: "PLAYER1" }));
    steps.push(step("CIV_SNIPE_OPPONENT", { pool: "drafted_civ", count: 1, actor: "PLAYER1" }));
    steps.push(step("GAME_RESULT", { pool: "map" }));
  }
  return {
    civs: [
      { id: "civ-a", name: "Civ A" },
      { id: "civ-b", name: "Civ B" },
      { id: "civ-c", name: "Civ C" },
      { id: "civ-d", name: "Civ D" },
    ],
    maps: [{ id: "map-a", name: "Map A" }, { id: "map-b", name: "Map B" }],
    steps,
    options: { ...baseOptions, ...options },
  };
}

async function makeMatch(status: string, config: unknown, seated: boolean) {
  const sfx = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const match = await Match.create({
    presetId: new Types.ObjectId(),
    hostId: new Types.ObjectId(),
    config,
    status,
    player1Id: seated ? new Types.ObjectId() : undefined,
    player2Id: seated ? new Types.ObjectId() : undefined,
    player1Name: seated ? "Alice" : undefined,
    player2Name: seated ? "Bob" : undefined,
    shareCode: `st${sfx}`,
  });
  return match;
}

let seq = 0;
async function act(matchId: string, gameIndex: number, fields: Record<string, unknown>) {
  await MatchAction.create({ matchId, stepIndex: -1, gameIndex, seq: seq++, ...fields });
  await Match.findByIdAndUpdate(matchId, { $inc: { actionSeq: 1 } });
}

async function getState(id: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}/api/matches/${id}/state`, { headers });
  const text = await res.text();
  return { status: res.status, etag: res.headers.get("etag"), text, body: text ? JSON.parse(text) : null };
}

const FORBIDDEN_KEYS = [
  "pendingBans", "civDuel", "votes", "awaitingAck", "offeredP1", "offeredP2",
  "snipedByP1", "snipedByP2", "maps", "civs", "offerableP1", "offerableP2",
  "civPickableIds", "stepBar", "currentStep", "shareCode", "player1Name",
  "player2Name", "hostId", "player1Id", "player2Id",
];

async function main() {
  await mongoose.connect(URI);
  const cleanup: string[] = [];

  try {
    // --- Lobby: nobody seated, nothing played ---
    const lobby = await makeMatch("lobby", threeGameConfig(), false);
    cleanup.push(String(lobby._id));
    {
      const { status, body } = await getState(String(lobby._id));
      ok(status === 200, "lobby match returns 200");
      ok(body.status === "lobby", "lobby status is reported verbatim");
      ok(body.finished === false, "an unplayed match is not finished");
      ok(body.seats[0].claimed === false && body.seats[1].claimed === false, "no seat is claimed");
      ok(body.games.length === 3, "games array has one entry per game in the series");
      ok(body.games.every((g: { winnerSlot: unknown }) => g.winnerSlot === null), "no game is decided");
      ok(body.score["1"] === 0 && body.score["2"] === 0, "score starts at zero");
    }

    // --- Mid-duel: a map ban and a civ offer in flight, neither revealed ---
    const midDuel = await makeMatch("running", threeGameConfig(), true);
    cleanup.push(String(midDuel._id));
    const midId = String(midDuel._id);
    await act(midId, 0, { actor: "player1", actionType: "ban", pool: "map", target: "map-b" });
    await act(midId, 0, { actor: "player1", actionType: "offer", target: "civ-a" });
    {
      const { status, text, body } = await getState(midId);
      ok(status === 200, "mid-duel match returns 200");
      for (const key of FORBIDDEN_KEYS) {
        ok(!text.includes(key), `response never mentions "${key}"`);
      }
      ok(body.games[0].civBySlot["1"] === null, "an unrevealed offer does not leak into civBySlot");
      ok(body.games[0].map === null, "no map has been selected yet");
      ok(body.finished === false, "an in-flight duel is not finished");
    }

    // --- Decided game 0, series still open ---
    await act(midId, 0, { actor: "host", actionType: "select", pool: "map", target: "map-a" });
    await act(midId, 0, { actor: "player2", actionType: "offer", target: "civ-b" });
    // player1 offered civ-a already; give it a second civ so one survives the snipe.
    await act(midId, 0, { actor: "player1", actionType: "offer", target: "civ-c" });
    await act(midId, 0, { actor: "player2", actionType: "offer", target: "civ-d" });
    // Each snipes one from the other's offer, leaving exactly one survivor apiece.
    await act(midId, 0, { actor: "player2", actionType: "gsnipe", target: "civ-c" }); // removes P1's civ-c
    await act(midId, 0, { actor: "player1", actionType: "gsnipe", target: "civ-d" }); // removes P2's civ-d
    await act(midId, 0, { actor: "host", actionType: "result", target: "player1" });
    {
      const { body } = await getState(midId);
      ok(body.games[0].map === "map-a", "the decided game's map is reported");
      ok(body.games[0].civBySlot["1"] === "civ-a", "slot 1's surviving civ is reported");
      ok(body.games[0].civBySlot["2"] === "civ-b", "slot 2's surviving civ is reported");
      ok(body.games[0].winnerSlot === 1, "the decided game's winner maps to the higher seed's slot");
      ok(body.score["1"] === 1 && body.score["2"] === 0, "the score reflects one win");
      ok(body.finished === false, "one game does not decide a Bo3");
    }

    // --- Clinching score while status still reads "running" ---
    await act(midId, 1, { actor: "host", actionType: "select", pool: "map", target: "map-a" });
    await act(midId, 1, { actor: "host", actionType: "result", target: "player1" });
    {
      const { body } = await getState(midId);
      ok(body.status === "running", "the stored status is never rewritten to finished");
      ok(body.finished === true, "a majority of games completes the series regardless of status");
      ok(body.score["1"] === 2 && body.score["2"] === 0, "the clinching score is reported");
    }

    // --- playAll keeps the series open past a clinching score ---
    const playAll = await makeMatch("running", threeGameConfig({ playAll: true }), true);
    cleanup.push(String(playAll._id));
    const playAllId = String(playAll._id);
    for (const g of [0, 1]) {
      await act(playAllId, g, { actor: "host", actionType: "select", pool: "map", target: "map-a" });
      await act(playAllId, g, { actor: "host", actionType: "result", target: "player1" });
    }
    {
      const { body } = await getState(playAllId);
      ok(body.playAll === true, "playAll is reported");
      ok(body.finished === false, "playAll keeps a clinched series open until every game is played");
    }

    // --- headStart is separated from the win-only score ---
    const handicapped = await makeMatch(
      "running",
      threeGameConfig({ headStart: { player1: 1, player2: 0 } } as never),
      true
    );
    cleanup.push(String(handicapped._id));
    const handicappedId = String(handicapped._id);
    await act(handicappedId, 0, { actor: "host", actionType: "select", pool: "map", target: "map-a" });
    await act(handicappedId, 0, { actor: "host", actionType: "result", target: "player1" });
    {
      const { body } = await getState(handicappedId);
      ok(body.headStart["1"] === 1 && body.headStart["2"] === 0, "headStart is returned");
      ok(body.score["1"] === 1 && body.score["2"] === 0, "score counts only games won, excluding the head start");
    }

    // --- ETag / If-None-Match ---
    {
      const first = await getState(lobby.id);
      ok(!!first.etag, "a successful response carries an ETag");
      const cached = await getState(lobby.id, { "if-none-match": first.etag! });
      ok(cached.status === 304, "a matching If-None-Match returns 304");
      ok(cached.text === "", "a 304 carries no body");
      await act(String(lobby._id), 0, { actor: "host", actionType: "select", pool: "map", target: "map-a" });
      const changed = await getState(lobby.id, { "if-none-match": first.etag! });
      ok(changed.status === 200, "a new action invalidates the old ETag");
      ok(changed.etag !== first.etag, "the ETag changes when the match does");
    }

    // --- 404s ---
    {
      const bad = await getState("not-an-object-id");
      ok(bad.status === 404, "a malformed id returns 404");
      const missing = await getState(String(new Types.ObjectId()));
      ok(missing.status === 404, "a well-formed but unknown id returns 404");
    }
  } finally {
    await Match.deleteMany({ _id: { $in: cleanup } });
    await MatchAction.deleteMany({ matchId: { $in: cleanup } });
    await mongoose.disconnect();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
