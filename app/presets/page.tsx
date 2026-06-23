import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { NewPresetButton } from "@/components/preset/NewPresetButton";
import { ClonePresetButton } from "@/components/preset/ClonePresetButton";
import { PublicToggle } from "@/components/preset/PublicToggle";
import { StartMatchButton } from "@/components/match/StartMatchButton";
import { getCurrentUser } from "@/lib/session";
import { dbConnect } from "@/lib/mongoose";
import { Preset } from "@/lib/models/Preset";
import { toClientPreset, type ClientPreset } from "@/lib/presets";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

async function loadPresets(viewerId?: string): Promise<ClientPreset[]> {
  try {
    await dbConnect();
    const filter = viewerId
      ? { $or: [{ ownerId: viewerId }, { isPublic: true }] }
      : { isPublic: true };
    const docs = await Preset.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
    return docs.map((d) => toClientPreset(d as never, viewerId));
  } catch {
    return [];
  }
}

export default async function PresetsPage() {
  const user = await getCurrentUser();
  const presets = await loadPresets(user?.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl aoe-gold-text"><T k="presets.title" /></h1>
            <p className="mt-1 text-sm text-muted">
              <T k="presets.subtitle" />
            </p>
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

        {presets.length === 0 ? (
          <div className="aoe-panel rounded-lg p-8 text-center text-muted">
            <T k={user ? "presets.none" : "presets.noneSignin"} />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {presets.map((p) => (
              <li key={p.id} className="aoe-panel rounded-lg p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg aoe-gold-text">{p.name}</h2>
                    <p className="mt-1 text-xs text-muted">
                      Bo{p.config?.options?.bestOf ?? "?"} · <T k="presets.steps" vars={{ n: p.config?.steps?.length ?? 0 }} /> ·{" "}
                      {p.isPublic ? <T k="common.public" /> : <T k="common.private" />}
                      {p.isOwner ? <> · <T k="presets.yours" /></> : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <StartMatchButton presetId={p.id} />
                    {user && <ClonePresetButton presetId={p.id} />}
                    {p.isOwner && <PublicToggle presetId={p.id} initial={p.isPublic} />}
                    {p.isOwner && (
                      <Link href={`/presets/${p.id}/edit`} className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:text-gold-bright">
                        <T k="presets.edit" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
