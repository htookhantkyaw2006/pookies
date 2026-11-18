import { Group, PointLight } from "three";
import type { Furniture } from "@/lib/world/map";
import { COLORS, paint } from "../materials";
import { ball, box, cone, cyl, disc, group, pick, rbox, seeded, slab } from "../parts";
import { RUG_BOTTOM } from "../room";

const BARK = "#9a6b4a";
const LEAVES = ["#5fb07a", "#4fa36c", "#79c48f"];
const STONE = "#e6ddd0";
const WOOD = "#c99a6c";
const WOOD_DARK = "#a97c55";
const FLOWERS = [COLORS.pink, COLORS.butter, COLORS.lilac, COLORS.peach, "#ffffff", COLORS.rose];

/** Stepping stones laid along a path. */
export function buildPath(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const random = seeded(item.id);
  const result = new Group();
  const along = w >= d;
  const length = along ? w : d;
  for (let step = 0.4; step < length - 0.2; step += 0.62) {
    for (const lane of [-0.38, 0.38]) {
      const across = (along ? d : w) / 2 + lane + (random() - 0.5) * 0.12;
      const sx = along ? x + step + (random() - 0.5) * 0.1 : x + across;
      const sz = along ? z + across : z + step + (random() - 0.5) * 0.1;
      const stone = slab(0.5 + random() * 0.12, 0.42 + random() * 0.1, 0.02, 0.16, STONE, sx, RUG_BOTTOM, sz);
      stone.rotation.y = (random() - 0.5) * 0.5;
      stone.userData.flat = true;
      result.add(stone);
    }
  }
  return result;
}

/** A round little tree that stays inside its tile. */
export function buildTree(item: Furniture): Group {
  const cx = item.rect.x + 0.5;
  const cz = item.rect.y + 0.5;
  const random = seeded(item.id);
  const canopy = pick(random, LEAVES);
  return group(
    cyl(0.2, 0.24, 0.06, COLORS.soil, cx, 0.03, cz, 14),
    cyl(0.07, 0.1, 0.95, BARK, cx, 0.5, cz, 10),
    ball(0.44, canopy, cx, 1.2, cz, [1, 0.9, 1]),
    ball(0.3, pick(random, LEAVES), cx - 0.16, 1.42, cz + 0.08),
    ball(0.28, pick(random, LEAVES), cx + 0.16, 1.5, cz - 0.08),
  );
}

/** A picnic table with a bench along each long side. */
export function buildPicnicTable(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const result = group(
    rbox(w - 0.2, 0.06, 0.95, WOOD, cx, 0.46, cz, 0.02),
    rbox(w - 0.25, 0.05, 0.3, WOOD, cx, 0.27, z + 0.22, 0.02),
    rbox(w - 0.25, 0.05, 0.3, WOOD, cx, 0.27, z + d - 0.22, 0.02),
  );
  for (const side of [-1, 1]) {
    const legs = box(0.06, 0.5, d - 0.15, WOOD_DARK, cx + side * (w / 2 - 0.4), 0.22, cz);
    result.add(legs);
  }
  // A checked cloth and a jug of lemonade.
  result.add(
    box(0.9, 0.006, 0.7, "#f6b3c5", cx, 0.494, cz),
    cyl(0.07, 0.06, 0.16, "#fff2a8", cx + 0.5, 0.57, cz, 14, { opacity: 0.85 }),
    cyl(0.035, 0.032, 0.08, COLORS.sky, cx - 0.5, 0.53, cz - 0.15),
  );
  return result;
}

/** A park bench, its back on the north side so you face the path. */
export function buildBench(item: Furniture): Group {
  const { x, y: z, w } = item.rect;
  const cx = x + w / 2;
  const result = group(
    rbox(w - 0.15, 0.05, 0.42, WOOD, cx, 0.27, z + 0.55, 0.02),
    rbox(w - 0.15, 0.3, 0.05, WOOD, cx, 0.5, z + 0.3, 0.02),
  );
  for (const side of [-1, 1]) {
    result.add(
      box(0.05, 0.27, 0.05, COLORS.dark, cx + side * (w / 2 - 0.2), 0.13, z + 0.7),
      box(0.05, 0.6, 0.05, COLORS.dark, cx + side * (w / 2 - 0.2), 0.3, z + 0.32),
      rbox(0.05, 0.04, 0.4, COLORS.dark, cx + side * (w / 2 - 0.12), 0.4, z + 0.55, 0.015),
    );
  }
  return result;
}

