import { SiteHeader } from "@/components/SiteHeader";

// Instant skeleton shown while a match room loads after "Start match".
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="aoe-panel space-y-4 rounded-lg p-6">
          <div className="skeleton h-5 w-1/3" />
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </div>
          <div className="skeleton h-32 w-full" />
        </div>
      </main>
    </>
  );
}
