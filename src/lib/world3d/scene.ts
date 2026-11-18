import {
  Float32BufferAttribute,
  Group,
  Mesh,
  RingGeometry,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PlantMood } from "@/lib/data/rules";
import type { Furniture, WorldMap } from "@/lib/world/map";
import {
  buildBookshelf,
  buildDesk,
  buildDoormat,
  buildMeetingTable,
  buildPod,
  buildPrinter,
  buildWaterCooler,
} from "./furniture/desks";
import { buildWallDecor, buildWhiteboard } from "./furniture/decor";
import {
  buildBench,
  buildFirePit,
  buildFlowerBed,
  buildLog,
  buildPath,
  buildPicnicTable,
  buildPond,
  buildStringLights,
  buildTree,
} from "./furniture/garden";
import { buildCounter, buildFridge, buildRoundTable } from "./furniture/kitchen";
import { buildCoffeeTable, buildFloorLamp, buildGameTable, buildPlant, buildRug } from "./furniture/lounge";
import { buildArcade, buildFoosball, buildThrowLine } from "./furniture/games";
import { buildPhotoBooth, buildPhotoCamera, buildPhotoWall } from "./furniture/photo";
import { buildArmchair, buildDoorSign, buildRoomRug, buildSideTable } from "./furniture/rooms";
import { buildBeanbag, buildSeat, buildSofa } from "./furniture/seating";
import {
  buildBreathMat,
  buildFloorCushion,
  buildNapPod,
  buildShower,
  buildSinkCounter,
  buildStall,
} from "./furniture/washroom";
import { paint } from "./materials";
import { mesh } from "./parts";
import { MARKER_HEIGHT, buildRoom } from "./room";

/** One piece of furniture from the map, built in place. Plants start out looking fine. */
export function buildFurniture(item: Furniture, mood: PlantMood = "fine"): Group {
  switch (item.kind) {
    case "pod":
      return buildPod(item);
    case "desk":
      return buildDesk(item);
    case "meetingTable":
      return buildMeetingTable(item);
    case "bookshelf":
      return buildBookshelf(item);
    case "printer":
      return buildPrinter(item);
    case "waterCooler":
      return buildWaterCooler(item);
    case "doormat":
      return buildDoormat(item);
    case "counter":
      return buildCounter(item);
    case "fridge":
      return buildFridge(item);
    case "roundTable":
      return buildRoundTable(item);
    case "sofa":
      return buildSofa(item);
    case "beanbag":
      return buildBeanbag(item);
    case "coffeeTable":
      return buildCoffeeTable(item);
    case "gameTable":
      return buildGameTable(item);
    case "rug":
      return buildRug(item);
    case "floorLamp":
      return buildFloorLamp(item);
    case "plant":
      return buildPlant(item, mood);
    case "path":
      return buildPath(item);
    case "tree":
      return buildTree(item);
    case "picnicTable":
      return buildPicnicTable(item);
    case "bench":
      return buildBench(item);
    case "log":
      return buildLog(item);
    case "firePit":
      return buildFirePit(item);
    case "pond":
      return buildPond(item);
    case "flowerBed":
      return buildFlowerBed(item);
    case "stringLights":
      return buildStringLights(item);
    case "stall":
      return buildStall(item);
    case "sinkCounter":
      return buildSinkCounter(item);
    case "shower":
      return buildShower(item);
    case "napPod":
      return buildNapPod(item);
    case "breathMat":
      return buildBreathMat(item);
    case "floorCushion":
      return buildFloorCushion(item);
    case "roomRug":
      return buildRoomRug(item);
    case "armchair":
      return buildArmchair(item);
    case "sideTable":
      return buildSideTable(item);
    case "doorSign":
      return buildDoorSign(item);
    case "arcade":
      return buildArcade(item);
    case "foosball":
      return buildFoosball(item);
    case "throwLine":
      return buildThrowLine(item);
    case "photoBooth":
      return buildPhotoBooth(item);
    case "photoCamera":
      return buildPhotoCamera(item);
    case "photoWall":
      return buildPhotoWall(item);
    case "whiteboard": {
      const { board, surface } = buildWhiteboard(item);
      board.add(surface);
      return board;
    }
  }
}

