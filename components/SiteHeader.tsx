"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useI18n, LanguageToggle } from "@/lib/i18n";

export function SiteHeader() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const user = session?.user;

  return (
    <header className="border-b border-border/80 bg-surface/60 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-xl aoe-gold-text">
          AoE<span className="text-foreground">IV</span> · Ban/Pick
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <LanguageToggle />
          <Link href="/presets" className="text-muted hover:text-gold-bright transition">
            {t("nav.presets")}
          </Link>
          {(user as { isAdmin?: boolean } | undefined)?.isAdmin && (
            <Link href="/admin" className="text-bronze hover:text-gold-bright transition">Admin</Link>
          )}
          {status === "loading" ? (
            <span className="skeleton h-8 w-36" aria-hidden />
          ) : user ? (
            <span className="fade-in inline-flex items-center gap-4">
              <Link href="/account" className="text-gold-bright hover:underline" title={t("account.title")}>
                {user.name ?? t("nav.commander")}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="aoe-btn rounded px-3 py-1.5 text-sm"
              >
                {t("nav.signout")}
              </button>
            </span>
          ) : (
            <Link href="/login" className="fade-in aoe-btn rounded px-3 py-1.5 text-sm">
              {t("nav.signin")}
            </Link>
          )}
        </nav>
      </div>
      <div className="aoe-rule" />
    </header>
  );
}
