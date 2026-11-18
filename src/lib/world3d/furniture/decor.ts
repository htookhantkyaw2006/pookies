import { Group, PlaneGeometry, type Mesh } from "three";
import type { Furniture, WallDecor } from "@/lib/world/map";
import { COLORS, paint } from "../materials";
import { ball, box, cyl, group, mesh, rbox, ring } from "../parts";

/** The meeting room whiteboard: the board, its tray and markers, plus the surface the team message is drawn on. */
export function buildWhiteboard(item: Furniture): { board: Group; surface: Mesh } {
  const { x, w } = item.rect;
  const cx = x + w / 2;
  // The board hangs on the wall's south face, which is the bottom edge of its tile.
  const wallFace = item.rect.y + item.rect.h;
  const width = w - 0.3;
  const centerY = 0.8;
  const surfaceGeometry = new PlaneGeometry(width - 0.12, 0.6);
  // Just in front of the frame (which is 0.05 deep), so nothing covers the message.
  const surface = mesh(surfaceGeometry, paint("#ffffff", { rough: 0.35 }), cx, centerY, wallFace + 0.056);
  // Kept out of the merged scenery so its picture can change.
  surface.userData.dynamic = true;
  surface.userData.board = true;
  const marker = (offset: number, color: string) => {
    const pen = cyl(0.012, 0.012, 0.12, color, cx + offset, 0.465, wallFace + 0.075, 8);
    pen.rotation.z = Math.PI / 2;
    return pen;
  };
  const board = group(
    rbox(width, 0.72, 0.05, "#d7d0dd", cx, centerY, wallFace + 0.025, 0.02),
    box(width * 0.7, 0.03, 0.09, "#cfc4d6", cx, 0.44, wallFace + 0.05),
    marker(-0.3, COLORS.red),
    marker(-0.12, COLORS.purple),
    marker(0.04, COLORS.dark),
    rbox(0.14, 0.05, 0.05, COLORS.sky, cx + 0.3, 0.47, wallFace + 0.07, 0.015),
  );
  return { board, surface };
}

function windowPane(width: number): Group {
  const glass = "#cfe9ff";
  const pane = group(
    rbox(width, 0.74, 0.06, COLORS.paper, 0, 0.78, 0.03, 0.02),
    box(width - 0.12, 0.62, 0.02, glass, 0, 0.78, 0.065, { emissive: "#bfe4ff", glow: 0.55, rough: 0.2, when: "day" }),
    box(0.035, 0.62, 0.03, COLORS.paper, 0, 0.78, 0.075),
    box(width - 0.12, 0.035, 0.03, COLORS.paper, 0, 0.8, 0.075),
    rbox(width + 0.12, 0.04, 0.14, COLORS.paper, 0, 0.42, 0.07, 0.015),
  );
  // A little cactus on the sill of the wider windows.
  if (width >= 1.5) {
    pane.add(
      cyl(0.04, 0.03, 0.06, COLORS.terracotta, width / 2 - 0.15, 0.47, 0.09),
      ball(0.035, "#5fbf8d", width / 2 - 0.15, 0.54, 0.09, [0.8, 1.4, 0.8]),
    );
  }
  return pane;
}

function clock(): Group {
  const face = cyl(0.2, 0.2, 0.04, COLORS.paper, 0, 0.96, 0.02, 28);
  face.rotation.x = Math.PI / 2;
  const rim = ring(0.2, 0.02, COLORS.dark, 0, 0.96, 0.04);
  const hourHand = box(0.02, 0.1, 0.01, COLORS.dark, 0.02, 0.99, 0.05);
  hourHand.rotation.z = -0.6;
  const minuteHand = box(0.015, 0.15, 0.01, COLORS.dark, -0.04, 1.01, 0.055);
  minuteHand.rotation.z = 0.7;
  return group(face, rim, hourHand, minuteHand, ball(0.015, COLORS.red, 0, 0.96, 0.06));
}

