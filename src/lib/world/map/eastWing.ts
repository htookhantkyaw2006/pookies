import type { Furniture, Seat, Thing, TileRect, WallDecor, Zone } from "./types";

/**
 * The east side: the game corner (cols 32-41, rows 1-6) off the kitchen, and
 * an open-air garden below it (cols 32-41, rows 8-25).
 *
 * The garden's stone path runs down the middle from the game corner, with a
 * branch west to the lounge door. North: a picnic table and a bench. Middle:
 * a fire pit with log seats, and a pond. South: the photo booth and the photo
 * wall. String lights hang over all of it.
 */

/**
 * Where you stand to be in a booth photo: the four spots in front of the
 * backdrop (tile units).
 */
export const PHOTO_BOOTH_AREA: TileRect = { x: 32, y: 22, w: 4, h: 2 };

export const EAST_ZONES: Zone[] = [
  {
    id: "game",
    name: "Game corner",
    hint: "Play a round. You show as Away here",
    status: "away",
    rect: { x: 32, y: 1, w: 10, h: 6 },
    spot: { x: 36.5, y: 4.5 },
  },
  {
    id: "garden",
    name: "Garden",
    hint: "Fresh air. You show as Away here",
    status: "away",
    rect: { x: 32, y: 8, w: 10, h: 18 },
    spot: { x: 36.5, y: 14 },
  },
];

export const EAST_FURNITURE: Furniture[] = [
  // Garden: paths first (they lie flat), then everything standing on the grass.
  { id: "path-main", kind: "path", rect: { x: 36, y: 8, w: 2, h: 18 }, solid: false },
  { id: "path-lounge", kind: "path", rect: { x: 32, y: 13, w: 4, h: 2 }, solid: false },
  // Game corner: arcade cabinets in the corner, darts by the far wall, foosball in the middle.
  { id: "throw-line", kind: "throwLine", rect: { x: 39, y: 3, w: 3, h: 1 }, solid: false },
  { id: "arcade-1", kind: "arcade", rect: { x: 32, y: 1, w: 1, h: 1 }, solid: true },
  { id: "arcade-2", kind: "arcade", rect: { x: 33, y: 1, w: 1, h: 1 }, solid: true },
  { id: "foosball", kind: "foosball", rect: { x: 34, y: 4, w: 2, h: 1 }, solid: true },
  { id: "game-corner-table", kind: "roundTable", rect: { x: 39, y: 5, w: 1, h: 1 }, solid: true },
  { id: "plant-game", kind: "plant", rect: { x: 41, y: 6, w: 1, h: 1 }, solid: true },
  { id: "string-lights", kind: "stringLights", rect: { x: 32, y: 8, w: 10, h: 18 }, solid: false },

  { id: "tree-1", kind: "tree", rect: { x: 32, y: 8, w: 1, h: 1 }, solid: true },
  { id: "tree-2", kind: "tree", rect: { x: 41, y: 8, w: 1, h: 1 }, solid: true },
  { id: "tree-3", kind: "tree", rect: { x: 41, y: 12, w: 1, h: 1 }, solid: true },
  { id: "tree-4", kind: "tree", rect: { x: 32, y: 25, w: 1, h: 1 }, solid: true },
  { id: "tree-5", kind: "tree", rect: { x: 41, y: 20, w: 1, h: 1 }, solid: true },

  // North: a picnic table west of the path, a bench east of it.
  { id: "picnic-table", kind: "picnicTable", rect: { x: 33, y: 9, w: 3, h: 2 }, solid: true },
  { id: "garden-bench", kind: "bench", rect: { x: 39, y: 10, w: 2, h: 1 }, solid: true },
  { id: "flowers-2", kind: "flowerBed", rect: { x: 38, y: 8, w: 2, h: 1 }, solid: true },

  // Middle: the fire pit with its logs, and the pond.
  { id: "fire-pit", kind: "firePit", rect: { x: 33, y: 16, w: 2, h: 2 }, solid: true },
  { id: "log-1", kind: "log", rect: { x: 32, y: 16, w: 1, h: 1 }, solid: false },
  { id: "log-2", kind: "log", rect: { x: 35, y: 16, w: 1, h: 1 }, solid: false },
  { id: "log-3", kind: "log", rect: { x: 34, y: 18, w: 1, h: 1 }, solid: false },
  { id: "pond", kind: "pond", rect: { x: 38, y: 15, w: 4, h: 3 }, solid: true },
  { id: "flowers-1", kind: "flowerBed", rect: { x: 32, y: 19, w: 2, h: 1 }, solid: true },

  // South: the photo booth (backdrop, four spots, a camera facing them) and the photo wall.
  { id: "photo-booth", kind: "photoBooth", rect: { x: 32, y: 21, w: 4, h: 1 }, solid: true },
  { id: "photo-camera", kind: "photoCamera", rect: { x: 34, y: 24, w: 1, h: 1 }, solid: true },
  { id: "photo-wall", kind: "photoWall", rect: { x: 38, y: 21, w: 2, h: 1 }, solid: true },
  { id: "flowers-3", kind: "flowerBed", rect: { x: 39, y: 24, w: 3, h: 2 }, solid: true },
];

