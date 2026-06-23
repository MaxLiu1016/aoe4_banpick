"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";

export function AccountForm({ initialName, email }: { initialName: string; email: string }) {
  const { t } = useI18n();
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed");
      }
      // Push the new name into the session immediately so the header updates.
      await update({ name: name.trim() });
      router.refresh();
      setMsg(t("account.saved"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aoe-panel rounded-xl p-7">
      <h1 className="font-display text-2xl aoe-gold-text text-center">{t("account.title")}</h1>
      <div className="aoe-rule my-4" />
      <form onSubmit={save} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">{t("account.username")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            required
            className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold"
          />
        </label>
        {email && (
          <label className="block opacity-60">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">Email</span>
            <input value={email} disabled className="w-full rounded border border-border bg-surface px-3 py-2 text-muted" />
          </label>
        )}
        <p className="text-xs text-muted">{t("account.hint")}</p>
        {err && <p className="text-sm text-danger">{err}</p>}
        {msg && <p className="text-sm text-gold-bright">{msg}</p>}
        <button type="submit" disabled={busy || !name.trim() || name.trim() === initialName}
          className="aoe-btn w-full rounded px-4 py-2.5 font-display disabled:opacity-50">
          {busy ? t("account.saving") : t("account.save")}
        </button>
      </form>
    </div>
  );
}
