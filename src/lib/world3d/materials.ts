import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

/**
 * Shared materials for the 3D office. Every colour is made once and reused,
 * which keeps the number of materials (and draw calls) small.
 */

export interface Finish {
  /** Glow colour, for screens and lamps. */
  emissive?: string;
  glow?: number;
  rough?: number;
  metal?: number;
  opacity?: number;
  /**
   * When the glow shows: "night" for lamps, string lights and the fire (bright
   * after dark, almost off by day); "day" for window glass (bright by day).
   * The stage adjusts these with the time of day.
   */
  when?: "night" | "day";
}

/** A material whose glow follows the time of day. */
export interface TimedGlow {
  when: "night" | "day";
  glow: number;
}

const cache = new Map<string, MeshStandardMaterial>();

export function paint(color: string, finish: Finish = {}): MeshStandardMaterial {
  const rough = finish.rough ?? 0.82;
  const metal = finish.metal ?? 0;
  const opacity = finish.opacity ?? 1;
  const key = `${color}|${finish.emissive ?? ""}|${finish.glow ?? 0}|${rough}|${metal}|${opacity}|${finish.when ?? ""}`;
  let material = cache.get(key);
  if (!material) {
    material = new MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      emissive: finish.emissive ?? "#000000",
      emissiveIntensity: finish.glow ?? 0,
      transparent: opacity < 1,
      opacity,
    });
    if (finish.when) {
      const timed: TimedGlow = { when: finish.when, glow: finish.glow ?? 0 };
      material.userData.timedGlow = timed;
    }
    cache.set(key, material);
  }
  return material;
}

/** The Pookies colours, as used across the office. */
export const COLORS = {
  wallSide: "#f6ece2",
  wallTop: "#5b4a63",
  base: "#4a3b52",
  baseboard: "#e2cdb8",
  doorway: "#ead9c4",
  wood: "#ecd0a8",
  woodDark: "#c9a27a",
  woodEdge: "#d6b184",
  metal: "#9a8fa6",
  dark: "#3b3247",
  white: "#fbfaf7",
  paper: "#ffffff",
  felt: "#c9bff2",
  lilac: "#cfbcf8",
  purple: "#8f73df",
  purpleSoft: "#b8a2f0",
  purpleDeep: "#7a5fd2",
  pink: "#ff8fa3",
  rose: "#ffb5c9",
  peach: "#ffc4a3",
  butter: "#ffe08a",
  mint: "#a9e5c8",
  mintDeep: "#74c9a0",
  sky: "#aed6f8",
  skyDeep: "#7bb5e6",
  red: "#e5484d",
  green: "#3fa173",
  terracotta: "#d98c5f",
  soil: "#6b4a36",
} as const;

type Pattern = "planks" | "tiles" | "carpet" | "stripes";

/**
 * A small repeating floor pattern, generated in code so nothing is
 * downloaded. One texture repeat covers `TEXTURE_TILES` tiles.
 */
export const TEXTURE_TILES = 2;

function hex(color: string): [number, number, number] {
  const value = Number.parseInt(color.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function makePattern(pattern: Pattern, base: string, line: string): DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const [br, bg, bb] = hex(base);
  const [lr, lg, lb] = hex(line);
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // A gentle tone per plank / tile so the floor doesn't look flat.
  const tones: number[] = Array.from({ length: 64 }, () => (random() - 0.5) * 10);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let isLine = false;
      let tone = 0;
      if (pattern === "planks") {
        const row = Math.floor(y / 8);
        const offset = row % 2 === 0 ? 0 : 20;
        isLine = y % 8 === 0 || (x + offset) % 40 === 0;
        tone = tones[row * 2 + Math.floor(((x + offset) % 64) / 40)];
      } else if (pattern === "tiles") {
        isLine = x % 16 === 0 || y % 16 === 0;
        const checker = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
        tone = checker ? 5 : -5;
      } else if (pattern === "carpet") {
        tone = (random() - 0.5) * 14;
      } else {
        isLine = Math.floor(x / 8) % 2 === 0;
      }
      const i = (y * size + x) * 4;
      if (isLine) {
        data[i] = lr;
        data[i + 1] = lg;
        data[i + 2] = lb;
      } else {
        data[i] = Math.max(0, Math.min(255, br + tone));
        data[i + 1] = Math.max(0, Math.min(255, bg + tone));
        data[i + 2] = Math.max(0, Math.min(255, bb + tone));
      }
      data[i + 3] = 255;
    }
  }

  const texture = new DataTexture(data, size, size);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

const floorCache = new Map<string, MeshStandardMaterial>();

/** A patterned floor material. */
export function floorPaint(pattern: Pattern, base: string, line: string): MeshStandardMaterial {
  const key = `${pattern}|${base}|${line}`;
  let material = floorCache.get(key);
  if (!material) {
    material = new MeshStandardMaterial({
      map: makePattern(pattern, base, line),
      roughness: pattern === "tiles" ? 0.55 : 0.9,
    });
    floorCache.set(key, material);
  }
  return material;
}
