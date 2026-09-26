import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HANDS,
  createGame,
  emptyScore,
  goOutTeam,
  handTotal,
  linePoints,
  meetsGoOut,
  negativeLine,
  subtotal,
} from "./scoring.ts";

describe("goOutTeam", () => {
  it("is null until a team submits going out", () => {
    const game = createGame();
    assert.equal(goOutTeam(game, 0), null);
  });

  it("records the last-act team and only one side", () => {
    const game = createGame();
    game.scores[0][1].goingOut = true;
    assert.equal(goOutTeam(game, 0), 1);
    assert.equal(goOutTeam(game, 1), null);
  });
});

describe("negativeLine", () => {
  it("deducts leftover points whether typed as 50 or −50", () => {
    assert.equal(negativeLine(50), -50);
    assert.equal(negativeLine(-50), -50);
    assert.equal(negativeLine(0), 0);
  });
});

describe("negative leftover scoring", () => {
  const hand = HANDS[0];

  it("subtracts leftover from the subtotal instead of adding it", () => {
    const leftover = { ...emptyScore(), negativePts: 50 };
    assert.equal(linePoints(leftover, hand).negativePts, -50);
    assert.equal(subtotal(leftover, hand), -50);
    assert.equal(handTotal(leftover, hand), -50);
  });

  it("still deducts when leftover was already stored negative", () => {
    const leftover = { ...emptyScore(), negativePts: -50 };
    assert.equal(linePoints(leftover, hand).negativePts, -50);
    assert.equal(subtotal(leftover, hand), -50);
  });

  it("does not flip a zero leftover row", () => {
    const empty = emptyScore();
    assert.equal(linePoints(empty, hand).negativePts, 0);
    assert.equal(subtotal(empty, hand), 0);
  });
});

describe("meetsGoOut", () => {
  it("requires the hand's clean and dirty books", () => {
    const hand = HANDS[0];
    assert.equal(
      meetsGoOut(
        {
          perfectDraw: false,
          goingOut: false,
          cleanBooks: 0,
          dirtyBooks: 0,
          bookOf7s: 0,
          bookOfBlack3s: 0,
          negativePts: 0,
          cardCount: 0,
        },
        hand,
      ),
      false,
    );
    assert.equal(
      meetsGoOut(
        {
          perfectDraw: false,
          goingOut: false,
          cleanBooks: 1,
          dirtyBooks: 1,
          bookOf7s: 0,
          bookOfBlack3s: 0,
          negativePts: 0,
          cardCount: 0,
        },
        hand,
      ),
      true,
    );
  });
});
