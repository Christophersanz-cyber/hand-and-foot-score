/** Player session: rack tiles (with exposure flags) + optional discards. */

import { type TileCode, tileMeta } from "./tiles";
import { MAX_HAND_SIZE, sortHand } from "./hand";

export const SESSION_KEY = "mahjong-combos:session:v2";
export const LEGACY_HAND_KEY = "mahjong-combos:hand:v1";

export interface PlayerTile {
  code: TileCode;
  exposed: boolean;
}

export interface SessionState {
  tiles: PlayerTile[];
  discards: TileCode[];
}

export function emptySession(): SessionState {
  return { tiles: [], discards: [] };
}

export function codesOf(tiles: PlayerTile[]): TileCode[] {
  return tiles.map((t) => t.code);
}

export function exposuresOf(tiles: PlayerTile[]): TileCode[] {
  return tiles.filter((t) => t.exposed).map((t) => t.code);
}

export function seenTiles(session: SessionState): TileCode[] {
  return [...codesOf(session.tiles), ...session.discards];
}

export function addRackTile(tiles: PlayerTile[], code: TileCode): PlayerTile[] {
  if (tiles.length >= MAX_HAND_SIZE) return tiles;
  if (!tileMeta(code)) return tiles;
  const next = [...tiles, { code, exposed: false }];
  return sortPlayerTiles(next);
}

export function removeRackTile(tiles: PlayerTile[], index: number): PlayerTile[] {
  return tiles.filter((_, i) => i !== index);
}

export function toggleExposed(tiles: PlayerTile[], index: number): PlayerTile[] {
  return tiles.map((t, i) => (i === index ? { ...t, exposed: !t.exposed } : t));
}

export function addDiscard(discards: TileCode[], code: TileCode): TileCode[] {
  if (!tileMeta(code)) return discards;
  return [...discards, code];
}

export function removeDiscard(discards: TileCode[], index: number): TileCode[] {
  return discards.filter((_, i) => i !== index);
}

function sortPlayerTiles(tiles: PlayerTile[]): PlayerTile[] {
  const order = sortHand(tiles.map((t) => t.code));
  const pool = [...tiles];
  const out: PlayerTile[] = [];
  for (const code of order) {
    const idx = pool.findIndex((t) => t.code === code);
    if (idx >= 0) {
      out.push(pool[idx]);
      pool.splice(idx, 1);
    }
  }
  return out;
}

export function loadSession(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isSession(parsed)) return parsed;
    }
    const legacy = localStorage.getItem(LEGACY_HAND_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as unknown;
      if (Array.isArray(parsed) && parsed.every((t) => typeof t === "string")) {
        return { tiles: sortPlayerTiles(parsed.map((code) => ({ code, exposed: false }))), discards: [] };
      }
    }
  } catch {
    // ignore malformed storage
  }
  return emptySession();
}

export function saveSession(session: SessionState): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // non-fatal
  }
}

function isSession(v: unknown): v is SessionState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as SessionState;
  return (
    Array.isArray(s.tiles) &&
    s.tiles.every((t) => t && typeof t.code === "string" && typeof t.exposed === "boolean") &&
    Array.isArray(s.discards) &&
    s.discards.every((d) => typeof d === "string")
  );
}
