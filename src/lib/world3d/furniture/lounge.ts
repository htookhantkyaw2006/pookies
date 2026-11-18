import { Group, PointLight } from "three";
import type { PlantMood } from "@/lib/data/rules";
import type { Furniture } from "@/lib/world/map";
import { COLORS } from "../materials";
import { RUG_BOTTOM } from "../room";
import { ball, box, cyl, group, seeded, slab } from "../parts";

export function buildCoffeeTable(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const top = 0.3;
  const magazine = box(0.26, 0.01, 0.34, COLORS.pink, cx - 0.35, top + 0.04, cz, { rough: 0.5 });
  magazine.rotation.y = -0.25;
  return group(
    slab(w - 0.2, d - 0.3, 0.05, 0.28, COLORS.wood, cx, top - 0.02, cz),
    slab(w - 0.4, d - 0.5, 0.02, 0.2, COLORS.woodDark, cx, 0.08, cz),
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => cyl(0.025, 0.025, top - 0.02, COLORS.woodDark, cx + sx * (w / 2 - 0.25), (top - 0.02) / 2, cz + sz * (d / 2 - 0.22), 8)),
    ),
    magazine,
    cyl(0.04, 0.036, 0.08, COLORS.butter, cx + 0.35, top + 0.07, cz - 0.05),
    cyl(0.06, 0.05, 0.07, COLORS.terracotta, cx + 0.1, top + 0.065, cz + 0.1),
    ball(0.05, "#7fcf9d", cx + 0.1, top + 0.12, cz + 0.1, [1, 0.8, 1]),
  );
}

/** A ping-pong table with net, paddles and a ball. */
export function buildGameTable(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const top = 0.42;
  const length = w - 0.1;
  const width = d - 0.12;
  const result = group(
    box(length, 0.04, width, COLORS.green, cx, top, cz, { rough: 0.6 }),
    box(length, 0.003, 0.02, COLORS.paper, cx, top + 0.022, cz - width / 2 + 0.02),
    box(length, 0.003, 0.02, COLORS.paper, cx, top + 0.022, cz + width / 2 - 0.02),
    box(0.02, 0.003, width, COLORS.paper, x + 0.07, top + 0.022, cz),
    box(0.02, 0.003, width, COLORS.paper, x + w - 0.07, top + 0.022, cz),
    box(length, 0.003, 0.01, COLORS.paper, cx, top + 0.022, cz),
    box(0.015, 0.1, width + 0.06, "#ffffff", cx, top + 0.07, cz, { opacity: 0.85 }),
    cyl(0.012, 0.012, 0.12, COLORS.dark, cx, top + 0.06, cz - width / 2 - 0.03, 8),
    cyl(0.012, 0.012, 0.12, COLORS.dark, cx, top + 0.06, cz + width / 2 + 0.03, 8),
    ball(0.025, COLORS.paper, cx - 0.6, top + 0.05, cz + 0.15),
  );
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      result.add(box(0.05, top - 0.02, 0.05, COLORS.dark, cx + sx * (length / 2 - 0.2), (top - 0.02) / 2, cz + sz * (width / 2 - 0.1)));
    }
  }
  for (const [side, color] of [[-1, COLORS.red], [1, COLORS.dark]] as const) {
    const paddle = cyl(0.08, 0.08, 0.015, color, cx + side * (length / 2 - 0.35), top + 0.03, cz + side * 0.15, 18);
    const handle = box(0.04, 0.015, 0.1, COLORS.woodDark, cx + side * (length / 2 - 0.35), top + 0.03, cz + side * 0.15 + 0.12);
    result.add(paddle, handle);
  }
  return result;
}

