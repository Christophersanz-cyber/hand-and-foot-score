/**
 * Parse / validate a user-supplied year card (JSON paste or file).
 *
 * Official NMJL wording is not required — only the structured hand shapes the
 * player transcribes from a card they own.
 */

import {
  CARD_SECTION_IDS,
  type CardHand,
  type CardSectionId,
  type YearCard,
} from "../data/cards/types";
import {
  type Block,
  type BlockCount,
  type HandPattern,
  type SuitVar,
  type TileSpec,
  defaultJokerable,
  patternTileCount,
} from "./patterns";
import type { Dragon, Wind } from "./tiles";

export interface ParseIssue {
  path: string;
  message: string;
}

export type ParseResult = { ok: true; card: YearCard } | { ok: false; issues: ParseIssue[] };

const SUIT_VARS: SuitVar[] = ["S1", "S2", "S3"];
const WINDS: Wind[] = ["north", "east", "west", "south"];
const DRAGONS: Dragon[] = ["red", "green", "white"];
const COUNTS = new Set<number>([1, 2, 3, 4, 5]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function issue(issues: ParseIssue[], path: string, message: string) {
  issues.push({ path, message });
}

function parseSpec(raw: unknown, path: string, issues: ParseIssue[]): TileSpec | null {
  if (!isRecord(raw) || typeof raw.kind !== "string") {
    issue(issues, path, "tile spec must be an object with a kind");
    return null;
  }
  switch (raw.kind) {
    case "num": {
      const suit = raw.suit;
      const offset = raw.offset;
      if (typeof suit !== "string" || !SUIT_VARS.includes(suit as SuitVar)) {
        issue(issues, `${path}.suit`, "must be S1, S2, or S3");
        return null;
      }
      if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || offset > 9) {
        issue(issues, `${path}.offset`, "must be an integer 0–9");
        return null;
      }
      return { kind: "num", suit: suit as SuitVar, offset };
    }
    case "wind": {
      if (typeof raw.wind !== "string" || !WINDS.includes(raw.wind as Wind)) {
        issue(issues, `${path}.wind`, "must be north, east, west, or south");
        return null;
      }
      return { kind: "wind", wind: raw.wind as Wind };
    }
    case "dragon": {
      if (typeof raw.dragon !== "string" || !DRAGONS.includes(raw.dragon as Dragon)) {
        issue(issues, `${path}.dragon`, "must be red, green, or white");
        return null;
      }
      return { kind: "dragon", dragon: raw.dragon as Dragon };
    }
    case "dragonOfSuit": {
      if (typeof raw.suit !== "string" || !SUIT_VARS.includes(raw.suit as SuitVar)) {
        issue(issues, `${path}.suit`, "must be S1, S2, or S3");
        return null;
      }
      return { kind: "dragonOfSuit", suit: raw.suit as SuitVar };
    }
    case "flower":
      return { kind: "flower" };
    default:
      issue(issues, `${path}.kind`, `unknown kind "${raw.kind}"`);
      return null;
  }
}

function parseBlock(raw: unknown, path: string, issues: ParseIssue[]): Block | null {
  if (!isRecord(raw)) {
    issue(issues, path, "block must be an object");
    return null;
  }
  if (typeof raw.count !== "number" || !COUNTS.has(raw.count)) {
    issue(issues, `${path}.count`, "must be 1 (single), 2 (pair), 3 (pung), 4 (kong), or 5 (quint)");
    return null;
  }
  const count = raw.count as BlockCount;
  const spec = parseSpec(raw.spec, `${path}.spec`, issues);
  if (!spec) return null;
  const jokerable =
    typeof raw.jokerable === "boolean" ? raw.jokerable : defaultJokerable(count, spec);
  if (jokerable && (count < 3 || spec.kind === "flower")) {
    issue(issues, `${path}.jokerable`, "Jokers are not allowed in singles, pairs, or flowers");
    return null;
  }
  return { count, spec, jokerable };
}

function parseSection(raw: unknown): CardSectionId {
  if (typeof raw === "string" && (CARD_SECTION_IDS as string[]).includes(raw)) {
    return raw as CardSectionId;
  }
  return "other";
}

