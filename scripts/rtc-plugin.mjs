/**
 * Dev/preview (Vite) half of the `/api/rtc` WebRTC signaling relay. The
 * deployed-app half lives in server/middleware/rtc.ts; both delegate to the
 * same handler in src/lib/multiplayer/signaling.server.ts.
 *
 * This version of TanStack Start (1.168) has no file-based server routes, so —
 * like scripts/app-env-plugin.mjs and the /auth/popup handler — the endpoint is
 * a plain connect middleware registered BEFORE TanStack Start's SSR handler so
 * `/api/rtc` never falls through to the SPA HTML fallback.
 */
export const RTC_ROUTE = "/api/rtc";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function rtcPlugin() {
  return {
    name: "app-builder:rtc-signaling",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ?? "";
        const pathOnly = rawUrl.split("?", 1)[0] ?? "";
        if (pathOnly !== RTC_ROUTE) {
          next();
          return;
        }
        void (async () => {
          try {
            const host = String(
              req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
            );
            const method = (req.method ?? "GET").toUpperCase();
            const body = method === "POST" ? await readBody(req) : null;
            const request = new Request(`http://${host}${rawUrl}`, {
              method,
              headers: { "content-type": "application/json" },
              ...(body != null ? { body } : {}),
            });

            const mod = await server.ssrLoadModule("/src/lib/multiplayer/signaling.server.ts");
            const response = await mod.handleRtcRequest(request);

            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            const payload = Buffer.from(await response.arrayBuffer());
            res.end(payload);
          } catch (err) {
            console.error("[app-builder] /api/rtc handler failed:", err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("content-type", "application/json; charset=utf-8");
            }
            res.end(JSON.stringify({ error: "signaling failed" }));
          }
        })();
      });
    },
  };
}
