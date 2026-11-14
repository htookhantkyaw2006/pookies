import { Group } from "three";
import type { Furniture } from "@/lib/world/map";
import { COLORS } from "../materials";
import { RUG_BOTTOM } from "../room";
import { ball, box, cone, cyl, group, pick, rbox, ring, seeded, slab } from "../parts";

const DESK_TOP = 0.42;
const SCREENS = ["#bfe0ff", "#d7ccff", "#c8f2df", "#ffe3c4"];

/** Four slim legs under a table top. */
function legs(x: number, z: number, w: number, d: number, height: number, inset = 0.12): Group {
  const result = new Group();
  for (const [lx, lz] of [
    [x + inset, z + inset],
    [x + w - inset, z + inset],
    [x + inset, z + d - inset],
    [x + w - inset, z + d - inset],
  ]) {
    result.add(cyl(0.03, 0.025, height, COLORS.metal, lx, height / 2, lz, 10));
  }
  return result;
}

/**
 * A monitor on a stand, its screen looking along `facing` (+1 towards +z,
 * -1 towards -z), with a few lines of "work" glowing on it.
 */
export function monitor(x: number, z: number, facing: 1 | -1, random: () => number): Group {
  const screen = pick(random, SCREENS);
  const top = DESK_TOP + 0.025;
  const result = group(
    rbox(0.22, 0.02, 0.13, COLORS.dark, x, top + 0.01, z, 0.008),
    box(0.035, 0.16, 0.03, COLORS.dark, x, top + 0.09, z - facing * 0.02),
    rbox(0.6, 0.36, 0.035, COLORS.dark, x, top + 0.28, z, 0.012),
    box(0.54, 0.3, 0.004, screen, x, top + 0.28, z + facing * 0.019, {
      emissive: screen,
      glow: 0.55,
      rough: 0.4,
    }),
  );
  for (let line = 0; line < 3; line += 1) {
    const width = 0.15 + random() * 0.25;
    result.add(
      box(width, 0.025, 0.003, "#5c6f9e", x - 0.22 + width / 2, top + 0.36 - line * 0.07, z + facing * 0.022, {
        emissive: "#7d8fc4",
        glow: 0.3,
      }),
    );
  }
  return result;
}

export function keyboard(x: number, z: number): Group {
  const top = DESK_TOP + 0.025;
  return group(
    rbox(0.4, 0.022, 0.13, "#f4f1f8", x, top + 0.011, z, 0.008),
    box(0.34, 0.004, 0.09, "#dcd6e6", x, top + 0.024, z),
    ball(0.032, "#f4f1f8", x + 0.29, top + 0.012, z, [1, 0.45, 1.4]),
  );
}

/** Something personal on each desk: a mug, a little plant, papers or a lamp. */
export function deskItem(x: number, z: number, random: () => number): Group {
  const top = DESK_TOP + 0.025;
  const kind = Math.floor(random() * 4);
  if (kind === 0) {
    const color = pick(random, [COLORS.rose, COLORS.sky, COLORS.butter, COLORS.mint]);
    const mug = group(cyl(0.04, 0.036, 0.09, color, x, top + 0.045, z), cyl(0.033, 0.033, 0.005, "#6b4a36", x, top + 0.088, z));
    const handle = ring(0.025, 0.008, color, x + 0.045, top + 0.05, z);
    handle.rotation.y = Math.PI / 2;
    mug.add(handle);
    return mug;
  }
  if (kind === 1) {
    return group(
      cyl(0.045, 0.035, 0.07, COLORS.terracotta, x, top + 0.035, z),
      ball(0.06, "#5fbf8d", x, top + 0.11, z, [1, 0.9, 1]),
      ball(0.04, "#3fa173", x + 0.03, top + 0.15, z - 0.01),
    );
  }
  if (kind === 2) {
    const first = box(0.2, 0.012, 0.27, COLORS.paper, x, top + 0.006, z);
    const second = box(0.2, 0.012, 0.27, "#f6f0e2", x + 0.02, top + 0.018, z + 0.01);
    second.rotation.y = 0.2;
    return group(first, second);
  }
  const arm = box(0.02, 0.26, 0.02, COLORS.dark, x, top + 0.14, z);
  arm.rotation.z = 0.25;
  const head = cone(0.06, 0.08, COLORS.butter, x + 0.05, top + 0.27, z);
  head.rotation.z = -2.4;
  return group(cyl(0.06, 0.065, 0.02, COLORS.dark, x, top + 0.01, z), arm, head);
}

