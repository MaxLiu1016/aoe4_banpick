"use client";

import { useI18n } from "@/lib/i18n";
import { stepLabel } from "@/lib/draft/stepLabel";
import type { Step } from "@/lib/draft/schema";

/**
 * A step's name, for server components that only need this one translated thing.
 *
 * The preset page is a server component and `stepLabel` needs the reader's
 * locale, which lives in a client context — so the boundary is drawn as tightly
 * as it can be: one span, not a client-rendered step list.
 */
export function StepName({ step }: { step: Pick<Step, "type" | "actor" | "simultaneous"> }) {
  const { t } = useI18n();
  return <>{stepLabel(t, step)}</>;
}
