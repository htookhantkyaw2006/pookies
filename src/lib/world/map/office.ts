import type { Furniture, Point, Seat, Thing, WallDecor, Zone } from "./types";

/**
 * The original office: focus room, meeting room, kitchen, desks and lounge,
 * in the top-left corner of the building.
 */

export const OFFICE_ZONES: Zone[] = [
  {
    id: "desks",
    name: "Desks",
    hint: "You show as Online here",
    status: "online",
    rect: { x: 1, y: 8, w: 19, h: 11 },
    spot: { x: 9, y: 13.5 },
  },
  {
    id: "focus",
    name: "Focus room",
    hint: "Quiet zone. You show as Busy here",
    status: "busy",
    rect: { x: 1, y: 1, w: 9, h: 6 },
    spot: { x: 5, y: 4 },
  },
  {
    id: "meeting",
    name: "Meeting room",
    hint: "You show as Busy here",
    status: "busy",
    rect: { x: 11, y: 1, w: 9, h: 6 },
    spot: { x: 12, y: 2.5 },
  },
  {
    id: "kitchen",
    name: "Kitchen",
    hint: "Taking a break. You show as Away here",
    status: "away",
    rect: { x: 21, y: 1, w: 10, h: 6 },
    spot: { x: 23, y: 4 },
  },
  {
    id: "lounge",
    name: "Lounge",
    hint: "Taking a break. You show as Away here",
    status: "away",
    rect: { x: 21, y: 8, w: 10, h: 11 },
    spot: { x: 28.5, y: 15.5 },
  },
];

const POD_ORIGINS: Point[] = [
  { x: 3, y: 10 },
  { x: 11, y: 10 },
  { x: 3, y: 15 },
  { x: 11, y: 15 },
];

export const OFFICE_FURNITURE: Furniture[] = [
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

export const OFFICE_SEATS: Seat[] = [
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

export const OFFICE_DECOR: WallDecor[] = [
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
  { id: "window-east-3", kind: "window", x: 31, z: 9.2, faces: "west", width: 1.4 },
  // Inside walls.
  { id: "poster-meeting", kind: "poster", x: 11, z: 4.5, faces: "east", width: 0.8, color: "#cfbcf8" },
  { id: "poster-kitchen", kind: "poster", x: 21, z: 3.5, faces: "east", width: 0.8, color: "#ffe08a" },
  { id: "poster-desks", kind: "poster", x: 20, z: 9.4, faces: "west", width: 0.8, color: "#aed6f8" },
  { id: "art-lounge", kind: "poster", x: 21, z: 10.25, faces: "east", width: 0.8, color: "#ffc4a3" },
];

/** Things to use in the original office (plants are added for every plant on the map). */
export const OFFICE_THINGS: Thing[] = [
  // The espresso machine on the kitchen counter.
  { id: "coffee", kind: "coffee", x: 24.35, y: 2.45, reach: 64 },
  // The whiteboard on the meeting room's back wall.
  { id: "board", kind: "board", x: 15.5, y: 1.5, reach: 96 },
];
