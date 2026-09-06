/**
 * Conflict resolution for live shared scoring. A Hand & Foot scoresheet changes
 * only when someone taps a control, so a full-game broadcast with last-write-
 * wins is both correct and simple — no operational transform needed.
 *
 * Each state carries a `Version`: the game's `updatedAt` (ms) plus the
 * originating client id as a deterministic tiebreaker. `updatedAt` almost always
 * decides (wall-clock moves forward between edits); the client id only breaks
 * the rare same-millisecond tie so two peers can never ping-pong forever.
 */
export interface Version {
  /** Game.updatedAt (ms since epoch). */
  ts: number;
  /** Originating peer/client id. */
  cid: string;
}

/** True when `a` should win over `b` (strictly newer). Equal versions are not. */
export function isNewer(a: Version, b: Version): boolean {
  if (a.ts !== b.ts) return a.ts > b.ts;
  return a.cid > b.cid;
}

/** The message peers exchange on the reliable channel to sync a game. */
export interface StateMessage {
  type: "state";
  /** Version tiebreaker: the id of the client that produced this state. */
  cid: string;
  game: unknown;
}

export function isStateMessage(data: unknown): data is StateMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "state" &&
    typeof (data as { cid?: unknown }).cid === "string" &&
    "game" in data
  );
}
