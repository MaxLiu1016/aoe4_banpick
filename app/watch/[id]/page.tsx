import { SiteHeader } from "@/components/SiteHeader";
import { MatchRoom } from "@/components/match/MatchRoom";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="font-display text-2xl aoe-gold-text"><T k="match.spectating" /></h1>
          <span className="rounded-full border border-bronze px-2 py-0.5 text-xs text-gold-bright">LIVE</span>
        </div>
        <MatchRoom matchId={id} spectator />
      </main>
    </>
  );
}
