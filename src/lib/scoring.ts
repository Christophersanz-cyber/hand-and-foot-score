export type TeamIndex = 0 | 1;
export type HandIndex = 0 | 1 | 2 | 3;

export type HandDef = {
  index: HandIndex;
  label: string;
  short: string;
  open: number;
  perfectDrawCards: number;
  goingOut: number;
  cleanNeed: number;
  dirtyNeed: number;
};

export const HANDS: HandDef[] = [
  {
    index: 0,
    label: "1st Hand",
    short: "1st",
    open: 90,
    perfectDrawCards: 22,
    goingOut: 100,
    cleanNeed: 1,
    dirtyNeed: 1,
  },
  {
    index: 1,
    label: "2nd Hand",
    short: "2nd",
    open: 120,
    perfectDrawCards: 26,
    goingOut: 200,
    cleanNeed: 2,
    dirtyNeed: 2,
  },
  {
    index: 2,
    label: "3rd Hand",
    short: "3rd",
    open: 150,
    perfectDrawCards: 30,
    goingOut: 300,
    cleanNeed: 3,
    dirtyNeed: 3,
  },
  {
    index: 3,
    label: "4th Hand",
    short: "4th",
    open: 180,
    perfectDrawCards: 34,
    goingOut: 400,
    cleanNeed: 4,
    dirtyNeed: 4,
  },
];

export const POINTS = {
  perfectDraw: 100,
  cleanBook: 500,
  dirtyBook: 300,
  bookOf7s: 1500,
  bookOfBlack3s: 2000,
} as const;

export const CARD_VALUES = [
  { id: "joker", label: "Jokers", pts: 50 },
  { id: "twoAce", label: "2s & Aces", pts: 20 },
  { id: "face", label: "K, Q, J, 10, 9, 8", pts: 10 },
  { id: "low", label: "7, 6, 5, 4, black 3", pts: 5 },
  { id: "red3", label: "Red 3", pts: -500 },
] as const;

export type CardValueId = (typeof CARD_VALUES)[number]["id"];

export type TeamHandScore = {
  perfectDraw: boolean;
  goingOut: boolean;
  cleanBooks: number;
  dirtyBooks: number;
  bookOf7s: number;
  bookOfBlack3s: number;
  negativePts: number;
  cardCount: number;
};

export type Game = {
  id: string;
  createdAt: number;
  updatedAt: number;
  teamNames: [string, string];
  scores: [
    [TeamHandScore, TeamHandScore],
    [TeamHandScore, TeamHandScore],
    [TeamHandScore, TeamHandScore],
    [TeamHandScore, TeamHandScore],
  ];
  currentHand: HandIndex;
};

export type BookKey =
  | "cleanBooks"
  | "dirtyBooks"
  | "bookOf7s"
  | "bookOfBlack3s";

export const BOOK_ROWS: {
  key: BookKey;
  label: string;
  pts: number;
  hint: string;
}[] = [
  {
    key: "cleanBooks",
    label: "Clean Books",
    pts: POINTS.cleanBook,
    hint: "No wilds",
  },
  {
    key: "dirtyBooks",
    label: "Dirty Books",
    pts: POINTS.dirtyBook,
    hint: "With wilds",
  },
  {
    key: "bookOf7s",
    label: "Book of 7's",
    pts: POINTS.bookOf7s,
    hint: "Seven 7s",
  },
  {
    key: "bookOfBlack3s",
    label: "Book of Black 3's",
    pts: POINTS.bookOfBlack3s,
    hint: "Seven black 3s",
  },
];

export function emptyScore(): TeamHandScore {
  return {
    perfectDraw: false,
    goingOut: false,
    cleanBooks: 0,
    dirtyBooks: 0,
    bookOf7s: 0,
    bookOfBlack3s: 0,
    negativePts: 0,
    cardCount: 0,
  };
}

export function createGame(
  teamNames: [string, string] = ["Team 1", "Team 2"],
): Game {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    teamNames: [teamNames[0].trim() || "Team 1", teamNames[1].trim() || "Team 2"],
    scores: [
      [emptyScore(), emptyScore()],
      [emptyScore(), emptyScore()],
      [emptyScore(), emptyScore()],
      [emptyScore(), emptyScore()],
    ],
    currentHand: 0,
  };
}

