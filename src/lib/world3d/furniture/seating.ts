import { Group } from "three";
import { sitPoint, type Furniture, type Seat, type WorldMap, type ZoneKind } from "@/lib/world/map";
import { COLORS } from "../materials";
import { ball, box, cyl, group, rbox, ring, turn } from "../parts";

const CHAIR_COLORS: Partial<Record<ZoneKind, { seat: string; back: string }>> = {
  desks: { seat: "#a597f3", back: "#7a68e0" },
  focus: { seat: "#97c6ee", back: "#5f9fd6" },
  meeting: { seat: "#f6b3c5", back: "#e3809b" },
};

/** Where a seated character goes: its spot, how high it sits, and which way it looks (0 = +z). */
export interface SitSpot {
  x: number;
  z: number;
  y: number;
  yaw: number;
}

function furnitureUnder(map: WorldMap, kind: Furniture["kind"], x: number, z: number, slack: number) {
  return map.furniture.find(
    (item) =>
      item.kind === kind &&
      x >= item.rect.x - slack &&
      x <= item.rect.x + item.rect.w + slack &&
      z >= item.rect.y - slack &&
      z <= item.rect.y + item.rect.h + slack,
  );
}

/** Works out where (and facing which way) someone sits in a seat in 3D. */
export function sitSpot(map: WorldMap, seat: Seat): SitSpot {
  const point = sitPoint(seat);
  if (seat.kind === "chair") {
    return { x: point.x, z: point.y, y: 0.22, yaw: seat.facing === "up" ? Math.PI : 0 };
  }
  if (seat.kind === "sofa") {
    const sofa = furnitureUnder(map, "sofa", point.x, point.y, 0.7);
    if (sofa) {
      // Sit in the middle of whichever of the two cushions is closer, clear of the armrests.
      const cushion = (sofa.rect.w - 0.5) / 2;
      const left = sofa.rect.x + 0.25 + cushion / 2;
      const right = left + cushion;
      const x = Math.abs(point.x - left) <= Math.abs(point.x - right) ? left : right;
      const z = sofa.flip ? sofa.rect.y + 0.42 : sofa.rect.y + 0.6;
      return { x, z, y: 0.2, yaw: sofa.flip ? Math.PI : 0 };
    }
  }
  if (seat.kind === "beanbag") {
    const bag = furnitureUnder(map, "beanbag", point.x, point.y, 0.3);
    if (bag) return { x: bag.rect.x + 0.5, z: bag.rect.y + 0.55, y: 0.16, yaw: 0 };
  }
  if (seat.kind === "stool") {
    // Stools face the round table when they're at it, otherwise the counter to the north.
    const table = map.furniture.find((item) => item.kind === "roundTable");
    const tableX = table ? table.rect.x + table.rect.w / 2 : Number.NaN;
    const tableZ = table ? table.rect.y + table.rect.h / 2 : Number.NaN;
    const atTable = Math.hypot(point.x - tableX, point.y - tableZ) < 2.2;
    const yaw = atTable ? Math.atan2(tableX - point.x, tableZ - point.y) : Math.PI;
    return { x: point.x, z: point.y, y: 0.3, yaw };
  }
  return { x: point.x, z: point.y, y: 0, yaw: 0 };
}

/** A swivel office chair, built facing +z (the person looks towards +z). */
function officeChair(seat: string, back: string): Group {
  const chair = new Group();
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const spoke = box(0.2, 0.025, 0.04, COLORS.dark, Math.sin(angle) * 0.1, 0.04, Math.cos(angle) * 0.1);
    spoke.rotation.y = angle + Math.PI / 2;
    chair.add(spoke, ball(0.025, COLORS.dark, Math.sin(angle) * 0.2, 0.025, Math.cos(angle) * 0.2));
  }
  chair.add(
    cyl(0.025, 0.025, 0.16, COLORS.metal, 0, 0.13, 0, 10),
    rbox(0.42, 0.07, 0.4, seat, 0, 0.24, 0, 0.03),
    box(0.03, 0.2, 0.03, COLORS.dark, 0, 0.34, -0.19),
  );
  const backrest = rbox(0.42, 0.34, 0.06, back, 0, 0.47, -0.21, 0.03);
  backrest.rotation.x = -0.12;
  chair.add(backrest);
  for (const side of [-1, 1]) {
    chair.add(
      box(0.025, 0.1, 0.025, COLORS.dark, side * 0.22, 0.31, 0),
      rbox(0.05, 0.03, 0.22, COLORS.dark, side * 0.22, 0.37, 0, 0.012),
    );
  }
  return chair;
}

