/**
 * Suggestion engine.
 *
 * Given the player's current tiles, score each candidate `HandPattern` by how
 * close the player is to completing it, and return a ranked list of the best
 * candidates together with what is still needed.
 *
 * Closeness model
 * ---------------
 * For a fully-bound target hand (a `ConcreteHand` of 14 `Slot`s):
 *   1. Match real (non-joker) tiles to slots of the exact same tile. Each match
 *      is worth 1 point. Real matches are maximised first because they are
 *      always at least as good as using a joker.
 *   2. Fill remaining *jokerable* slots with the player's spare jokers.
 *   3. `matched = realMatches + jokersUsed`, out of 14.
 *
 * Concealed / exposures
 * ---------------------
 * Patterns flagged `concealed` are ineligible when the player already has any
 * exposure (a claimed pung/kong on the rack). They are kept in the list, sorted
 * after eligible hands, so the player can see why they dropped off.
 *
 * Optional wall odds
 * ------------------
 * When discards (and the rack) are provided, remaining-copy counts and a simple
 * next-draw probability are attached and used as a tie-breaker.
 */

import { nextDrawOdds, remainingByTile } from "./deck";
import { type ConcreteHand, type HandPattern, expandPattern } from "./patterns";
import { type Hand, JOKER, toCounts } from "./tiles";

export interface MatchResult {
  matched: number; // 0..14
  realMatches: number;
  jokersUsed: number;
  tilesNeeded: number; // 14 - matched
  /** Tiles still required (after real matches + jokers), as a multiset list. */
  needed: string[];
  binding: string;
  /** False when a concealed hand conflicts with existing exposures. */
  eligible: boolean;
  concealedConflict: boolean;
  /** Remaining copies of each needed tile (same order as `needed`), if wall tracking is on. */
  neededRemaining?: number[];
  /** Approximate P(next unseen tile is one of `needed`). */
  nextDrawOdds?: number;
}

export interface SuggestContext {
  /** Tiles already exposed (claimed pung/kong). */
  exposures?: Hand;
  /** Seen discards (and optionally other table tiles). */
  discards?: Hand;
  /** Attach remaining-copy / next-draw odds and use them as a tie-break. */
  useWallOdds?: boolean;
}

const HAND_SIZE = 14;

/** Score one concrete (fully-bound) target hand against the player's tiles. */
export function scoreConcrete(hand: Hand, target: ConcreteHand): MatchResult {
  const counts = toCounts(hand);
  const jokers = counts.get(JOKER) ?? 0;
  const available = new Map(counts);
  available.delete(JOKER);

  let realMatches = 0;
  const unmatched: { tile: string; jokerable: boolean }[] = [];

  for (const slot of target.slots) {
    const have = available.get(slot.tile) ?? 0;
    if (have > 0) {
      available.set(slot.tile, have - 1);
      realMatches += 1;
    } else {
      unmatched.push({ tile: slot.tile, jokerable: slot.jokerable });
    }
  }

  let jokersLeft = jokers;
  const stillNeeded: string[] = [];
  let jokersUsed = 0;
  for (const slot of unmatched) {
    if (slot.jokerable && jokersLeft > 0) {
      jokersLeft -= 1;
      jokersUsed += 1;
    } else {
      stillNeeded.push(slot.tile);
    }
  }

  const matched = realMatches + jokersUsed;
  return {
    matched,
    realMatches,
    jokersUsed,
    tilesNeeded: HAND_SIZE - matched,
    needed: stillNeeded,
    binding: target.binding,
    eligible: true,
    concealedConflict: false,
  };
}

function withEligibility(result: MatchResult, pattern: HandPattern, exposures: Hand): MatchResult {
  const concealedConflict = Boolean(pattern.concealed) && exposures.length > 0;
  return { ...result, concealedConflict, eligible: !concealedConflict };
}

function withWallOdds(result: MatchResult, seen: Hand, enabled: boolean): MatchResult {
  if (!enabled) return result;
  const remaining = remainingByTile(seen);
  return {
    ...result,
    neededRemaining: result.needed.map((code) => remaining.get(code) ?? 0),
    nextDrawOdds: nextDrawOdds(result.needed, seen),
  };
}

/** Best `MatchResult` for a pattern over all of its legal bindings. */
export function scorePattern(hand: Hand, pattern: HandPattern, ctx: SuggestContext = {}): MatchResult {
  const exposures = ctx.exposures ?? [];
  const seen = [...hand, ...(ctx.discards ?? [])];
  const targets = expandPattern(pattern);
  let best: MatchResult | null = null;
  for (const target of targets) {
    let r = scoreConcrete(hand, target);
    r = withEligibility(r, pattern, exposures);
    r = withWallOdds(r, seen, Boolean(ctx.useWallOdds));
    if (best === null || compareResults(r, best) < 0) {
      best = r;
    }
  }
  return (
    best ??
    withEligibility(
      {
        matched: 0,
        realMatches: 0,
        jokersUsed: 0,
        tilesNeeded: HAND_SIZE,
        needed: [],
        binding: "fixed",
        eligible: true,
        concealedConflict: false,
      },
      pattern,
      exposures,
    )
  );
}

/** Lower is better (used for picking a binding and for ranking). */
function compareResults(a: MatchResult, b: MatchResult): number {
  if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
  if (b.matched !== a.matched) return b.matched - a.matched;
  if (a.jokersUsed !== b.jokersUsed) return a.jokersUsed - b.jokersUsed;
  const aOdds = a.nextDrawOdds ?? -1;
  const bOdds = b.nextDrawOdds ?? -1;
  if (bOdds !== aOdds) return bOdds - aOdds;
  return 0;
}

export interface Suggestion {
  pattern: HandPattern;
  result: MatchResult;
}

/**
 * Rank patterns by closeness to the given hand.
 * Returns all patterns sorted best-first; pass `limit` to cap the list.
 */
export function suggest(
  hand: Hand,
  patterns: HandPattern[],
  limit?: number,
  ctx: SuggestContext = {},
): Suggestion[] {
  const scored: Suggestion[] = patterns.map((pattern) => ({
    pattern,
    result: scorePattern(hand, pattern, ctx),
  }));

  scored.sort((a, b) => {
    const byScore = compareResults(a.result, b.result);
    if (byScore !== 0) return byScore;
    return a.pattern.name.localeCompare(b.pattern.name);
  });

  return typeof limit === "number" ? scored.slice(0, limit) : scored;
}
