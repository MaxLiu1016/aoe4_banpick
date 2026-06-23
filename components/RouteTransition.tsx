"use client";

import { usePathname } from "next/navigation";

/**
 * Replays the `.route-enter` animation on every client navigation by re-keying
 * the page subtree on pathname change. Sits inside SessionProvider/I18nProvider
 * (see app/providers.tsx) so context survives the remount — the header's session
 * stays resolved and does not flash on navigation.
 *
 * The flex classes preserve the body's column layout (header / flex-1 main / footer).
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-enter flex flex-1 flex-col">
      {children}
    </div>
  );
}
