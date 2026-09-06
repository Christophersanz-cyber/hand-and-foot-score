import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRoomId } from "./invite.ts";

describe("parseRoomId", () => {
  it("reads the join param from a full invite link", () => {
    assert.equal(
      parseRoomId("https://example.com/?join=abc-123"),
      "abc-123",
    );
  });

  it("reads join from a link with other params", () => {
    assert.equal(parseRoomId("https://x.app/?foo=1&join=room9&bar=2"), "room9");
  });

  it("accepts a bare code", () => {
    assert.equal(parseRoomId("  room-xyz  "), "room-xyz");
  });

  it("returns null for empty input", () => {
    assert.equal(parseRoomId("   "), null);
  });
});
