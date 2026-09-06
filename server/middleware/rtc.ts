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
  // event.req is the web-standard Request (h3 v2 / Nitro v3); the handler reads
  // its URL + body itself, so pass it straight through.
  return handleRtcRequest(event.req);
}
