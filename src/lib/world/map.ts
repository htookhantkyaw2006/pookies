import type { PresenceStatus } from "@/lib/data/types";

/**
 * The office floor plan. Everything is laid out on a tile grid; positions that
 * people stand at are in "tile units" and may be fractional (4.5 = middle of
 * tile 4). Multiply by TILE to get world pixels.
 */

export const TILE = 48;

export interface Point {
  x: number;
  y: number;
}

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ZoneKind = "desks" | "focus" | "meeting" | "kitchen" | "lounge";

export interface Zone {
  id: ZoneKind;
  name: string;
  /** Shown when you walk in. */
  hint: string;
  /** Being in this room says this about you. */
  status: PresenceStatus;
  rect: TileRect;
}

export type FurnitureKind =
  | "pod"
  | "desk"
  | "meetingTable"
  | "counter"
  | "fridge"
  | "roundTable"
  | "sofa"
  | "coffeeTable"
  | "beanbag"
  | "gameTable"
  | "plant"
  | "bookshelf"
  | "rug"
  | "whiteboard"
  | "doormat"
  | "waterCooler"
  | "printer"
  | "floorLamp";

export interface Furniture {
  id: string;
  kind: FurnitureKind;
  rect: TileRect;
  /** Solid furniture blocks walking. */
  solid: boolean;
  /** Mirrors the art top-to-bottom (e.g. a desk whose chair is above it). */
  flip?: boolean;
}

/** "spot" is somewhere to stand (a counter, the ping-pong table); everything else can be sat on. */
export type SeatKind = "chair" | "stool" | "sofa" | "beanbag" | "spot";

export interface Seat {
  id: string;
  zone: ZoneKind;
  kind: SeatKind;
  /** Where you stand to use it (tile units). */
  x: number;
  y: number;
  /** Which way someone sitting here looks; the chair back is on the other side. */
  facing?: "up" | "down";
  /** Where your feet go once seated, when it isn't where you stood (sofas, beanbags). */
  sit?: Point;
}

export function canSit(seat: Seat): boolean {
  return seat.kind !== "spot";
}

/** Where someone sitting in `seat` is drawn, in tile units. */
export function sitPoint(seat: Seat): Point {
  return seat.sit ?? { x: seat.x, y: seat.y };
}

export interface WorldMap {
  cols: number;
  rows: number;
  /** One string per row: "#" is wall, "." is floor. */
  layout: string[];
  zones: Zone[];
  furniture: Furniture[];
  seats: Seat[];
  things: Thing[];
  decor: WallDecor[];
  /** Where you appear when you open the office. */
  spawn: Point;
  /** Just inside the front door: where people arrive and leave. */
  entrance: Point;
}

const COLS = 32;
const ROWS = 20;

const wall = (n: number) => "#".repeat(n);
const floor = (n: number) => ".".repeat(n);

// Three rooms along the top, each closed off by walls.
const TOP_ROOMS = wall(1) + floor(9) + wall(1) + floor(9) + wall(1) + floor(10) + wall(1);
// The wall under them, with a two-tile doorway into each room.
const DOOR_ROW = wall(4) + floor(2) + wall(8) + floor(2) + wall(9) + floor(2) + wall(5);
// Desks on the left, lounge on the right, a wall between them...
const SPLIT = wall(1) + floor(19) + wall(1) + floor(10) + wall(1);
// ...with a wide opening in the middle.
const OPEN = wall(1) + floor(30) + wall(1);

const LAYOUT: string[] = [
  wall(COLS),
  TOP_ROOMS,
  TOP_ROOMS,
  TOP_ROOMS,
  TOP_ROOMS,
  TOP_ROOMS,
  TOP_ROOMS,
  DOOR_ROW,
  SPLIT,
  SPLIT,
  SPLIT,
  OPEN,
  OPEN,
  OPEN,
  OPEN,
  OPEN,
  SPLIT,
  SPLIT,
  SPLIT,
  wall(COLS),
];

const ZONES: Zone[] = [
  {
    id: "desks",
    name: "Desks",
    hint: "You show as Online here",
    status: "online",
    rect: { x: 1, y: 8, w: 19, h: 11 },
  },
  {
    id: "focus",
    name: "Focus room",
    hint: "Quiet zone. You show as Busy here",
    status: "busy",
    rect: { x: 1, y: 1, w: 9, h: 6 },
  },
  {
    id: "meeting",
    name: "Meeting room",
    hint: "You show as Busy here",
    status: "busy",
    rect: { x: 11, y: 1, w: 9, h: 6 },
  },
  {
    id: "kitchen",
    name: "Kitchen",
    hint: "Taking a break. You show as Away here",
    status: "away",
    rect: { x: 21, y: 1, w: 10, h: 6 },
  },
  {
    id: "lounge",
    name: "Lounge",
    hint: "Taking a break. You show as Away here",
    status: "away",
    rect: { x: 21, y: 8, w: 10, h: 11 },
  },
];

