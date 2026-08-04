"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import type { PresetIssue } from "@/lib/draft/validate";

export function StartMatchButton({ presetId }: { presetId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId }),
      });
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // The API ships validation issues as { code, params } so they can be read
        // in the viewer's own language rather than always in English.
        const issues: PresetIssue[] = Array.isArray(j.issues) ? j.issues : [];
        const msg = issues.length
          ? issues.map((p) => t(`validate.${p.code}`, p.params)).join("\n")
          : j.error ?? t("presets.startFailed");
        alert(msg);
        setBusy(false);
        return;
      }
      const m = await res.json();
      router.push(`/match/${m.id}`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button onClick={start} disabled={busy} className="aoe-btn inline-flex items-center justify-center gap-2 rounded px-3 py-1.5 text-sm disabled:opacity-50">
      {busy ? <span className="spinner" aria-label={t("presets.start")} /> : t("presets.start")}
    </button>
  );
}
