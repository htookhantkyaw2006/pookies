import { Box3, PerspectiveCamera, Raycaster, Vector2, type Mesh } from "three";
import { describe, expect, it } from "vitest";
import { canSit, OFFICE_MAP, sitPoint } from "@/lib/world/map";
import { FOV, cameraOffset, rayToFloor, toPixels, toScene } from "./coords";
import { buildSeat, sitSpot } from "./furniture/seating";
import {
  FLOOR_TOP,
  MARKER_HEIGHT,
  RING_HEIGHT,
  RUG_BOTTOM,
  SHADOW_HEIGHT,
  buildRoom,
  isCutWall,
} from "./room";
import { Pookie } from "./pookie";
import { buildFurniture, buildOfficeScene } from "./scene";

const isWall = (c: number, r: number) => OFFICE_MAP.layout[r]?.[c] === "#";
const isFloor = (c: number, r: number) => OFFICE_MAP.layout[r]?.[c] === ".";

describe("3D coordinates", () => {
  it("turns engine pixels into tiles and back", () => {
    const at = toScene(432, 648);
    expect(at).toEqual({ x: 9, z: 13.5 });
    expect(toPixels(at.x, at.z)).toEqual({ x: 432, y: 648 });
  });

  it("finds where a ray meets the floor, and misses when looking up", () => {
    expect(rayToFloor({ x: 2, y: 10, z: 3 }, { x: 0, y: -1, z: 0 })).toEqual({ x: 2, z: 3 });
    expect(rayToFloor({ x: 0, y: 10, z: 0 }, { x: 0, y: -1, z: 1 })).toEqual({ x: 0, z: 10 });
    expect(rayToFloor({ x: 0, y: 10, z: 0 }, { x: 0, y: 1, z: 0 })).toBeNull();
  });

  it("points the middle of the screen at the spot the camera is looking at", () => {
    const camera = new PerspectiveCamera(FOV, 16 / 9, 0.1, 300);
    const target = { x: 12, z: 7 };
    const offset = cameraOffset(14);
    camera.position.set(target.x, offset.y, target.z + offset.z);
    camera.lookAt(target.x, 0, target.z);
    camera.updateMatrixWorld();
    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(0, 0), camera);
    const hit = rayToFloor(raycaster.ray.origin, raycaster.ray.direction)!;
    expect(hit.x).toBeCloseTo(target.x, 5);
    expect(hit.z).toBeCloseTo(target.z, 5);
  });
});

