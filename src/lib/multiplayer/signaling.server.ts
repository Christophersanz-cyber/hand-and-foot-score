/**
 * Server binding for the `/api/rtc` signaling relay: pulls the shared `Sql`
 * accessor (Neon when DATABASE_URL is set, else the PGLite fallback) and adapts
 * the web `Request`/`Response` types the dev Vite middleware and the deployed
 * Nitro middleware both speak. The routing/SQL lives in ./signaling.ts.
 */
import { getSql } from "../db";
import { handleRtc } from "./signaling";

export async function handleRtcRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const body = request.method.toUpperCase() === "POST" ? await request.text() : null;
  const sql = await getSql();
  const { status, body: payload } = await handleRtc(sql, {
    method: request.method,
    url,
    body,
  });
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