export function parseCardHand(raw: unknown, path: string, issues: ParseIssue[]): CardHand | null {
  if (!isRecord(raw)) {
    issue(issues, path, "hand must be an object");
    return null;
  }
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "";
  if (!name) issue(issues, `${path}.name`, "name is required");
  const suitVarCount = raw.suitVarCount;
  if (suitVarCount !== 0 && suitVarCount !== 1 && suitVarCount !== 2 && suitVarCount !== 3) {
    issue(issues, `${path}.suitVarCount`, "must be 0, 1, 2, or 3");
  }
  if (typeof raw.usesNumberVar !== "boolean") {
    issue(issues, `${path}.usesNumberVar`, "must be a boolean");
  }
  if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) {
    issue(issues, `${path}.blocks`, "at least one block is required");
    return null;
  }
  const blocks: Block[] = [];
  for (let i = 0; i < raw.blocks.length; i++) {
    const b = parseBlock(raw.blocks[i], `${path}.blocks[${i}]`, issues);
    if (b) blocks.push(b);
  }
  if (!name || typeof raw.usesNumberVar !== "boolean") return null;
  if (suitVarCount !== 0 && suitVarCount !== 1 && suitVarCount !== 2 && suitVarCount !== 3) {
    return null;
  }

  const hand: CardHand = {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `hand-${path}`,
    name,
    category:
      typeof raw.category === "string" && raw.category.trim()
        ? raw.category.trim()
        : parseSection(raw.section),
    description: typeof raw.description === "string" ? raw.description : "",
    suitVarCount,
    usesNumberVar: raw.usesNumberVar,
    blocks,
    section: parseSection(raw.section ?? raw.category),
    concealed: raw.concealed === true,
    value: typeof raw.value === "number" && Number.isFinite(raw.value) ? raw.value : undefined,
  };

  const tiles = patternTileCount(hand);
  if (tiles !== 14) {
    issue(issues, `${path}.blocks`, `blocks must total 14 tiles (got ${tiles})`);
    return null;
  }
  return hand;
}

export function parseYearCard(input: unknown, fallbackYear?: number): ParseResult {
  let data: unknown = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      return { ok: false, issues: [{ path: "", message: "Not valid JSON" }] };
    }
  }

  const issues: ParseIssue[] = [];
  let year: number | undefined;
  let title: string | undefined;
  let notes: string | undefined;
  let handsRaw: unknown;

  if (Array.isArray(data)) {
    year = fallbackYear;
    handsRaw = data;
  } else if (isRecord(data)) {
    if (typeof data.year === "number" && Number.isInteger(data.year)) year = data.year;
    else if (fallbackYear !== undefined) year = fallbackYear;
    else issue(issues, "year", "year is required (e.g. 2026)");
    if (typeof data.title === "string") title = data.title.trim();
    if (typeof data.notes === "string") notes = data.notes;
    handsRaw = data.hands;
    if (!Array.isArray(handsRaw)) issue(issues, "hands", "hands must be an array");
  } else {
    return { ok: false, issues: [{ path: "", message: "Expected an object or an array of hands" }] };
  }

  if (year !== undefined && (year < 1900 || year > 2100)) {
    issue(issues, "year", "year must be between 1900 and 2100");
  }
  if (!Array.isArray(handsRaw)) {
    return { ok: false, issues: issues };
  }
  if (handsRaw.length === 0) {
    issue(issues, "hands", "add at least one hand");
  }

  const hands: CardHand[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < handsRaw.length; i++) {
    const hand = parseCardHand(handsRaw[i], `hands[${i}]`, issues);
    if (!hand) continue;
    let id = hand.id;
    if (ids.has(id)) id = `${id}-${i}`;
    ids.add(id);
    hands.push({ ...hand, id });
  }

  if (issues.length > 0 || year === undefined) return { ok: false, issues };

  const card: YearCard = {
    id: `user:${newId()}`,
    year,
    title: title || `${year} card`,
    notes,
    source: "user",
    hands,
    updatedAt: new Date().toISOString(),
  };
  return { ok: true, card };
}

/** Serialize a card for export / paste-back (no bundled source flag). */
export function serializeYearCard(card: YearCard): string {
  const payload = {
    year: card.year,
    title: card.title,
    notes: card.notes,
    hands: card.hands.map((h) => ({
      id: h.id,
      name: h.name,
      section: h.section,
      category: h.category,
      description: h.description,
      concealed: h.concealed,
      value: h.value,
      suitVarCount: h.suitVarCount,
      usesNumberVar: h.usesNumberVar,
      blocks: h.blocks,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function emptyHandDraft(section: CardSectionId = "other"): CardHand {
  return {
    id: `hand-${newId()}`,
    name: "New hand",
    category: section,
    section,
    description: "",
    concealed: false,
    suitVarCount: 1,
    usesNumberVar: true,
    blocks: [],
  };
}

export type { HandPattern };
