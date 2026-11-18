import { describe, expect, it } from "vitest";
import { GAME_MAX, topScores, validateScore, withScore } from "@/lib/data/rules";
import type { GameScore } from "@/lib/data/types";
import { DARTS_MAX_SCORE, DARTS_PER_ROUND, aimAt, newDarts, scoreAt, throwDart } from "./darts";
import {
  BASKET_WIDTH,
  BASKET_Y,
  ROUND_SECONDS,
  SNACK_MAX_SCORE,
  newSnackCatch,
  stepSnackCatch,
  type SnackCatchState,
} from "./snackCatch";

/** Plays a whole round with a simple strategy, at 60 steps a second. */
function play(seed: number, strategy: (state: SnackCatchState) => -1 | 0 | 1 | { to: number }): SnackCatchState {
  const state = newSnackCatch(seed);
  for (let frame = 0; frame < ROUND_SECONDS * 60 + 10 && !state.over; frame += 1) {
    stepSnackCatch(state, 1 / 60, strategy(state));
  }
  return state;
}

/** Chases the lowest snack, ignoring alarm clocks. */
function chaseSnacks(state: SnackCatchState): { to: number } | 0 {
  const next = state.items
    .filter((item) => item.kind !== "alarm" && item.y < BASKET_Y)
    .sort((a, b) => b.y - a.y)[0];
  return next ? { to: next.x } : 0;
}

describe("Snack Catch", () => {
  it("lasts one minute, then stops", () => {
    const state = play(7, () => 0);
    expect(state.over).toBe(true);
    expect(state.time).toBe(ROUND_SECONDS);
    expect(state.items).toHaveLength(0);
    // Stepping a finished round changes nothing.
    stepSnackCatch(state, 1, 1);
    expect(state.time).toBe(ROUND_SECONDS);
  });

  it("plays the same way for the same seed", () => {
    const a = play(42, chaseSnacks);
    const b = play(42, chaseSnacks);
    expect(a.score).toBe(b.score);
    expect(a.caught).toBe(b.caught);
    expect(play(43, chaseSnacks).caught).not.toBe(a.caught);
  });

  it("rewards catching snacks, and never goes below zero", () => {
    const lazy = play(3, () => 0);
    const keen = play(3, chaseSnacks);
    expect(keen.score).toBeGreaterThan(lazy.score);
    expect(keen.caught).toBeGreaterThan(30);
    expect(lazy.score).toBeGreaterThanOrEqual(0);
    expect(keen.score).toBeLessThanOrEqual(SNACK_MAX_SCORE);
  });

  it("costs points to catch an alarm clock", () => {
    const state = newSnackCatch(1);
    state.score = 5;
    state.items.push({ id: 99, kind: "alarm", emoji: "⏰", x: state.basketX, y: BASKET_Y - 0.01, speed: 0.5 });
    state.nextDrop = 99;
    stepSnackCatch(state, 0.05, 0);
    expect(state.score).toBe(2);
    expect(state.alarms).toBe(1);
    expect(state.events).toEqual(["alarm"]);
  });

  it("keeps the basket on the field and moves it at a steady speed", () => {
    const state = newSnackCatch(1);
    for (let i = 0; i < 200; i += 1) stepSnackCatch(state, 1 / 60, -1);
    expect(state.basketX).toBeCloseTo(BASKET_WIDTH / 2);
    stepSnackCatch(state, 1 / 60, { to: 0.95 });
    expect(state.basketX).toBeLessThan(0.2);
  });
});

describe("Darts", () => {
  it("scores by how close to the middle it lands", () => {
    expect(scoreAt(0, 0).points).toBe(50);
    expect(scoreAt(0.2, 0).points).toBe(25);
    expect(scoreAt(0, -0.45).points).toBe(15);
    expect(scoreAt(0.5, 0.5).points).toBe(10);
    expect(scoreAt(0.9, 0).points).toBe(5);
    expect(scoreAt(1.1, 0).points).toBe(0);
  });

  it("gives three darts a round, then stops", () => {
    const state = newDarts(5);
    for (let i = 0; i < DARTS_PER_ROUND; i += 1) expect(throwDart(state, 1 + i)).not.toBeNull();
    expect(state.over).toBe(true);
    expect(throwDart(state, 9)).toBeNull();
    expect(state.score).toBe(state.throws.reduce((sum, dart) => sum + dart.points, 0));
    expect(state.score).toBeLessThanOrEqual(DARTS_MAX_SCORE);
  });

  it("keeps the aim moving, mostly over the board", () => {
    const state = newDarts(9);
    let onBoard = 0;
    for (let t = 0; t < 20; t += 0.1) {
      const aim = aimAt(state, t);
      if (Math.hypot(aim.x, aim.y) <= 1) onBoard += 1;
    }
    expect(onBoard / 200).toBeGreaterThan(0.75);
    expect(aimAt(state, 0)).not.toEqual(aimAt(state, 0.5));
  });

  it("throws the same way for the same seed and timing", () => {
    const a = newDarts(11);
    const b = newDarts(11);
    expect(throwDart(a, 2.3)).toEqual(throwDart(b, 2.3));
  });
});

describe("High scores", () => {
  it("matches the limits the database checks", () => {
    // Keep in step with supabase/migrations/20261115140000_game_scores.sql.
    expect(GAME_MAX).toEqual({ snack: 474, darts: 150 });
  });

  it("refuses scores no round could reach, and made-up games", () => {
    expect(validateScore("darts", 150).ok).toBe(true);
    expect(validateScore("darts", 151).ok).toBe(false);
    expect(validateScore("snack", -1).ok).toBe(false);
    expect(validateScore("snack", 2.5).ok).toBe(false);
    expect(validateScore("chess", 1).ok).toBe(false);
  });

  it("keeps only your best, and lists the top scores highest first", () => {
    let scores: GameScore[] = [];
    scores = withScore(scores, { game: "darts", userId: "a", score: 40, at: 1 });
    scores = withScore(scores, { game: "darts", userId: "a", score: 30, at: 2 });
    expect(scores).toEqual([{ game: "darts", userId: "a", score: 40, at: 1 }]);
    scores = withScore(scores, { game: "darts", userId: "a", score: 70, at: 3 });
    scores = withScore(scores, { game: "darts", userId: "b", score: 70, at: 4 });
    scores = withScore(scores, { game: "snack", userId: "b", score: 99, at: 5 });
    expect(topScores(scores, "darts").map((item) => item.userId)).toEqual(["a", "b"]);
    expect(topScores(scores, "snack")).toHaveLength(1);
  });
});
