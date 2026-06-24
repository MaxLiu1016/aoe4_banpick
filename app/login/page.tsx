"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { INVITE_ONLY_REGISTRATION } from "@/lib/features";

export default function LoginPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [form, setForm] = useState({ username: "", email: "", password: "", inviteCode: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        if (form.password.length < 8) throw new Error(t("login.passwordTooShort"));
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? t("login.failed"));
        }
      }
      const res = await signIn("credentials", {
        email: form.username,
        password: form.password,
        redirect: false,
      });
      if (res?.error) throw new Error(t("login.invalid"));
      window.location.href = "/presets";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="aoe-panel rounded-xl p-7">
          <h1 className="font-display text-2xl aoe-gold-text text-center">
            {mode === "signin" ? t("login.enter") : t("login.forge")}
          </h1>
          <div className="aoe-rule my-4" />

          <form onSubmit={onSubmit} className="space-y-3">
            <Field label={t("login.account")} value={form.username} onChange={set("username")} />
            <Field label={t("login.password")} type="password" value={form.password} onChange={set("password")} />
            {mode === "register" && <p className="text-xs text-muted">{t("login.passwordHint")}</p>}
            {mode === "register" && INVITE_ONLY_REGISTRATION && (
              <>
                <Field label={t("login.inviteCode")} value={form.inviteCode} onChange={set("inviteCode")} />
                <p className="text-xs text-muted">{t("login.inviteHint")}</p>
              </>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="aoe-btn w-full rounded px-4 py-2.5 font-display disabled:opacity-50"
            >
              {busy ? "…" : mode === "signin" ? t("login.signin") : t("login.create")}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            {mode === "signin" ? t("login.noBanner") : t("login.enlisted")}
            <button
              className="text-gold-bright hover:underline"
              onClick={() => {
                setMode((m) => (m === "signin" ? "register" : "signin"));
                setError(null);
              }}
            >
              {mode === "signin" ? t("login.register") : t("login.signin")}
            </button>
          </p>
        </div>
      </main>
    </>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required
        className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold"
      />
    </label>
  );
}
