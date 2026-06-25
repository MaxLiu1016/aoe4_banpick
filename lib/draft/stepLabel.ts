import type { PresetConfig, Step } from "@/lib/draft/schema";

// Canonical ENGLISH names for step types and actors. Auto-generated step labels
// always use English regardless of the UI locale, so this lives in a plain
// server-safe module (no React / no i18n hook) that both the preset editor and
// the demo seed can share. Keep these in sync with the en values in lib/i18n.tsx.
const STEP_EN: Record<string, string> = {
  MAP_BAN: "Ban map",
  MAP_PICK: "Pick map (into pool)",
  CIV_BAN: "Ban civ",
  CIV_PICK: "Pick civ into pool",
  MAP_SELECT: "Select map",
  SYNC_CONFIRM: "Both players confirm to continue",
  CIV_OFFER: "Pick civ to field (simultaneous)",
  CIV_SNIPE_OPPONENT: "Snipe opponent (simultaneous)",
  GAME_RESULT: "Game result",
};

const ACTOR_SHORT_EN: Record<string, string> = {
  HOST_DRAW: "Random",
  PLAYER1: "P1",
  PLAYER2: "P2",
  LOSER: "Loser",
  WINNER: "Winner",
};

// The default label for a step. Simultaneous/result steps have no meaningful
// single actor, so they omit the actor prefix.
export function defaultStepLabel(s: Pick<Step, "type" | "actor">): string {
  const step = STEP_EN[s.type] ?? s.type;
  if (s.type === "CIV_OFFER" || s.type === "CIV_SNIPE_OPPONENT" || s.type === "GAME_RESULT" || s.type === "SYNC_CONFIRM") return step;
  return `${ACTOR_SHORT_EN[s.actor] ?? s.actor} · ${step}`;
}

// Returns a copy of a config with every step's label reset to the English default.
export function withEnglishStepLabels(config: PresetConfig): PresetConfig {
  return { ...config, steps: config.steps.map((s) => ({ ...s, label: defaultStepLabel(s) })) };
}
