import { describe, expect, it } from "vitest";
import { latestEntryByUser } from "@/lib/presence/derive";
import { CURRENT_USER_ID, createSeed } from "./seed";
import { simulateStep } from "./simulate";

const NOW = Date.UTC(2026, 10, 12, 10, 0);

/** Small deterministic random source so runs are repeatable. */
function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

describe("createSeed", () => {
  it("builds a small team with you connected and at least one admin", () => {
    const state = createSeed(NOW, "UTC");
    expect(state.members.length).toBeGreaterThanOrEqual(3);
    expect(state.members.length).toBeLessThanOrEqual(15);
    expect(state.members.some((m) => m.role === "admin")).toBe(true);
    expect(latestEntryByUser(state.presence).has(CURRENT_USER_ID)).toBe(true);
  });

  it("only references people who exist", () => {
    const state = createSeed(NOW, "UTC");
    const ids = new Set(state.members.map((m) => m.id));
    for (const entry of state.presence) expect(ids.has(entry.userId)).toBe(true);
    for (const checkIn of state.checkIns) expect(ids.has(checkIn.userId)).toBe(true);
  });

  it("has at most one check-in per person per day", () => {
    const state = createSeed(NOW, "UTC");
    const keys = state.checkIns.map((c) => `${c.userId}|${c.date}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("simulateStep", () => {
  it("never changes your own status, note or connection", () => {
    const random = seededRandom(7);
    let id = 0;
    let state = createSeed(NOW, "UTC");
    const meBefore = state.members.find((m) => m.id === CURRENT_USER_ID);
    const myEntryBefore = latestEntryByUser(state.presence).get(CURRENT_USER_ID);

    for (let step = 0; step < 500; step += 1) {
      state = simulateStep({ ...state, now: NOW + step * 7_000 }, random, () => `sim-${(id += 1)}`);
    }

    expect(state.members.find((m) => m.id === CURRENT_USER_ID)).toEqual(meBefore);
    expect(latestEntryByUser(state.presence).get(CURRENT_USER_ID)).toEqual(myEntryBefore);
  });

  it("keeps the office consistent over a long run", () => {
    const random = seededRandom(42);
    let id = 0;
    let state = createSeed(NOW, "UTC");

    for (let step = 0; step < 500; step += 1) {
      state = simulateStep({ ...state, now: NOW + step * 7_000 }, random, () => `sim-${(id += 1)}`);

      const perUser = state.presence.map((entry) => entry.userId);
      expect(new Set(perUser).size).toBe(perUser.length);

      const perDay = state.checkIns.map((c) => `${c.userId}|${c.date}`);
      expect(new Set(perDay).size).toBe(perDay.length);
    }

    expect(state.members).toHaveLength(createSeed(NOW, "UTC").members.length);
  });

  it("leaves a one-person office alone", () => {
    const seed = createSeed(NOW, "UTC");
    const solo = {
      ...seed,
      members: seed.members.filter((m) => m.id === CURRENT_USER_ID),
      presence: seed.presence.filter((entry) => entry.userId === CURRENT_USER_ID),
    };
    expect(simulateStep(solo, seededRandom(1), () => "x")).toBe(solo);
  });
});