export const EAST_SEATS: Seat[] = [
  // The picnic table's benches, two each side.
  { id: "picnic-1", zone: "garden", kind: "bench", x: 33.5, y: 11.5, facing: "up", sit: { x: 33.5, y: 10.75 } },
  { id: "picnic-2", zone: "garden", kind: "bench", x: 35.5, y: 11.5, facing: "up", sit: { x: 35.5, y: 10.75 } },
  { id: "picnic-3", zone: "garden", kind: "bench", x: 33.5, y: 8.5, facing: "down", sit: { x: 33.5, y: 9.25 } },
  { id: "picnic-4", zone: "garden", kind: "bench", x: 35.5, y: 8.5, facing: "down", sit: { x: 35.5, y: 9.25 } },
  // The bench, looking out over the path.
  { id: "bench-1", zone: "garden", kind: "bench", x: 39.5, y: 11.5, facing: "down", sit: { x: 39.5, y: 10.55 } },
  { id: "bench-2", zone: "garden", kind: "bench", x: 40.5, y: 11.5, facing: "down", sit: { x: 40.5, y: 10.55 } },
  // Logs round the fire.
  { id: "log-seat-1", zone: "garden", kind: "log", x: 32.5, y: 16.5 },
  { id: "log-seat-2", zone: "garden", kind: "log", x: 35.5, y: 16.5 },
  { id: "log-seat-3", zone: "garden", kind: "log", x: 34.5, y: 18.5 },
  // Standing spots in the photo booth (sample teammates drift over to pose).
  { id: "booth-1", zone: "garden", kind: "spot", x: 32.5, y: 22.6 },
  { id: "booth-2", zone: "garden", kind: "spot", x: 33.5, y: 22.6 },
  { id: "booth-3", zone: "garden", kind: "spot", x: 34.5, y: 22.6 },
  { id: "booth-4", zone: "garden", kind: "spot", x: 35.5, y: 22.6 },

  // Stools round the little table in the game corner.
  { id: "game-stool-1", zone: "game", kind: "stool", x: 38.5, y: 5.5 },
  { id: "game-stool-2", zone: "game", kind: "stool", x: 40.5, y: 5.5 },
];

export const EAST_DECOR: WallDecor[] = [
  { id: "window-game", kind: "window", x: 36.5, z: 1, faces: "south", width: 1.6 },
  { id: "scoreboard", kind: "scoreboard", x: 38.6, z: 1, faces: "south", width: 1.3 },
  { id: "dartboard", kind: "dartboard", x: 40.5, z: 1, faces: "south", width: 0.7 },
];

export const EAST_THINGS: Thing[] = [
  { id: "arcade-1", kind: "arcade", x: 32.5, y: 2.4, reach: 46 },
  { id: "arcade-2", kind: "arcade", x: 33.5, y: 2.4, reach: 46 },
  { id: "scores", kind: "scores", x: 38.6, y: 2.1, reach: 50 },
  // Behind the line on the floor.
  { id: "darts", kind: "darts", x: 40.5, y: 4.4, reach: 50 },
  // The booth's button, from any of its four spots (so the log nearby doesn't win).
  { id: "booth-button-1", kind: "booth", x: 32.5, y: 22.6, reach: 40 },
  { id: "booth-button-2", kind: "booth", x: 33.5, y: 22.6, reach: 40 },
  { id: "booth-button-3", kind: "booth", x: 34.5, y: 22.6, reach: 40 },
  { id: "booth-button-4", kind: "booth", x: 35.5, y: 22.6, reach: 40 },
  { id: "photos", kind: "photos", x: 39, y: 22.5, reach: 72 },
];