/** A log to sit on by the fire. */
export function buildLog(item: Furniture): Group {
  const cx = item.rect.x + 0.5;
  const cz = item.rect.y + 0.5;
  const log = cyl(0.17, 0.17, 0.7, BARK, cx, 0.17, cz, 14);
  log.rotation.z = Math.PI / 2;
  const endA = cyl(0.15, 0.15, 0.01, "#e2c39d", cx - 0.351, 0.17, cz, 14);
  endA.rotation.z = Math.PI / 2;
  const endB = cyl(0.15, 0.15, 0.01, "#e2c39d", cx + 0.351, 0.17, cz, 14);
  endB.rotation.z = Math.PI / 2;
  return group(log, endA, endB);
}

/** A stone fire pit with crossed logs and flames that glow after dark. */
export function buildFirePit(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const random = seeded(item.id);
  const result = group(cyl(0.62, 0.66, 0.05, "#6b5a50", cx, 0.025, cz, 24));
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    result.add(ball(0.15, i % 2 ? "#b8aea4" : "#cfc6bb", cx + Math.cos(angle) * 0.68, 0.11, cz + Math.sin(angle) * 0.68, [1, 0.75, 1]));
  }
  for (let i = 0; i < 3; i += 1) {
    const firewood = cyl(0.05, 0.05, 0.7, BARK, cx, 0.12, cz, 8);
    firewood.rotation.set(Math.PI / 2, (i / 3) * Math.PI, 0.25);
    result.add(firewood);
  }
  // Flames that glow after dark.
  for (let i = 0; i < 5; i += 1) {
    const color = i % 2 ? "#ffb347" : "#ff7a45";
    const flame = paint(color, { emissive: color, glow: 1.4, when: "night" });
    result.add(cone(0.08 + random() * 0.05, 0.3 + random() * 0.2, flame, cx + (random() - 0.5) * 0.3, 0.3, cz + (random() - 0.5) * 0.3));
  }
  const light = new PointLight("#ff9a55", 1.4, 5, 2);
  light.position.set(cx, 0.8, cz);
  light.userData.nightLight = 1.4;
  light.userData.flicker = true;
  result.add(light);
  return result;
}

/** A small pond: stones round the edge, lily pads, reeds. */
export function buildPond(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const random = seeded(item.id);
  const rx = w / 2 - 0.2;
  const rz = d / 2 - 0.2;
  const water = disc(1, "#8fd0f0", cx, RUG_BOTTOM + 0.01, cz, { emissive: "#bfe8ff", glow: 0.15, rough: 0.15 });
  water.scale.set(rx, 1, rz);
  water.userData.flat = true;
  const bed = disc(1, "#5aa0c2", cx, RUG_BOTTOM, cz);
  bed.scale.set(rx + 0.05, 1, rz + 0.05);
  bed.userData.flat = true;
  const result = group(bed, water);
  for (let i = 0; i < 22; i += 1) {
    const angle = (i / 22) * Math.PI * 2;
    result.add(
      ball(0.13, i % 3 ? "#cfc6bb" : "#b8aea4", cx + Math.cos(angle) * (rx + 0.05), 0.07, cz + Math.sin(angle) * (rz + 0.05), [1.2, 0.6, 1]),
    );
  }
  for (const [px, pz] of [
    [-0.6, -0.2],
    [0.4, 0.3],
    [0.9, -0.35],
  ]) {
    const pad = disc(0.16, "#6cc48a", cx + px, RUG_BOTTOM + 0.02, cz + pz);
    pad.userData.flat = true;
    result.add(pad, ball(0.04, COLORS.pink, cx + px + 0.04, 0.07, cz + pz));
  }
  for (let i = 0; i < 6; i += 1) {
    const reed = cyl(0.012, 0.016, 0.4 + random() * 0.2, "#6c9f58", cx + rx - 0.25 + random() * 0.15, 0.25, cz - rz + 0.2 + random() * 0.4, 6);
    result.add(reed);
  }
  // A couple of goldfish under the surface.
  result.add(
    ball(0.06, "#ff9a4a", cx - 0.2, RUG_BOTTOM + 0.005, cz + 0.4, [1.6, 0.4, 0.8]),
    ball(0.05, "#ffb066", cx + 0.6, RUG_BOTTOM + 0.005, cz - 0.1, [1.6, 0.4, 0.8]),
  );
  return result;
}

