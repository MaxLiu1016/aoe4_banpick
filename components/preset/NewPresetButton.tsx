"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export function NewPresetButton() {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bestOf: 5 }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        alert(t("presets.limitReached"));
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to create preset");
      const preset = await res.json();
      router.push(`/presets/${preset.id}/edit`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button onClick={create} disabled={busy} className="aoe-btn rounded px-4 py-2 font-display disabled:opacity-50">
      {busy ? t("presets.forging") : t("presets.new")}
    </button>
  );
}
