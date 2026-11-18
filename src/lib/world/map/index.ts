import { EAST_DECOR, EAST_FURNITURE, EAST_SEATS, EAST_THINGS, EAST_ZONES } from "./eastWing";
import { COLS, LAYOUT, ROWS } from "./layout";
import { OFFICE_DECOR, OFFICE_FURNITURE, OFFICE_SEATS, OFFICE_THINGS, OFFICE_ZONES } from "./office";
import { SOUTH_DECOR, SOUTH_FURNITURE, SOUTH_SEATS, SOUTH_THINGS, SOUTH_ZONES } from "./southWing";
import type { Furniture, Thing, WorldMap } from "./types";

export * from "./types";
export { COLS, PERSONAL_ROOMS, ROOM_COUNT, ROWS, personalRoomDoor, personalRoomRect } from "./layout";
export { PHOTO_BOOTH_AREA } from "./eastWing";
export { freePersonalRoom, personalRoomAt, personalRoomMiddle } from "./southWing";

/** The whole office, put together from its wings. */

const FURNITURE: Furniture[] = [...OFFICE_FURNITURE, ...EAST_FURNITURE, ...SOUTH_FURNITURE];

const THINGS: Thing[] = [
  ...OFFICE_THINGS,
  ...EAST_THINGS,
  ...SOUTH_THINGS,
  // Every plant can be watered.
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
  zones: [...OFFICE_ZONES, ...EAST_ZONES, ...SOUTH_ZONES],
  furniture: FURNITURE,
  seats: [...OFFICE_SEATS, ...EAST_SEATS, ...SOUTH_SEATS],
  things: THINGS,
  decor: [...OFFICE_DECOR, ...EAST_DECOR, ...SOUTH_DECOR],
  spawn: { x: 9, y: 13.5 },
  entrance: { x: 10, y: 18.3 },
};
