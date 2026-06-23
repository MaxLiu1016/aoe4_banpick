import { SiteHeader } from "@/components/SiteHeader";

// Instant skeleton shown while the (force-dynamic) presets page loads on the server.
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="skeleton h-8 w-48" />
            <div className="skeleton h-4 w-64" />
          </div>
          <div className="skeleton h-10 w-32" />
        </div>
        <div className="aoe-rule my-5" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="aoe-panel rounded-lg p-5">
              <div className="skeleton h-6 w-40" />
              <div className="skeleton mt-2 h-3 w-52" />
              <div className="mt-6 flex gap-2 border-t border-border/60 pt-4">
                <div className="skeleton h-8 w-20" />
                <div className="skeleton h-8 w-20" />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
