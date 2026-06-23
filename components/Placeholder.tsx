import { SiteHeader } from "@/components/SiteHeader";

export function Placeholder({
  title,
  milestone,
  children,
}: {
  title: string;
  milestone: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="aoe-panel rounded-xl p-8">
          <span className="rounded-full border border-bronze px-3 py-1 text-xs text-gold-bright">
            {milestone}
          </span>
          <h1 className="mt-4 font-display text-3xl aoe-gold-text">{title}</h1>
          <div className="aoe-rule my-4" />
          <div className="text-muted">{children}</div>
        </div>
      </main>
    </>
  );
}
