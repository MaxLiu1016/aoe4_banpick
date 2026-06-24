import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MatchRoom } from "@/components/match/MatchRoom";
import { T } from "@/lib/i18n";
import { getRoomMeta } from "@/lib/match/roomMeta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const room = await getRoomMeta(id);
  const name = room?.name ?? "Ban/Pick Match";
  const title = `Watch: ${name} · AoE IV Ban/Pick`;
  const description =
    room?.description || `Spectate this live Age of Empires IV ban/pick draft — ${name}${room?.bestOf ? ` (Bo${room.bestOf})` : ""}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await getRoomMeta(id);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="font-display text-2xl aoe-gold-text">{room?.name ?? "Ban/Pick Match"}</h1>
              <p className="text-xs text-muted">
                <T k="match.spectating" />
                {room?.bestOf ? ` · Bo${room.bestOf}` : ""}
              </p>
            </div>
            <span className="rounded-full border border-bronze px-2 py-0.5 text-xs text-gold-bright">LIVE</span>
          </div>
        </div>
        <MatchRoom matchId={id} spectator />
      </main>
    </>
  );
}
