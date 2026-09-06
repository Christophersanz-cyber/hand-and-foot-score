import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { handleRtc, type RtcRequest } from "./signaling.ts";
import type { Sql } from "../db.ts";

/**
 * Exercises the /api/rtc relay against a real embedded Postgres (PGLite) — the
 * same backend the local dev fallback uses — so the SQL, JSON round-tripping,
 * and the p2p.ts wire contract are all covered without a running server.
 */

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(here, "..", "..", "..", "migrations", "0002_rtc.sql");

function get(room: string, peer: string, name = "", since = 0): RtcRequest {
  const url = new URL("http://test/api/rtc");
  url.searchParams.set("room", room);
  url.searchParams.set("peer", peer);
  url.searchParams.set("name", name);
  url.searchParams.set("since", String(since));
  return { method: "GET", url, body: null };
}

function post(body: unknown): RtcRequest {
  return { method: "POST", url: new URL("http://test/api/rtc"), body: JSON.stringify(body) };
}

describe("rtc signaling relay", () => {
  let pg: PGlite;
  let sql: Sql;

  before(async () => {
    // Match src/lib/db.ts: int8 (incl. bigserial id) -> number, not BigInt.
    pg = new PGlite({ parsers: { 20: Number } });
    await pg.waitReady;
    await pg.exec(readFileSync(MIGRATION, "utf8"));
    sql = {
      query: async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows,
    } as Sql;
  });

  after(async () => {
    await pg.close();
  });

  it("registers a peer on GET and returns the roster", async () => {
    const res = await handleRtc(sql, get("r1", "alice", "Alice"));
    assert.equal(res.status, 200);
    const body = res.body as { peers: { id: string; name: string }[]; signals: unknown[] };
    assert.deepEqual(body.peers, [{ id: "alice", name: "Alice" }]);
    assert.deepEqual(body.signals, []);
  });

  it("shows both peers to each side once both have polled", async () => {
    await handleRtc(sql, get("r1", "bob", "Bob"));
    const res = await handleRtc(sql, get("r1", "alice", "Alice"));
    const body = res.body as { peers: { id: string }[] };
    assert.deepEqual(
      body.peers.map((p) => p.id).sort(),
      ["alice", "bob"],
    );
  });

  it("delivers a signal only to its target, with a numeric id and parsed payload", async () => {
    const payload = { sdp: "v=0", type: "offer" };
    const posted = await handleRtc(sql, post({
      op: "signal",
      room: "r1",
      from: "alice",
      to: "bob",
      kind: "offer",
      payload,
    }));
    assert.deepEqual(posted.body, { ok: true });

    // Alice (the sender) must not receive her own signal.
    const alice = (await handleRtc(sql, get("r1", "alice"))).body as { signals: unknown[] };
    assert.equal(alice.signals.length, 0);

    const bob = (await handleRtc(sql, get("r1", "bob"))).body as {
      signals: { id: number; from: string; kind: string; payload: unknown }[];
    };
    assert.equal(bob.signals.length, 1);
    assert.equal(typeof bob.signals[0].id, "number");
    assert.equal(bob.signals[0].from, "alice");
    assert.equal(bob.signals[0].kind, "offer");
    assert.deepEqual(bob.signals[0].payload, payload);
  });

  it("filters already-seen signals via `since`", async () => {
    const first = (await handleRtc(sql, get("r1", "bob"))).body as {
      signals: { id: number }[];
    };
    const lastId = first.signals.at(-1)?.id ?? 0;
    const again = (await handleRtc(sql, get("r1", "bob", "", lastId))).body as {
      signals: unknown[];
    };
    assert.equal(again.signals.length, 0);
  });

  it("drops a peer and its signals on leave", async () => {
    await handleRtc(sql, post({ op: "leave", room: "r1", peer: "alice" }));
    const res = (await handleRtc(sql, get("r1", "bob"))).body as { peers: { id: string }[] };
    assert.ok(!res.peers.some((p) => p.id === "alice"));
  });

  it("rejects bad input", async () => {
    const invalidJson: RtcRequest = {
      method: "POST",
      url: new URL("http://test/api/rtc"),
      body: "not json",
    };
    assert.equal((await handleRtc(sql, invalidJson)).status, 400);

    const missingParams: RtcRequest = {
      method: "GET",
      url: new URL("http://test/api/rtc?room=x"),
      body: null,
    };
    assert.equal((await handleRtc(sql, missingParams)).status, 400);

    assert.equal(
      (await handleRtc(sql, post({ op: "signal", room: "r", from: "a", to: "b", kind: "bogus" })))
        .status,
      400,
    );
    assert.equal((await handleRtc(sql, post({ op: "wat", room: "r" }))).status, 400);

    const badMethod: RtcRequest = {
      method: "DELETE",
      url: new URL("http://test/api/rtc"),
      body: null,
    };
    assert.equal((await handleRtc(sql, badMethod)).status, 405);
  });
});
