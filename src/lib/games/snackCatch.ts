import { seededRandom } from "./random";

/**
 * Snack Catch: snacks fall from the top; slide the basket left and right to
 * catch them before they reach the floor. Alarm clocks fall too: catching one
 * costs points. One round lasts a minute and gets a little faster as it goes.
 *
 * The field is 1 wide and 1 tall (0 at the top). Only rules live here; the
 * screen draws whatever this state says.
 */

export const ROUND_SECONDS = 60;
export const BASKET_WIDTH = 0.18;
export const BASKET_Y = 0.9;
/** Basket speed, in field widths per second. */
export const BASKET_SPEED = 1.35;
export const ITEM_SIZE = 0.07;
export const ALARM_PENALTY = 3;

export type FallingKind = "snack" | "treat" | "alarm";

export interface Falling {
  id: number;
  kind: FallingKind;
  emoji: string;
  x: number;
  y: number;
  /** Field heights per second. */
  speed: number;
}

export interface SnackCatchState {
  time: number;
  score: number;
  basketX: number;
  items: Falling[];
  caught: number;
  missed: number;
  alarms: number;
  /** When the next item drops, in round seconds. */
  nextDrop: number;
  nextId: number;
  over: boolean;
  /** What happened on the last step, for sounds and little flashes. */
  events: Array<"catch" | "treat" | "alarm">;
  random: () => number;
}

export const POINTS: Record<FallingKind, number> = { snack: 1, treat: 3, alarm: -ALARM_PENALTY };

const SNACKS = ["🍩", "🍪", "🍎", "🧁", "🍕", "🥐", "🍓"];
const TREATS = ["🍰", "🍦"];

/** Seconds between drops: about 0.9 at the start, 0.38 by the end. */
export function dropGap(time: number): number {
  const progress = Math.min(1, time / ROUND_SECONDS);
  return 0.9 - progress * 0.52;
}

/** How fast things fall: a little faster as the round goes on. */
function fallSpeed(time: number): number {
  const progress = Math.min(1, time / ROUND_SECONDS);
  return 0.38 + progress * 0.42;
}

/**
 * The most a round could ever score: every drop caught, all of them treats.
 * The shortest gap is used throughout, so this is a safe upper bound.
 */
export const SNACK_MAX_SCORE = Math.ceil(ROUND_SECONDS / dropGap(ROUND_SECONDS)) * POINTS.treat;

export function newSnackCatch(seed: number): SnackCatchState {
  return {
    time: 0,
    score: 0,
    basketX: 0.5,
    items: [],
    caught: 0,
    missed: 0,
    alarms: 0,
    nextDrop: 0.6,
    nextId: 1,
    over: false,
    events: [],
    random: seededRandom(seed),
  };
}

function drop(state: SnackCatchState): void {
  const roll = state.random();
  const kind: FallingKind = roll < 0.18 ? "alarm" : roll < 0.28 ? "treat" : "snack";
  const list = kind === "alarm" ? ["⏰"] : kind === "treat" ? TREATS : SNACKS;
  state.items.push({
    id: state.nextId,
    kind,
    emoji: list[Math.floor(state.random() * list.length)],
    x: ITEM_SIZE + state.random() * (1 - ITEM_SIZE * 2),
    y: -ITEM_SIZE,
    speed: fallSpeed(state.time) * (0.85 + state.random() * 0.3),
  });
  state.nextId += 1;
}

/** Does the basket, centred at basketX, catch an item at x? */
export function inBasket(basketX: number, x: number): boolean {
  return Math.abs(x - basketX) <= BASKET_WIDTH / 2 + ITEM_SIZE / 2;
}

/**
 * Moves the round on by dt seconds. `steer` is -1 (left), 0 or 1 (right), or
 * a field position to slide towards (from a pointer or touch).
 */
export function stepSnackCatch(
  state: SnackCatchState,
  dt: number,
  steer: -1 | 0 | 1 | { to: number },
): SnackCatchState {
  state.events = [];
  if (state.over) return state;
  const step = Math.min(dt, 0.1);
  state.time = Math.min(ROUND_SECONDS, state.time + step);

  const reach = BASKET_SPEED * step;
  const half = BASKET_WIDTH / 2;
  if (typeof steer === "object") {
    const goal = Math.max(half, Math.min(1 - half, steer.to));
    state.basketX += Math.max(-reach, Math.min(reach, goal - state.basketX));
  } else {
    state.basketX = Math.max(half, Math.min(1 - half, state.basketX + steer * reach));
  }

  while (state.time >= state.nextDrop && state.time < ROUND_SECONDS) {
    drop(state);
    state.nextDrop += dropGap(state.nextDrop);
  }

  const kept: Falling[] = [];
  for (const item of state.items) {
    const before = item.y;
    item.y += item.speed * step;
    // It reaches the basket's rim this step.
    if (before < BASKET_Y && item.y >= BASKET_Y && inBasket(state.basketX, item.x)) {
      state.score = Math.max(0, state.score + POINTS[item.kind]);
      if (item.kind === "alarm") {
        state.alarms += 1;
        state.events.push("alarm");
      } else {
        state.caught += 1;
        state.events.push(item.kind === "treat" ? "treat" : "catch");
      }
      continue;
    }
    if (item.y > 1 + ITEM_SIZE) {
      if (item.kind !== "alarm") state.missed += 1;
      continue;
    }
    kept.push(item);
  }
  state.items = kept;

  if (state.time >= ROUND_SECONDS) {
    state.over = true;
    state.items = [];
  }
  return state;
}
