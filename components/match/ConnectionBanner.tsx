"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket/client";
import { useI18n } from "@/lib/i18n";

/**
 * Thin top bar shown whenever the realtime socket drops, so a disconnected user
 * gets immediate visual feedback (the client auto-reconnects and re-joins). Shares
 * the singleton socket with MatchRoom; renders nothing until the first successful
 * connect so it never flashes during initial page load.
 */
export function ConnectionBanner() {
  const { t } = useI18n();
  const [online, setOnline] = useState(true);
  const [everConnected, setEverConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (socket.connected) { setOnline(true); setEverConnected(true); }
    const onConnect = () => { setOnline(true); setEverConnected(true); };
    const onDisconnect = () => setOnline(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  if (online || !everConnected) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-600/60 bg-amber-900/90 px-4 py-1.5 text-sm text-amber-100 shadow-lg backdrop-blur"
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-300" aria-hidden />
      {t("match.reconnecting")}
    </div>
  );
}