/** A raised flower bed full of colour. */
export function buildFlowerBed(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const random = seeded(item.id);
  const result = group(
    rbox(w - 0.1, 0.22, d - 0.1, WOOD_DARK, cx, 0.11, cz, 0.04),
    box(w - 0.24, 0.02, d - 0.24, COLORS.soil, cx, 0.225, cz),
  );
  const count = Math.round(w * d * 7);
  for (let i = 0; i < count; i += 1) {
    const fx = x + 0.18 + random() * (w - 0.36);
    const fz = z + 0.18 + random() * (d - 0.36);
    const height = 0.12 + random() * 0.12;
    result.add(
      cyl(0.008, 0.008, height, "#5f9e58", fx, 0.23 + height / 2, fz, 5),
      ball(0.045 + random() * 0.02, pick(random, FLOWERS), fx, 0.24 + height, fz),
    );
  }
  for (let i = 0; i < Math.round(w * d * 3); i += 1) {
    result.add(ball(0.07, pick(random, LEAVES), x + 0.2 + random() * (w - 0.4), 0.27, z + 0.2 + random() * (d - 0.4), [1, 0.6, 1]));
  }
  return result;
}

/**
 * String lights over the garden: poles round the edge and strings of bulbs
 * between them, glowing after dark.
 */
export function buildStringLights(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const top = 1.7;
  const north = [0.25, w / 2, w - 0.25].map((dx) => ({ x: x + dx, z: z + 0.25 }));
  const south = [0.25, w / 2, w - 0.25].map((dx) => ({ x: x + dx, z: z + d - 0.25 }));
  const result = new Group();
  for (const pole of [...north, ...south]) {
    result.add(cyl(0.03, 0.04, top, COLORS.dark, pole.x, top / 2, pole.z, 8), ball(0.05, COLORS.dark, pole.x, top, pole.z));
  }
  // Straight runs only: along the north and south edges, and across between facing poles.
  const strings: Array<[{ x: number; z: number }, { x: number; z: number }]> = [];
  for (let i = 0; i < north.length; i += 1) {
    strings.push([north[i], south[i]]);
    if (i < north.length - 1) {
      strings.push([north[i], north[i + 1]]);
      strings.push([south[i], south[i + 1]]);
    }
  }
  const colors = ["#ffe7a8", "#ffd1dc", "#d7f2ff", "#fff3c4"];
  const wire = paint("#4a3f55");
  strings.forEach(([a, b], index) => {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const at = (t: number) => ({
      x: a.x + (b.x - a.x) * t,
      y: top - 0.04 - 0.35 * Math.sin(Math.PI * t),
      z: a.z + (b.z - a.z) * t,
    });
    // The wire, as short straight pieces following the sag.
    const pieces = Math.max(8, Math.round(length * 2));
    for (let i = 0; i < pieces; i += 1) {
      const p = at(i / pieces);
      const q = at((i + 1) / pieces);
      const span = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
      const piece = cyl(0.008, 0.008, span, wire, (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2, 4);
      piece.lookAt(q.x, q.y, q.z);
      piece.rotateX(Math.PI / 2);
      result.add(piece);
    }
    // Bulbs hanging from it every so often.
    const bulbs = Math.max(4, Math.round(length * 1.2));
    for (let i = 1; i < bulbs; i += 1) {
      const p = at(i / bulbs);
      const color = colors[(i + index) % colors.length];
      result.add(
        ball(0.05, color, p.x, p.y - 0.05, p.z, [1, 1.25, 1], {
          emissive: color,
          glow: 1.6,
          when: "night",
        }),
      );
    }
  });
  return result;
}
