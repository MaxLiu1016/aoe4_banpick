import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { NewPresetButton } from "@/components/preset/NewPresetButton";
import { PresetBrowser } from "@/components/preset/PresetBrowser";
import { getCurrentUser } from "@/lib/session";
import { dbConnect } from "@/lib/mongoose";
import { Preset } from "@/lib/models/Preset";
import { toClientPreset } from "@/lib/presets";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** The first page of public formats, rendered on the server.
 *
 *  Signed out, this list IS the page — and until now it arrived by fetch, so every
 *  crawler saw a heading and a button. Signed in, the browser opens on "my presets"
 *  instead, and seeding it with public ones would only make the list flicker. */
async function publicFirstPage() {
  try {
    await dbConnect();
    const docs = await Preset.find({ isPublic: true }).sort({ isDemo: -1, demoOrder: 1, updatedAt: -1 }).limit(9).lean();
    const total = await Preset.countDocuments({ isPublic: true });
    return { items: docs.map((d) => toClientPreset(d as never)), total };
  } catch {
    // A database blip should cost the page its head start, not the whole page —
    // the browser still fetches the list itself.
    return undefined;
  }
}

export default async function PresetsPage() {
  const user = await getCurrentUser();
  const initial = user ? undefined : await publicFirstPage();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl aoe-gold-text"><T k="presets.title" /></h1>
            <p className="mt-1 text-sm text-muted"><T k="presets.subtitle" /></p>
          </div>
          {user ? (
            <NewPresetButton />
          ) : (
            <Link href="/login" className="aoe-btn rounded px-4 py-2 font-display">
              <T k="presets.signinCreate" />
            </Link>
          )}
        </div>
        <div className="aoe-rule my-5" />
        <PresetBrowser initial={initial} />
      </main>
    </>
  );
}