/** Four desks pushed together, two each side of a felt divider. */
export function buildPod(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const random = seeded(item.id);
  const result = group(
    rbox(w - 0.08, 0.05, d - 0.1, COLORS.wood, cx, DESK_TOP, cz, 0.02),
    box(w - 0.12, 0.012, d - 0.14, COLORS.woodEdge, cx, DESK_TOP - 0.031, cz),
    legs(x + 0.04, z + 0.05, w - 0.08, d - 0.1, DESK_TOP - 0.025),
    box(w - 0.5, 0.16, 0.03, COLORS.woodDark, cx, 0.24, cz),
    rbox(w - 0.3, 0.24, 0.05, COLORS.felt, cx, DESK_TOP + 0.145, cz, 0.02),
  );
  for (const seatX of [x + 1, x + 3]) {
    // The row above faces down into the pod; the row below faces up.
    result.add(monitor(seatX, cz - 0.24, -1, random));
    result.add(keyboard(seatX, z + 0.3));
    result.add(deskItem(seatX + (random() > 0.5 ? 0.42 : -0.42), z + 0.32, random));

    result.add(monitor(seatX, cz + 0.24, 1, random));
    result.add(keyboard(seatX, z + d - 0.3));
    result.add(deskItem(seatX + (random() > 0.5 ? 0.42 : -0.42), z + d - 0.32, random));
  }
  return result;
}

/** A single desk in the focus room, with a privacy screen at the back. */
export function buildDesk(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const random = seeded(item.id);
  // flip: the chair is above (north of) the desk, so the person looks south.
  const toward: 1 | -1 = item.flip ? -1 : 1;
  const backZ = item.flip ? z + d - 0.1 : z + 0.1;
  const result = group(
    rbox(w - 0.12, 0.05, d - 0.16, COLORS.wood, cx, DESK_TOP, cz, 0.02),
    legs(x + 0.06, z + 0.08, w - 0.12, d - 0.16, DESK_TOP - 0.025),
    rbox(w - 0.2, 0.3, 0.04, COLORS.sky, cx, DESK_TOP + 0.17, backZ, 0.02),
    monitor(cx - 0.1, cz - toward * 0.12, toward, random),
    keyboard(cx - 0.1, cz + toward * 0.28),
    deskItem(cx + 0.65, cz + toward * 0.15, random),
  );
  // Headphones resting on the desk.
  const band = ring(0.08, 0.012, COLORS.dark, cx - 0.72, DESK_TOP + 0.06, cz, Math.PI);
  band.rotation.y = Math.PI / 2;
  result.add(band, ball(0.035, COLORS.purple, cx - 0.72, DESK_TOP + 0.045, cz - 0.08), ball(0.035, COLORS.purple, cx - 0.72, DESK_TOP + 0.045, cz + 0.08));
  return result;
}

/** The long meeting table, with a laptop, papers and a speaker puck. */
export function buildMeetingTable(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const top = 0.42;
  const laptopScreen = box(0.42, 0.28, 0.015, COLORS.dark, cx - 0.1, top + 0.17, cz - 0.05);
  laptopScreen.rotation.x = -0.25;
  const glow = box(0.38, 0.24, 0.003, "#cfe2ff", cx - 0.1, top + 0.17, cz - 0.04, { emissive: "#cfe2ff", glow: 0.5 });
  glow.rotation.x = -0.25;
  const paperA = box(0.24, 0.006, 0.32, COLORS.paper, cx - 1.3, top + 0.035, cz + 0.2);
  paperA.rotation.y = 0.3;
  const paperB = box(0.24, 0.006, 0.32, COLORS.paper, cx + 1.1, top + 0.035, cz - 0.25);
  paperB.rotation.y = -0.2;
  return group(
    slab(w - 0.2, d - 0.5, 0.06, 0.62, "#f1dbbb", cx, top - 0.03, cz),
    slab(w - 0.3, d - 0.6, 0.012, 0.56, COLORS.woodEdge, cx, top - 0.045, cz),
    cyl(0.07, 0.1, top - 0.03, COLORS.metal, cx - 1.4, (top - 0.03) / 2, cz),
    cyl(0.07, 0.1, top - 0.03, COLORS.metal, cx + 1.4, (top - 0.03) / 2, cz),
    cyl(0.32, 0.32, 0.03, COLORS.metal, cx - 1.4, 0.015, cz),
    cyl(0.32, 0.32, 0.03, COLORS.metal, cx + 1.4, 0.015, cz),
    rbox(0.42, 0.02, 0.3, "#d6d0de", cx - 0.1, top + 0.04, cz + 0.12, 0.008),
    laptopScreen,
    glow,
    paperA,
    paperB,
    cyl(0.1, 0.11, 0.04, COLORS.dark, cx + 0.6, top + 0.05, cz + 0.1),
    ring(0.07, 0.006, "#7fd3a8", cx + 0.6, top + 0.072, cz + 0.1).rotateX(Math.PI / 2),
    cyl(0.035, 0.03, 0.1, "#dff1ff", cx + 1.5, top + 0.08, cz + 0.2, 12, { opacity: 0.7 }),
    cyl(0.035, 0.03, 0.1, "#dff1ff", cx - 1.6, top + 0.08, cz - 0.2, 12, { opacity: 0.7 }),
  );
}

