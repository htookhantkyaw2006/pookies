import type { WorldMap } from "./map";

/**
 * Doorways: the short gaps in walls that you walk through to get from one
 * room to another. Found from the floor plan itself, so a new door in the
 * layout gets a door automatically.
 *
 * A doorway is a run of one to three floor tiles in a line of wall, with
 * floor on both sides (the two rooms) and wall at both ends (the door frame).
 * Wide openings, like the gap between the desks and the lounge, aren't doors.
 */

const MAX_WIDTH = 3;

export interface Doorway {
  id: string;
  /** "row": the door is in an east-west wall and you walk through north-south. "column": the other way. */
  along: "row" | "column";
  /** The doorway's tiles (tile units). */
  x: number;
  y: number;
  w: number;
  h: number;
}

function isFloor(map: WorldMap, c: number, r: number): boolean {
  return map.layout[r]?.[c] === ".";
}

function isWall(map: WorldMap, c: number, r: number): boolean {
  return map.layout[r]?.[c] === "#";
}

/** Can you walk straight through this tile, north-south (row) or east-west (column)? */
function passes(map: WorldMap, c: number, r: number, along: Doorway["along"]): boolean {
  if (!isFloor(map, c, r)) return false;
  return along === "row"
    ? isFloor(map, c, r - 1) && isFloor(map, c, r + 1)
    : isFloor(map, c - 1, r) && isFloor(map, c + 1, r);
}

export function findDoorways(map: WorldMap): Doorway[] {
  const doors: Doorway[] = [];

  // Doors in east-west walls: runs along a row, framed by wall left and right.
  for (let r = 0; r < map.rows; r += 1) {
    let c = 0;
    while (c < map.cols) {
      if (!(passes(map, c, r, "row") && isWall(map, c - 1, r))) {
        c += 1;
        continue;
      }
      let end = c;
      while (passes(map, end + 1, r, "row")) end += 1;
      const width = end - c + 1;
      if (width <= MAX_WIDTH && isWall(map, end + 1, r)) {
        doors.push({ id: `door-${c}-${r}`, along: "row", x: c, y: r, w: width, h: 1 });
      }
      c = end + 1;
    }
  }

  // Doors in north-south walls: runs down a column, framed by wall above and below.
  for (let c = 0; c < map.cols; c += 1) {
    let r = 0;
    while (r < map.rows) {
      if (!(passes(map, c, r, "column") && isWall(map, c, r - 1))) {
        r += 1;
        continue;
      }
      let end = r;
      while (passes(map, c, end + 1, "column")) end += 1;
      const height = end - r + 1;
      if (height <= MAX_WIDTH && isWall(map, c, end + 1)) {
        doors.push({ id: `door-${c}-${r}`, along: "column", x: c, y: r, w: 1, h: height });
      }
      r = end + 1;
    }
  }

  return doors;
}

/** The middle of a doorway (tile units). */
export function doorwayMiddle(door: Doorway): { x: number; y: number } {
  return { x: door.x + door.w / 2, y: door.y + door.h / 2 };
}
