import { SiteHeader } from "@/components/SiteHeader";

// Instant skeleton shown while the account page resolves the session on the server.
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="aoe-panel space-y-4 rounded-xl p-7">
          <div className="skeleton mx-auto h-7 w-40" />
          <div className="aoe-rule my-2" />
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      </main>
    </>
  );
}
