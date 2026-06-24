"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

// Toggles a favorite (a reference to someone else's public preset). Favoriting
// adds it to the viewer's "My rules" list; it disappears if the author deletes it.
export function FavoriteButton({ presetId, initial }: { presetId: string; initial: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !fav;
    try {
      const res = await fetch(`/api/presets/${presetId}/favorite`, { method: next ? "POST" : "DELETE" });
      if (res.status === 401) { router.push("/login"); return; }
      if (res.ok) {
        setFav(next);
        router.refresh(); // so it shows/hides in the "My rules" list
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={fav ? t("presets.unfavorite") : t("presets.favorite")}
      className={`inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
        fav ? "border-gold text-gold-bright" : "border-border text-muted hover:text-gold-bright"
      }`}
    >
      {fav ? "★" : "☆"} {fav ? t("presets.favorited") : t("presets.favorite")}
    </button>
  );
}
