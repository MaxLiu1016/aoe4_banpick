import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Thumb } from "@/components/Thumb";
import { StartMatchButton } from "@/components/match/StartMatchButton";
import { StepName } from "@/components/preset/StepName";
import { EntryName } from "@/components/EntryName";
import { T } from "@/lib/i18n";
import { getPublicPreset, presetSummary } from "@/lib/preset/publicPreset";
import { gameIndexOfSteps } from "@/lib/draft/engine";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const preset = await getPublicPreset(id);
  if (!preset) return { title: "Not found" };
  const title = preset.name;
  // The author's own words if they wrote any, otherwise the shape of the format —
  // which is what somebody searching for a draft format is actually after.
  const description = preset.description?.trim() || `${presetSummary(preset)}. Age of Empires IV ban/pick draft format.`;
  return {
    title,
    description,
    alternates: { canonical: `/presets/${preset.id}` },
    openGraph: { title: `${title} · AoE4 Ban/Pick`, description, type: "article" },
    twitter: { card: "summary", title: `${title} · AoE4 Ban/Pick`, description },
  };
}

/**
 * A draft format's own page.
 *
 * The reason it exists is that until now a format had no URL. The rules lived
 * inside an editor only its owner could open, so the one thing this site is for —
 * "here is the format we are playing" — could not be linked, shared, previewed in
 * Discord, or found by anyone searching for it.
 *
 * Rendered on the server, all of it. A page whose content arrives by fetch is a
 * page a crawler sees as empty, and this is the page that most needs not to be.
 */
export default async function PresetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const preset = await getPublicPreset(id);
  if (!preset) notFound();

  const c = preset.config;
  const gameOf = gameIndexOfSteps(c.steps);
  const games = c.steps.filter((s) => s.type === "GAME_RESULT").length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <header>
          <h1 className="font-display text-3xl aoe-gold-text">{preset.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {presetSummary(preset)}
            {preset.ownerName && !preset.isDemo ? <> · <T k="presets.by" vars={{ name: preset.ownerName }} /></> : null}
            {preset.isDemo ? <> · <T k="presets.demo" /></> : null}
          </p>
          {preset.description && <p className="mt-3 max-w-3xl text-foreground/85">{preset.description}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <StartMatchButton presetId={preset.id} />
            <Link href={`/history?preset=${preset.id}`}
              className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:text-gold-bright">
              <T k="presets.history" />
            </Link>
          </div>
        </header>

        <div className="aoe-rule my-7" />

        <section>
          <h2 className="font-display text-xl aoe-gold-text"><T k="preset.stepsTitle" /></h2>
          <ol className="mt-3 space-y-1.5">
            {c.steps.map((s, i) => (
              <li key={s.id} className="flex items-baseline gap-3 rounded border border-border/60 px-3 py-2 text-sm">
                <span className="w-6 shrink-0 text-right font-display text-muted">{i + 1}</span>
                <span className="flex-1 text-foreground"><StepName step={s} /></span>
                <span className="shrink-0 text-xs text-muted">
                  {games > 1 && <> <T k="match.gameN" vars={{ n: gameOf[i] + 1 }} /> · </>}
                  {s.count > 1 ? `×${s.count} · ` : ""}
                  {s.timeLimitSec > 0 ? `${s.timeLimitSec}s` : "∞"}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl aoe-gold-text">
            <T k="preset.civsTitle" vars={{ n: c.civs.length }} />
          </h2>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {c.civs.map((civ) => (
              <li key={civ.id} className="aoe-panel rounded-lg p-2 text-center">
                <Thumb src={civ.imageUrl} alt={civ.name} className="mx-auto aspect-square w-full object-contain" />
                <span className="mt-1 block truncate text-xs text-foreground"><EntryName kind="civ" id={civ.id} name={civ.name} /></span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl aoe-gold-text">
            <T k="preset.mapsTitle" vars={{ n: c.maps.length }} />
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {c.maps.map((m) => (
              <li key={m.id} className="aoe-panel overflow-hidden rounded-lg">
                <Thumb src={m.imageUrl} alt={m.name} className="aspect-[16/10] w-full object-cover" />
                <span className="block truncate px-2 py-1.5 text-xs text-foreground">{m.name}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
