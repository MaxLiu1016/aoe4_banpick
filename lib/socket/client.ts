"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/** Lazily-created singleton socket connected to the same origin (or NEXT_PUBLIC_SOCKET_URL). */
export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    socket = io(url, { autoConnect: true, transports: ["websocket", "polling"] });
  }
  return socket;
}
