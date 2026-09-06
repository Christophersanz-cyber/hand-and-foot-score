/**
 * American Mahjong wall composition and remaining-tile estimates.
 *
 * NMJL deck (152 tiles):
 *   4 of each suit tile (1–9 × 3 suits = 108)
 *   4 of each wind (16) and dragon (12)
 *   8 flowers, 8 jokers
 *
 * Probability here is a simple next-draw / remaining estimate from tiles the
 * player has marked as seen (hand + discards). It is not a full Charleston or
 * opponent-hand model.
 */

import { FLOWER, JOKER, type TileCode, TILE_CATALOG, isFlower, isJoker, tileMeta } from "./tiles";

export const DECK_SIZE = 152;
export const JOKER_COUNT = 8;
export const FLOWER_COUNT = 8;
export const STANDARD_COPY_COUNT = 4;

export function deckMax(code: TileCode): number {
  if (isJoker(code)) return JOKER_COUNT;
  if (isFlower(code)) return FLOWER_COUNT;
  if (tileMeta(code)) return STANDARD_COPY_COUNT;
  return 0;
}

/** Remaining copies of each catalog tile after `seen` tiles are removed. */
export function remainingByTile(seen: TileCode[]): Map<TileCode, number> {
  const remaining = new Map<TileCode, number>();
  for (const t of TILE_CATALOG) remaining.set(t.code, deckMax(t.code));
  for (const code of seen) {
    const left = remaining.get(code);
    if (left === undefined) continue;
    remaining.set(code, Math.max(0, left - 1));
  }
  return remaining;
}

export function remainingOf(code: TileCode, seen: TileCode[]): number {
  return remainingByTile(seen).get(code) ?? 0;
}

export function wallSize(seen: TileCode[]): number {
  return Math.max(0, DECK_SIZE - seen.length);
}

/**
 * Approximate chance the next unseen tile is one of `needed` (with replacement
 * ignored — one-draw from the remaining wall). Duplicate needed tiles are
 * counted separately against remaining copies.
 */
export function nextDrawOdds(needed: TileCode[], seen: TileCode[]): number {
  const wall = wallSize(seen);
  if (wall === 0 || needed.length === 0) return 0;
  const remaining = remainingByTile(seen);
  const used = new Map<TileCode, number>();
  let hits = 0;
  for (const code of needed) {
    const already = used.get(code) ?? 0;
    const left = remaining.get(code) ?? 0;
    if (already < left) {
      hits += 1;
      used.set(code, already + 1);
    }
  }
  return hits / wall;
}

export { FLOWER, JOKER };
