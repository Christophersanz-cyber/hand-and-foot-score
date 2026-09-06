import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNewer, isStateMessage } from "./sync.ts";

describe("isNewer (last-write-wins version)", () => {
  it("prefers the newer timestamp", () => {
    assert.equal(isNewer({ ts: 2, cid: "a" }, { ts: 1, cid: "z" }), true);
    assert.equal(isNewer({ ts: 1, cid: "z" }, { ts: 2, cid: "a" }), false);
  });

  it("breaks a same-ms tie deterministically by client id", () => {
    assert.equal(isNewer({ ts: 5, cid: "b" }, { ts: 5, cid: "a" }), true);
    assert.equal(isNewer({ ts: 5, cid: "a" }, { ts: 5, cid: "b" }), false);
  });

  it("treats an identical version as not newer (no ping-pong)", () => {
    assert.equal(isNewer({ ts: 5, cid: "a" }, { ts: 5, cid: "a" }), false);
  });
});

describe("isStateMessage", () => {
  it("accepts a well-formed state message", () => {
    assert.equal(isStateMessage({ type: "state", cid: "abc", game: { id: "g" } }), true);
  });

  it("rejects anything else", () => {
    assert.equal(isStateMessage(null), false);
    assert.equal(isStateMessage({ type: "ping" }), false);
    assert.equal(isStateMessage({ type: "state", game: {} }), false);
    assert.equal(isStateMessage({ type: "state", cid: "x" }), false);
  });
});