export function buildRug(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const layers = [
    slab(w - 0.2, d - 0.2, 0.012, 0.6, "#f6c3a6", cx, RUG_BOTTOM, cz),
    slab(w - 0.55, d - 0.55, 0.004, 0.42, "#fde3d3", cx, RUG_BOTTOM + 0.014, cz),
    slab(w - 0.7, d - 0.7, 0.004, 0.34, "#f6c3a6", cx, RUG_BOTTOM + 0.022, cz),
  ];
  for (const layer of layers) layer.userData.flat = true;
  return group(...layers);
}

/** A floor lamp that really lights the corner of the lounge. */
export function buildFloorLamp(item: Furniture): Group {
  const { x, y: z } = item.rect;
  const cx = x + 0.5;
  const cz = z + 0.5;
  const light = new PointLight("#ffd9a0", 1.1, 4, 2);
  light.position.set(cx, 1.3, cz);
  // Brighter after dark (the stage scales it with the time of day).
  light.userData.nightLight = 1.1;
  return group(
    cyl(0.17, 0.2, 0.04, COLORS.dark, cx, 0.02, cz, 18),
    cyl(0.018, 0.018, 1.0, COLORS.dark, cx, 0.52, cz, 8),
    cyl(0.16, 0.24, 0.26, "#fff4d6", cx, 1.1, cz, 20, { emissive: "#ffe2a8", glow: 1.1, when: "night" }),
    light,
  );
}

const LEAVES: Record<PlantMood, { colors: string[]; tilt: number; length: number; lift: number }> = {
  fresh: { colors: ["#3fae78", "#2f9a66", "#5fd294"], tilt: 0.45, length: 1.75, lift: 0.08 },
  fine: { colors: ["#4fb283", "#3fa173", "#69c898"], tilt: 0.55, length: 1.6, lift: 0.05 },
  thirsty: { colors: ["#a8b46a", "#97a35c", "#bcc47c"], tilt: 1.15, length: 1.25, lift: 0 },
};

/** A potted plant. Fresh ones flower; thirsty ones droop and fade. */
export function buildPlant(item: Furniture, mood: PlantMood): Group {
  const { x, y: z } = item.rect;
  const cx = x + 0.5;
  const cz = z + 0.5;
  const random = seeded(item.id);
  const look = LEAVES[mood];
  const result = group(
    cyl(0.2, 0.15, 0.3, COLORS.terracotta, cx, 0.15, cz, 18),
    cyl(0.22, 0.21, 0.05, "#e39a6c", cx, 0.3, cz, 18),
    cyl(0.18, 0.18, 0.02, mood === "thirsty" ? "#a88a72" : COLORS.soil, cx, 0.31, cz, 18),
  );
  const count = 7;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + random() * 0.4;
    const pivot = new Group();
    pivot.position.set(cx, 0.32 + look.lift, cz);
    pivot.rotation.y = angle;
    const leaf = ball(0.075, look.colors[i % 3], 0, 0.15, 0.05, [0.8, look.length, 0.35]);
    leaf.rotation.x = look.tilt + random() * 0.2;
    leaf.position.z = Math.sin(look.tilt) * 0.12;
    leaf.position.y = Math.cos(look.tilt) * 0.12;
    pivot.add(leaf);
    result.add(pivot);
  }
  result.add(ball(0.08, look.colors[2], cx, 0.48 + look.lift * 2, cz, [0.7, mood === "thirsty" ? 1.2 : 2, 0.7]));
  if (mood === "fresh") {
    for (const [dx, dz, color] of [
      [-0.08, 0.06, COLORS.pink],
      [0.09, -0.04, COLORS.butter],
      [0.02, 0.1, COLORS.rose],
    ] as const) {
      result.add(ball(0.04, color, cx + dx, 0.66, cz + dz), ball(0.015, "#fff6c9", cx + dx, 0.69, cz + dz));
    }
  }
  if (mood === "thirsty") {
    const fallen = ball(0.05, "#c9a86a", cx + 0.1, 0.33, cz + 0.05, [1, 0.25, 0.6]);
    result.add(fallen);
  }
  return result;
}
