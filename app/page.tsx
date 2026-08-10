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
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/presets" className="aoe-btn rounded px-7 py-3 text-lg font-display">
              {t("home.createDraft")}
            </Link>
          </div>
        </section>

        {/* What the site does. Four cards rather than three because the product
            grew two things the old copy had no room for — the formats that ship
            ready to run, and the broadcast page — and neither belongs folded into
            a sentence about something else. Two by two, so none of them is thin. */}
        <section className="mt-20 grid gap-6 sm:grid-cols-2">
          {[
            { t: "home.f1t", d: "home.f1d" },
            { t: "home.f2t", d: "home.f2d" },
            { t: "home.f3t", d: "home.f3d" },
            { t: "home.f4t", d: "home.f4d" },
          ].map((f) => (
            <div key={f.t} className="aoe-panel rounded-xl p-6">
              <h2 className="font-display text-lg aoe-gold-text">{t(f.t)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">{t(f.d)}</p>
            </div>
          ))}
        </section>

        {/* Civ roster — quiet, decorative band */}
        <section className="mt-24">
          <h2 className="text-center font-display text-sm uppercase tracking-[0.3em] text-muted">
            {t("home.roster")} · {t("home.civs", { n: CIVS.length })}
          </h2>
          <div className="aoe-rule mb-6 mt-4" />
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
