/**
 * Data-driven hand pattern schema + expansion.
 *
 * A `HandPattern` is an abstract, parameterised description of a 14-tile winning
 * hand. Patterns use *variables* so a single entry can represent "the same shape
 * in any suit / starting at any number":
 *
 *   - Suit variables (S1, S2, S3) are bound to distinct concrete suits.
 *   - A single number variable `N` (when `usesNumberVar` is true) is bound to a
 *     base number; blocks add a fixed `offset` to it.
 *
 * The engine `expandPattern` enumerates every legal binding and produces the set
 * of concrete 14-tile "target hands" the pattern can become. Scoring then picks
 * the binding closest to the player's tiles.
 *
 * This schema is intentionally generic so that the (copyrighted) yearly NMJL card
 * is NOT reproduced here — see `src/data/cards`.
 */

import {
  type Dragon,
  type Suit,
  type TileCode,
  type Wind,
  SUITS,
  SUIT_DRAGON,
  dragonTile,
  suitTile,
  windTile,
} from "./tiles";

export type SuitVar = "S1" | "S2" | "S3";
export const SUIT_VARS: SuitVar[] = ["S1", "S2", "S3"];

/** Describes which tile fills a block. Resolved against a variable binding. */
export type TileSpec =
  /** A numbered suit tile. Number = base + offset (base is 0 when not using the var). */
  | { kind: "num"; suit: SuitVar; offset: number }
  | { kind: "wind"; wind: Wind }
  | { kind: "dragon"; dragon: Dragon }
  /** The dragon paired with a suit variable (Bam→Green, Crack→Red, Dot→White). */
  | { kind: "dragonOfSuit"; suit: SuitVar }
  | { kind: "flower" };

/** Group size: 1 = single, 2 = pair, 3 = pung, 4 = kong, 5 = quint. */
export type BlockCount = 1 | 2 | 3 | 4 | 5;

/** A block is `count` copies of the same tile. */
export interface Block {
  count: BlockCount;
  spec: TileSpec;
  /**
   * Whether a Joker may substitute for a missing tile in this block.
   * NMJL rule of thumb: Jokers are allowed in groups of 3+ (pungs/kongs/quints)
   * but NEVER in singles or pairs. Flowers also cannot be jokered.
   */
  jokerable: boolean;
}

export interface HandPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  /** How many distinct suit variables the pattern binds (0–3). */
  suitVarCount: 0 | 1 | 2 | 3;
  /** Whether the pattern uses the number variable `N` (enumerated 1..9). */
  usesNumberVar: boolean;
  blocks: Block[];
  /**
   * When true, the hand must be played concealed (no exposures).
   * NMJL cards mark these with a "C" / Concealed. If the player already has
   * an exposure, the pattern is ineligible.
   */
  concealed?: boolean;
  /** Optional point value from the player's card (informational). */
  value?: number;
}

/** A slot is one required tile in a concrete (fully-bound) target hand. */
export interface Slot {
  tile: TileCode;
  jokerable: boolean;
}

export interface ConcreteHand {
  /** The 14 required tiles, expanded from the pattern. */
  slots: Slot[];
  /** Human-readable binding, e.g. "S1=bam, S2=dot, N=3". */
  binding: string;
}

// --- Small builder helpers so `hands.ts` reads like structured data. --------

export const num = (suit: SuitVar, offset: number): TileSpec => ({ kind: "num", suit, offset });
export const wind = (w: Wind): TileSpec => ({ kind: "wind", wind: w });
export const dragon = (d: Dragon): TileSpec => ({ kind: "dragon", dragon: d });
export const dragonOfSuit = (suit: SuitVar): TileSpec => ({ kind: "dragonOfSuit", suit });
export const flower = (): TileSpec => ({ kind: "flower" });

/** Default jokerability from NMJL: groups of 3+ except flowers. */
export function defaultJokerable(count: BlockCount, spec: TileSpec): boolean {
  return count >= 3 && spec.kind !== "flower";
}

