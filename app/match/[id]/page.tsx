import { SiteHeader } from "@/components/SiteHeader";
import { MatchRoom } from "@/components/match/MatchRoom";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-2xl aoe-gold-text"><T k="match.room" /></h1>
          <a href={`/watch/${id}`} className="text-xs text-muted hover:text-gold-bright" target="_blank" rel="noreferrer">
            <T k="match.spectatorLink" />
          </a>
        </div>
        <MatchRoom matchId={id} />
      </main>
    </>
  );
}
