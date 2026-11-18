/**
 * Day or night in the 3D office: "auto" follows this computer's clock;
 * "day" and "night" pin it. A per-browser preference, remembered here.
 */

export type SkyMode = "auto" | "day" | "night";

const STORAGE_KEY = "pookies-sky";
const ORDER: readonly SkyMode[] = ["auto", "day", "night"];

/** The hours "day" and "night" stand for. */
export const PINNED_HOURS = { day: 12, night: 22 } as const;

let mode: SkyMode | null = null;
const listeners = new Set<() => void>();

export function getSkyMode(): SkyMode {
  if (mode === null) {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage can be blocked; follow the clock.
    }
    mode = saved === "day" || saved === "night" ? saved : "auto";
  }
  return mode;
}

export function setSkyMode(next: SkyMode): void {
  mode = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not remembered, but still applies for now.
  }
  for (const listener of listeners) listener();
}

/** Auto, then day, then night, then back to auto. */
export function nextSkyMode(current: SkyMode): SkyMode {
  return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}

export function subscribeSkyMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The hour to light the office for: pinned, or the clock (which `?hour=` can preview). */
export function skyHour(current: SkyMode, clockHour: number): number {
  return current === "auto" ? clockHour : PINNED_HOURS[current];
}
