/**
 * Card registry: bundled per-year cards + helpers to pick the latest / by id.
 * User-imported cards live in localStorage (see `src/lib/card-store.ts`) and
 * are merged at runtime — adding a year does not require a code change.
 */

import { CARD_2026 } from "./2026";
import type { YearCard } from "./types";

export const BUNDLED_CARDS: YearCard[] = [CARD_2026];

export function latestBundledCard(): YearCard {
  return BUNDLED_CARDS.reduce((best, card) => (card.year > best.year ? card : best));
}

export function bundledCardById(id: string): YearCard | undefined {
  return BUNDLED_CARDS.find((c) => c.id === id);
}

export function bundledCardByYear(year: number): YearCard | undefined {
  return BUNDLED_CARDS.find((c) => c.year === year);
}

/** Merge bundled + user cards. User cards with the same year sort first. */
export function mergeCards(userCards: YearCard[]): YearCard[] {
  const all = [...userCards, ...BUNDLED_CARDS];
  return all.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (a.source !== b.source) return a.source === "user" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** Default selection: newest year, preferring a user card for that year. */
export function defaultCard(userCards: YearCard[]): YearCard {
  const merged = mergeCards(userCards);
  return merged[0] ?? latestBundledCard();
}

export function findCard(id: string, userCards: YearCard[]): YearCard | undefined {
  return userCards.find((c) => c.id === id) ?? bundledCardById(id);
}

export { CARD_2026 };
export type { YearCard } from "./types";
export {
  CARD_SECTIONS,
  CARD_SECTION_IDS,
  CARD_SECTION_NAME,
  cardHands,
  handsInSection,
  sectionsInCard,
} from "./types";
export type { CardHand, CardSectionId, CardSource } from "./types";