const POD_ORIGINS: Point[] = [
  { x: 3, y: 10 },
  { x: 11, y: 10 },
  { x: 3, y: 15 },
  { x: 11, y: 15 },
];

const FURNITURE: Furniture[] = [
  // Desks
  ...POD_ORIGINS.map(
    (origin, index): Furniture => ({
      id: `pod-${index + 1}`,
      kind: "pod",
      rect: { ...origin, w: 4, h: 2 },
      solid: true,
    }),
  ),
  { id: "shelf", kind: "bookshelf", rect: { x: 8, y: 8, w: 3, h: 1 }, solid: true },
  { id: "plant-desks-1", kind: "plant", rect: { x: 1, y: 8, w: 1, h: 1 }, solid: true },
  { id: "plant-desks-2", kind: "plant", rect: { x: 19, y: 8, w: 1, h: 1 }, solid: true },
  { id: "plant-desks-3", kind: "plant", rect: { x: 1, y: 18, w: 1, h: 1 }, solid: true },
  { id: "plant-desks-4", kind: "plant", rect: { x: 19, y: 18, w: 1, h: 1 }, solid: true },
  { id: "doormat", kind: "doormat", rect: { x: 9, y: 18, w: 2, h: 1 }, solid: false },
  { id: "water-cooler", kind: "waterCooler", rect: { x: 17, y: 8, w: 1, h: 1 }, solid: true },
  { id: "printer", kind: "printer", rect: { x: 18, y: 8, w: 1, h: 1 }, solid: true },

  // Focus room
  { id: "focus-desk-1", kind: "desk", rect: { x: 1, y: 1, w: 2, h: 1 }, solid: true },
  { id: "focus-desk-2", kind: "desk", rect: { x: 4, y: 1, w: 2, h: 1 }, solid: true },
  { id: "focus-desk-3", kind: "desk", rect: { x: 7, y: 1, w: 2, h: 1 }, solid: true },
  { id: "focus-desk-4", kind: "desk", rect: { x: 1, y: 6, w: 2, h: 1 }, solid: true, flip: true },
  { id: "focus-desk-5", kind: "desk", rect: { x: 7, y: 6, w: 2, h: 1 }, solid: true, flip: true },
  { id: "plant-focus", kind: "plant", rect: { x: 9, y: 1, w: 1, h: 1 }, solid: true },

  // Meeting room
  { id: "whiteboard", kind: "whiteboard", rect: { x: 14, y: 0, w: 3, h: 1 }, solid: false },
  { id: "meeting-table", kind: "meetingTable", rect: { x: 13, y: 3, w: 5, h: 2 }, solid: true },
  { id: "plant-meeting-1", kind: "plant", rect: { x: 11, y: 1, w: 1, h: 1 }, solid: true },
  { id: "plant-meeting-2", kind: "plant", rect: { x: 19, y: 1, w: 1, h: 1 }, solid: true },

  // Kitchen
  { id: "counter", kind: "counter", rect: { x: 22, y: 1, w: 6, h: 1 }, solid: true },
  { id: "fridge", kind: "fridge", rect: { x: 29, y: 1, w: 2, h: 1 }, solid: true },
  { id: "kitchen-table", kind: "roundTable", rect: { x: 25, y: 4, w: 2, h: 1 }, solid: true },
  { id: "plant-kitchen", kind: "plant", rect: { x: 21, y: 6, w: 1, h: 1 }, solid: true },

  // Lounge
  { id: "rug", kind: "rug", rect: { x: 22, y: 9, w: 7, h: 6 }, solid: false },
  { id: "sofa-1", kind: "sofa", rect: { x: 23, y: 9, w: 4, h: 1 }, solid: true },
  { id: "coffee-table", kind: "coffeeTable", rect: { x: 24, y: 11, w: 2, h: 1 }, solid: true },
  { id: "sofa-2", kind: "sofa", rect: { x: 23, y: 13, w: 4, h: 1 }, solid: true, flip: true },
  { id: "beanbag-1", kind: "beanbag", rect: { x: 29, y: 10, w: 1, h: 1 }, solid: false },
  { id: "beanbag-2", kind: "beanbag", rect: { x: 29, y: 12, w: 1, h: 1 }, solid: false },
  { id: "game-table", kind: "gameTable", rect: { x: 24, y: 16, w: 3, h: 1 }, solid: true },
  { id: "plant-lounge-1", kind: "plant", rect: { x: 30, y: 8, w: 1, h: 1 }, solid: true },
  { id: "plant-lounge-2", kind: "plant", rect: { x: 21, y: 18, w: 1, h: 1 }, solid: true },
  { id: "plant-lounge-3", kind: "plant", rect: { x: 30, y: 18, w: 1, h: 1 }, solid: true },
  { id: "lamp-lounge", kind: "floorLamp", rect: { x: 21, y: 9, w: 1, h: 1 }, solid: true },
];

