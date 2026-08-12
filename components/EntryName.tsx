"use client";

import { useI18n, localName } from "@/lib/i18n";

/**
 * A civ or map name, for server components that need this one translated thing.
 *
 * `localName` needs the reader's locale, which lives in a client context. The
 * preset page is otherwise a server component and there is no reason to give
 * that up over a list of names, so the boundary is one span wide.
 */
export function EntryName({ kind, id, name }: { kind: "civ" | "map"; id: string; name: string }) {
  const { t } = useI18n();
  return <>{localName(t, kind, id, name)}</>;
}
