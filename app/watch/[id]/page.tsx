import type { Metadata } from "next";
import { ConnectionBanner } from "@/components/match/ConnectionBanner";
import { SpectatorStage } from "@/components/match/spectator/SpectatorStage";
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

/**
 * The spectator page. Deliberately has no site chrome: it is a picture to point a
 * stream or a projector at, and a nav bar in the corner of a broadcast is someone
 * else's UI on your screen. Everything a viewer needs is inside the board.
 *
 * The connection banner does stay — an operator has to be able to tell a frozen
 * board from a quiet one.
 */
export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await getRoomMeta(id);
  return (
    <>
      <ConnectionBanner />
      <SpectatorStage matchId={id} roomName={room?.name ?? "Ban/Pick Match"} />
    </>
  );
}
