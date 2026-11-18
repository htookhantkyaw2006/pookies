import { Group } from "three";
import type { Furniture } from "@/lib/world/map";
import { COLORS } from "../materials";
import { ball, box, cone, cyl, group, rbox } from "../parts";

/**
 * The photo booth in the garden: a bright backdrop to stand in front of, a
 * camera on a tripod facing it, and a pin board for the photos.
 */

const BUNTING = [COLORS.pink, COLORS.butter, COLORS.mint, COLORS.sky, COLORS.lilac];

/** A tall backdrop on two posts, facing south (towards the camera), with bunting and a sign. */
export function buildPhotoBooth(item: Furniture): Group {
  const { x, y: z, w } = item.rect;
  const cx = x + w / 2;
  // At the front of its tile, so what you see matches where you can stand.
  const back = z + 0.8;
  const width = w - 0.2;
  const parts = [
    // Posts and the board between them.
    box(0.08, 1.45, 0.08, COLORS.woodDark, x + 0.12, 0.725, back),
    box(0.08, 1.45, 0.08, COLORS.woodDark, x + w - 0.12, 0.725, back),
    rbox(width - 0.1, 1.05, 0.05, "#f7e9ff", cx, 0.68, back, 0.03),
    // Soft stripes on the backdrop.
    ...[0, 1, 2, 3, 4, 5].map((i) =>
      box(0.22, 0.98, 0.01, i % 2 === 0 ? "#fbd9e6" : "#dcebfb", x + 0.45 + i * ((width - 0.7) / 5), 0.68, back + 0.03),
    ),
    // A sign over the top that glows a little after dark.
    rbox(1.1, 0.24, 0.05, COLORS.purpleDeep, cx, 1.36, back, 0.04),
    box(0.9, 0.1, 0.01, COLORS.butter, cx, 1.36, back + 0.03, { emissive: COLORS.butter, glow: 0.7, when: "night" }),
  ];
  // Bunting along the top, between the posts.
  const flags = Math.round(width / 0.32);
  for (let i = 0; i < flags; i += 1) {
    const flag = cone(0.08, 0.16, BUNTING[i % BUNTING.length], x + 0.3 + i * ((width - 0.4) / (flags - 1)), 1.12, back + 0.06, 3);
    flag.rotation.z = Math.PI;
    parts.push(flag);
  }
  parts.push(box(width, 0.012, 0.012, COLORS.dark, cx, 1.2, back + 0.05));
  return group(...parts);
}

/** A boxy little camera on a tripod, looking north at the booth. */
export function buildPhotoCamera(item: Furniture): Group {
  const cx = item.rect.x + 0.5;
  const cz = item.rect.y + 0.5;
  const legs = [-0.5, 0.5, Math.PI].map((angle) => {
    const leg = cyl(0.015, 0.02, 0.8, COLORS.dark, cx + Math.sin(angle) * 0.14, 0.38, cz + Math.cos(angle) * 0.14, 6);
    leg.rotation.x = Math.cos(angle) * 0.35;
    leg.rotation.z = -Math.sin(angle) * 0.35;
    return leg;
  });
  const lens = cyl(0.08, 0.09, 0.14, COLORS.dark, cx, 0.86, cz - 0.2, 18);
  lens.rotation.x = Math.PI / 2;
  const glass = cyl(0.055, 0.055, 0.01, COLORS.skyDeep, cx, 0.86, cz - 0.275, 18);
  glass.rotation.x = Math.PI / 2;
  return group(
    ...legs,
    rbox(0.34, 0.24, 0.2, COLORS.pink, cx, 0.86, cz, 0.05),
    rbox(0.12, 0.06, 0.08, COLORS.dark, cx - 0.08, 1.0, cz, 0.02),
    box(0.08, 0.05, 0.02, "#ffffff", cx + 0.09, 0.95, cz - 0.11, { emissive: "#ffffff", glow: 0.4 }),
    lens,
    glass,
    ball(0.025, COLORS.red, cx + 0.12, 1.0, cz),
  );
}

/** A cork pin board on legs, covered in little photo prints. */
export function buildPhotoWall(item: Furniture): Group {
  const { x, y: z, w } = item.rect;
  const cx = x + w / 2;
  const back = z + 0.8;
  const parts = [
    box(0.06, 1.25, 0.06, COLORS.woodDark, x + 0.15, 0.62, back),
    box(0.06, 1.25, 0.06, COLORS.woodDark, x + w - 0.15, 0.62, back),
    rbox(w - 0.2, 0.8, 0.06, COLORS.woodDark, cx, 0.8, back, 0.03),
    box(w - 0.32, 0.68, 0.02, "#d9a77a", cx, 0.8, back + 0.035),
  ];
  // A neat grid of prints: white borders, colourful middles, a pin in each.
  const prints = ["#fbd9e6", "#dcebfb", "#e4f6ec", "#fff1c4", "#ece1f6", "#fde2d4"];
  prints.forEach((color, i) => {
    const px = cx - 0.55 + (i % 3) * 0.55;
    const py = 0.98 - Math.floor(i / 3) * 0.34;
    parts.push(
      box(0.36, 0.26, 0.01, "#ffffff", px, py, back + 0.05),
      box(0.3, 0.17, 0.008, color, px, py + 0.02, back + 0.056),
      ball(0.02, BUNTING[i % BUNTING.length], px, py + 0.12, back + 0.06),
    );
  });
  return group(...parts);
}
