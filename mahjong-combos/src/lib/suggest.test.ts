import { describe, expect, it } from "vitest";

import { EXAMPLE_HANDS } from "../data/hands";
import { CARD_2026 } from "../data/cards/2026";
import { expandPattern, patternTileCount } from "./patterns";
import { scorePattern, suggest } from "./suggest";
import { type Hand, dragonTile, suitTile, windTile, JOKER } from "./tiles";

const byId = (id: string) => {
  const p = EXAMPLE_HANDS.find((h) => h.id === id);
  if (!p) throw new Error(`missing pattern ${id}`);
  return p;
};

describe("hand data integrity", () => {
  it("every example hand totals exactly 14 tiles", () => {
    for (const pattern of EXAMPLE_HANDS) {
      expect(patternTileCount(pattern)).toBe(14);
    }
  });

  it("every binding expands to a 14-slot concrete hand", () => {
    for (const pattern of EXAMPLE_HANDS) {
      const concretes = expandPattern(pattern);
      expect(concretes.length).toBeGreaterThan(0);
      for (const c of concretes) {
        expect(c.slots).toHaveLength(14);
      }
    }
  });

  it("has unique pattern ids", () => {
    const ids = EXAMPLE_HANDS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("bundled 2026 card exposes NMJL-style sections", () => {
    const sections = new Set(CARD_2026.hands.map((h) => h.section));
    expect(sections.has("like-numbers")).toBe(true);
    expect(sections.has("quints")).toBe(true);
    expect(sections.has("consecutive-run")).toBe(true);
    expect(sections.has("singles-pairs")).toBe(true);
  });
});

describe("scoring", () => {
  it("an empty hand matches nothing", () => {
    const result = scorePattern([], byId("four-winds-dragon-pair"));
    expect(result.matched).toBe(0);
    expect(result.tilesNeeded).toBe(14);
    expect(result.eligible).toBe(true);
  });

  it("a completed hand scores 14 with nothing needed", () => {
    const hand: Hand = [
      windTile("north"),
      windTile("north"),
      windTile("north"),
      windTile("east"),
      windTile("east"),
      windTile("east"),
      windTile("west"),
      windTile("west"),
      windTile("west"),
      windTile("south"),
      windTile("south"),
      windTile("south"),
      dragonTile("red"),
      dragonTile("red"),
    ];
    const result = scorePattern(hand, byId("four-winds-dragon-pair"));
    expect(result.matched).toBe(14);
    expect(result.tilesNeeded).toBe(0);
    expect(result.needed).toHaveLength(0);
  });

  it("a hand one tile away ranks that pattern first", () => {
    const hand: Hand = [
      windTile("north"),
      windTile("north"),
      windTile("north"),
      windTile("east"),
      windTile("east"),
      windTile("east"),
      windTile("west"),
      windTile("west"),
      windTile("west"),
      windTile("south"),
      windTile("south"),
      windTile("south"),
      dragonTile("red"),
    ];
    const ranked = suggest(hand, EXAMPLE_HANDS);
    expect(ranked[0].pattern.id).toBe("four-winds-dragon-pair");
    expect(ranked[0].result.matched).toBe(13);
    expect(ranked[0].result.tilesNeeded).toBe(1);
    expect(ranked[0].result.needed).toEqual([dragonTile("red")]);
  });

  it("a joker completes a jokerable pung", () => {
    const b = (n: number) => suitTile(n, "bam");
    const hand: Hand = [
      b(1),
      b(1),
      JOKER,
      b(2),
      b(2),
      b(2),
      b(3),
      b(3),
      b(3),
      b(4),
      b(4),
      b(4),
      b(5),
      b(5),
    ];
    const result = scorePattern(hand, byId("consecutive-pungs"));
    expect(result.realMatches).toBe(13);
    expect(result.jokersUsed).toBe(1);
    expect(result.matched).toBe(14);
    expect(result.tilesNeeded).toBe(0);
  });

  it("a joker cannot complete a pair", () => {
    const b = (n: number) => suitTile(n, "bam");
    const hand: Hand = [b(1), b(1), b(2), b(2), b(3), b(3), b(4), b(4), b(5), b(5), b(6), b(6), b(7), JOKER];
    const result = scorePattern(hand, byId("seven-consecutive-pairs"));
    expect(result.jokersUsed).toBe(0);
    expect(result.matched).toBe(13);
    expect(result.needed).toEqual([b(7)]);
  });

  it("a joker can complete a quint", () => {
    const b = (n: number) => suitTile(n, "bam");
    const c = (n: number) => suitTile(n, "crack");
    const d = (n: number) => suitTile(n, "dot");
    // Like quints of 5: quint bam + quint crack + pair dot + pair flowers, one joker in a quint.
    const hand: Hand = [
      b(5),
      b(5),
      b(5),
      b(5),
      JOKER,
      c(5),
      c(5),
      c(5),
      c(5),
      c(5),
      d(5),
      d(5),
      "F",
      "F",
    ];
    const result = scorePattern(hand, byId("like-quints-pairs"));
    expect(result.jokersUsed).toBe(1);
    expect(result.matched).toBe(14);
    expect(result.tilesNeeded).toBe(0);
  });

  it("concealed hands become ineligible once any tile is exposed", () => {
    const b = (n: number) => suitTile(n, "bam");
    const hand: Hand = [b(1), b(1), b(2), b(2), b(3), b(3), b(4), b(4), b(5), b(5), b(6), b(6), b(7), b(7)];
    const open = scorePattern(hand, byId("seven-consecutive-pairs"));
    expect(open.eligible).toBe(true);
    expect(open.matched).toBe(14);

    const blocked = scorePattern(hand, byId("seven-consecutive-pairs"), { exposures: [b(1)] });
    expect(blocked.concealedConflict).toBe(true);
    expect(blocked.eligible).toBe(false);
    expect(blocked.matched).toBe(14);
  });

  it("ineligible concealed hands rank after eligible ones", () => {
    const hand: Hand = [
      windTile("north"),
      windTile("north"),
      windTile("north"),
      windTile("east"),
      windTile("east"),
      windTile("east"),
      windTile("west"),
      windTile("west"),
      windTile("west"),
      windTile("south"),
      windTile("south"),
      windTile("south"),
      dragonTile("red"),
      dragonTile("red"),
    ];
    const ranked = suggest(hand, EXAMPLE_HANDS, undefined, { exposures: [windTile("north")] });
    expect(ranked[0].pattern.id).toBe("four-winds-dragon-pair");
    expect(ranked[0].result.eligible).toBe(true);
    const concealed = ranked.find((s) => s.pattern.id === "seven-consecutive-pairs");
    expect(concealed?.result.eligible).toBe(false);
    const lastEligible = ranked.filter((s) => s.result.eligible).at(-1);
    const firstIneligible = ranked.find((s) => !s.result.eligible);
    if (lastEligible && firstIneligible) {
      expect(ranked.indexOf(lastEligible)).toBeLessThan(ranked.indexOf(firstIneligible));
    }
  });

  it("wall odds report remaining copies of needed tiles", () => {
    const hand: Hand = [
      windTile("north"),
      windTile("north"),
      windTile("north"),
      windTile("east"),
      windTile("east"),
      windTile("east"),
      windTile("west"),
      windTile("west"),
      windTile("west"),
      windTile("south"),
      windTile("south"),
      windTile("south"),
      dragonTile("red"),
    ];
    const result = scorePattern(hand, byId("four-winds-dragon-pair"), {
      discards: [dragonTile("red"), dragonTile("red"), dragonTile("red")],
      useWallOdds: true,
    });
    expect(result.needed).toEqual([dragonTile("red")]);
    expect(result.neededRemaining).toEqual([0]);
    expect(result.nextDrawOdds).toBe(0);
  });

  it("suggest respects the limit and sorts by closeness", () => {
    const hand: Hand = [dragonTile("red"), dragonTile("red"), dragonTile("green")];
    const ranked = suggest(hand, EXAMPLE_HANDS, 3);
    expect(ranked).toHaveLength(3);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].result.matched).toBeGreaterThanOrEqual(ranked[i].result.matched);
    }
  });
});
