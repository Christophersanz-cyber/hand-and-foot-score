/** Hand helpers: size limits and pure add/remove/sort operations. */

import { type Hand, type TileCode, TILE_CATALOG } from "./tiles";

export type { Hand };

/** A completed American Mahjong hand is 14 tiles. */
export const MAX_HAND_SIZE = 14;

const ORDER = new Map<TileCode, number>(TILE_CATALOG.map((t, i) => [t.code, i]));

/** Sort a hand into catalog order (bam → crack → dot → winds → dragons → flower → joker). */
export function sortHand(hand: Hand): Hand {
  return [...hand].sort((a, b) => (ORDER.get(a) ?? 99) - (ORDER.get(b) ?? 99));
}

/** Add a tile, keeping the hand sorted and capped at `MAX_HAND_SIZE`. */
export function addTile(hand: Hand, code: TileCode): Hand {
  if (hand.length >= MAX_HAND_SIZE) return hand;
  return sortHand([...hand, code]);
}

/** Remove the tile at `index`. */
export function removeAt(hand: Hand, index: number): Hand {
  return hand.filter((_, i) => i !== index);
}