import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { HistoryList } from "@/components/history/HistoryList";
import { T } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Draft history · AoE IV Ban/Pick",
  description: "Every draft you played in or hosted.",
};

export default async function HistoryPage() {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-6">
        <h1 className="mb-4 font-display text-2xl aoe-gold-text"><T k="history.title" /></h1>
        {/* Rendered signed-out too: the worldwide feed needs no account, and a
            visitor who lands here should see that the site is being used rather
            than a login wall. */}
        <HistoryList loggedIn={!!user} />
      </main>
    </>
  );
}
