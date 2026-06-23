"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/lib/i18n";
import { RouteTransition } from "@/components/RouteTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <RouteTransition>{children}</RouteTransition>
      </I18nProvider>
    </SessionProvider>
  );
}
