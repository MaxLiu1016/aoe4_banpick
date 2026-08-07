import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MatchRoom } from "@/components/match/MatchRoom";
import { ConnectionBanner } from "@/components/match/ConnectionBanner";
import { T } from "@/lib/i18n";
import { getRoomMeta } from "@/lib/match/roomMeta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const room = await getRoomMeta(id);
  const name = room?.name ?? "Ban/Pick Match";
  const title = `${name} · AoE IV Ban/Pick`;
  const description =
    room?.description || `Live Age of Empires IV ban/pick draft room — ${name}${room?.bestOf ? ` (Bo${room.bestOf})` : ""}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
    // A draft room is over in twenty minutes; indexing one only competes with
    // the format pages that are meant to be found.
    robots: { index: false, follow: false },
  };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await getRoomMeta(id);
  return (
    <>
      <ConnectionBanner />
      <SiteHeader />
      {/* Room for the bottom of the draft to breathe — and for the panel the page
          scrolls to when your turn comes round to actually reach the top. */}
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-12 pt-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl aoe-gold-text">{room?.name ?? "Ban/Pick Match"}</h1>
            <p className="text-xs text-muted">
              <T k="match.room" />
              {room?.bestOf ? ` · Bo${room.bestOf}` : ""}
            </p>
          </div>
          <a href={`/watch/${id}`} className="shrink-0 text-xs text-muted hover:text-gold-bright" target="_blank" rel="noreferrer">
            <T k="match.spectatorLink" />
          </a>
        </div>
        <MatchRoom matchId={id} />
      </main>
    </>
  );
}
