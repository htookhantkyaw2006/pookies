/** A small seeded random number generator, so a game plays the same way for the same seed. */
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0 || 1;
  return () => {
    // mulberry32
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
