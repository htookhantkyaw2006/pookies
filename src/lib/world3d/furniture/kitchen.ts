import { Group } from "three";
import { OFFICE_MAP, type Furniture } from "@/lib/world/map";
import { COLORS } from "../materials";
import { ball, box, cyl, group, rbox, ring } from "../parts";

const CABINET = "#cfe9dd";
const CABINET_DOOR = "#e2f3ea";

/** Where the espresso machine sits on the counter: the coffee "thing" on the map. */
function coffeeX(): number {
  return OFFICE_MAP.things.find((thing) => thing.kind === "coffee")?.x ?? 24.35;
}

function espressoMachine(x: number, z: number, top: number): Group {
  const spout = box(0.04, 0.06, 0.04, COLORS.metal, x, top + 0.2, z + 0.1);
  const mug = group(
    cyl(0.04, 0.036, 0.08, COLORS.paper, x, top + 0.065, z + 0.11),
    ring(0.022, 0.007, COLORS.paper, x + 0.045, top + 0.07, z + 0.11),
  );
  return group(
    rbox(0.44, 0.44, 0.34, COLORS.dark, x, top + 0.22, z - 0.03, 0.05),
    rbox(0.32, 0.03, 0.18, "#56495f", x, top + 0.015, z + 0.12, 0.01),
    box(0.36, 0.1, 0.06, "#56495f", x, top + 0.33, z + 0.15),
    spout,
    mug,
    ball(0.022, COLORS.red, x + 0.14, top + 0.36, z + 0.185, [1, 1, 1], { emissive: COLORS.red, glow: 0.8 }),
    ball(0.018, "#3fb37f", x + 0.08, top + 0.36, z + 0.185, [1, 1, 1], { emissive: "#3fb37f", glow: 0.8 }),
    // Cups warming on top.
    cyl(0.035, 0.03, 0.06, COLORS.rose, x - 0.1, top + 0.47, z - 0.03),
    cyl(0.035, 0.03, 0.06, COLORS.sky, x + 0.02, top + 0.47, z - 0.03),
  );
}

/** The kitchen counter along the back wall. */
export function buildCounter(item: Furniture): Group {
  const { x, y: z, w } = item.rect;
  const cx = x + w / 2;
  const depth = 0.82;
  const cz = z + depth / 2 + 0.02;
  const top = 0.56;
  const result = group(
    box(w - 0.04, top - 0.04, depth - 0.04, CABINET, cx, (top - 0.04) / 2, cz),
    rbox(w, 0.05, depth, COLORS.white, cx, top - 0.01, cz, 0.015),
    box(w - 0.06, 0.06, 0.02, "#bfdccd", cx, 0.03, cz + depth / 2 - 0.03),
  );
  // Cupboard doors with knobs along the front.
  const doors = Math.round(w / 0.75);
  const doorWidth = (w - 0.1) / doors;
  for (let i = 0; i < doors; i += 1) {
    const doorX = x + 0.05 + doorWidth * (i + 0.5);
    result.add(
      rbox(doorWidth - 0.05, 0.38, 0.02, CABINET_DOOR, doorX, 0.29, cz + depth / 2 - 0.01, 0.01),
      ball(0.018, COLORS.metal, doorX + doorWidth / 2 - 0.1, 0.4, cz + depth / 2 + 0.01),
    );
  }

  // Sink and tap at the left end.
  const sinkX = x + 0.75;
  const spout = box(0.03, 0.03, 0.16, COLORS.metal, sinkX, top + 0.24, cz - 0.17, { metal: 0.6, rough: 0.3 });
  result.add(
    box(0.56, 0.012, 0.42, "#cfe0ea", sinkX, top + 0.017, cz),
    box(0.48, 0.006, 0.34, "#a9c3d1", sinkX, top + 0.022, cz),
    cyl(0.018, 0.018, 0.24, COLORS.metal, sinkX, top + 0.13, cz - 0.25, 10, { metal: 0.6, rough: 0.3 }),
    spout,
  );

  // Espresso machine (where you make coffee), a fruit bowl and a mug tree.
  result.add(espressoMachine(coffeeX(), cz - 0.08, top + 0.015));
  const fruitX = x + w - 1.2;
  result.add(
    cyl(0.17, 0.11, 0.08, "#f1dbbb", fruitX, top + 0.055, cz),
    ball(0.055, "#f2a31b", fruitX - 0.06, top + 0.11, cz),
    ball(0.055, COLORS.red, fruitX + 0.06, top + 0.11, cz + 0.03),
    ball(0.05, "#9fd66b", fruitX, top + 0.14, cz - 0.04),
    cyl(0.01, 0.01, 0.28, COLORS.woodDark, x + w - 0.45, top + 0.15, cz - 0.1),
    cyl(0.07, 0.07, 0.015, COLORS.woodDark, x + w - 0.45, top + 0.02, cz - 0.1),
  );
  for (const [i, color] of [COLORS.rose, COLORS.butter, COLORS.sky].entries()) {
    result.add(cyl(0.035, 0.032, 0.07, color, x + w - 0.45 + (i - 1) * 0.07, top + 0.2 + i * 0.04, cz - 0.03));
  }

  // Wall cupboards above the left half (the window is on the right).
  for (let i = 0; i < 2; i += 1) {
    result.add(
      rbox(0.78, 0.36, 0.34, CABINET, x + 0.45 + i * 0.82, 1.02, z + 0.2, 0.03),
      ball(0.016, COLORS.metal, x + 0.45 + i * 0.82 + 0.28, 0.9, z + 0.38),
    );
  }
  return result;
}

