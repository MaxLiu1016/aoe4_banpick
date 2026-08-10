"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface Row {
  id: string;
  name: string;
  status: "lobby" | "running" | "paused" | "finished";
  /** Series is over. Computed from the score, so drafts that finished before the
   *  status was ever persisted still read correctly. */
  decided: boolean;
  /** Undecided and silent for long enough to call it walked-away-from. */
  stale: boolean;
  bestOf?: number;
  anonymous: boolean;
  // null in the global feed for drafts you had no part in.
  role: "player1" | "player2" | "host" | null;
  player1Name: string | null;
  player2Name: string | null;
  score: { player1: number; player2: number };
  updatedAt: string;
}

type Scope = "mine" | "global";

export function HistoryList({ loggedIn, presetId }: { loggedIn: boolean; presetId?: string }) {
  const { t, locale } = useI18n();
  // Signed out there is no "mine" to show, so open on the feed that has content.
  const [scope, setScope] = useState<Scope>(loggedIn ? "mine" : "global");
  // What's in the box vs. what's been asked for. Typing shouldn't fire a request
  // per keystroke, so the query trails the input by a beat.
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  // Results are stamped with the request they answer, so changing tab or query
  // shows the skeleton again by simply not matching — no clearing the state from
  // inside the effect, which would be a synchronous setState during render.
  const [data, setData] = useState<{ key: string; rows: Row[] } | null>(null);
  // Signed out, "my drafts" has nothing to fetch: the answer is a sign-in prompt.
  const needsFetch = loggedIn || scope === "global";
  const key = `${scope}|${q}|${presetId ?? ""}`;

  useEffect(() => {
    const id = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  useEffect(() => {
    if (!needsFetch) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (scope === "global") params.set("scope", "global");
    if (q) params.set("q", q);
    if (presetId) params.set("preset", presetId);
    fetch(`/api/matches?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled) setData({ key, rows: d as Row[] }); })
      .catch(() => { if (!cancelled) setData({ key, rows: [] }); });
    return () => { cancelled = true; };
  }, [key, scope, q, presetId, needsFetch]);

  const rows: Row[] | null = !needsFetch ? [] : data?.key === key ? data.rows : null;
  const filtering = Boolean(q || presetId);

  const fmt = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : locale === "en" ? "en-GB" : "zh-TW",
    { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const Tabs = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {(["mine", "global"] as Scope[]).map((s) => (
          <button key={s} onClick={() => setScope(s)}
            className={`rounded border px-3 py-1.5 text-sm transition ${
              scope === s ? "border-gold text-gold-bright" : "border-border text-muted hover:text-gold-bright"
            }`}>
            {t(`history.tab.${s}`)}
          </button>
        ))}
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={t("history.search")}
          className="ml-auto min-w-40 flex-1 rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-gold sm:max-w-64 sm:flex-none" />
      </div>
      {presetId && (
        <div className="mt-2">
          <Link href="/history"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold px-3 py-1 text-xs text-gold-bright hover:brightness-110">
            {/* Named from the results rather than looked up: a preset can be
                private, and its title is not this page's to hand out. */}
            {t("history.filteredBy", { name: rows?.[0]?.name || t("history.filteredPreset") })}
            <span className="text-muted">✕</span>
          </Link>
        </div>
      )}
      <p className="mt-2 mb-3 text-xs text-muted">
        {t(scope === "global" ? "history.subtitleGlobal" : "history.subtitle")}
      </p>
    </>
  );

  if (rows === null) {
    return <div>{Tabs}<div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 w-full rounded-lg" aria-hidden />)}</div></div>;
  }
  if (rows.length === 0) {
    return (
      <div>
        {Tabs}
        <p className="aoe-panel rounded-xl p-6 text-center text-sm text-muted">
          {scope === "mine" && !loggedIn
            ? <Link href="/login" className="text-gold-bright hover:underline">{t("nav.signin")}</Link>
            : filtering
            ? t("history.noneFiltered")
            : t(scope === "global" ? "history.noneGlobal" : "history.none")}
        </p>
      </div>
    );
  }

  return (
    <div>
    {Tabs}
    <ul className="space-y-2">
      {rows.map((m) => {
        const p1 = m.player1Name || t("match.p1");
        const p2 = m.player2Name || t("match.p2");
        // No won/lost caption: the score is right next to it, so the label only
        // has to say the draft is over.
        const decided = m.decided;
        return (
          <li key={m.id} className="aoe-panel flex items-center gap-4 rounded-xl px-4 py-3 transition hover:border-gold">
            {/* Spectating is the safe default for every row, so the row itself goes
                there. Taking your seat back is a different act and gets its own
                control — nested links are not legal HTML anyway. */}
            <Link href={`/watch/${m.id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base text-foreground">
                  {m.name || t("match.room")}
                  {m.anonymous && <span className="ml-2 text-xs text-muted">🕶</span>}
                </div>
                <div className="truncate text-xs text-muted">
                  <span className="text-p1">{p1}</span>
                  <span className="mx-1.5">vs</span>
                  <span className="text-p2">{p2}</span>
                  {m.bestOf ? <span className="ml-2">· Bo{m.bestOf}</span> : null}
                  {m.role && <span className="ml-2">· {t(`history.role.${m.role}`)}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-xl aoe-gold-text tabular-nums">
                  {m.score.player1} — {m.score.player2}
                </div>
                <div className="text-[11px] text-muted">
                  {decided
                    ? t("history.done")
                    : m.stale ? t("history.status.abandoned") : t(`history.status.${m.status}`)}
                </div>
              </div>
              <div className="hidden shrink-0 text-right text-[11px] text-muted sm:block">
                {fmt.format(new Date(m.updatedAt))}
              </div>
            </Link>
            {/* Only for a draft you were in that hasn't been decided: that is the
                one you might have been dropped from and need to get back into.
                Watching a room you are seated in leaves your seat empty. */}
            {m.role && !decided && (
              <Link href={`/match/${m.id}`}
                className="shrink-0 rounded border border-gold px-3 py-1.5 text-xs text-gold-bright hover:brightness-110">
                {t("history.rejoin")}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
    </div>
  );
}
