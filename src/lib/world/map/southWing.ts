import { HEADSPACE, PERSONAL_ROOMS, ROOM_COUNT, WASHROOM, personalRoomDoor, personalRoomRect } from "./layout";
import type { Furniture, Point, Seat, Thing, WallDecor, Zone } from "./types";

/**
 * The row of rooms under the office (rows 20-25), left to right:
 *
 *   headspace (cols 1-7)    three nap pods, a breathing mat, cushions, a lamp;
 *                           its door opens off the desks
 *   personal space (9-22)   three quiet rooms anyone can use, each with a rug,
 *                           an armchair and side table, and a plant; doors off
 *                           the desks and the lounge. Being in one shows you as
 *                           Busy, and the light by its door says "In use"
 *   washroom (cols 24-30)   two stalls, sinks under a mirror, a shower; its
 *                           door opens off the lounge
 */

const FIRST = PERSONAL_ROOMS[0];
const LAST = PERSONAL_ROOMS[PERSONAL_ROOMS.length - 1];

/** The middle of personal space room `index`: where Places walks you. */
export function personalRoomMiddle(index: number): Point {
  const { x, y, w, h } = personalRoomRect(index);
  return { x: x + w / 2, y: y + h / 2 + 0.5 };
}

/** Which personal space room the tile point (x, y) is in, or -1 for none. */
export function personalRoomAt(x: number, y: number): number {
  return PERSONAL_ROOMS.findIndex(
    (rect) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h,
  );
}

/**
 * The first personal space room nobody else is in (`others` are tile points),
 * or the first room if they are all taken.
 */
export function freePersonalRoom(others: Iterable<Point>): number {
  const taken = new Set<number>();
  for (const point of others) taken.add(personalRoomAt(point.x, point.y));
  for (let index = 0; index < ROOM_COUNT; index += 1) if (!taken.has(index)) return index;
  return 0;
}

export const SOUTH_ZONES: Zone[] = [
  {
    id: "nap",
    name: "Headspace",
    hint: "Rest and recharge. You show as Away here",
    status: "away",
    rect: HEADSPACE,
    spot: { x: 4.5, y: 24 },
  },
  {
    id: "personal",
    name: "Personal space",
    hint: "Quiet time. You show as Busy here",
    status: "busy",
    rect: { x: FIRST.x, y: FIRST.y, w: LAST.x + LAST.w - FIRST.x, h: FIRST.h },
    spot: personalRoomMiddle(0),
  },
  {
    id: "wash",
    name: "Washroom",
    hint: "You show as Away here",
    status: "away",
    rect: WASHROOM,
    spot: { x: 26.5, y: 24 },
  },
];

const furniture: Furniture[] = [
  // Headspace: three nap pods along the back, a breathing mat, cushions, a night lamp.
  { id: "nap-pod-1", kind: "napPod", rect: { x: 1, y: 20, w: 1, h: 2 }, solid: true },
  { id: "nap-pod-2", kind: "napPod", rect: { x: 3, y: 20, w: 1, h: 2 }, solid: true },
  { id: "nap-pod-3", kind: "napPod", rect: { x: 6, y: 20, w: 1, h: 2 }, solid: true },
  { id: "breath-mat", kind: "breathMat", rect: { x: 3, y: 23, w: 2, h: 2 }, solid: false },
  { id: "cushion-1", kind: "floorCushion", rect: { x: 1, y: 24, w: 1, h: 1 }, solid: false },
  { id: "cushion-2", kind: "floorCushion", rect: { x: 7, y: 24, w: 1, h: 1 }, solid: false },
  { id: "lamp-nap", kind: "floorLamp", rect: { x: 7, y: 25, w: 1, h: 1 }, solid: true },
  { id: "plant-nap", kind: "plant", rect: { x: 1, y: 25, w: 1, h: 1 }, solid: true },

  // Washroom: two stalls along the back, sinks on the right under the mirror, a shower.
  { id: "stall-1", kind: "stall", rect: { x: 25, y: 20, w: 2, h: 2 }, solid: true },
  { id: "stall-2", kind: "stall", rect: { x: 27, y: 20, w: 2, h: 2 }, solid: true },
  { id: "sinks", kind: "sinkCounter", rect: { x: 30, y: 20, w: 1, h: 3 }, solid: true },
  { id: "shower", kind: "shower", rect: { x: 29, y: 24, w: 2, h: 2 }, solid: true },
  { id: "plant-wash", kind: "plant", rect: { x: 24, y: 25, w: 1, h: 1 }, solid: true },
];

const seats: Seat[] = [
  // Lie down in a pod from in front of it.
  { id: "nap-1", zone: "nap", kind: "bed", x: 1.5, y: 22.5, sit: { x: 1.5, y: 20.95 } },
  { id: "nap-2", zone: "nap", kind: "bed", x: 3.5, y: 22.5, sit: { x: 3.5, y: 20.95 } },
  { id: "nap-3", zone: "nap", kind: "bed", x: 6.5, y: 22.5, sit: { x: 6.5, y: 20.95 } },
  { id: "cushion-seat-1", zone: "nap", kind: "cushion", x: 1.5, y: 24.5 },
  { id: "cushion-seat-2", zone: "nap", kind: "cushion", x: 7.5, y: 24.5 },

  // Step into a stall from in front of its door.
  { id: "stall-seat-1", zone: "wash", kind: "stall", x: 26, y: 22.5, sit: { x: 26, y: 20.9 } },
  { id: "stall-seat-2", zone: "wash", kind: "stall", x: 28, y: 22.5, sit: { x: 28, y: 20.9 } },
];

// Personal space: the door is above each room's right-hand corner, so the
// armchair and side table sit in the left corner, the plant below them.
PERSONAL_ROOMS.forEach(({ x, y, w, h }, index) => {
  const n = index + 1;
  const door = personalRoomDoor(index);
  furniture.push(
    { id: `room-${n}-rug`, kind: "roomRug", rect: { x, y, w, h }, solid: false },
    { id: `room-${n}-table`, kind: "sideTable", rect: { x, y, w: 1, h: 1 }, solid: true },
    { id: `room-${n}-armchair`, kind: "armchair", rect: { x: x + 1, y, w: 1, h: 1 }, solid: false },
    { id: `plant-room-${n}`, kind: "plant", rect: { x, y: y + h - 1, w: 1, h: 1 }, solid: true },
    { id: `room-${n}-sign`, kind: "doorSign", rect: { x: door.x, y: door.y, w: 1, h: 1 }, solid: false },
  );
  seats.push({
    id: `room-${n}-seat`,
    zone: "personal",
    kind: "armchair",
    x: x + 1.5,
    y: y + 1.5,
    facing: "down",
    sit: { x: x + 1.5, y: y + 0.6 },
  });
});

export const SOUTH_FURNITURE: Furniture[] = furniture;

export const SOUTH_SEATS: Seat[] = seats;

export const SOUTH_DECOR: WallDecor[] = [
  { id: "poster-nap", kind: "poster", x: 1, z: 23.5, faces: "east", width: 0.8, color: "#cfbcf8" },
  // The washroom mirror, above the sinks on the wall it shares with the garden.
  { id: "mirror-wash", kind: "mirror", x: 31, z: 21.5, faces: "west", width: 1.8 },
];

export const SOUTH_THINGS: Thing[] = [
  // Anywhere on the round mat.
  { id: "breathe", kind: "breathe", x: 4, y: 24, reach: 72 },
  { id: "sink", kind: "sink", x: 29.5, y: 20.8, reach: 56 },
  { id: "mirror", kind: "mirror", x: 29.5, y: 22.3, reach: 56 },
];