/** A tall fridge with magnets and a little plant on top. */
export function buildFridge(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const depth = d - 0.2;
  const cz = z + 0.1 + depth / 2;
  const front = cz + depth / 2;
  const height = 1.2;
  const result = group(
    rbox(w - 0.14, height, depth, "#eef3f6", cx, height / 2, cz, 0.06),
    box(0.012, height - 0.1, 0.01, "#c6d3dc", cx, height / 2, front + 0.002),
    box(w - 0.3, 0.012, 0.01, "#c6d3dc", cx, 0.8, front + 0.002),
    rbox(0.03, 0.26, 0.03, COLORS.metal, cx - 0.08, 0.95, front + 0.02, 0.012),
    rbox(0.03, 0.26, 0.03, COLORS.metal, cx + 0.08, 0.95, front + 0.02, 0.012),
    rbox(0.03, 0.3, 0.03, COLORS.metal, cx - 0.08, 0.5, front + 0.02, 0.012),
  );
  const magnets = [COLORS.pink, COLORS.butter, COLORS.sky, COLORS.mint, COLORS.lilac];
  magnets.forEach((color, i) => {
    result.add(box(0.07, 0.07, 0.015, color, cx + 0.25 + (i % 2) * 0.13, 1.0 - i * 0.12, front + 0.008));
  });
  result.add(
    box(0.16, 0.2, 0.004, COLORS.paper, cx - 0.4, 0.6, front + 0.004),
    cyl(0.07, 0.06, 0.1, COLORS.terracotta, cx + 0.5, height + 0.05, cz),
    ball(0.09, "#5fbf8d", cx + 0.5, height + 0.15, cz),
  );
  return result;
}

/** The round kitchen table, with mugs and a vase. */
export function buildRoundTable(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const top = cyl(0.5, 0.5, 0.05, "#f1dbbb", cx, 0.42, cz, 28);
  top.scale.set((w - 0.25) / 1, 1, (d - 0.12) / 1);
  const edge = cyl(0.5, 0.5, 0.015, COLORS.woodEdge, cx, 0.39, cz, 28);
  edge.scale.copy(top.scale);
  return group(
    top,
    edge,
    cyl(0.05, 0.07, 0.38, COLORS.metal, cx, 0.2, cz, 12),
    cyl(0.26, 0.28, 0.03, COLORS.metal, cx, 0.015, cz, 20),
    cyl(0.04, 0.036, 0.08, COLORS.paper, cx - 0.4, 0.485, cz + 0.1),
    cyl(0.04, 0.036, 0.08, COLORS.rose, cx + 0.42, 0.485, cz - 0.08),
    cyl(0.05, 0.04, 0.16, "#cfe9ff", cx, 0.525, cz, 14, { opacity: 0.8, rough: 0.3 }),
    ball(0.04, COLORS.pink, cx - 0.02, 0.66, cz),
    ball(0.035, COLORS.butter, cx + 0.04, 0.63, cz + 0.02),
  );
}
