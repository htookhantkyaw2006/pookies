import { describe, expect, it } from "vitest";
import {
  clockInZone,
  dateKeyInZone,
  describeDateKey,
  greetingForHour,
  hourInZone,
  shiftDateKey,
  timeAgo,
} from "./dates";

// 2026-11-12 23:30 UTC: still the 12th in London, already the 13th in Tokyo.
const LATE_EVENING_UTC = Date.UTC(2026, 10, 12, 23, 30);

describe("dateKeyInZone", () => {
  it("gives each person their own local calendar day", () => {
    expect(dateKeyInZone(LATE_EVENING_UTC, "UTC")).toBe("2026-11-12");
    expect(dateKeyInZone(LATE_EVENING_UTC, "Asia/Tokyo")).toBe("2026-11-13");
    expect(dateKeyInZone(LATE_EVENING_UTC, "America/Los_Angeles")).toBe("2026-11-12");
  });

  it("falls back to UTC for a time zone it doesn't know", () => {
    expect(dateKeyInZone(LATE_EVENING_UTC, "Not/AZone")).toBe("2026-11-12");
  });
});

describe("shiftDateKey", () => {
  it("crosses month and year boundaries", () => {
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDateKey("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftDateKey("2026-11-12", 0)).toBe("2026-11-12");
  });
});

describe("describeDateKey", () => {
  it("names today and yesterday, and dates everything else", () => {
    expect(describeDateKey("2026-11-12", "2026-11-12")).toBe("Today");
    expect(describeDateKey("2026-11-11", "2026-11-12")).toBe("Yesterday");
    expect(describeDateKey("2026-11-09", "2026-11-12")).toBe("Mon, Nov 9");
  });
});

describe("hourInZone and greetingForHour", () => {
  it("reads the hour on a 0-23 clock in the zone", () => {
    expect(hourInZone(LATE_EVENING_UTC, "UTC")).toBe(23);
    expect(hourInZone(LATE_EVENING_UTC, "Asia/Tokyo")).toBe(8);
    expect(hourInZone(Date.UTC(2026, 10, 12, 0, 5), "UTC")).toBe(0);
  });

  it("picks a greeting for each part of the day", () => {
    expect(greetingForHour(5)).toBe("Good morning");
    expect(greetingForHour(11)).toBe("Good morning");
    expect(greetingForHour(12)).toBe("Good afternoon");
    expect(greetingForHour(17)).toBe("Good afternoon");
    expect(greetingForHour(18)).toBe("Good evening");
    expect(greetingForHour(2)).toBe("Good evening");
  });
});

describe("clockInZone", () => {
  it("shows the wall-clock time for a zone", () => {
    // Intl may use a narrow no-break space before AM/PM.
    expect(clockInZone(LATE_EVENING_UTC, "Asia/Tokyo").replace(/\s/g, " ")).toBe("8:30 AM");
  });
});

describe("timeAgo", () => {
  const now = 1_000_000_000;
  it("stays coarse", () => {
    expect(timeAgo(now - 20_000, now)).toBe("just now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3 hr ago");
    expect(timeAgo(now - 26 * 3_600_000, now)).toBe("1 day ago");
    expect(timeAgo(now - 50 * 3_600_000, now)).toBe("2 days ago");
  });

  it("never reports a time in the future", () => {
    expect(timeAgo(now + 60_000, now)).toBe("just now");
  });
});
