/**
 * Tile model for American Mahjong (NMJL-style).
 *
 * A tile is represented by a compact string `TileCode` so hands can be stored
 * in localStorage and compared cheaply as multisets. The catalog below is the
 * single source of truth for what tiles exist and how they render.
 */

export type Suit = "bam" | "crack" | "dot";
export const SUITS: Suit[] = ["bam", "crack", "dot"];

export type Wind = "north" | "east" | "west" | "south";
export const WINDS: Wind[] = ["north", "east", "west", "south"];

export type Dragon = "red" | "green" | "white"; // "white" dragon is also called "soap"
export const DRAGONS: Dragon[] = ["red", "green", "white"];

/**
 * Compact codes:
 *  - Suit tiles: `${1..9}${B|C|D}`  e.g. "1B" (1 bam), "9D" (9 dot)
 *  - Winds:      N, E, W, S
 *  - Dragons:    DR (red), DG (green), DW (white / soap)
 *  - Flower:     F
 *  - Joker:      J
 */
export type TileCode = string;

const SUIT_LETTER: Record<Suit, string> = { bam: "B", crack: "C", dot: "D" };
const LETTER_SUIT: Record<string, Suit> = { B: "bam", C: "crack", D: "dot" };

const WIND_CODE: Record<Wind, TileCode> = {
  north: "N",
  east: "E",
  west: "W",
  south: "S",
};

const DRAGON_CODE: Record<Dragon, TileCode> = {
  red: "DR",
  green: "DG",
  white: "DW",
};

export const FLOWER: TileCode = "F";
export const JOKER: TileCode = "J";

export function suitTile(n: number, suit: Suit): TileCode {
  if (n < 1 || n > 9) throw new Error(`suit tile number out of range: ${n}`);
  return `${n}${SUIT_LETTER[suit]}`;
}

export function windTile(w: Wind): TileCode {
  return WIND_CODE[w];
}

export function dragonTile(d: Dragon): TileCode {
  return DRAGON_CODE[d];
}

/** NMJL convention: each suit is paired with a dragon (Bam→Green, Crack→Red, Dot→White/soap). */
export const SUIT_DRAGON: Record<Suit, Dragon> = {
  bam: "green",
  crack: "red",
  dot: "white",
};

export interface TileMeta {
  code: TileCode;
  label: string; // short label for the tile face, e.g. "1B", "Rd", "So"
  name: string; // human friendly name
  group: "bam" | "crack" | "dot" | "wind" | "dragon" | "flower" | "joker";
}

function buildCatalog(): TileMeta[] {
  const tiles: TileMeta[] = [];
  for (const suit of SUITS) {
    for (let n = 1; n <= 9; n++) {
      tiles.push({
        code: suitTile(n, suit),
        label: `${n}${SUIT_LETTER[suit]}`,
        name: `${n} ${suit}`,
        group: suit,
      });
    }
  }
  const windNames: Record<Wind, string> = {
    north: "North",
    east: "East",
    west: "West",
    south: "South",
  };
  for (const w of WINDS) {
    tiles.push({ code: windTile(w), label: WIND_CODE[w], name: `${windNames[w]} Wind`, group: "wind" });
  }
  tiles.push({ code: dragonTile("red"), label: "Rd", name: "Red Dragon", group: "dragon" });
  tiles.push({ code: dragonTile("green"), label: "Gr", name: "Green Dragon", group: "dragon" });
  tiles.push({ code: dragonTile("white"), label: "So", name: "White Dragon (Soap)", group: "dragon" });
  tiles.push({ code: FLOWER, label: "Fl", name: "Flower", group: "flower" });
  tiles.push({ code: JOKER, label: "Jk", name: "Joker", group: "joker" });
  return tiles;
}

export const TILE_CATALOG: TileMeta[] = buildCatalog();

const CATALOG_BY_CODE: Map<TileCode, TileMeta> = new Map(
  TILE_CATALOG.map((t) => [t.code, t]),
);

export function tileMeta(code: TileCode): TileMeta | undefined {
  return CATALOG_BY_CODE.get(code);
}

export function tileLabel(code: TileCode): string {
  return CATALOG_BY_CODE.get(code)?.label ?? code;
}

export function tileName(code: TileCode): string {
  return CATALOG_BY_CODE.get(code)?.name ?? code;
}

export function isJoker(code: TileCode): boolean {
  return code === JOKER;
}

export function isFlower(code: TileCode): boolean {
  return code === FLOWER;
}

export function suitOf(code: TileCode): Suit | undefined {
  if (code.length === 2 && /[1-9]/.test(code[0])) {
    return LETTER_SUIT[code[1]];
  }
  return undefined;
}

export function numberOf(code: TileCode): number | undefined {
  if (code.length === 2 && /[1-9]/.test(code[0]) && LETTER_SUIT[code[1]]) {
    return Number(code[0]);
  }
  return undefined;
}

/** A hand is an ordered list of tile codes (duplicates allowed). Max 14 for a mahjong hand. */
export type Hand = TileCode[];

/** Build a multiset (code → count) from a hand. */
export function toCounts(hand: Hand): Map<TileCode, number> {
  const counts = new Map<TileCode, number>();
  for (const code of hand) {
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
}