const SEATS: Seat[] = [
  // Four chairs around each desk pod: two above facing down, two below facing up.
  ...POD_ORIGINS.flatMap((origin, pod) =>
    [
      { x: origin.x + 1, y: origin.y - 0.5, facing: "down" as const },
      { x: origin.x + 3, y: origin.y - 0.5, facing: "down" as const },
      { x: origin.x + 1, y: origin.y + 2.5, facing: "up" as const },
      { x: origin.x + 3, y: origin.y + 2.5, facing: "up" as const },
    ].map(
      (point, chair): Seat => ({
        id: `desk-${pod + 1}-${chair + 1}`,
        zone: "desks",
        kind: "chair",
        ...point,
      }),
    ),
  ),

  { id: "focus-1", zone: "focus", kind: "chair", x: 2, y: 2.5, facing: "up" },
  { id: "focus-2", zone: "focus", kind: "chair", x: 5, y: 2.5, facing: "up" },
  { id: "focus-3", zone: "focus", kind: "chair", x: 8, y: 2.5, facing: "up" },
  { id: "focus-4", zone: "focus", kind: "chair", x: 2, y: 5.5, facing: "down" },
  { id: "focus-5", zone: "focus", kind: "chair", x: 8, y: 5.5, facing: "down" },

  { id: "meeting-1", zone: "meeting", kind: "chair", x: 14, y: 2.5, facing: "down" },
  { id: "meeting-2", zone: "meeting", kind: "chair", x: 15.5, y: 2.5, facing: "down" },
  { id: "meeting-3", zone: "meeting", kind: "chair", x: 17, y: 2.5, facing: "down" },
  { id: "meeting-4", zone: "meeting", kind: "chair", x: 14, y: 5.5, facing: "up" },
  { id: "meeting-5", zone: "meeting", kind: "chair", x: 15.5, y: 5.5, facing: "up" },
  { id: "meeting-6", zone: "meeting", kind: "chair", x: 17, y: 5.5, facing: "up" },

  { id: "kitchen-1", zone: "kitchen", kind: "stool", x: 23.5, y: 2.5 },
  { id: "kitchen-2", zone: "kitchen", kind: "stool", x: 26.5, y: 2.5 },
  { id: "kitchen-3", zone: "kitchen", kind: "stool", x: 24.5, y: 4.5 },
  { id: "kitchen-4", zone: "kitchen", kind: "stool", x: 27.5, y: 4.5 },

  // Sofa seats: stand in front, sit back into the cushions.
  { id: "lounge-1", zone: "lounge", kind: "sofa", x: 23.5, y: 10.5, sit: { x: 23.5, y: 9.9 } },
  { id: "lounge-2", zone: "lounge", kind: "sofa", x: 26.5, y: 10.5, sit: { x: 26.5, y: 9.9 } },
  { id: "lounge-3", zone: "lounge", kind: "sofa", x: 23.5, y: 12.5, sit: { x: 23.5, y: 13.6 } },
  { id: "lounge-4", zone: "lounge", kind: "sofa", x: 26.5, y: 12.5, sit: { x: 26.5, y: 13.6 } },
  { id: "lounge-5", zone: "lounge", kind: "beanbag", x: 29.5, y: 10.5, sit: { x: 29.5, y: 10.75 } },
  { id: "lounge-6", zone: "lounge", kind: "beanbag", x: 29.5, y: 12.5, sit: { x: 29.5, y: 12.75 } },
  { id: "lounge-7", zone: "lounge", kind: "spot", x: 23.5, y: 16.5 },
  { id: "lounge-8", zone: "lounge", kind: "spot", x: 27.5, y: 16.5 },
];