function stool(): Group {
  const result = new Group();
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = cyl(0.015, 0.015, 0.3, COLORS.woodDark, Math.sin(angle) * 0.1, 0.15, Math.cos(angle) * 0.1, 8);
    leg.rotation.set(Math.cos(angle) * 0.18, 0, -Math.sin(angle) * 0.18);
    result.add(leg);
  }
  const footRing = ring(0.11, 0.01, COLORS.metal, 0, 0.12, 0);
  footRing.rotation.x = Math.PI / 2;
  result.add(
    footRing,
    cyl(0.19, 0.18, 0.05, "#f6c56b", 0, 0.31, 0, 20),
    cyl(0.16, 0.17, 0.02, "#ffd98f", 0, 0.345, 0, 20),
  );
  return result;
}

/** The chair or stool drawn at a seat; sofas and beanbags are furniture of their own. */
export function buildSeat(map: WorldMap, seat: Seat): Group | null {
  if (seat.kind !== "chair" && seat.kind !== "stool") return null;
  const spot = sitSpot(map, seat);
  const colors = CHAIR_COLORS[seat.zone] ?? CHAIR_COLORS.desks!;
  const piece = seat.kind === "chair" ? officeChair(colors.seat, colors.back) : stool();
  piece.position.set(spot.x, 0, spot.z);
  return turn(piece, spot.yaw);
}

/** A sofa; `flip` turns its back to the south. */
export function buildSofa(item: Furniture): Group {
  const { x, y: z, w, h: d } = item.rect;
  const cx = x + w / 2;
  const cz = z + d / 2;
  const backZ = item.flip ? z + d - 0.14 : z + 0.14;
  const seatZ = item.flip ? z + 0.42 : z + 0.58;
  const result = group(
    rbox(w - 0.12, 0.18, d - 0.12, COLORS.purpleDeep, cx, 0.11, cz, 0.06),
    rbox(w - 0.3, 0.42, 0.22, COLORS.purple, cx, 0.4, backZ, 0.09),
    rbox(0.22, 0.34, d - 0.1, COLORS.purple, x + 0.16, 0.3, cz, 0.09),
    rbox(0.22, 0.34, d - 0.1, COLORS.purple, x + w - 0.16, 0.3, cz, 0.09),
  );
  const cushionWidth = (w - 0.5) / 2;
  for (const side of [-1, 1]) {
    result.add(rbox(cushionWidth - 0.02, 0.12, 0.62, COLORS.purpleSoft, cx + side * (cushionWidth / 2 + 0.005), 0.26, seatZ, 0.05));
  }
  const pillowA = rbox(0.32, 0.28, 0.1, COLORS.rose, x + 0.55, 0.42, backZ + (item.flip ? -0.14 : 0.14), 0.05);
  pillowA.rotation.z = 0.2;
  const pillowB = rbox(0.32, 0.28, 0.1, COLORS.butter, x + w - 0.55, 0.42, backZ + (item.flip ? -0.14 : 0.14), 0.05);
  pillowB.rotation.z = -0.2;
  result.add(pillowA, pillowB);
  return result;
}

export function buildBeanbag(item: Furniture): Group {
  const { x, y: z } = item.rect;
  const color = item.id.endsWith("1") ? COLORS.peach : COLORS.mint;
  const shade = item.id.endsWith("1") ? "#f59e75" : COLORS.mintDeep;
  return group(
    ball(0.42, color, x + 0.5, 0.17, z + 0.5, [1, 0.5, 0.95]),
    ball(0.26, shade, x + 0.5, 0.25, z + 0.5, [1, 0.35, 1]),
    ball(0.3, color, x + 0.5, 0.32, z + 0.32, [1, 0.6, 0.55]),
  );
}
