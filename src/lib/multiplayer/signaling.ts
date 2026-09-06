/**
 * Backend logic for the WebRTC signaling relay the P2PRoom client (p2p.ts)
 * talks to at `/api/rtc`. Kept free of any framework/runtime binding — it takes
 * a `Sql` accessor and a parsed request, so it runs identically under the dev
 * Vite middleware, the deployed Nitro middleware, and unit tests (which hand it
 * a PGLite-backed `Sql`).
 *
 * Wire contract (must match p2p.ts exactly):
 *
 *   GET  /api/rtc?room&peer&name&since
 *     → registers/refreshes `peer` in the room roster and returns
 *       { peers: [{ id, name }], signals: [{ id, from, kind, payload }] }
 *       where `signals` are those addressed TO `peer` with id > `since`,
 *       oldest first. The first GET IS the join (it registers the peer).
 *
 *   POST /api/rtc  { op: "signal", room, from, to, kind, payload }
 *     → enqueues one offer/answer/ice signal from `from` to `to`.
 *
 *   POST /api/rtc  { op: "leave", room, peer }
 *     → removes `peer` from the roster (its pending signals go too).
 *
 * Every request opportunistically evicts stale rows, so the relay needs no
 * background job: peers unseen for PEER_TTL_SECONDS drop from the roster and
 * signals older than SIGNAL_TTL_SECONDS are discarded.
 */
import type { Sql } from "../db";

/** A roster peer is dropped this many seconds after its last poll. */
export const PEER_TTL_SECONDS = 20;
/** Undelivered signals are discarded this many seconds after creation. */
export const SIGNAL_TTL_SECONDS = 60;

export type SignalKind = "offer" | "answer" | "ice";

export interface RtcRequest {
  method: string;
  url: URL;
  /** Raw request body text (POST only). */
  body: string | null;
}

export interface RtcResponse {
  status: number;
  body: unknown;
}

interface PeerRow {
  id: string;
  name: string;
}

interface SignalRow {
  id: number;
  from: string;
  kind: SignalKind;
  payload: unknown;
}

const SIGNAL_KINDS = new Set<SignalKind>(["offer", "answer", "ice"]);

function json(status: number, body: unknown): RtcResponse {
  return { status, body };
}

/** Prune expired roster peers and undelivered signals (best-effort). */
async function cleanup(sql: Sql): Promise<void> {
  await sql.query(
    `delete from rtc_peers where last_seen < now() - ($1 || ' seconds')::interval`,
    [String(PEER_TTL_SECONDS)],
  );
  await sql.query(
    `delete from rtc_signals where created_at < now() - ($1 || ' seconds')::interval`,
    [String(SIGNAL_TTL_SECONDS)],
  );
}

async function handleGet(sql: Sql, url: URL): Promise<RtcResponse> {
  const room = url.searchParams.get("room");
  const peer = url.searchParams.get("peer");
  if (!room || !peer) {
    return json(400, { error: "room and peer are required" });
  }
  const name = url.searchParams.get("name") ?? "";
  const since = Number(url.searchParams.get("since") ?? "0");
  const sinceId = Number.isFinite(since) && since > 0 ? Math.floor(since) : 0;

  await cleanup(sql);

  // The poll IS the heartbeat: (re)register the peer and bump its last_seen.
  await sql.query(
    `insert into rtc_peers (room, id, name, last_seen)
       values ($1, $2, $3, now())
     on conflict (room, id)
       do update set name = excluded.name, last_seen = now()`,
    [room, peer, name.slice(0, 64)],
  );

  const peers = await sql.query<PeerRow>(
    `select id, name from rtc_peers where room = $1 order by id`,
    [room],
  );

  const signals = await sql.query<SignalRow>(
    `select id, from_peer as "from", kind, payload
       from rtc_signals
      where room = $1 and to_peer = $2 and id > $3
      order by id asc`,
    [room, peer, sinceId],
  );

  return json(200, { peers, signals });
}

async function handlePost(sql: Sql, body: string | null): Promise<RtcResponse> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body ?? "") as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid JSON body" });
  }

  const op = parsed.op;
  const room = typeof parsed.room === "string" ? parsed.room : null;
  if (!room) return json(400, { error: "room is required" });

  if (op === "leave") {
    const peer = typeof parsed.peer === "string" ? parsed.peer : null;
    if (!peer) return json(400, { error: "peer is required" });
    await sql.query(`delete from rtc_peers where room = $1 and id = $2`, [room, peer]);
    await sql.query(
      `delete from rtc_signals where room = $1 and (from_peer = $2 or to_peer = $2)`,
      [room, peer],
    );
    return json(200, { ok: true });
  }

  if (op === "signal") {
    const from = typeof parsed.from === "string" ? parsed.from : null;
    const to = typeof parsed.to === "string" ? parsed.to : null;
    const kind = parsed.kind as SignalKind;
    if (!from || !to) return json(400, { error: "from and to are required" });
    if (!SIGNAL_KINDS.has(kind)) return json(400, { error: "invalid signal kind" });
    await sql.query(
      `insert into rtc_signals (room, from_peer, to_peer, kind, payload)
         values ($1, $2, $3, $4, $5::jsonb)`,
      [room, from, to, kind, JSON.stringify(parsed.payload ?? null)],
    );
    return json(200, { ok: true });
  }

  return json(400, { error: "unknown op" });
}

/** Route one parsed `/api/rtc` request to the matching handler. */
export async function handleRtc(sql: Sql, req: RtcRequest): Promise<RtcResponse> {
  const method = req.method.toUpperCase();
  if (method === "GET") return handleGet(sql, req.url);
  if (method === "POST") return handlePost(sql, req.body);
  return json(405, { error: "method not allowed" });
}
