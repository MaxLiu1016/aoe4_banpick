import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { NewPresetButton } from "@/components/preset/NewPresetButton";
import { PresetBrowser } from "@/components/preset/PresetBrowser";
import { getCurrentUser } from "@/lib/session";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PresetsPage() {
  const user = await getCurrentUser();

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
        <PresetBrowser />
      </main>
    </>
  );
}
