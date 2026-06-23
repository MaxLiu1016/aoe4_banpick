"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

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
        const msg = Array.isArray(j.issues) && j.issues.length ? j.issues.join("\n") : j.error ?? "Failed to start match";
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
    <button onClick={start} disabled={busy} className="aoe-btn rounded px-3 py-1.5 text-sm disabled:opacity-50">
      {busy ? "…" : t("presets.start")}
    </button>
  );
}
