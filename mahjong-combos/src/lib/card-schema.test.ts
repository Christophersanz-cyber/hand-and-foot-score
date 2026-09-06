import { describe, expect, it } from "vitest";

import { CARD_2026 } from "../data/cards/2026";
import { parseYearCard, serializeYearCard } from "./card-schema";

const sample = {
  year: 2027,
  title: "My 2027 card",
  hands: [
    {
      id: "wd-1",
      name: "Four Winds & Dragon Pair",
      section: "winds-dragons",
      concealed: false,
      suitVarCount: 0,
      usesNumberVar: false,
      blocks: [
        { count: 3, spec: { kind: "wind", wind: "north" } },
        { count: 3, spec: { kind: "wind", wind: "east" } },
        { count: 3, spec: { kind: "wind", wind: "west" } },
        { count: 3, spec: { kind: "wind", wind: "south" } },
        { count: 2, spec: { kind: "dragon", dragon: "red" } },
      ],
    },
  ],
};

describe("parseYearCard", () => {
  it("accepts a well-formed year card and defaults jokerable", () => {
    const result = parseYearCard(sample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.year).toBe(2027);
    expect(result.card.source).toBe("user");
    expect(result.card.hands).toHaveLength(1);
    expect(result.card.hands[0].blocks[0].jokerable).toBe(true);
    expect(result.card.hands[0].blocks[4].jokerable).toBe(false);
  });

  it("accepts a JSON string", () => {
    const result = parseYearCard(JSON.stringify(sample));
    expect(result.ok).toBe(true);
  });

  it("rejects a jokerable pair", () => {
    const bad = {
      year: 2026,
      hands: [
        {
          name: "Bad pair",
          suitVarCount: 0,
          usesNumberVar: false,
          blocks: [
            { count: 2, spec: { kind: "dragon", dragon: "red" }, jokerable: true },
            { count: 4, spec: { kind: "wind", wind: "north" } },
            { count: 4, spec: { kind: "wind", wind: "east" } },
            { count: 4, spec: { kind: "wind", wind: "west" } },
          ],
        },
      ],
    };
    const result = parseYearCard(bad);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.message.includes("Jokers"))).toBe(true);
  });

  it("rejects hands that do not total 14 tiles", () => {
    const result = parseYearCard({
      year: 2026,
      hands: [
        {
          name: "Short",
          suitVarCount: 0,
          usesNumberVar: false,
          blocks: [{ count: 3, spec: { kind: "wind", wind: "north" } }],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.message.includes("14"))).toBe(true);
  });

  it("round-trips the bundled demo card", () => {
    const json = serializeYearCard(CARD_2026);
    const result = parseYearCard(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.hands).toHaveLength(CARD_2026.hands.length);
    expect(result.card.year).toBe(2026);
  });
});
