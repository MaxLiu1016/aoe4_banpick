/**
 * Send a crash home.
 *
 * `sendBeacon` first, on purpose: this is called from an error boundary, which
 * means the tree it belongs to has just been torn down and the user's next move
 * is usually a reload. A normal `fetch` is cancelled when the page goes away —
 * exactly the reports we most want are the ones most likely to be lost. A beacon
 * is handed to the browser and survives the navigation.
 *
 * Never throws, never awaits anything the caller has to handle. A failure to
 * report a crash must not become a second crash.
 */
export type ClientErrorReport = {
  message: string;
  stack?: string;
  where?: string;
  matchId?: string;
  role?: string;
  step?: string;
  digest?: string;
};

export function reportClientError(r: ClientErrorReport): void {
  try {
    if (typeof window === "undefined") return;
    const body = JSON.stringify({
      ...r,
      message: String(r.message ?? "").slice(0, 500),
      stack: r.stack?.slice(0, 4000),
      userAgent: navigator.userAgent?.slice(0, 300),
    });
    const url = "/api/client-error";
    if (navigator.sendBeacon) {
      // text/plain rather than application/json: a JSON beacon is a CORS
      // preflight in some browsers, and a preflight is another thing that can
      // fail while the page is dying. Same-origin and the route parses the body
      // itself, so the content type buys nothing.
      navigator.sendBeacon(url, new Blob([body], { type: "text/plain;charset=UTF-8" }));
      return;
    }
    void fetch(url, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } })
      .catch(() => {});
  } catch { /* reporting must not throw */ }
}
