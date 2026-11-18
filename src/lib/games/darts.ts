import { seededRandom } from "./random";

/**
 * Darts: the aim drifts around the board in a slow, wobbly loop. Press to
 * throw when it's where you want it. Three darts a round.
 *
 * The board has radius 1, centred on (0, 0). Only rules live here.
 */

export const DARTS_PER_ROUND = 3;

/** Rings from the middle out: the furthest each reaches, and what it's worth. */
export const RINGS: ReadonlyArray<{ reach: number; points: number; name: string }> = [
  { reach: 0.08, points: 50, name: "Bullseye!" },
  { reach: 0.25, points: 25, name: "Great shot" },
  { reach: 0.5, points: 15, name: "Nice" },
  { reach: 0.75, points: 10, name: "Not bad" },
  { reach: 1, points: 5, name: "On the board" },
];

export const DARTS_MAX_SCORE = DARTS_PER_ROUND * RINGS[0].points;

export interface Throw {
  x: number;
  y: number;
  points: number;
  name: string;
}

export interface DartsState {
  throws: Throw[];
  score: number;
  /** Each dart sways a little differently. */
  phase: { a: number; b: number; speed: number };
  random: () => number;
  over: boolean;
}

export function scoreAt(x: number, y: number): { points: number; name: string } {
  const distance = Math.hypot(x, y);
  for (const ring of RINGS) if (distance <= ring.reach) return { points: ring.points, name: ring.name };
  return { points: 0, name: "Missed the board" };
}

function nextPhase(random: () => number): DartsState["phase"] {
  return { a: random() * Math.PI * 2, b: random() * Math.PI * 2, speed: 0.9 + random() * 0.35 };
}

export function newDarts(seed: number): DartsState {
  const random = seededRandom(seed);
  return { throws: [], score: 0, phase: nextPhase(random), random, over: false };
}

/** Where the aim is `t` seconds into this dart: a loop that never quite repeats. */
export function aimAt(state: DartsState, t: number): { x: number; y: number } {
  const { a, b, speed } = state.phase;
  const s = t * speed;
  return {
    x: 0.78 * Math.sin(1.3 * s + a) + 0.12 * Math.sin(3.7 * s + b),
    y: 0.72 * Math.sin(1.9 * s + b) + 0.12 * Math.cos(2.9 * s + a),
  };
}

/** Throws a dart from wherever the aim is `t` seconds in. A tiny wobble on release. */
export function throwDart(state: DartsState, t: number): Throw | null {
  if (state.over) return null;
  const aim = aimAt(state, t);
  const wobble = 0.04;
  const x = aim.x + (state.random() - 0.5) * wobble;
  const y = aim.y + (state.random() - 0.5) * wobble;
  const { points, name } = scoreAt(x, y);
  const dart: Throw = { x, y, points, name };
  state.throws.push(dart);
  state.score += points;
  state.phase = nextPhase(state.random);
  state.over = state.throws.length >= DARTS_PER_ROUND;
  return dart;
}
