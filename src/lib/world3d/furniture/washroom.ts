import { Group } from "three";
import type { Furniture } from "@/lib/world/map";
import { COLORS, paint } from "../materials";
import { ball, box, cyl, group, rbox } from "../parts";
import { RUG_BOTTOM } from "../room";

const TILE_WHITE = "#f7fafc";
const PARTITION = "#cfe3ef";
const PARTITION_DARK = "#a9c7d8";
const CHROME = "#b9c4cc";

/** Signs on stall doors: green when free, red when someone's in. The stage swaps them. */
export const SIGN_FREE = paint("#3fb37f", { emissive: "#3fb37f", glow: 0.6 });
export const SIGN_TAKEN = paint("#e5484d", { emissive: "#e5484d", glow: 0.6 });

/**
 * A toilet stall: partitions, a door at the front, and a toilet inside. The
 * door's little sign is kept separate (userData.stallSign) so it can change.
 */
export function buildStall(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const height = 0.95;
  const front = z + d - 0.06;
  const result = group(
    box(0.05, height, d - 0.1, PARTITION, x + 0.05, height / 2 + 0.05, z + d / 2),
    box(0.05, height, d - 0.1, PARTITION, x + w - 0.05, height / 2 + 0.05, z + d / 2),
    // The door, slightly ajar at the bottom like real stalls.
    rbox(w - 0.2, height - 0.1, 0.05, PARTITION_DARK, cx, height / 2 + 0.1, front, 0.02),
    ball(0.03, CHROME, cx + w / 2 - 0.3, 0.55, front + 0.04),
    // The toilet, seen over the partitions.
    rbox(0.42, 0.3, 0.28, TILE_WHITE, cx, 0.4, z + 0.22, 0.05),
    cyl(0.2, 0.17, 0.22, TILE_WHITE, cx, 0.11, z + 0.62, 18),
    cyl(0.21, 0.21, 0.04, "#e9eef2", cx, 0.24, z + 0.62, 18),
    box(0.22, 0.012, 0.012, CHROME, cx + 0.32, 0.5, z + 0.5),
  );
  const sign = box(0.14, 0.07, 0.02, TILE_WHITE, cx, 0.82, front + 0.04);
  sign.material = SIGN_FREE;
  sign.userData.dynamic = true;
  sign.userData.stallSign = item.id;
  result.add(sign);
  // A toilet roll on the partition.
  const roll = cyl(0.05, 0.05, 0.09, "#ffffff", x + w - 0.13, 0.45, z + 0.7, 12);
  roll.rotation.z = Math.PI / 2;
  result.add(roll);
  return result;
}

/** A counter of sinks against the wall, with taps and a soap pump. */
export function buildSinkCounter(item: Furniture): Group {
  const { x, y: z, h: d } = item.rect;
  const cz = z + d / 2;
  const cx = x + 0.55;
  const result = group(
    box(0.6, 0.42, d - 0.1, "#dce9f2", cx, 0.21, cz),
    rbox(0.66, 0.05, d - 0.06, TILE_WHITE, cx, 0.45, cz, 0.015),
  );
  for (const offset of [-0.65, 0.65]) {
    const sz = cz + offset;
    const spout = box(0.12, 0.025, 0.025, CHROME, cx + 0.12, 0.62, sz, { metal: 0.5, rough: 0.3 });
    result.add(
      cyl(0.2, 0.15, 0.04, "#e3eef5", cx - 0.02, 0.475, sz, 18),
      cyl(0.02, 0.02, 0.16, CHROME, cx + 0.2, 0.55, sz, 8, { metal: 0.5, rough: 0.3 }),
      spout,
    );
  }
  result.add(
    cyl(0.04, 0.045, 0.12, COLORS.mint, cx + 0.15, 0.53, cz, 12),
    cyl(0.01, 0.01, 0.05, CHROME, cx + 0.15, 0.62, cz, 6),
    // Folded towels.
    rbox(0.22, 0.06, 0.18, COLORS.lilac, cx, 0.5, z + 0.18, 0.02),
    rbox(0.22, 0.06, 0.18, COLORS.rose, cx, 0.56, z + 0.18, 0.02),
  );
  return result;
}

/** A glass shower cubicle with a rain head and a rubber duck. */
export function buildShower(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const glass = paint("#d7f0fb", { opacity: 0.45, rough: 0.1 });
  const tray = rbox(w - 0.15, 0.06, d - 0.15, TILE_WHITE, cx, 0.03, cz, 0.03);
  const result = group(
    tray,
    box(w - 0.2, 1.1, 0.03, glass, cx, 0.6, z + 0.1),
    box(0.03, 1.1, d - 0.2, glass, x + 0.1, 0.6, cz),
    box(0.03, 1.1, d - 0.2, glass, x + w - 0.1, 0.6, cz),
    box(w - 0.2, 1.1, 0.03, glass, cx, 0.6, z + d - 0.1),
    cyl(0.02, 0.02, 0.5, CHROME, x + w - 0.3, 0.95, z + 0.3, 8, { metal: 0.5, rough: 0.3 }),
    cyl(0.12, 0.12, 0.03, CHROME, x + w - 0.3, 1.2, z + 0.42, 16, { metal: 0.5, rough: 0.3 }),
    ball(0.07, COLORS.butter, cx - 0.2, 0.12, cz + 0.2, [1.2, 0.9, 1]),
    ball(0.045, COLORS.butter, cx - 0.14, 0.2, cz + 0.2),
  );
  return result;
}

/** A capsule nap pod with a soft mattress, pillow and blanket. */
export function buildNapPod(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const shell = "#b9a8e6";
  return group(
    rbox(w - 0.08, 0.28, d - 0.08, shell, cx, 0.14, cz, 0.12),
    rbox(w - 0.2, 0.08, d - 0.2, "#efe9fb", cx, 0.31, cz, 0.04),
    // A hood over the head end.
    rbox(w - 0.08, 0.5, 0.42, shell, cx, 0.45, z + 0.24, 0.16),
    rbox(0.5, 0.08, 0.26, "#ffffff", cx, 0.39, z + 0.55, 0.04),
    rbox(w - 0.22, 0.05, 0.85, "#8fa5e8", cx, 0.37, z + d - 0.55, 0.03),
    ball(0.025, "#ffe7a8", cx + 0.25, 0.62, z + 0.42, [1, 1, 1], { emissive: "#ffe7a8", glow: 1, when: "night" }),
  );
}

/** A round mat in the middle of the headspace room, for the breathing exercise. */
export function buildBreathMat(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const mat = cyl(0.85, 0.85, 0.02, "#c9bff2", cx, RUG_BOTTOM + 0.01, cz, 32);
  mat.userData.flat = true;
  const inner = cyl(0.55, 0.55, 0.004, "#e6dffb", cx, RUG_BOTTOM + 0.022, cz, 32);
  inner.userData.flat = true;
  const centre = cyl(0.22, 0.22, 0.004, "#cfbcf8", cx, RUG_BOTTOM + 0.026, cz, 24);
  centre.userData.flat = true;
  return group(mat, inner, centre);
}

/** A plump floor cushion. */
export function buildFloorCushion(item: Furniture): Group {
  const cx = item.rect.x + 0.5;
  const cz = item.rect.y + 0.5;
  const color = item.id.endsWith("1") ? COLORS.rose : COLORS.mint;
  return group(rbox(0.62, 0.16, 0.62, color, cx, 0.08, cz, 0.08), ball(0.035, "#ffffff", cx, 0.17, cz));
}
