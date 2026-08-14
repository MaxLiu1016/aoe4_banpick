import { isSimultaneousStep } from "@/lib/draft/schema";
import type { Step } from "@/lib/draft/schema";

/**
 * What a step is called, derived from what the step IS.
 *
 * This used to be a free-text field on every step: the editor generated an
 * English default, a human could overwrite it, and the result was frozen into
 * the preset and then into every match created from it. Three problems came out
 * of that, and they were not really separable.
 *
 * It could not be translated. Not "was not" — could not: by the time a Japanese
 * player opened the room, the string had been a literal for months. The board
 * showed a translated step name in its heading and the authored English in the
 * bar directly under it, on the same screen.
 *
 * It could drift from the step. Change a step's actor after typing a custom
 * label and the label kept saying P1 while the step now belonged to P2 — the
 * editor only auto-updated labels it recognised as its own.
 *
 * And it was never really one field. Two generators existed (`defaultStepLabel`
 * and a second, differently-worded set inside `buildDefaultConfig`), plus a
 * third abbreviated table in the editor's timeline, so the same step could be
 * called three things in one product.
 *
 * So the label is derived now, and nobody authors one. A step's name is a pure
 * function of its type, its actor, and whether it runs simultaneously — which
 * is all a name was ever trying to say.
 */

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function stepLabel(t: TFn, s: Pick<Step, "type" | "actor" | "simultaneous">): string {
  const name = t(`step.${s.type}`);
  // A result belongs to the game rather than to a seat, so it never takes a
  // prefix — its actor is only "whoever calls it first".
  if (s.type === "GAME_RESULT") return name;
  // A confirm gate reads two ways, and the difference is the entire point of
  // the step. Unnamed it asks everybody, and `step.SYNC_CONFIRM` already says
  // so. Named — "the winner acknowledges the map the loser just picked" — it
  // asks ONE seat, and calling that "both players confirm" told the other side
  // they were expected to press something they were never asked for.
  if (s.type === "SYNC_CONFIRM") {
    return isSimultaneousStep(s)
      ? name
      : t("step.byActor", { actor: t(`actorShort.${s.actor}`), step: t("step.SYNC_CONFIRM_one") });
  }
  // The bar has no checkbox to carry this, unlike the editor row, so here the
  // name has to say it.
  if (isSimultaneousStep(s)) return t("step.simul", { step: name });
  return t("step.byActor", { actor: t(`actorShort.${s.actor}`), step: name });
}
