import type { PresenceStatus } from "@/lib/data/types";

/**
 * The shapes the office floor plan is made of. Everything sits on a tile
 * grid; positions people stand at are in "tile units" and may be fractional
 * (4.5 = middle of tile 4). Multiply by TILE to get world pixels.
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

export type ZoneKind =
  | "desks"
  | "focus"
  | "meeting"
  | "kitchen"
  | "lounge"
  | "game"
  | "wash"
  | "nap"
  | "garden"
  | "personal";

export interface Zone {
  id: ZoneKind;
  name: string;
  /** Shown when you walk in. */
  hint: string;
  /** Being in this room says this about you. */
  status: PresenceStatus;
  rect: TileRect;
  /** A good open spot to walk to when someone picks this room from Places (tile units). */
  spot: Point;
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
  | "floorLamp"
  // Garden
  | "path"
  | "tree"
  | "picnicTable"
  | "bench"
  | "log"
  | "firePit"
  | "pond"
  | "flowerBed"
  | "stringLights"
  // Washroom and headspace room
  | "stall"
  | "sinkCounter"
  | "shower"
  | "napPod"
  | "breathMat"
  | "floorCushion"
  // Personal space rooms
  | "roomRug"
  | "armchair"
  | "sideTable"
  // Says "In use" while someone's in the room behind it.
  | "doorSign"
  | "arcade"
  | "foosball"
  | "throwLine"
  | "photoBooth"
  | "photoCamera"
  | "photoWall";

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
export type SeatKind =
  | "chair"
  | "stool"
  | "sofa"
  | "beanbag"
  | "bench"
  | "log"
  | "cushion"
  | "armchair"
  // Step into a toilet stall: you're hidden from view while inside.
  | "stall"
  // Lie down in a nap pod.
  | "bed"
  | "spot";

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

/** Seats where you can't be seen: inside a toilet stall. */
export function hidesYou(seat: Seat | undefined): boolean {
  return seat?.kind === "stall";
}

/** Where someone sitting in `seat` is drawn, in tile units. */
export function sitPoint(seat: Seat): Point {
  return seat.sit ?? { x: seat.x, y: seat.y };
}

/**
 * Pictures and fittings hung on walls. They never block anyone. `x`/`z` is a
 * point on the wall's face (tile units) and `faces` is the way it looks, into
 * the room.
 */
export type WallDecorKind = "window" | "clock" | "poster" | "mirror" | "dartboard" | "scoreboard";

export interface WallDecor {
  id: string;
  kind: WallDecorKind;
  x: number;
  z: number;
  faces: "south" | "east" | "west";
  width: number;
  color?: string;
}

/** Things you can walk up to and use. Positions are where you stand (tile units). */
export type ThingKind =
  | "coffee"
  | "board"
  | "plant"
  | "sink"
  | "mirror"
  | "breathe"
  | "arcade"
  | "darts"
  | "scores"
  | "booth"
  | "photos";

export interface Thing {
  id: string;
  kind: ThingKind;
  x: number;
  y: number;
  /** How close you need to be, in pixels. */
  reach: number;
}

/**
 * One letter per tile:
 *   "." floor you can walk on
 *   "#" wall
 *   "g" lawn outside the building (decoration, can't be walked on)
 *   "h" hedge edging the garden (can't be walked through)
 */
export type Tile = "." | "#" | "g" | "h";

export interface WorldMap {
  cols: number;
  rows: number;
  /** One string per row, one letter per tile (see Tile). */
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

export function tileAt(map: WorldMap, c: number, r: number): Tile | undefined {
  return map.layout[r]?.[c] as Tile | undefined;
}

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
