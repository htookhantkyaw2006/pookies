import { Group, type Mesh, type Object3D } from "three";
import { doorwayMiddle, findDoorways, type Doorway } from "@/lib/world/doors";
import type { WorldMap } from "@/lib/world/map";
import { COLORS } from "./materials";
import { ball, box, group, rbox } from "./parts";
import { WALL_HEIGHT, isCutWall } from "./room";

/**
 * A door in every doorway. Each swings open as someone walks up to it (away
 * from them, like a real door) and closes again once nobody is near. Doors
 * never block the way: they're always open by the time you reach them.
 *
 * Doors in the low, cut-away walls (the ones the camera looks over) are low
 * swing doors, so they don't hide the room behind; doors in full-height
 * walls are full height.
 */

/** How near (tiles) someone has to be for a door to open. */
const OPEN_DISTANCE = 1.5;
/** Seconds to swing fully open, and to swing shut again. */
const OPEN_SECONDS = 0.35;
const CLOSE_SECONDS = 0.7;
/** How far a door swings, in radians (a little under a right angle). */
const SWING = Math.PI * 0.47;

const TALL_DOOR = 1.05;
const LOW_DOOR = 0.55;

interface Leaf {
  pivot: Object3D;
  /** +1 or -1: which way this leaf turns to swing towards the "positive" side (south or east). */
  turn: number;
}

interface DoorState {
  door: Doorway;
  leaves: Leaf[];
  /** 0 shut, 1 fully open. */
  open: number;
  /** +1 swings south/east, -1 north/west; chosen when it starts to open. */
  side: number;
}

/** One door leaf, built hinged at the origin and reaching `length` along +x. */
function buildLeaf(length: number, height: number): Group {
  const width = length - 0.06;
  const low = height < TALL_DOOR;
  const parts = [
    rbox(width, height, 0.07, COLORS.wood, width / 2 + 0.03, height / 2 + 0.02, 0, 0.02),
    // A darker inset panel, and a round handle on both faces near the free edge.
    box(width - 0.16, height - (low ? 0.16 : 0.3), 0.075, COLORS.woodEdge, width / 2 + 0.03, height / 2 + 0.02, 0),
    ball(0.035, COLORS.butter, width - 0.07, height * (low ? 0.6 : 0.5), 0.05),
    ball(0.035, COLORS.butter, width - 0.07, height * (low ? 0.6 : 0.5), -0.05),
  ];
  const leaf = group(...parts);
  leaf.traverse((object) => {
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return leaf;
}

export class Doors {
  readonly root = new Group();
  private readonly doors: DoorState[] = [];

  constructor(
    map: WorldMap,
    private readonly calm: boolean,
  ) {
    for (const door of findDoorways(map)) {
      // The door is as tall as the wall it sits in allows.
      const jamb = door.along === "row" ? { c: door.x - 1, r: door.y } : { c: door.x, r: door.y - 1 };
      const height = isCutWall(map, jamb.c, jamb.r) ? LOW_DOOR : Math.min(TALL_DOOR, WALL_HEIGHT - 0.2);
      const span = door.along === "row" ? door.w : door.h;
      // One leaf for a narrow doorway, a pair for anything wider.
      const pair = span > 1;
      const length = pair ? span / 2 : span;
      const leaves: Leaf[] = [];
      for (const end of pair ? [0, 1] : [0]) {
        const pivot = new Group();
        const leaf = buildLeaf(length, height);
        if (door.along === "row") {
          // Hinged at the left (and right) edge of the doorway, in the middle of the wall.
          pivot.position.set(end === 0 ? door.x : door.x + door.w, 0, door.y + 0.5);
          if (end === 1) leaf.rotation.y = Math.PI;
        } else {
          // Hinged at the top (and bottom) edge, reaching along the wall.
          pivot.position.set(door.x + 0.5, 0, end === 0 ? door.y : door.y + door.h);
          leaf.rotation.y = end === 0 ? -Math.PI / 2 : Math.PI / 2;
        }
        pivot.add(leaf);
        this.root.add(pivot);
        // Turning +y swings a leaf's free edge towards -z (row doors) or +x (column doors);
        // these signs make "side +1" mean south for row doors and east for column doors.
        const turn = door.along === "row" ? (end === 0 ? -1 : 1) : end === 0 ? 1 : -1;
        leaves.push({ pivot, turn });
      }
      this.doors.push({ door, leaves, open: 0, side: 1 });
    }
  }

  /** Frees the door shapes (materials are shared with the rest of the office). */
  dispose(): void {
    this.root.traverse((object) => (object as Mesh).geometry?.dispose());
    this.root.removeFromParent();
  }

  /** How many doors there are (for tests). */
  get count(): number {
    return this.doors.length;
  }

  /**
   * Opens doors near anyone in `people` (tile units) and closes the rest,
   * a little more each frame.
   */
  update(dt: number, people: ReadonlyArray<{ x: number; y: number }>): void {
    for (const state of this.doors) {
      const middle = doorwayMiddle(state.door);
      let nearest: { x: number; y: number } | null = null;
      let best = OPEN_DISTANCE;
      for (const person of people) {
        const distance = Math.hypot(person.x - middle.x, person.y - middle.y);
        if (distance < best) {
          best = distance;
          nearest = person;
        }
      }

      // Swing away from whoever is coming through; only pick a side while shut,
      // so a door never flips round half open.
      if (nearest && state.open < 0.05) {
        const offset = state.door.along === "row" ? nearest.y - middle.y : nearest.x - middle.x;
        state.side = offset <= 0 ? 1 : -1;
      }

      const target = nearest ? 1 : 0;
      if (this.calm) {
        state.open = target;
      } else if (target > state.open) {
        state.open = Math.min(1, state.open + dt / OPEN_SECONDS);
      } else if (target < state.open) {
        state.open = Math.max(0, state.open - dt / CLOSE_SECONDS);
      }

      // Ease in and out, so the swing starts and stops softly.
      const t = state.open;
      const eased = t * t * (3 - 2 * t);
      for (const { pivot, turn } of state.leaves) pivot.rotation.y = turn * state.side * eased * SWING;
    }
  }
}
