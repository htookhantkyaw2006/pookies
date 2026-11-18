import { describe, expect, it } from "vitest";
import { currentHour, daylightAt } from "./daylight";
import { nextSkyMode, skyHour } from "./skyMode";

describe("daylight", () => {
  it("is bright at midday, with the lamps off", () => {
    const noon = daylightAt(12);
    expect(noon.night).toBe(0);
    expect(noon.sunIntensity).toBeGreaterThan(2.5);
  });

  it("is dark at midnight, with the lamps on", () => {
    const midnight = daylightAt(0);
    expect(midnight.night).toBe(1);
    expect(midnight.sunIntensity).toBeLessThan(1);
    expect(daylightAt(24)).toEqual(midnight);
  });

  it("changes gently: no sudden jumps from one minute to the next", () => {
    for (let minute = 0; minute < 24 * 60; minute += 1) {
      const now = daylightAt(minute / 60);
      const next = daylightAt((minute + 1) / 60);
      expect(Math.abs(next.night - now.night), `${minute}`).toBeLessThan(0.02);
      expect(Math.abs(next.sunIntensity - now.sunIntensity), `${minute}`).toBeLessThan(0.05);
    }
  });

  it("warms up at sunset", () => {
    const sunset = daylightAt(18.5);
    const red = Number.parseInt(sunset.sun.slice(1, 3), 16);
    const blue = Number.parseInt(sunset.sun.slice(5, 7), 16);
    expect(red).toBeGreaterThan(blue);
  });

  it("uses your own clock, unless ?hour= asks to preview another time", () => {
    const evening = new Date(2026, 10, 15, 21, 30);
    expect(currentHour(evening, "")).toBe(21.5);
    expect(currentHour(evening, "?hour=9")).toBe(9);
    expect(currentHour(evening, "?hour=nonsense")).toBe(21.5);
    expect(currentHour(evening, "?hour=40")).toBe(21.5);
  });
});

describe("the day/night switch", () => {
  it("cycles auto, day, night, then back to the clock", () => {
    expect(nextSkyMode("auto")).toBe("day");
    expect(nextSkyMode("day")).toBe("night");
    expect(nextSkyMode("night")).toBe("auto");
  });

  it("pins the hour for day and night, and follows the clock on auto", () => {
    expect(skyHour("auto", 7.5)).toBe(7.5);
    expect(daylightAt(skyHour("day", 23)).night).toBe(0);
    expect(daylightAt(skyHour("night", 12)).night).toBe(1);
  });
});
