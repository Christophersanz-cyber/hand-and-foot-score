import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HANDS,
  createGame,
  goOutTeam,
  meetsGoOut,
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