/** Leftover / red-3 points always deduct. 50 and −50 both score as −50. */
export function negativeLine(pts: number): number {
  if (!Number.isFinite(pts) || pts === 0) return 0;
  return -Math.abs(pts);
}

export function linePoints(score: TeamHandScore, hand: HandDef) {
  return {
    perfectDraw: score.perfectDraw ? POINTS.perfectDraw : 0,
    goingOut: score.goingOut ? hand.goingOut : 0,
    cleanBooks: score.cleanBooks * POINTS.cleanBook,
    dirtyBooks: score.dirtyBooks * POINTS.dirtyBook,
    bookOf7s: score.bookOf7s * POINTS.bookOf7s,
    bookOfBlack3s: score.bookOfBlack3s * POINTS.bookOfBlack3s,
    negativePts: negativeLine(score.negativePts),
    cardCount: score.cardCount,
  };
}

export function subtotal(score: TeamHandScore, hand: HandDef): number {
  const p = linePoints(score, hand);
  return (
    p.perfectDraw +
    p.goingOut +
    p.cleanBooks +
    p.dirtyBooks +
    p.bookOf7s +
    p.bookOfBlack3s +
    p.negativePts
  );
}

export function handTotal(score: TeamHandScore, hand: HandDef): number {
  return subtotal(score, hand) + score.cardCount;
}

export function runningTotal(
  game: Game,
  team: TeamIndex,
  throughHand: HandIndex = 3,
): number {
  let total = 0;
  for (let i = 0; i <= throughHand; i++) {
    total += handTotal(game.scores[i][team], HANDS[i]);
  }
  return total;
}

export function handRunningPair(
  game: Game,
  throughHand: HandIndex,
): [number, number] {
  return [runningTotal(game, 0, throughHand), runningTotal(game, 1, throughHand)];
}

export function isScoreEmpty(score: TeamHandScore): boolean {
  return (
    !score.perfectDraw &&
    !score.goingOut &&
    score.cleanBooks === 0 &&
    score.dirtyBooks === 0 &&
    score.bookOf7s === 0 &&
    score.bookOfBlack3s === 0 &&
    score.negativePts === 0 &&
    score.cardCount === 0
  );
}

export function isHandPlayed(game: Game, hand: HandIndex): boolean {
  return !isScoreEmpty(game.scores[hand][0]) || !isScoreEmpty(game.scores[hand][1]);
}

export function playedHandCount(game: Game): number {
  return HANDS.filter((h) => isHandPlayed(game, h.index)).length;
}

export function meetsGoOut(score: TeamHandScore, hand: HandDef): boolean {
  return score.cleanBooks >= hand.cleanNeed && score.dirtyBooks >= hand.dirtyNeed;
}

/** Team that submitted going out for this hand — the last act. Null if nobody has. */
export function goOutTeam(game: Game, hand: HandIndex = game.currentHand): TeamIndex | null {
  if (game.scores[hand][0].goingOut) return 0;
  if (game.scores[hand][1].goingOut) return 1;
  return null;
}

export function winnerOf(game: Game): TeamIndex | null {
  const a = runningTotal(game, 0);
  const b = runningTotal(game, 1);
  if (a === b) return null;
  return a > b ? 0 : 1;
}

export function formatPts(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US");
  if (n < 0) return `−${abs}`;
  return abs;
}

export function formatPtsSigned(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US");
  if (n < 0) return `−${abs}`;
  if (n > 0) return `+${abs}`;
  return "0";
}

export function gameSummary(game: Game): string {
  const t0 = runningTotal(game, 0);
  const t1 = runningTotal(game, 1);
  const win = winnerOf(game);
  const lines = [
    "Hand & Foot Score",
    `${game.teamNames[0]}  ${formatPts(t0)}`,
    `${game.teamNames[1]}  ${formatPts(t1)}`,
    win === null ? "Tied" : `${game.teamNames[win]} wins`,
    "",
  ];
  for (const hand of HANDS) {
    if (!isHandPlayed(game, hand.index)) continue;
    const a = handTotal(game.scores[hand.index][0], hand);
    const b = handTotal(game.scores[hand.index][1], hand);
    lines.push(
      `${hand.label}:  ${game.teamNames[0]} ${formatPts(a)}  ·  ${game.teamNames[1]} ${formatPts(b)}`,
    );
  }
  return lines.join("\n");
}

export function clampCount(n: number, max = 20): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}
