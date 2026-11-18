import { describe, expect, it } from "vitest";
import { Box3, type Object3D } from "three";
import { findDoorways } from "@/lib/world/doors";
import { OFFICE_MAP } from "@/lib/world/map";
import { Doors } from "./doors";

const doorways = findDoorways(OFFICE_MAP);

/** The hinge of the door leaf at this position among all the leaves. */
function hinge(doors: Doors, index: number): Object3D {
  return doors.root.children[index];
}

/** Steps the doors for `seconds` at 60 frames a second. */
function run(doors: Doors, seconds: number, people: Array<{ x: number; y: number }>): void {
  for (let i = 0; i < seconds * 60; i += 1) doors.update(1 / 60, people);
}

describe("doors", () => {
  it("puts a door in every doorway, and none in the wide openings", () => {
    const at = doorways.map((door) => `${door.x},${door.y}`);
    // The office's three top-room doors, the game corner's two, the lounge to the garden,
    // and the five rooms under the office.
    expect(at.sort()).toEqual(
      ["4,7", "14,7", "25,7", "36,7", "31,5", "31,13", "4,19", "12,19", "17,19", "22,19", "29,19"].sort(),
    );
    // Two-tile doorways get a pair of doors.
    const doors = new Doors(OFFICE_MAP, false);
    const leaves = doorways.reduce((sum, door) => sum + (Math.max(door.w, door.h) > 1 ? 2 : 1), 0);
    expect(doors.root.children).toHaveLength(leaves);
    expect(doors.count).toBe(doorways.length);
  });

  it("keeps each shut door inside its doorway", () => {
    const doors = new Doors(OFFICE_MAP, false);
    doors.update(0, []);
    let index = 0;
    for (const door of doorways) {
      const count = Math.max(door.w, door.h) > 1 ? 2 : 1;
      for (let leaf = 0; leaf < count; leaf += 1) {
        const bounds = new Box3().setFromObject(doors.root.children[index]);
        expect(bounds.min.x, door.id).toBeGreaterThanOrEqual(door.x - 0.05);
        expect(bounds.max.x, door.id).toBeLessThanOrEqual(door.x + door.w + 0.05);
        expect(bounds.min.z, door.id).toBeGreaterThanOrEqual(door.y - 0.05);
        expect(bounds.max.z, door.id).toBeLessThanOrEqual(door.y + door.h + 0.05);
        index += 1;
      }
    }
  });

  it("swings open as someone walks up, away from them, and shuts once they've gone", () => {
    const doors = new Doors(OFFICE_MAP, false);
    // The headspace door (4,19) is a single door in an east-west wall; it's the fifth doorway found.
    const index = doorways.findIndex((door) => door.id === "door-4-19");
    const leafIndex = doorways.slice(0, index).reduce((sum, door) => sum + (Math.max(door.w, door.h) > 1 ? 2 : 1), 0);
    const leaf = hinge(doors, leafIndex);

    // Coming from the desks (north): it opens towards the headspace room (south).
    run(doors, 0.1, [{ x: 4.5, y: 18.4 }]);
    const partly = leaf.rotation.y;
    expect(Math.abs(partly)).toBeGreaterThan(0);
    run(doors, 1, [{ x: 4.5, y: 18.4 }]);
    const open = leaf.rotation.y;
    expect(Math.abs(open)).toBeGreaterThan(Math.abs(partly));
    // The free edge (1 tile along +x from the hinge) has swung south.
    const edgeZ = Math.sin(-open);
    expect(edgeZ).toBeGreaterThan(0.9);

    // Nobody near: it closes.
    run(doors, 2, [{ x: 10, y: 10 }]);
    expect(leaf.rotation.y).toBeCloseTo(0);

    // Coming from the headspace room (south): it opens the other way.
    run(doors, 1, [{ x: 4.5, y: 20.6 }]);
    expect(Math.sign(leaf.rotation.y)).toBe(-Math.sign(open));
  });

  it("opens straight away, without swinging, when reduced motion is on", () => {
    const doors = new Doors(OFFICE_MAP, true);
    doors.update(1 / 60, [{ x: 4.5, y: 18.4 }]);
    const index = doorways.findIndex((door) => door.id === "door-4-19");
    const leafIndex = doorways.slice(0, index).reduce((sum, door) => sum + (Math.max(door.w, door.h) > 1 ? 2 : 1), 0);
    expect(Math.abs(hinge(doors, leafIndex).rotation.y)).toBeCloseTo(Math.PI * 0.47);
  });
});
