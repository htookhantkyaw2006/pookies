import { Group, PlaneGeometry } from "three";
import type { WorldMap, ZoneKind } from "@/lib/world/map";
import { COLORS, TEXTURE_TILES, floorPaint } from "./materials";
import { box, mesh } from "./parts";

/** Walls at the back of a room stand tall; walls between the camera and a room are cut down. */
export const WALL_HEIGHT = 1.3;
export const CUT_WALL_HEIGHT = 0.3;

/**
 * Flat things lie in layers, each clear of the one below so they never
 * flicker: doorways at 0, room floors, then rugs and mats, then the soft
 * shadows and status rings under people, then the walk-to marker.
 */
export const FLOOR_TOP = 0.012;
export const RUG_BOTTOM = 0.022;
export const SHADOW_HEIGHT = 0.056;
export const RING_HEIGHT = 0.062;
export const MARKER_HEIGHT = 0.07;

const FLOORS: Record<ZoneKind, () => ReturnType<typeof floorPaint>> = {
  desks: () => floorPaint("planks", "#f3dcbd", "#e2c39d"),
  focus: () => floorPaint("carpet", "#d9e6f4", "#c5d6ea"),
  meeting: () => floorPaint("carpet", "#e6ddf7", "#d6c9f0"),
  kitchen: () => floorPaint("tiles", "#dff1e7", "#c4e2d2"),
  lounge: () => floorPaint("planks", "#f7e2d1", "#ead0ba"),
};

function isFloor(map: WorldMap, c: number, r: number): boolean {
  return map.layout[r]?.[c] === ".";
}

/**
 * True when a wall tile would hide a room behind it (seen from the camera,
 * which looks north): following the wall north, you reach floor before the
 * edge of the building. Only the building's back walls stand tall.
 */
export function isCutWall(map: WorldMap, c: number, r: number): boolean {
  for (let row = r - 1; row >= 0; row -= 1) {
    if (isFloor(map, c, row)) return true;
  }
  return false;
}

/** Floors, walls and the base the whole office stands on. */
export function buildRoom(map: WorldMap): Group {
  const room = new Group();

  // The block the office sits on, like a diorama. Its top stays a little below the floor:
  // two surfaces at exactly the same height flicker as the camera moves.
  const base = box(map.cols + 0.8, 0.6, map.rows + 0.8, COLORS.base, map.cols / 2, -0.32, map.rows / 2);
  base.userData.flat = true;
  room.add(base);

  // Plain floor everywhere (doorways), then a patterned floor per room.
  const under = new PlaneGeometry(map.cols, map.rows);
  under.rotateX(-Math.PI / 2);
  const underMesh = mesh(under, COLORS.doorway, map.cols / 2, 0, map.rows / 2);
  underMesh.userData.flat = true;
  room.add(underMesh);

  for (const zone of map.zones) {
    const { x, y, w, h } = zone.rect;
    const plane = new PlaneGeometry(w, h);
    plane.rotateX(-Math.PI / 2);
    // Scale the texture coordinates so the pattern keeps the same size in every room.
    const uv = plane.getAttribute("uv");
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(i, (uv.getX(i) * w) / TEXTURE_TILES, (uv.getY(i) * h) / TEXTURE_TILES);
    }
    const floor = mesh(plane, FLOORS[zone.id](), x + w / 2, FLOOR_TOP, y + h / 2);
    floor.userData.flat = true;
    room.add(floor);
  }

  // Walls, one tile at a time (they are merged into one mesh later).
  map.layout.forEach((row, r) => {
    for (let c = 0; c < row.length; c += 1) {
      if (row[c] !== "#") continue;
      const height = isCutWall(map, c, r) ? CUT_WALL_HEIGHT : WALL_HEIGHT;
      room.add(box(1, height, 1, COLORS.wallSide, c + 0.5, height / 2, r + 0.5));
      room.add(box(1.002, 0.05, 1.002, COLORS.wallTop, c + 0.5, height + 0.025, r + 0.5));

      if (height !== WALL_HEIGHT) continue;
      // A baseboard where a tall wall meets the floor.
      const trims: Array<[number, number, number, number]> = [];
      if (isFloor(map, c, r + 1)) trims.push([1, 0.03, c + 0.5, r + 1.015]);
      if (isFloor(map, c + 1, r)) trims.push([0.03, 1, c + 1.015, r + 0.5]);
      if (isFloor(map, c - 1, r)) trims.push([0.03, 1, c - 0.015, r + 0.5]);
      for (const [w, d, x, z] of trims) {
        const trim = box(w, 0.08, d, COLORS.baseboard, x, 0.04, z);
        trim.userData.flat = true;
        room.add(trim);
      }
    }
  });

  return room;
}