export interface OfficeScene {
  /** Everything: scenery, plants, the whiteboard surface, the walk-to marker. */
  root: Group;
  /** Redraws one plant to match how recently it was watered. */
  setPlantMood(id: string, mood: PlantMood): void;
  /** The whiteboard's writing surface, for the team message. */
  board: Mesh | null;
  /** The ring that shows where you clicked to walk to. */
  marker: Mesh;
  /** Frees the GPU memory held by the scene's geometry. */
  dispose(): void;
}

function disposeTree(object: Object3D): void {
  object.traverse((child) => {
    if ((child as Mesh).isMesh) (child as Mesh).geometry.dispose();
  });
}

/**
 * Merges every fixed mesh that shares a material into a single mesh, so the
 * office draws in a few dozen calls instead of thousands. Meshes marked
 * `userData.dynamic`, and lights, are kept as they are.
 */
function bake(root: Group): Group {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, { material: Material; cast: boolean; parts: BufferGeometry[] }>();
  const keep: Object3D[] = [];

  root.traverse((object) => {
    if ((object as { isLight?: boolean }).isLight) {
      keep.push(object);
      return;
    }
    const piece = object as Mesh;
    if (!piece.isMesh) return;
    if (piece.userData.dynamic) {
      keep.push(piece);
      return;
    }
    let geometry = piece.geometry.clone().applyMatrix4(piece.matrixWorld);
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") geometry.deleteAttribute(name);
    }
    if (!geometry.getAttribute("uv")) {
      geometry.setAttribute("uv", new Float32BufferAttribute(new Float32Array(geometry.getAttribute("position").count * 2), 2));
    }
    geometry.clearGroups();
    const material = piece.material as Material;
    const cast = piece.userData.flat !== true;
    const key = `${material.uuid}|${cast}`;
    const bucket = buckets.get(key) ?? { material, cast, parts: [] };
    bucket.parts.push(geometry);
    buckets.set(key, bucket);
  });

  const baked = new Group();
  for (const object of keep) baked.attach(object);
  for (const { material, cast, parts } of buckets.values()) {
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    if (!merged) continue;
    const combined = new Mesh(merged, material);
    combined.castShadow = cast;
    combined.receiveShadow = true;
    baked.add(combined);
  }
  disposeTree(root);
  return baked;
}

/** Builds the whole 3D office from the map. */
export function buildOfficeScene(map: WorldMap, moods: Record<string, PlantMood> = {}): OfficeScene {
  const scenery = new Group();
  scenery.add(buildRoom(map));
  let board: Mesh | null = null;
  for (const item of map.furniture) {
    if (item.kind === "plant") continue;
    const piece = buildFurniture(item);
    if (item.kind === "whiteboard") {
      piece.traverse((child) => {
        if (child.userData.board) board = child as Mesh;
      });
    }
    scenery.add(piece);
  }
  for (const seat of map.seats) {
    const piece = buildSeat(map, seat);
    if (piece) scenery.add(piece);
  }
  for (const decor of map.decor) scenery.add(buildWallDecor(decor));

  const root = new Group();
  root.add(bake(scenery));

  // Plants change when they're watered, so each keeps a holder of its own.
  const plants = new Map<string, { item: Furniture; holder: Group; mood: PlantMood }>();
  for (const item of map.furniture) {
    if (item.kind !== "plant") continue;
    const mood = moods[item.id] ?? "fine";
    const holder = new Group();
    holder.add(buildPlant(item, mood));
    holder.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    plants.set(item.id, { item, holder, mood });
    root.add(holder);
  }

  const markerGeometry = new RingGeometry(0.16, 0.24, 28);
  markerGeometry.rotateX(-Math.PI / 2);
  const marker = mesh(markerGeometry, paint("#6b4ee6", { emissive: "#6b4ee6", glow: 0.6, opacity: 0.9 }), 0, MARKER_HEIGHT, 0);
  marker.visible = false;
  root.add(marker);

  return {
    root,
    board,
    marker,
    setPlantMood(id, mood) {
      const plant = plants.get(id);
      if (!plant || plant.mood === mood) return;
      disposeTree(plant.holder);
      plant.holder.clear();
      plant.holder.add(buildPlant(plant.item, mood));
      plant.holder.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
      });
      plant.mood = mood;
    },
    dispose() {
      disposeTree(root);
    },
  };
}
