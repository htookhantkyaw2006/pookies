/** Date helpers. All take explicit timestamps so they stay pure and testable. */

const FALLBACK_ZONE = "UTC";

function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return FALLBACK_ZONE;
  }
}

/** The calendar day ("YYYY-MM-DD") that `ms` falls on in the given time zone. */
export function dateKeyInZone(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ms);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Moves a date key by whole days, e.g. shiftDateKey("2026-03-01", -1). */
export function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/** "Today", "Yesterday", or a short date such as "Mon, Nov 9". */
export function describeDateKey(key: string, todayKey: string): string {
  if (key === todayKey) return "Today";
  if (key === shiftDateKey(todayKey, -1)) return "Yesterday";
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(Date.UTC(year, month - 1, day));
}

/** A long form for headings, e.g. "Thursday, November 12". */
export function longDateInZone(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone(timeZone),
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(ms);
}

export function hourInZone(ms: number, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone(timeZone),
    hour: "numeric",
    hourCycle: "h23",
  }).format(ms);
  return Number(hour);
}

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Wall-clock time in a zone, e.g. "2:30 PM". */
export function clockInZone(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone(timeZone),
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}

/** Coarse on purpose: "just now", "12 min ago", "3 hr ago", "2 days ago". */
export function timeAgo(ms: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - ms) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
