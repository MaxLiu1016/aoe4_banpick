"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import type { ClientPreset } from "@/lib/presets";
import { StartMatchButton } from "@/components/match/StartMatchButton";
import { ClonePresetButton } from "@/components/preset/ClonePresetButton";
import { PublicToggle } from "@/components/preset/PublicToggle";

const LIMIT = 9;

export function PresetBrowser() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const loggedIn = !!session?.user;

  const [scope, setScope] = useState<"mine" | "public">("public");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ClientPreset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Default to "mine" once we know the user is logged in.
  useEffect(() => { if (loggedIn) setScope("mine"); }, [loggedIn]);

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ scope, q: debouncedQ, page: String(page), limit: String(LIMIT) });
    fetch(`/api/presets?${params}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setItems(d.items ?? []); setTotal(d.total ?? 0); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope, debouncedQ, page]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border p-0.5">
          {loggedIn && (
            <button onClick={() => { setScope("mine"); setPage(1); }}
              className={`rounded px-3 py-1.5 text-sm transition ${scope === "mine" ? "bg-surface-2 text-gold-bright" : "text-muted hover:text-gold-bright"}`}>
              {t("presets.tabMine")}
            </button>
          )}
          <button onClick={() => { setScope("public"); setPage(1); }}
            className={`rounded px-3 py-1.5 text-sm transition ${scope === "public" ? "bg-surface-2 text-gold-bright" : "text-muted hover:text-gold-bright"}`}>
            {t("presets.tabPublic")}
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("presets.search")}
          className="min-w-0 flex-1 rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-gold"
        />
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="aoe-panel rounded-lg p-8 text-center text-muted">
          {loading ? "…" : t("presets.none2")}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <li key={p.id} className="aoe-panel flex flex-col rounded-lg p-5">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg aoe-gold-text">
                  {p.name}
                  {p.isDemo && (
                    <span className="ml-2 rounded-full border border-bronze px-2 py-0.5 align-middle text-[10px] text-bronze">{t("presets.demo")}</span>
                  )}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Bo{p.config?.options?.bestOf ?? "?"} · {t("presets.steps", { n: p.config?.steps?.length ?? 0 })} ·{" "}
                  {p.isPublic ? t("common.public") : t("common.private")}
                  {p.isOwner ? ` · ${t("presets.yours")}` : ""}
                </p>
                {p.description && (
                  <p className="mt-2 text-sm text-foreground/80">{p.description}</p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                <StartMatchButton presetId={p.id} />
                {loggedIn && <ClonePresetButton presetId={p.id} />}
                {p.isDemo ? (
                  <span className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm text-muted" title={t("presets.demoLockedHint")}>
                    🔒 {t("common.public")}
                  </span>
                ) : (
                  <>
                    {p.isOwner && <PublicToggle presetId={p.id} initial={p.isPublic} />}
                    {p.isOwner && (
                      <Link href={`/presets/${p.id}/edit`} className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:text-gold-bright">
                        {t("presets.edit")}
                      </Link>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded border border-border px-3 py-1.5 text-muted hover:text-gold-bright disabled:opacity-40">
            {t("presets.prev")}
          </button>
          <span className="text-muted">{t("presets.pageOf", { p: page, n: pages })}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
            className="rounded border border-border px-3 py-1.5 text-muted hover:text-gold-bright disabled:opacity-40">
            {t("presets.next")}
          </button>
        </div>
      )}
    </div>
  );
}
