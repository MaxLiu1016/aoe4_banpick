import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/session";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { INVITE_ONLY_REGISTRATION } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // The only admin surface today is invite-code management; hide it while the
  // invite system is disabled.
  if (!INVITE_ONLY_REGISTRATION) redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl aoe-gold-text">Admin · Invite Codes</h1>
        <div className="aoe-rule my-5" />
        <AdminPanel />
      </main>
    </>
  );
}
