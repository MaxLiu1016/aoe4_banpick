"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/lib/i18n";
import { RouteTransition } from "@/components/RouteTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // refetchOnWindowFocus: switching back to the tab no longer re-fetches the
    // session, which avoided a re-render storm that re-triggered the match socket
    // effect and flashed the civ-pop animation on the flags.
    <SessionProvider refetchOnWindowFocus={false}>
      <I18nProvider>
        <RouteTransition>{children}</RouteTransition>
      </I18nProvider>
    </SessionProvider>
  );
}
