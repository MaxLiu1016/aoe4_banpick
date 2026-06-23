"use client";

import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";
import { CIVS } from "@/data/civs";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t } = useI18n();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-20">
        {/* Hero */}
        <section className="text-center">
          <p className="font-display text-xs tracking-[0.35em] text-bronze uppercase">
            {t("home.kicker")}
          </p>
          <h1 className="mt-4 text-5xl sm:text-6xl aoe-gold-text font-display">
            {t("home.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted">
            {t("home.subtitle")}
          </p>
          <div className="mt-9 flex justify-center">
            <Link href="/presets" className="aoe-btn rounded px-7 py-3 text-lg font-display">
              {t("home.createDraft")}
            </Link>
          </div>
        </section>

        {/* Civ roster — quiet, decorative band */}
        <section className="mt-24">
          <div className="aoe-rule mb-6" />
          <div className="grid grid-cols-6 gap-3 sm:grid-cols-12">
            {CIVS.map((c) => (
              <div key={c.id} className="group flex items-center justify-center" title={c.name}>
                {c.imageUrl ? (
                  <Image
                    src={c.imageUrl}
                    alt={c.name}
                    width={48}
                    height={48}
                    className="h-11 w-11 object-contain opacity-60 transition group-hover:scale-125 group-hover:opacity-100"
                    unoptimized
                  />
                ) : (
                  <div className="h-11 w-11 rounded bg-surface-2" />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted">
        {t("home.footer")}
      </footer>
    </>
  );
}
