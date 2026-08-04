import type { Metadata } from "next";
import Link from "next/link";
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
        <h1 className="font-display text-2xl aoe-gold-text"><T k="history.title" /></h1>
        <p className="mb-5 text-xs text-muted"><T k="history.subtitle" /></p>
        {user ? (
          <HistoryList />
        ) : (
          <p className="aoe-panel rounded-xl p-6 text-center text-sm text-muted">
            <Link href="/login" className="text-gold-bright hover:underline"><T k="nav.signin" /></Link>
          </p>
        )}
      </main>
    </>
  );
}