/** A tall bookshelf, filled with books in Pookies colours. */
export function buildBookshelf(item: Furniture): Group {
  const { x, y: z, w } = item.rect;
  const cx = x + w / 2;
  const depth = 0.4;
  const backZ = z + 0.06 + depth / 2;
  const height = 1.15;
  const random = seeded(item.id);
  const colors = [COLORS.pink, COLORS.sky, COLORS.butter, COLORS.mint, COLORS.lilac, COLORS.peach, "#8f73df", "#5fbf8d"];
  const result = group(
    box(w - 0.1, height, 0.03, "#b98a62", cx, height / 2, z + 0.08),
    box(0.05, height, depth, "#a87a54", x + 0.08, height / 2, backZ),
    box(0.05, height, depth, "#a87a54", x + w - 0.08, height / 2, backZ),
  );
  const shelves = [0.04, 0.4, 0.76, 1.12];
  for (const shelfY of shelves) result.add(box(w - 0.12, 0.04, depth, "#b98a62", cx, shelfY, backZ));
  for (const shelfY of shelves.slice(0, 3)) {
    let bookX = x + 0.14;
    while (bookX < x + w - 0.2) {
      const width = 0.05 + random() * 0.05;
      const tall = 0.2 + random() * 0.1;
      if (random() > 0.88) {
        bookX += 0.12; // a gap
        continue;
      }
      const book = box(width, tall, 0.26, pick(random, colors), bookX + width / 2, shelfY + 0.02 + tall / 2, backZ);
      if (random() > 0.9) book.rotation.z = 0.25;
      result.add(book);
      bookX += width + 0.01;
    }
  }
  result.add(
    cyl(0.07, 0.06, 0.12, COLORS.terracotta, x + 0.45, height + 0.2, backZ),
    ball(0.1, "#5fbf8d", x + 0.45, height + 0.32, backZ),
    rbox(0.22, 0.16, 0.16, COLORS.rose, x + w - 0.5, height + 0.22, backZ, 0.04),
  );
  return result;
}

/** The office printer on a little cabinet, with a page coming out. */
export function buildPrinter(item: Furniture): Group {
  const { x, y: z } = item.rect;
  const cx = x + 0.5;
  const cz = z + 0.5;
  return group(
    rbox(0.74, 0.42, 0.6, "#d6cde0", cx, 0.21, cz, 0.04),
    box(0.6, 0.01, 0.01, "#bfb3cc", cx, 0.3, cz + 0.301),
    rbox(0.66, 0.24, 0.5, "#f4f2f7", cx, 0.54, cz - 0.02, 0.05),
    rbox(0.6, 0.04, 0.44, "#e3dde9", cx, 0.68, cz - 0.04, 0.02),
    box(0.4, 0.01, 0.26, COLORS.paper, cx, 0.5, cz + 0.27),
    box(0.12, 0.05, 0.02, COLORS.dark, cx + 0.2, 0.62, cz + 0.23),
    ball(0.015, "#3fb37f", cx + 0.17, 0.62, cz + 0.245, [1, 1, 1], { emissive: "#3fb37f", glow: 0.9 }),
  );
}

/** A water cooler with a blue bottle and paper cups. */
export function buildWaterCooler(item: Furniture): Group {
  const { x, y: z } = item.rect;
  const cx = x + 0.5;
  const cz = z + 0.5;
  return group(
    rbox(0.42, 0.62, 0.42, "#eef2f6", cx, 0.31, cz, 0.05),
    box(0.3, 0.08, 0.02, "#dbe3ea", cx, 0.42, cz + 0.21),
    box(0.04, 0.05, 0.04, COLORS.red, cx - 0.07, 0.48, cz + 0.22),
    box(0.04, 0.05, 0.04, "#5f9fd6", cx + 0.07, 0.48, cz + 0.22),
    cyl(0.15, 0.15, 0.4, "#a9d8ff", cx, 0.86, cz, 20, { opacity: 0.75, rough: 0.25 }),
    cyl(0.07, 0.15, 0.06, "#a9d8ff", cx, 0.63, cz, 20, { opacity: 0.75, rough: 0.25 }),
    cyl(0.03, 0.03, 0.03, "#5f9fd6", cx, 1.075, cz),
    cyl(0.04, 0.04, 0.16, "#f4f2f7", cx + 0.25, 0.42, cz),
  );
}

/** The welcome mat inside the front door. */
export function buildDoormat(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const mat = slab(w - 0.3, d - 0.35, 0.02, 0.12, "#e0a877", cx, RUG_BOTTOM, cz + 0.05);
  mat.userData.flat = true;
  const result = group(mat);
  for (let i = 0; i < 4; i += 1) {
    const stripe = box(w - 0.5, 0.004, 0.04, "#c98b5e", cx, RUG_BOTTOM + 0.024, cz - 0.15 + i * 0.1);
    stripe.userData.flat = true;
    result.add(stripe);
  }
  return result;
}
