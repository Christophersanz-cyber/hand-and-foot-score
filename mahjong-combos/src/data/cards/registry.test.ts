import { describe, expect, it } from "vitest";

import { BUNDLED_CARDS, defaultCard, latestBundledCard, mergeCards } from "./index";
import type { YearCard } from "./types";

describe("card registry", () => {
  it("defaults to the latest bundled year when no user cards exist", () => {
    const card = defaultCard([]);
    expect(card.source).toBe("bundled");
    expect(card.year).toBe(latestBundledCard().year);
    expect(BUNDLED_CARDS.length).toBeGreaterThan(0);
  });

  it("prefers a user card of the newest year over the bundled demo", () => {
    const user: YearCard = {
      id: "user:test",
      year: latestBundledCard().year,
      title: "My card",
      source: "user",
      hands: latestBundledCard().hands,
    };
    const merged = mergeCards([user]);
    expect(merged[0].id).toBe("user:test");
    expect(defaultCard([user]).id).toBe("user:test");
  });
});