describe("the 3D office", () => {
  it("builds something for every piece of furniture, chair and stool on the map", () => {
    for (const item of OFFICE_MAP.furniture) {
      const piece = buildFurniture(item);
      let meshes = 0;
      piece.traverse((child) => {
        if ((child as Mesh).isMesh) meshes += 1;
      });
      expect(meshes, item.id).toBeGreaterThan(0);
    }
    for (const seat of OFFICE_MAP.seats) {
      const piece = buildSeat(OFFICE_MAP, seat);
      if (seat.kind === "chair" || seat.kind === "stool") expect(piece, seat.id).not.toBeNull();
      else expect(piece, seat.id).toBeNull();
    }
  });

  it("keeps solid furniture inside the tiles that block walking", () => {
    for (const item of OFFICE_MAP.furniture) {
      if (!item.solid) continue;
      const bounds = new Box3().setFromObject(buildFurniture(item));
      const slack = 0.06;
      expect(bounds.min.x, `${item.id} left`).toBeGreaterThanOrEqual(item.rect.x - slack);
      expect(bounds.max.x, `${item.id} right`).toBeLessThanOrEqual(item.rect.x + item.rect.w + slack);
      expect(bounds.min.z, `${item.id} back`).toBeGreaterThanOrEqual(item.rect.y - slack);
      expect(bounds.max.z, `${item.id} front`).toBeLessThanOrEqual(item.rect.y + item.rect.h + slack);
    }
  });

  it("hangs every window, clock and poster on a wall, facing into a room", () => {
    const step = { south: [0, 1], east: [1, 0], west: [-1, 0] } as const;
    for (const decor of OFFICE_MAP.decor) {
      const [dx, dz] = step[decor.faces];
      // Just behind the face is wall; just in front is floor.
      const behind = { c: Math.floor(decor.x - dx * 0.5), r: Math.floor(decor.z - dz * 0.5) };
      const front = { c: Math.floor(decor.x + dx * 0.5), r: Math.floor(decor.z + dz * 0.5) };
      expect(isWall(behind.c, behind.r), `${decor.id} wall`).toBe(true);
      expect(isFloor(front.c, front.r), `${decor.id} room`).toBe(true);
      // Cut-down walls (the ones between the camera and a room) are too low to hang things on.
      expect(isCutWall(OFFICE_MAP, behind.c, behind.r), `${decor.id} tall wall`).toBe(false);
    }
  });

  it("keeps flat layers apart so doorways and rugs don't flicker", () => {
    // The base block's top sits below the doorway floor (y = 0), never level with it.
    const base = buildRoom(OFFICE_MAP).children[0];
    expect(new Box3().setFromObject(base).max.y).toBeLessThan(-0.01);
    const layers = [0, FLOOR_TOP, RUG_BOTTOM, SHADOW_HEIGHT, RING_HEIGHT, MARKER_HEIGHT];
    for (let i = 1; i < layers.length; i += 1) {
      expect(layers[i] - layers[i - 1], `layer ${i}`).toBeGreaterThanOrEqual(0.005);
    }
  });

  it("puts the whole scene together, with a whiteboard to write on", () => {
    const office = buildOfficeScene(OFFICE_MAP, {});
    expect(office.board).not.toBeNull();
    expect(office.root.children.length).toBeGreaterThan(10);
    office.setPlantMood("plant-desks-1", "thirsty");
    office.setPlantMood("plant-desks-1", "fresh");
    office.dispose();
  });
});

describe("sitting in 3D", () => {
  it("seats everyone close to where the map says, facing something sensible", () => {
    for (const seat of OFFICE_MAP.seats) {
      if (!canSit(seat)) continue;
      const spot = sitSpot(OFFICE_MAP, seat);
      const point = sitPoint(seat);
      expect(Math.hypot(spot.x - point.x, spot.z - point.y), seat.id).toBeLessThan(0.7);
      expect(spot.y, seat.id).toBeGreaterThan(0);
      expect(Number.isFinite(spot.yaw), seat.id).toBe(true);
    }
  });

  it("turns desk chairs to face their desk", () => {
    const below = OFFICE_MAP.seats.find((seat) => seat.facing === "up")!;
    const above = OFFICE_MAP.seats.find((seat) => seat.facing === "down")!;
    expect(sitSpot(OFFICE_MAP, below).yaw).toBeCloseTo(Math.PI);
    expect(sitSpot(OFFICE_MAP, above).yaw).toBeCloseTo(0);
  });

  it("faces the round table from the kitchen stools beside it", () => {
    const stool = OFFICE_MAP.seats.find((seat) => seat.id === "kitchen-3")!;
    const spot = sitSpot(OFFICE_MAP, stool);
    expect(Math.sin(spot.yaw)).toBeGreaterThan(0.5); // looking towards +x, where the table is
  });
});

describe("3D characters", () => {
  it("walks, turns to face the way it goes, and sits", () => {
    const pookie = new Pookie({ color: "mint", shape: "bunny" }, "online", false);
    const pose = {
      x: 5,
      z: 5,
      y: 0,
      walking: true,
      sitting: false,
      seatYaw: null,
      holdingCoffee: false,
      visible: true,
    };
    pookie.update(pose, 1 / 60, true);
    pookie.update({ ...pose, x: 5.2 }, 1 / 60, true);
    expect(pookie.root.position.x).toBeCloseTo(5.2);
    pookie.update({ ...pose, walking: false, sitting: true, y: 0.22, seatYaw: Math.PI }, 1 / 60, true);
    expect(pookie.lift).toBeCloseTo(0.22);
    pookie.setStatus("busy");
    pookie.update({ ...pose, visible: false }, 1 / 60, true);
    expect(pookie.root.visible).toBe(false);
    pookie.dispose();
  });
});
