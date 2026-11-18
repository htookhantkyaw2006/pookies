import { Group } from "three";
import type { Furniture } from "@/lib/world/map";
import { COLORS } from "../materials";
import { ball, box, cyl, group, rbox, slab } from "../parts";
import { RUG_BOTTOM } from "../room";

/**
 * The game corner: arcade cabinets, a foosball table and the line you throw
 * darts from. Every piece is built facing into the room (towards +z).
 */

/** An arcade cabinet against the wall, its screen and sign lit up. */
export function buildArcade(item: Furniture): Group {
  const cx = item.rect.x + 0.5;
  const back = item.rect.y + 0.1;
  const body = item.id.endsWith("1") ? COLORS.purpleDeep : COLORS.pink;
  const trim = item.id.endsWith("1") ? COLORS.butter : COLORS.sky;
  const screen = box(0.5, 0.36, 0.03, "#2b2440", cx, 0.86, back + 0.47, {
    emissive: item.id.endsWith("1") ? "#9fe8ff" : "#ffd27a",
    glow: 0.9,
  });
  screen.rotation.x = -0.2;
  const panel = rbox(0.66, 0.06, 0.26, COLORS.dark, cx, 0.6, back + 0.62, 0.02);
  panel.rotation.x = 0.25;
  return group(
    // The cabinet: tall back, a step forward for the screen, a narrow base.
    rbox(0.7, 1.16, 0.42, body, cx, 0.58, back + 0.21, 0.04),
    rbox(0.7, 0.48, 0.2, body, cx, 0.82, back + 0.48, 0.03),
    rbox(0.64, 0.5, 0.16, body, cx, 0.25, back + 0.5, 0.03),
    // A glowing sign along the top.
    box(0.62, 0.14, 0.03, trim, cx, 1.06, back + 0.43, { emissive: trim, glow: 0.7 }),
    screen,
    panel,
    cyl(0.012, 0.012, 0.08, COLORS.dark, cx - 0.14, 0.67, back + 0.62, 6),
    ball(0.035, COLORS.red, cx - 0.14, 0.72, back + 0.62),
    ball(0.028, COLORS.butter, cx + 0.06, 0.65, back + 0.64),
    ball(0.028, COLORS.mint, cx + 0.15, 0.65, back + 0.6),
    // Coin slot.
    box(0.08, 0.1, 0.01, COLORS.butter, cx, 0.32, back + 0.585, { emissive: COLORS.butter, glow: 0.4 }),
  );
}

/** A foosball table across two tiles: green pitch, rods and little players. */
export function buildFoosball(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const width = w - 0.25;
  const depth = d - 0.3;
  const parts = [
    rbox(width, 0.2, depth, COLORS.woodDark, cx, 0.5, cz, 0.04),
    box(width - 0.1, 0.02, depth - 0.1, COLORS.green, cx, 0.6, cz),
    box(0.02, 0.022, depth - 0.12, "#ffffff", cx, 0.611, cz),
  ];
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    parts.push(box(0.07, 0.42, 0.07, COLORS.woodDark, cx + dx * (width / 2 - 0.08), 0.21, cz + dz * (depth / 2 - 0.08)));
  }
  // Rods run front to back, with players on each, alternating teams.
  const rods = 6;
  for (let i = 0; i < rods; i += 1) {
    const rx = cx - width / 2 + 0.16 + (i * (width - 0.32)) / (rods - 1);
    const rod = cyl(0.012, 0.012, depth + 0.24, COLORS.metal, rx, 0.68, cz, 6);
    rod.rotation.x = Math.PI / 2;
    parts.push(rod);
    const team = i % 2 === 0 ? COLORS.red : COLORS.skyDeep;
    for (const offset of i === 0 || i === rods - 1 ? [0] : [-0.15, 0.15]) {
      parts.push(rbox(0.05, 0.12, 0.05, team, rx, 0.65, cz + offset, 0.015));
    }
    // Handles stick out the near side.
    parts.push(cyl(0.025, 0.025, 0.08, COLORS.dark, rx, 0.68, cz + depth / 2 + 0.12, 8).rotateX(Math.PI / 2));
  }
  return group(...parts);
}

/** A strip of tape on the floor: stand behind it to throw darts. */
export function buildThrowLine(item: Furniture): Group {
  const { x, y: z, w } = item.rect;
  const line = slab(w - 0.4, 0.07, 0.004, 0.02, COLORS.butter, x + w / 2, RUG_BOTTOM, z + 0.5);
  line.userData.flat = true;
  return group(line);
}
