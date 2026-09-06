/**
 * Per-year card model.
 *
 * A YearCard is the player's legally-owned NMJL card for one calendar year,
 * plus a bundled demo card of generic example shapes. Official card text is
 * never shipped — users import or type in the hands they own.
 */

import type { HandPattern } from "../../lib/patterns";

/** Standard NMJL card section labels (granular enough to filter / group). */
export const CARD_SECTIONS = [
  { id: "year", name: "Year" },
  { id: "2468", name: "2468" },
  { id: "like-numbers", name: "Like Numbers" },
  { id: "quints", name: "Quints" },
  { id: "consecutive-run", name: "Consecutive Run" },
  { id: "13579", name: "13579" },
  { id: "winds-dragons", name: "Winds-Dragons" },
  { id: "369", name: "369" },
  { id: "singles-pairs", name: "Singles & Pairs" },
  { id: "addition", name: "Addition" },
  { id: "news", name: "NEWS" },
  { id: "other", name: "Other" },
] as const;

export type CardSectionId = (typeof CARD_SECTIONS)[number]["id"];

export const CARD_SECTION_IDS: CardSectionId[] = CARD_SECTIONS.map((s) => s.id);

export const CARD_SECTION_NAME: Record<CardSectionId, string> = Object.fromEntries(
  CARD_SECTIONS.map((s) => [s.id, s.name]),
) as Record<CardSectionId, string>;

/** A winning-hand entry on a year's card. */
export interface CardHand extends HandPattern {
  section: CardSectionId;
  concealed: boolean;
}

export type CardSource = "bundled" | "user";

export interface YearCard {
  /** Stable id: `bundled:2026` or `user:<uuid>`. */
  id: string;
  year: number;
  title: string;
  notes?: string;
  source: CardSource;
  hands: CardHand[];
  /** ISO timestamp; set for user-imported cards. */
  updatedAt?: string;
}

export function cardHands(card: YearCard): CardHand[] {
  return card.hands;
}

export function sectionsInCard(card: YearCard): CardSectionId[] {
  const seen = new Set<CardSectionId>();
  for (const hand of card.hands) seen.add(hand.section);
  return CARD_SECTION_IDS.filter((id) => seen.has(id));
}

export function handsInSection(card: YearCard, section: CardSectionId | "all"): CardHand[] {
  if (section === "all") return card.hands;
  return card.hands.filter((h) => h.section === section);
}
