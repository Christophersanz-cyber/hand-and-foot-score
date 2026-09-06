/**
 * Server binding for the `/api/rtc` signaling relay: pulls the shared `Sql`
 * accessor (Neon when DATABASE_URL is set, else the PGLite fallback) and adapts
 * the web `Request`/`Response` types the dev Vite middleware and the deployed
 * Nitro middleware both speak. The routing/SQL lives in ./signaling.ts.
 *
 * DB failure is contained here: if the accessor can't initialize (e.g. no
 * DATABASE_URL and PGLite's WASM isn't in the deploy bundle), handleRtcWithSql
 * returns a 503 instead of throwing, so the rest of the (DB-free) app keeps
 * serving and only multiplayer degrades. See handleRtcWithSql in ./signaling.ts.
 */
import { getSql, type Sql } from "../db";
import { handleRtcWithSql } from "./signaling";

// Once DB bootstrap fails we don't want every poll (multiple peers, sub-second
// cadence) to re-attempt an init that can't succeed — that would retry-storm.
// Cache the failure briefly, then let a later request re-probe so a DB that
// becomes reachable recovers on its own.
const FAILURE_COOLDOWN_MS = 5_000;
let lastFailureAt = 0;

/** getSql, but short-circuit to the cached failure during the cooldown. */
function resolveSql(): Promise<Sql> {
  if (lastFailureAt && Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS) {
    return Promise.reject(new Error("database unavailable (cooldown)"));
  }
  return getSql().catch((err) => {
    lastFailureAt = Date.now();
    throw err;
  });
}

export async function handleRtcRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const body = request.method.toUpperCase() === "POST" ? await request.text() : null;
  const { status, body: payload } = await handleRtcWithSql(resolveSql, {
    method: request.method,
    url,
    body,
  });
  if (status === 200) lastFailureAt = 0; // a healthy response clears the cooldown
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
