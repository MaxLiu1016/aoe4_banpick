import "./env"; // MUST be first: loads .env.local before any module reads process.env
import { createServer } from "node:http";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { registerMatchHandlers } from "./lib/socket/matchHandlers";
import { seedInitialData } from "./lib/seed";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new SocketServer(httpServer, {
    cors: { origin: process.env.NEXT_PUBLIC_SOCKET_URL || true },
  });

  registerMatchHandlers(io);

  // Ensure the super-admin and demo presets exist (idempotent).
  seedInitialData().catch((e) => console.error("[seed] failed:", e));

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`> Ready on http://localhost:${port}  (dev=${dev})`);
  });
});
