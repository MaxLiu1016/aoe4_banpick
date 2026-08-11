import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Where a crash in somebody's browser comes to be written down.
 *
 * A render that throws on the client used to leave no trace anywhere: the server
 * log stayed clean, the player saw a blank fallback, and the only report we ever
 * got was "she crashed a lot of times". This endpoint is the difference between
 * that sentence and a stack trace.
 *
 * Deliberately unauthenticated. The people most likely to hit a crash are guests
 * mid-draft, and a report that needs a session is a report we do not get. What
 * stops it being a way to write into our logs at will is the size cap and the
 * per-IP window below — the same in-memory shape `app/api/matches/route.ts` uses,
 * and the same reasoning: one custom-server process, and losing the counters on
 * restart costs one extra window.
 *
 * Nothing identifying goes in the body by design. A match id, a role and a step
 * are enough to find the draft and replay it; a name would only be the one thing
 * we would have to redact before pasting a log into a bug report.
 */
const Body = z.object({
  message: z.string().max(500),
  stack: z.string().max(4000).optional(),
  /** Where in the app it happened — a route, or a component boundary's name. */
  where: z.string().max(120).optional(),
  matchId: z.string().max(64).optional(),
  /** "player1" | "player2" | "spectator" — no name, ever. */
  role: z.string().max(16).optional(),
  /** The draft step in progress, which is usually the whole answer. */
  step: z.string().max(64).optional(),
  /** Next's error digest, which is how a server-rendered error is correlated. */
  digest: z.string().max(64).optional(),
  userAgent: z.string().max(300).optional(),
});

const REPORTS_PER_MINUTE = 20;
const byIp = new Map<string, number[]>();

function rateLimited(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const cutoff = Date.now() - 60 * 1000;
  const recent = (byIp.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= REPORTS_PER_MINUTE) { byIp.set(ip, recent); return true; }
  recent.push(Date.now());
  byIp.set(ip, recent);
  return false;
}

export async function POST(req: Request) {
  // 204 on every path, including the failures. The caller is a page that is
  // already broken; there is nothing useful it could do with an error from the
  // thing that reports errors, and a rejected report must never become a second
  // crash on top of the first.
  try {
    if (rateLimited(req)) return new NextResponse(null, { status: 204 });
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return new NextResponse(null, { status: 204 });
    const b = parsed.data;
    // One line, because that is what is greppable in a hosting dashboard.
    console.error(
      `[client-error] ${b.where ?? "?"} | match=${b.matchId ?? "-"} role=${b.role ?? "-"} step=${b.step ?? "-"}` +
        `${b.digest ? ` digest=${b.digest}` : ""} | ${b.message}` +
        `${b.userAgent ? `\n  ua: ${b.userAgent}` : ""}` +
        `${b.stack ? `\n${b.stack}` : ""}`
    );
  } catch { /* reporting must not throw */ }
  return new NextResponse(null, { status: 204 });
}