/**
 * Pictures and fittings hung on walls. They never block anyone. `x`/`z` is a
 * point on the wall's face (tile units) and `faces` is the way it looks, into
 * the room.
 */
export type WallDecorKind = "window" | "clock" | "poster";

export interface WallDecor {
  id: string;
  kind: WallDecorKind;
  x: number;
  z: number;
  faces: "south" | "east" | "west";
  width: number;
  color?: string;
}

const WALL_DECOR: WallDecor[] = [
  // Along the top of the building.
  { id: "window-focus-1", kind: "window", x: 3, z: 1, faces: "south", width: 1.4 },
  { id: "window-focus-2", kind: "window", x: 6.5, z: 1, faces: "south", width: 1.4 },
  { id: "clock-meeting", kind: "clock", x: 18.6, z: 1, faces: "south", width: 0.5 },
  { id: "window-kitchen", kind: "window", x: 25.8, z: 1, faces: "south", width: 1.8 },
  // Down the left side, looking into the focus room and the desks.
  { id: "window-west-1", kind: "window", x: 1, z: 3.5, faces: "east", width: 1.4 },
  { id: "window-west-2", kind: "window", x: 1, z: 11, faces: "east", width: 1.6 },
  { id: "window-west-3", kind: "window", x: 1, z: 15.5, faces: "east", width: 1.6 },
  // Down the right side, looking into the kitchen and the lounge.
  { id: "window-east-1", kind: "window", x: 31, z: 4, faces: "west", width: 1.4 },
  { id: "window-east-2", kind: "window", x: 31, z: 11.5, faces: "west", width: 1.6 },
  { id: "window-east-3", kind: "window", x: 31, z: 15.5, faces: "west", width: 1.6 },
  // Inside walls.
  { id: "poster-meeting", kind: "poster", x: 11, z: 4.5, faces: "east", width: 0.8, color: "#cfbcf8" },
  { id: "poster-kitchen", kind: "poster", x: 21, z: 3.5, faces: "east", width: 0.8, color: "#ffe08a" },
  { id: "poster-desks", kind: "poster", x: 20, z: 9.4, faces: "west", width: 0.8, color: "#aed6f8" },
  { id: "art-lounge", kind: "poster", x: 21, z: 10.25, faces: "east", width: 0.8, color: "#ffc4a3" },
];

/** Things you can walk up to and use. Positions are where you stand (tile units). */
export type ThingKind = "coffee" | "board" | "plant";

export interface Thing {
  id: string;
  kind: ThingKind;
  x: number;
  y: number;
  /** How close you need to be, in pixels. */
  reach: number;
}

const THINGS: Thing[] = [
  // The espresso machine on the kitchen counter.
  { id: "coffee", kind: "coffee", x: 24.35, y: 2.45, reach: 64 },
  // The whiteboard on the meeting room's back wall.
  { id: "board", kind: "board", x: 15.5, y: 1.5, reach: 96 },
  ...FURNITURE.filter((item) => item.kind === "plant").map(
    (item): Thing => ({
      id: item.id,
      kind: "plant",
      x: item.rect.x + 0.5,
      y: item.rect.y + 0.5,
      reach: 76,
    }),
  ),
];

export const PLANT_IDS: readonly string[] = THINGS.filter((thing) => thing.kind === "plant").map(
  (thing) => thing.id,
);

export const OFFICE_MAP: WorldMap = {
  cols: COLS,
  rows: ROWS,
  layout: LAYOUT,
  zones: ZONES,
  furniture: FURNITURE,
  seats: SEATS,
  things: THINGS,
  decor: WALL_DECOR,
  spawn: { x: 9, y: 13.5 },
  entrance: { x: 10, y: 18.3 },
};

/** Tile units to world pixels. */
export function toPixels(point: Point): Point {
  return { x: point.x * TILE, y: point.y * TILE };
}

export function mapPixelSize(map: WorldMap): { width: number; height: number } {
  return { width: map.cols * TILE, height: map.rows * TILE };
}

/** The room a world-pixel position is in, or null in a doorway. */
export function zoneAt(map: WorldMap, x: number, y: number): Zone | null {
  const tx = x / TILE;
  const ty = y / TILE;
  return (
    map.zones.find(
      (zone) =>
        tx >= zone.rect.x &&
        tx < zone.rect.x + zone.rect.w &&
        ty >= zone.rect.y &&
        ty < zone.rect.y + zone.rect.h,
    ) ?? null
  );
}
