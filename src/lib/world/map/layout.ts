import type { Point, Tile, TileRect } from "./types";

/**
 * The building, one letter per tile (see Tile): one compact block. The
 * original office keeps its exact place in the top-left corner.
 *
 *   rows 0-19, cols 0-31   the original office: focus, meeting, kitchen,
 *                          desks, lounge
 *   rows 0-25, cols 32-41  the game corner, and the garden below it
 *   rows 20-25, cols 1-30  a row of quiet rooms under the office: the
 *                          headspace room and three personal space rooms
 *                          (off the desks), then the washroom (off the lounge)
 */

export const COLS = 43;
export const ROWS = 27;

/** How many personal space rooms there are. */
export const ROOM_COUNT = 3;

const wall = (n: number) => "#".repeat(n);
const floor = (n: number) => ".".repeat(n);

// The original office, exactly as it was.
const TOP_ROOMS = wall(1) + floor(9) + wall(1) + floor(9) + wall(1) + floor(10) + wall(1);
const DOOR_ROW = wall(4) + floor(2) + wall(8) + floor(2) + wall(9) + floor(2) + wall(5);
const SPLIT = wall(1) + floor(19) + wall(1) + floor(10) + wall(1);
const OPEN = wall(1) + floor(30) + wall(1);
const ORIGINAL: string[] = [
  wall(32),
  ...Array<string>(6).fill(TOP_ROOMS),
  DOOR_ROW,
  ...Array<string>(3).fill(SPLIT),
  ...Array<string>(5).fill(OPEN),
  ...Array<string>(3).fill(SPLIT),
  wall(32),
];

/** The bottom row of rooms. */
export const HEADSPACE: TileRect = { x: 1, y: 20, w: 7, h: 6 };
export const WASHROOM: TileRect = { x: 24, y: 20, w: 7, h: 6 };

/** The personal space rooms, left to right, between the headspace room and the washroom. */
export const PERSONAL_ROOMS: readonly TileRect[] = [
  { x: 9, y: 20, w: 4, h: 6 },
  { x: 14, y: 20, w: 4, h: 6 },
  { x: 19, y: 20, w: 4, h: 6 },
];

/** Each personal room's door, in the wall above its right-hand corner. */
const PERSONAL_DOORS: readonly Point[] = PERSONAL_ROOMS.map((room) => ({ x: room.x + room.w - 1, y: 19 }));

/** The floor of personal space room `index` (0-based). */
export function personalRoomRect(index: number): TileRect {
  return PERSONAL_ROOMS[index];
}

/** The door tile of personal space room `index`. */
export function personalRoomDoor(index: number): Point {
  return PERSONAL_DOORS[index];
}

function build(): string[] {
  const tiles: Tile[][] = Array.from({ length: ROWS }, () => Array<Tile>(COLS).fill("#"));
  ORIGINAL.forEach((line, r) => {
    for (let c = 0; c < line.length; c += 1) tiles[r][c] = line[c] as Tile;
  });
  const fill = (x: number, y: number, w: number, h: number, tile: Tile) => {
    for (let r = y; r < y + h; r += 1) for (let c = x; c < x + w; c += 1) tiles[r][c] = tile;
  };

  // The game corner, and the garden below it.
  fill(32, 1, 10, 6, ".");
  fill(32, 8, 10, 18, ".");
  // Doors: kitchen to game corner, game corner to garden, lounge to garden.
  fill(31, 5, 1, 2, ".");
  fill(36, 7, 2, 1, ".");
  fill(31, 13, 1, 2, ".");

  // The row of rooms under the office, each with a door in the office's back wall.
  for (const room of [HEADSPACE, WASHROOM, ...PERSONAL_ROOMS]) fill(room.x, room.y, room.w, room.h, ".");
  fill(4, 19, 1, 1, "."); // desks to headspace
  fill(29, 19, 1, 1, "."); // lounge to washroom
  for (const door of PERSONAL_DOORS) fill(door.x, door.y, 1, 1, ".");

  return tiles.map((row) => row.join(""));
}

export const LAYOUT: string[] = build();