/** Generic block builder for cases where the joker rule needs to be explicit. */
export const group = (count: BlockCount, spec: TileSpec, jokerable: boolean): Block => ({
  count,
  spec,
  jokerable,
});

const block = group;

/** Jokers allowed for groups of 3+ (pung/kong/quint). */
export const pung = (spec: TileSpec): Block => block(3, spec, true);
export const kong = (spec: TileSpec): Block => block(4, spec, true);
export const quint = (spec: TileSpec): Block => block(5, spec, true);
/** Jokers NOT allowed for pairs / singles per NMJL. */
export const pair = (spec: TileSpec): Block => block(2, spec, false);
export const single = (spec: TileSpec): Block => block(1, spec, false);

// --- Binding + expansion ----------------------------------------------------

interface Binding {
  suits: Partial<Record<SuitVar, Suit>>;
  base: number;
}

/** All injective assignments of `k` distinct suits to the first `k` suit vars. */
function suitBindings(k: number): Partial<Record<SuitVar, Suit>>[] {
  if (k === 0) return [{}];
  const results: Partial<Record<SuitVar, Suit>>[] = [];
  const pick = (idx: number, used: Suit[], acc: Partial<Record<SuitVar, Suit>>) => {
    if (idx === k) {
      results.push({ ...acc });
      return;
    }
    for (const s of SUITS) {
      if (used.includes(s)) continue;
      acc[SUIT_VARS[idx]] = s;
      pick(idx + 1, [...used, s], acc);
      delete acc[SUIT_VARS[idx]];
    }
  };
  pick(0, [], {});
  return results;
}

function resolveTile(spec: TileSpec, binding: Binding): TileCode | null {
  switch (spec.kind) {
    case "num": {
      const suit = binding.suits[spec.suit];
      if (!suit) return null;
      const n = binding.base + spec.offset;
      if (n < 1 || n > 9) return null;
      return suitTile(n, suit);
    }
    case "wind":
      return windTile(spec.wind);
    case "dragon":
      return dragonTile(spec.dragon);
    case "dragonOfSuit": {
      const suit = binding.suits[spec.suit];
      if (!suit) return null;
      return dragonTile(SUIT_DRAGON[suit]);
    }
    case "flower":
      return "F";
  }
}

function bindingLabel(pattern: HandPattern, binding: Binding): string {
  const parts: string[] = [];
  for (let i = 0; i < pattern.suitVarCount; i++) {
    const v = SUIT_VARS[i];
    parts.push(`${v}=${binding.suits[v]}`);
  }
  if (pattern.usesNumberVar) parts.push(`N=${binding.base}`);
  return parts.join(", ") || "fixed";
}

/**
 * Expand a pattern into every legal concrete 14-tile target hand.
 * Bindings that push a number out of 1..9 are discarded.
 */
export function expandPattern(pattern: HandPattern): ConcreteHand[] {
  const suitOptions = suitBindings(pattern.suitVarCount);
  const baseOptions = pattern.usesNumberVar ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [0];

  const hands: ConcreteHand[] = [];
  for (const suits of suitOptions) {
    for (const base of baseOptions) {
      const binding: Binding = { suits, base };
      const slots: Slot[] = [];
      let valid = true;
      for (const b of pattern.blocks) {
        const tile = resolveTile(b.spec, binding);
        if (tile === null) {
          valid = false;
          break;
        }
        for (let c = 0; c < b.count; c++) {
          slots.push({ tile, jokerable: b.jokerable });
        }
      }
      if (valid) {
        hands.push({ slots, binding: bindingLabel(pattern, binding) });
      }
    }
  }
  return hands;
}

/** Total tiles a pattern requires (must be 14 for a legal mahjong hand). */
export function patternTileCount(pattern: HandPattern): number {
  return pattern.blocks.reduce((sum, b) => sum + b.count, 0);
}