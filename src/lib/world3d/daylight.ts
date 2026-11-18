/**
 * The light over the office through the day, from the viewer's own local
 * time: bright by day, warm at sunset, dark with stars at night. Pure maths,
 * so it can be tested without a screen.
 */

export interface Daylight {
  /** Background colour around the building. */
  sky: string;
  /** The sun (or moon) colour and strength. */
  sun: string;
  sunIntensity: number;
  /** Soft light from above and from the ground. */
  skyLight: string;
  groundLight: string;
  ambient: number;
  /** 0 at midday, 1 in the middle of the night: lamps, string lights and the fire follow this. */
  night: number;
}

const NIGHT: Daylight = {
  sky: "#1c1836",
  sun: "#a9b8ff",
  sunIntensity: 0.6,
  skyLight: "#7a7fc0",
  groundLight: "#2e2745",
  ambient: 0.8,
  night: 1,
};
const DAWN: Daylight = {
  sky: "#d6a3b8",
  sun: "#ffc9a3",
  sunIntensity: 1.7,
  skyLight: "#ffe2d4",
  groundLight: "#9a86b0",
  ambient: 1.2,
  night: 0.35,
};
const DAY: Daylight = {
  sky: "#9cc4e4",
  sun: "#fff1dc",
  sunIntensity: 2.9,
  skyLight: "#fff8f0",
  groundLight: "#b9a6c9",
  ambient: 1.45,
  night: 0,
};
const SUNSET: Daylight = {
  sky: "#e8a07e",
  sun: "#ffad72",
  sunIntensity: 2,
  skyLight: "#ffd4b8",
  groundLight: "#8d6f8f",
  ambient: 1.15,
  night: 0.3,
};
const EVENING: Daylight = {
  sky: "#3b2d5c",
  sun: "#c9a9ff",
  sunIntensity: 0.9,
  skyLight: "#9c8fd0",
  groundLight: "#3a2f52",
  ambient: 0.95,
  night: 0.8,
};

/** Key moments in the day; light in between blends smoothly. */
const KEYS: Array<[number, Daylight]> = [
  [0, NIGHT],
  [5, NIGHT],
  [6.5, DAWN],
  [8.5, DAY],
  [16.5, DAY],
  [18.5, SUNSET],
  [20, EVENING],
  [21.5, NIGHT],
  [24, NIGHT],
];

function mixColor(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const channel = (shift: number) => {
    const from = (pa >> shift) & 255;
    const to = (pb >> shift) & 255;
    return Math.round(from + (to - from) * t);
  };
  const value = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${value.toString(16).padStart(6, "0")}`;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The light for an hour of the day (0 to 24, fractions allowed). */
export function daylightAt(hour: number): Daylight {
  const h = ((hour % 24) + 24) % 24;
  let index = 0;
  while (index < KEYS.length - 2 && h >= KEYS[index + 1][0]) index += 1;
  const [startHour, from] = KEYS[index];
  const [endHour, to] = KEYS[index + 1];
  const raw = (h - startHour) / (endHour - startHour);
  // Ease in and out so changes feel gentle.
  const t = raw * raw * (3 - 2 * raw);
  return {
    sky: mixColor(from.sky, to.sky, t),
    sun: mixColor(from.sun, to.sun, t),
    sunIntensity: mix(from.sunIntensity, to.sunIntensity, t),
    skyLight: mixColor(from.skyLight, to.skyLight, t),
    groundLight: mixColor(from.groundLight, to.groundLight, t),
    ambient: mix(from.ambient, to.ambient, t),
    night: mix(from.night, to.night, t),
  };
}

/** The hour to show: the viewer's local time, or `?hour=` in the address to preview another. */
export function currentHour(now: Date, search: string): number {
  const preview = new URLSearchParams(search).get("hour");
  const wanted = preview === null ? Number.NaN : Number(preview);
  if (Number.isFinite(wanted) && wanted >= 0 && wanted <= 24) return wanted;
  return now.getHours() + now.getMinutes() / 60;
}
