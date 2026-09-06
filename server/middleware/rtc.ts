/**
 * Deployed-app (Nitro) half of the `/api/rtc` WebRTC signaling relay. Auto-
 * registered as global h3 middleware because vite.config.ts sets
 * `serverDir: "./server"` (same mechanism as grok-pwa.ts). The dev/preview half
 * is scripts/rtc-plugin.mjs; both delegate to the shared handler below.
 *
 * PRODUCTION NOTE: cross-device signaling needs a real DATABASE_URL (Neon). On
 * the PGLite fallback each serverless instance has its own in-memory DB, so two
 * phones may land on different instances and never see each other's signals.
 */
import { handleRtcRequest } from "../../src/lib/multiplayer/signaling.server.ts";

interface RtcEvent {
  url: URL;
  req: Request;
}

export default async function rtcMiddleware(
  event: RtcEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  if (event.url.pathname !== "/api/rtc") return next();

  const method = (event.req.method ?? "GET").toUpperCase();
  const body = method === "POST" ? await event.req.text() : null;
  const request = new Request(event.url.toString(), {
    method,
    headers: { "content-type": "application/json" },
    ...(body != null ? { body } : {}),
  });
  return handleRtcRequest(request);
}
