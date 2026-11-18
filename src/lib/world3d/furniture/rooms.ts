import { Group } from "three";
import type { Furniture } from "@/lib/world/map";
import { COLORS } from "../materials";
import { ball, box, cone, cyl, group, rbox, slab } from "../parts";
import { RUG_BOTTOM } from "../room";
import { SIGN_FREE } from "./washroom";

/** A big soft rug filling a personal space room. */
export function buildRoomRug(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const layers = [
    slab(w - 0.5, d - 0.5, 0.012, 0.5, "#f3c6d6", cx, RUG_BOTTOM, cz),
    slab(w - 0.9, d - 0.9, 0.004, 0.36, "#fbe3ec", cx, RUG_BOTTOM + 0.014, cz),
  ];
  for (const layer of layers) layer.userData.flat = true;
  return group(...layers);
}

/** A deep, cosy armchair facing into the room (towards +z). */
export function buildArmchair(item: Furniture): Group {
  const cx = item.rect.x + 0.5;
  const cz = item.rect.y + 0.5;
  const fabric = "#9fb7ea";
  const dark = "#7f98d6";
  return group(
    rbox(0.8, 0.22, 0.72, dark, cx, 0.13, cz, 0.08),
    rbox(0.62, 0.12, 0.56, fabric, cx, 0.28, cz + 0.06, 0.06),
    rbox(0.8, 0.5, 0.2, dark, cx, 0.45, cz - 0.28, 0.09),
    rbox(0.17, 0.32, 0.66, fabric, cx - 0.34, 0.34, cz, 0.08),
    rbox(0.17, 0.32, 0.66, fabric, cx + 0.34, 0.34, cz, 0.08),
    // A throw over one arm.
    rbox(0.2, 0.04, 0.4, COLORS.butter, cx + 0.34, 0.51, cz + 0.05, 0.02),
  );
}

/** A little round side table with a lamp that glows at night, and a book. */
export function buildSideTable(item: Furniture): Group {
  const cx = item.rect.x + 0.5;
  const cz = item.rect.y + 0.5;
  const book = rbox(0.18, 0.04, 0.24, COLORS.purple, cx + 0.12, 0.47, cz + 0.08, 0.01);
  book.rotation.y = 0.4;
  return group(
    cyl(0.26, 0.26, 0.04, COLORS.wood, cx, 0.44, cz, 20),
    cyl(0.04, 0.05, 0.42, COLORS.woodDark, cx, 0.21, cz, 10),
    cyl(0.16, 0.18, 0.03, COLORS.woodDark, cx, 0.015, cz, 16),
    cyl(0.06, 0.07, 0.04, COLORS.dark, cx - 0.08, 0.48, cz - 0.06, 12),
    cyl(0.012, 0.012, 0.22, COLORS.dark, cx - 0.08, 0.6, cz - 0.06, 6),
    cone(0.13, 0.16, COLORS.butter, cx - 0.08, 0.76, cz - 0.06),
    ball(0.05, "#fff3c4", cx - 0.08, 0.7, cz - 0.06, [1, 1, 1], { emissive: "#ffe7a8", glow: 1.2, when: "night" }),
    book,
  );
}

/**
 * A little sign on a post just inside a personal space room, beside its door
 * (the door is in the wall above the room; the sign stands to its left).
 * Its light is kept separate (userData.roomSign) so the stage can show green
 * while the room is free and red while someone's inside.
 */
export function buildDoorSign(item: Furniture): Group {
  const cx = item.rect.x - 0.25;
  const cz = item.rect.y + item.rect.h + 0.08;
  const result = group(
    rbox(0.42, 0.26, 0.05, COLORS.paper, cx, 0.62, cz, 0.02),
    box(0.04, 0.5, 0.04, COLORS.dark, cx, 0.25, cz - 0.03),
  );
  const light = ball(0.05, COLORS.paper, cx, 0.62, cz + 0.04);
  light.material = SIGN_FREE;
  light.userData.dynamic = true;
  light.userData.roomSign = item.id;
  result.add(light);
  return result;
}
