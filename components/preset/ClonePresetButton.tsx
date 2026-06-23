"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

// Clones a preset (owned or public) into a new one owned by the current user,
// then opens it in the editor.
export function ClonePresetButton({ presetId, className }: { presetId: string; className?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function clone() {
    setBusy(true);
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fromId: presetId }),
      });
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) throw new Error("clone failed");
      const p = await res.json();
      router.push(`/presets/${p.id}/edit`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={clone}
      disabled={busy}
      className={className ?? "rounded border border-border px-3 py-1.5 text-sm text-muted hover:text-gold-bright disabled:opacity-50"}
    >
      {busy ? t("presets.cloning") : t("presets.clone")}
    </button>
  );
}
