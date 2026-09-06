/** Persist user-imported year cards in localStorage. */

import type { YearCard } from "../data/cards/types";

export const USER_CARDS_KEY = "mahjong-combos:user-cards:v1";
export const ACTIVE_CARD_KEY = "mahjong-combos:active-card:v1";

export function loadUserCards(): YearCard[] {
  try {
    const raw = localStorage.getItem(USER_CARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isYearCard);
  } catch {
    return [];
  }
}

export function saveUserCards(cards: YearCard[]): void {
  try {
    localStorage.setItem(USER_CARDS_KEY, JSON.stringify(cards));
  } catch {
    // private mode / quota — non-fatal
  }
}

export function loadActiveCardId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CARD_KEY);
  } catch {
    return null;
  }
}

export function saveActiveCardId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_CARD_KEY, id);
  } catch {
    // non-fatal
  }
}

export function upsertUserCard(cards: YearCard[], next: YearCard): YearCard[] {
  const idx = cards.findIndex((c) => c.id === next.id);
  if (idx === -1) return [...cards, next];
  const copy = [...cards];
  copy[idx] = next;
  return copy;
}

export function removeUserCard(cards: YearCard[], id: string): YearCard[] {
  return cards.filter((c) => c.id !== id);
}

function isYearCard(v: unknown): v is YearCard {
  if (typeof v !== "object" || v === null) return false;
  const c = v as YearCard;
  return (
    typeof c.id === "string" &&
    typeof c.year === "number" &&
    typeof c.title === "string" &&
    c.source === "user" &&
    Array.isArray(c.hands)
  );
}
