"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface Row {
  id: string;
  name: string;
  status: "lobby" | "running" | "paused" | "finished";
  bestOf?: number;
  anonymous: boolean;
  role: "player1" | "player2" | "host";
  player1Name: string | null;
  player2Name: string | null;
  score: { player1: number; player2: number };
  updatedAt: string;
}

export function HistoryList() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/matches")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled) setRows(d as Row[]); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, []);

  if (rows === null) {
    return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 w-full rounded-lg" aria-hidden />)}</div>;
  }
  if (rows.length === 0) {
    return <p className="aoe-panel rounded-xl p-6 text-center text-sm text-muted">{t("history.none")}</p>;
  }

  const fmt = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : locale === "en" ? "en-GB" : "zh-TW",
    { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <ul className="space-y-2">
      {rows.map((m) => {
        const p1 = m.player1Name || t("match.p1");
        const p2 = m.player2Name || t("match.p2");
        const decided = m.status === "finished";
        const youWon = decided && (
          (m.role === "player1" && m.score.player1 > m.score.player2) ||
          (m.role === "player2" && m.score.player2 > m.score.player1)
        );
        const youLost = decided && m.role !== "host" && !youWon && m.score.player1 !== m.score.player2;
        return (
          <li key={m.id}>
            <Link href={`/watch/${m.id}`}
              className="aoe-panel flex items-center gap-4 rounded-xl px-4 py-3 transition hover:border-gold">
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base text-foreground">
                  {m.name || t("match.room")}
                  {m.anonymous && <span className="ml-2 text-xs text-muted">🕶</span>}
                </div>
                <div className="truncate text-xs text-muted">
                  <span className="text-sky-400">{p1}</span>
                  <span className="mx-1.5">vs</span>
                  <span className="text-rose-400">{p2}</span>
                  {m.bestOf ? <span className="ml-2">· Bo{m.bestOf}</span> : null}
                  <span className="ml-2">· {t(`history.role.${m.role}`)}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-xl aoe-gold-text tabular-nums">
                  {m.score.player1} — {m.score.player2}
                </div>
                <div className="text-[11px] text-muted">
                  {decided
                    ? (m.role === "host" ? t("history.done") : youWon ? t("history.won") : youLost ? t("history.lost") : t("history.done"))
                    : t(`history.status.${m.status}`)}
                </div>
              </div>
              <div className="hidden shrink-0 text-right text-[11px] text-muted sm:block">
                {fmt.format(new Date(m.updatedAt))}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
