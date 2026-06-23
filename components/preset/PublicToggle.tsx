"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

// Quick public/private switch for a preset the viewer owns.
export function PublicToggle({ presetId, initial }: { presetId: string; initial: boolean }) {
  const { t } = useI18n();
  const [isPublic, setIsPublic] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !isPublic;
    try {
      const res = await fetch(`/api/presets/${presetId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      if (res.ok) setIsPublic(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={t("presets.togglePublicHint")}
      className={`rounded border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
        isPublic ? "border-gold text-gold-bright" : "border-border text-muted hover:text-gold-bright"
      }`}
    >
      {isPublic ? t("common.public") : t("common.private")}
    </button>
  );
}
