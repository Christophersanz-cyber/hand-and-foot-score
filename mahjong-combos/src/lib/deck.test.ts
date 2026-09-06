import { describe, expect, it } from "vitest";

import { DECK_SIZE, deckMax, nextDrawOdds, remainingOf, wallSize } from "./deck";
import { JOKER, dragonTile, suitTile } from "./tiles";

describe("deck remaining", () => {
  it("uses NMJL copy counts", () => {
    expect(deckMax(suitTile(5, "bam"))).toBe(4);
    expect(deckMax(dragonTile("red"))).toBe(4);
    expect(deckMax(JOKER)).toBe(8);
    expect(deckMax("F")).toBe(8);
  });

  it("subtracts seen tiles from the wall", () => {
    const seen = [suitTile(5, "bam"), suitTile(5, "bam"), JOKER];
    expect(remainingOf(suitTile(5, "bam"), seen)).toBe(2);
    expect(remainingOf(JOKER, seen)).toBe(7);
    expect(wallSize(seen)).toBe(DECK_SIZE - 3);
  });

  it("next-draw odds are remaining-needed over wall size", () => {
    const seen = [dragonTile("red"), dragonTile("red"), dragonTile("red")];
    const odds = nextDrawOdds([dragonTile("red")], seen);
    expect(odds).toBeCloseTo(1 / (DECK_SIZE - 3));
    expect(nextDrawOdds([dragonTile("red")], [...seen, dragonTile("red")])).toBe(0);
  });
});
