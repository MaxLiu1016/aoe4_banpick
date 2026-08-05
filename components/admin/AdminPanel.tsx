"use client";

import { useEffect, useState } from "react";
import { NumberInput } from "@/components/NumberInput";

type Code ={ code: string; used: boolean; note: string };

export function AdminPanel() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [count, setCount] = useState(5);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [justMade, setJustMade] = useState<string[]>([]);

  async function load() {
    const res = await fetch("/api/admin/invite-codes");
    if (res.ok) setCodes(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count, note }),
      });
      if (res.ok) {
        const j = await res.json();
        setJustMade(j.created);
        setNote("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  const unused = codes.filter((c) => !c.used);

  return (
    <div className="space-y-6">
      <section className="aoe-panel rounded-xl p-5">
        <h2 className="font-display text-lg aoe-gold-text">產生邀請碼 / Generate codes</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm text-muted">
            數量 / Count
            <NumberInput value={count} min={1} max={50} onChange={setCount}
              className="ml-2 w-20 rounded border border-border bg-surface-2 px-2 py-1 text-foreground" />
          </label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註 / note (optional)"
            className="min-w-40 flex-1 rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-gold" />
          <button onClick={generate} disabled={busy} className="aoe-btn rounded px-4 py-2 font-display disabled:opacity-50">
            {busy ? "…" : "產生"}
          </button>
        </div>
        {justMade.length > 0 && (
          <div className="mt-3 rounded border border-gold/50 bg-surface-2 p-3">
            <p className="text-xs text-muted">剛產生（複製給對方）/ Just created:</p>
            <div className="mt-1 flex flex-wrap gap-2 font-mono text-sm text-gold-bright">
              {justMade.map((c) => <span key={c} className="rounded bg-surface px-2 py-1">{c}</span>)}
            </div>
          </div>
        )}
      </section>

      <section className="aoe-panel rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg aoe-gold-text">所有邀請碼 / All codes</h2>
          <span className="text-xs text-muted">未使用 {unused.length} · 全部 {codes.length}</span>
        </div>
        <div className="aoe-rule my-3" />
        <ul className="space-y-1 font-mono text-sm">
          {codes.map((c) => (
            <li key={c.code} className="flex items-center justify-between gap-3 border-b border-border/40 py-1">
              <span className={c.used ? "text-muted line-through" : "text-gold-bright"}>{c.code}</span>
              <span className="flex items-center gap-3">
                {c.note && <span className="text-[11px] text-muted">{c.note}</span>}
                <span className={`text-[11px] ${c.used ? "text-danger" : "text-emerald-400"}`}>{c.used ? "已用" : "未用"}</span>
                {!c.used && (
                  <button onClick={() => navigator.clipboard?.writeText(c.code)} className="text-[11px] text-muted underline hover:text-gold-bright">複製</button>
                )}
              </span>
            </li>
          ))}
          {codes.length === 0 && <li className="py-2 text-muted">尚無邀請碼。</li>}
        </ul>
      </section>
    </div>
  );
}