function poster(width: number, color: string): Group {
  const height = width * 1.2;
  return group(
    rbox(width, height, 0.03, COLORS.paper, 0, 0.78, 0.015, 0.01),
    box(width - 0.1, height - 0.1, 0.008, color, 0, 0.78, 0.034),
    cyl(width * 0.16, width * 0.16, 0.006, COLORS.paper, -width * 0.12, 0.88, 0.04, 20).rotateX(Math.PI / 2),
    box(width * 0.55, 0.05, 0.006, "#ffffff", 0, 0.66, 0.04),
    box(width * 0.4, 0.04, 0.006, "#ffffff", -width * 0.07, 0.58, 0.04),
  );
}

/** A wide wall mirror with a soft frame. */
function mirror(width: number): Group {
  return group(
    rbox(width, 0.7, 0.04, "#dfe7ee", 0, 0.92, 0.02, 0.03),
    box(width - 0.1, 0.6, 0.01, "#cfe6f5", 0, 0.92, 0.045, { metal: 0.4, rough: 0.08 }),
    box(width * 0.5, 0.04, 0.012, "#ffffff", -width * 0.15, 1.08, 0.052, { opacity: 0.6 }),
  );
}

/** A round dartboard: rings from the bull out, a dark surround. */
function dartboard(width: number): Group {
  const r = width / 2;
  const disc = (radius: number, color: string, depth: number) =>
    cyl(radius, radius, 0.012, color, 0, 0.86, depth, 32).rotateX(Math.PI / 2);
  return group(
    disc(r, COLORS.dark, 0.02),
    disc(r * 0.8, "#f4e7cf", 0.032),
    disc(r * 0.62, COLORS.red, 0.036),
    disc(r * 0.45, "#f4e7cf", 0.04),
    disc(r * 0.25, COLORS.green, 0.044),
    disc(r * 0.09, COLORS.red, 0.048),
    // One dart already stuck in it.
    cyl(0.008, 0.008, 0.12, COLORS.metal, r * 0.3, 0.92, 0.1, 6).rotateX(Math.PI / 2),
    box(0.04, 0.03, 0.005, COLORS.purple, r * 0.3, 0.92, 0.16),
  );
}

/** The high-score board: a little screen with rows of glowing "scores". */
function scoreboard(width: number): Group {
  const parts = [
    rbox(width, 0.62, 0.05, COLORS.dark, 0, 0.86, 0.025, 0.03),
    box(width - 0.1, 0.1, 0.01, COLORS.butter, 0, 1.08, 0.055, { emissive: COLORS.butter, glow: 0.8 }),
  ];
  const colors = ["#9fe8ff", "#ffb5c9", "#a9e5c8", "#cfbcf8"];
  colors.forEach((color, row) => {
    const y = 0.95 - row * 0.1;
    parts.push(box(0.06, 0.05, 0.01, color, -width / 2 + 0.12, y, 0.055, { emissive: color, glow: 0.8 }));
    parts.push(box(width * (0.5 - row * 0.06), 0.035, 0.01, color, -width / 2 + 0.2 + (width * (0.5 - row * 0.06)) / 2, y, 0.055, { emissive: color, glow: 0.6 }));
  });
  return group(...parts);
}

const FACING_YAW = { south: 0, east: Math.PI / 2, west: -Math.PI / 2 } as const;

/** A window, clock or poster, hung on its wall. */
export function buildWallDecor(decor: WallDecor): Group {
  const piece =
    decor.kind === "window"
      ? windowPane(decor.width)
      : decor.kind === "clock"
        ? clock()
        : decor.kind === "mirror"
          ? mirror(decor.width)
          : decor.kind === "dartboard"
            ? dartboard(decor.width)
            : decor.kind === "scoreboard"
              ? scoreboard(decor.width)
              : poster(decor.width, decor.color ?? COLORS.lilac);
  piece.position.set(decor.x, 0, decor.z);
  piece.rotation.y = FACING_YAW[decor.faces];
  return piece;
}
