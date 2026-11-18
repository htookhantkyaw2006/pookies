import { describe, expect, it } from "vitest";
import { HALF_H, HALF_W, WorldEngine, type WorldPerson } from "./engine";
import { boxHitsSolid, buildGrid, cellAt, isWalkable, moveWithCollisions } from "./grid";
import {
  OFFICE_MAP,
  ROOM_COUNT,
  TILE,
  freePersonalRoom,
  personalRoomAt,
  personalRoomDoor,
  personalRoomMiddle,
  personalRoomRect,
  toPixels,
  zoneAt,
} from "./map";
import { findPath, nearestWalkable } from "./pathfinding";

const grid = buildGrid(OFFICE_MAP);

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

/** Steps the world for `seconds` of game time at 60 frames a second. */
function run(engine: WorldEngine, seconds: number): string[] {
  const entered: string[] = [];
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame += 1) {
    const zone = engine.step(1 / 60);
    if (zone) entered.push(zone.id);
  }
  return entered;
}

describe("the office map", () => {
  it("is a complete rectangle of tiles", () => {
    expect(OFFICE_MAP.layout).toHaveLength(OFFICE_MAP.rows);
    for (const row of OFFICE_MAP.layout) expect(row).toHaveLength(OFFICE_MAP.cols);
  });

  it("is walled in on every side", () => {
    for (let c = 0; c < OFFICE_MAP.cols; c += 1) {
      expect(isWalkable(grid, c, 0)).toBe(false);
      expect(isWalkable(grid, c, OFFICE_MAP.rows - 1)).toBe(false);
    }
    for (let r = 0; r < OFFICE_MAP.rows; r += 1) {
      expect(isWalkable(grid, 0, r)).toBe(false);
      expect(isWalkable(grid, OFFICE_MAP.cols - 1, r)).toBe(false);
    }
  });

  it("has room to stand at every seat, the spawn point and the door", () => {
    const spots = [...OFFICE_MAP.seats, OFFICE_MAP.spawn, OFFICE_MAP.entrance];
    for (const spot of spots) {
      const { x, y } = toPixels(spot);
      expect(boxHitsSolid(grid, x, y, HALF_W, HALF_H), JSON.stringify(spot)).toBe(false);
    }
  });

  it("puts every seat inside the room it belongs to", () => {
    for (const seat of OFFICE_MAP.seats) {
      const { x, y } = toPixels(seat);
      expect(zoneAt(OFFICE_MAP, x, y)?.id, seat.id).toBe(seat.zone);
    }
  });

  it("lets you walk from the door to every seat", () => {
    const door = toPixels(OFFICE_MAP.entrance);
    for (const seat of OFFICE_MAP.seats) {
      const { x, y } = toPixels(seat);
      expect(findPath(grid, cellAt(door.x, door.y), cellAt(x, y)), seat.id).not.toBeNull();
    }
  });
});

describe("findPath", () => {
  it("goes through doorways, never through walls or furniture", () => {
    const start = cellAt(...(Object.values(toPixels(OFFICE_MAP.spawn)) as [number, number]));
    const goal = { c: 5, r: 3 }; // inside the focus room
    const path = findPath(grid, start, goal);
    expect(path).not.toBeNull();
    for (const cell of path!) expect(isWalkable(grid, cell.c, cell.r)).toBe(true);
    expect(path!.at(-1)).toEqual(goal);
    // The only way in is the doorway in row 7.
    expect(path!.some((cell) => cell.r === 7 && (cell.c === 4 || cell.c === 5))).toBe(true);
  });

  it("never cuts a corner between two solid tiles", () => {
    const path = findPath(grid, { c: 9, r: 13 }, { c: 24, r: 3 })!;
    let previous = { c: 9, r: 13 };
    for (const cell of path) {
      if (cell.c !== previous.c && cell.r !== previous.r) {
        expect(isWalkable(grid, cell.c, previous.r)).toBe(true);
        expect(isWalkable(grid, previous.c, cell.r)).toBe(true);
      }
      previous = cell;
    }
  });

  it("returns an empty path when already there and null for solid tiles", () => {
    expect(findPath(grid, { c: 9, r: 13 }, { c: 9, r: 13 })).toEqual([]);
    expect(findPath(grid, { c: 9, r: 13 }, { c: 0, r: 0 })).toBeNull();
  });
});

describe("nearestWalkable", () => {
  it("keeps a walkable cell and steps off a solid one", () => {
    expect(nearestWalkable(grid, { c: 9, r: 13 })).toEqual({ c: 9, r: 13 });
    const off = nearestWalkable(grid, { c: 4, r: 10 }); // inside a desk pod
    expect(off).not.toBeNull();
    expect(isWalkable(grid, off!.c, off!.r)).toBe(true);
  });
});

describe("moveWithCollisions", () => {
  it("stops at a wall but still slides along it", () => {
    // Standing just right of the left wall, pushing up and to the left.
    const start = { x: TILE + HALF_W, y: 12 * TILE };
    const moved = moveWithCollisions(grid, start, -6, -6, HALF_W, HALF_H);
    expect(moved.x).toBe(start.x);
    expect(moved.y).toBe(start.y - 6);
  });
});

describe("WorldEngine", () => {
  const people: WorldPerson[] = [
    { id: "me", status: "online" },
    { id: "ana", status: "online" },
    { id: "ben", status: "busy" },
    { id: "cy", status: "away" },
    { id: "dee", status: "offline" },
  ];

  function zoneOf(engine: WorldEngine, id: string): string | undefined {
    const entity = engine.entities.get(id)!;
    return zoneAt(OFFICE_MAP, entity.x, entity.y)?.id;
  }

  it("starts everyone in a room that matches their status", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(3));
    engine.sync(people, "me");
    expect(zoneOf(engine, "me")).toBe("desks");
    expect(zoneOf(engine, "ana")).toBe("desks");
    expect(["focus", "meeting"]).toContain(zoneOf(engine, "ben"));
    expect(["kitchen", "lounge", "garden", "nap"]).toContain(zoneOf(engine, "cy"));
    expect(engine.entities.get("dee")!.visible).toBe(false);
  });

  it("never seats two people in the same spot", () => {
    const crowd: WorldPerson[] = Array.from({ length: 15 }, (_, i) => ({
      id: `p${i}`,
      status: (["online", "busy", "away"] as const)[i % 3],
    }));
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(11));
    engine.sync(crowd, "p0");
    const seats = [...engine.entities.values()].map((e) => e.seatId).filter(Boolean);
    expect(new Set(seats).size).toBe(seats.length);
  });

  it("walks a teammate to a new room when their status changes", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(5));
    engine.sync(people, "me");
    engine.sync(
      people.map((p) => (p.id === "ana" ? { ...p, status: "away" as const } : p)),
      "me",
    );
    expect(engine.entities.get("ana")!.path.length).toBeGreaterThan(0);
    run(engine, 40);
    expect(engine.entities.get("ana")!.path).toHaveLength(0);
    expect(["kitchen", "lounge", "garden", "nap"]).toContain(zoneOf(engine, "ana"));
  });

  it("keeps teammates out of walls and furniture while they walk", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(8));
    engine.sync(people, "me");
    const statuses = ["away", "busy", "online"] as const;
    for (let round = 0; round < 6; round += 1) {
      engine.sync(
        people.map((p) =>
          p.id === "me" || p.id === "dee" ? p : { ...p, status: statuses[round % 3] },
        ),
        "me",
      );
      for (let frame = 0; frame < 60 * 25; frame += 1) {
        engine.step(1 / 60);
        for (const entity of engine.entities.values()) {
          if (!entity.visible || entity.sitting) continue; // sitting sinks into a sofa
          expect(
            boxHitsSolid(grid, entity.x, entity.y, HALF_W, HALF_H),
            `${entity.id} at ${entity.x.toFixed(1)},${entity.y.toFixed(1)} (round ${round}, frame ${frame})`,
          ).toBe(false);
        }
      }
    }
  });

  it("sends someone out through the door when they go offline, and back in later", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(2));
    engine.sync(people, "me");
    engine.sync(
      people.map((p) => (p.id === "ana" ? { ...p, status: "offline" as const } : p)),
      "me",
    );
    const ana = engine.entities.get("ana")!;
    expect(ana.visible).toBe(true); // still walking out
    run(engine, 40);
    expect(ana.visible).toBe(false);

    engine.sync(people, "me");
    expect(ana.visible).toBe(true);
    run(engine, 40);
    expect(zoneOf(engine, "ana")).toBe("desks");
  });

  it("removes people who have left the workspace", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(2));
    engine.sync(people, "me");
    engine.sync(
      people.filter((p) => p.id !== "ben"),
      "me",
    );
    expect(engine.entities.has("ben")).toBe(false);
  });

  it("moves you with the keyboard and stops you at walls", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(1));
    engine.sync(people, "me");
    const me = engine.player!;
    const startX = me.x;
    engine.setInput(-1, 0);
    run(engine, 0.5);
    expect(me.x).toBeLessThan(startX);
    expect(me.walking).toBe(true);

    run(engine, 10); // keep pushing into the left wall
    expect(me.x).toBeGreaterThanOrEqual(TILE + HALF_W - 0.01);
    expect(boxHitsSolid(grid, me.x, me.y, HALF_W, HALF_H)).toBe(false);

    engine.setInput(0, 0);
    run(engine, 0.1);
    expect(me.walking).toBe(false);
  });

  it("walks you to a clicked spot and reports the room you enter", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(1));
    engine.sync(people, "me");
    expect(engine.zone?.id).toBe("desks");

    const target = toPixels({ x: 5, y: 4 }); // middle of the focus room
    expect(engine.walkTo(target.x, target.y)).toBe(true);
    expect(engine.playerTarget).not.toBeNull();
    const entered = run(engine, 20);

    expect(entered).toEqual(["focus"]);
    expect(engine.zone?.id).toBe("focus");
    expect(engine.player!.x).toBeCloseTo(target.x, 0);
    expect(engine.player!.y).toBeCloseTo(target.y, 0);
    expect(engine.playerTarget).toBeNull();
  });

  it("walks to the nearest free spot when you click on furniture", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(1));
    engine.sync(people, "me");
    const inPod = toPixels({ x: 4.5, y: 10.5 });
    expect(engine.walkTo(inPod.x, inPod.y)).toBe(true);
    run(engine, 20);
    const me = engine.player!;
    expect(boxHitsSolid(grid, me.x, me.y, HALF_W, HALF_H)).toBe(false);
    expect(Math.hypot(me.x - inPod.x, me.y - inPod.y)).toBeLessThan(TILE * 2);
  });

  it("lets the keyboard interrupt a click-to-walk", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(1));
    engine.sync(people, "me");
    const target = toPixels({ x: 25, y: 12 });
    engine.walkTo(target.x, target.y);
    run(engine, 0.3);
    engine.setInput(0, 1);
    expect(engine.player!.path).toHaveLength(0);
    expect(engine.playerTarget).toBeNull();
  });

  it("walks you over to stand beside a teammate", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(4));
    engine.sync(people, "me");
    expect(engine.walkToEntity("ben")).toBe(true);
    run(engine, 30);
    const me = engine.player!;
    const ben = engine.entities.get("ben")!;
    expect(Math.hypot(me.x - ben.x, me.y - ben.y)).toBeLessThan(60);
    expect(engine.walkToEntity("dee")).toBe(false); // offline: nobody to walk to
  });

  it("gets a wave back from someone nearby who isn't busy", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(4));
    engine.sync(people, "me");
    engine.walkToEntity("ana");
    run(engine, 30);
    engine.wave();
    expect(engine.player!.emote).toBe("👋");
    run(engine, 1.2);
    expect(engine.entities.get("ana")!.emote).toBe("👋");
    run(engine, 3);
    expect(engine.player!.emote).toBeNull();
    expect(engine.entities.get("ana")!.emote).toBeNull();
  });

  it("doesn't get a wave back from someone who is busy", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(4));
    engine.sync(people, "me");
    engine.walkToEntity("ben");
    run(engine, 30);
    engine.wave();
    run(engine, 1.2);
    expect(engine.entities.get("ben")!.emote).toBeNull();
  });
});

describe("WorldEngine with real teammates", () => {
  const people: WorldPerson[] = [
    { id: "me", status: "online" },
    { id: "ana", status: "online" },
    { id: "ben", status: "offline" },
  ];

  function liveEngine(): WorldEngine {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(6));
    engine.setTeammateMode("live");
    engine.sync(people, "me");
    return engine;
  }

  it("keeps a teammate hidden until their browser says where they are", () => {
    const engine = liveEngine();
    const ana = engine.entities.get("ana")!;
    expect(ana.visible).toBe(false);

    engine.setRemotePosition("ana", 500, 600);
    expect(ana.visible).toBe(true);
    expect(ana.x).toBe(500);
    expect(ana.y).toBe(600);
  });

  it("glides a teammate to each new position instead of jumping", () => {
    const engine = liveEngine();
    const ana = engine.entities.get("ana")!;
    engine.setRemotePosition("ana", 500, 600);
    engine.setRemotePosition("ana", 560, 600);
    expect(ana.x).toBe(500); // not there yet
    run(engine, 0.1);
    expect(ana.x).toBeGreaterThan(500);
    expect(ana.x).toBeLessThan(560);
    expect(ana.walking).toBe(true);
    run(engine, 1);
    expect(ana.x).toBeCloseTo(560, 0);
    expect(ana.walking).toBe(false);
  });

  it("moves a teammate at once when they are far from where we drew them", () => {
    const engine = liveEngine();
    const ana = engine.entities.get("ana")!;
    engine.setRemotePosition("ana", 200, 600);
    engine.setRemotePosition("ana", 1300, 300);
    expect(ana.x).toBe(1300);
    expect(ana.y).toBe(300);
  });

  it("does not move a teammate just because their status changed", () => {
    const engine = liveEngine();
    const ana = engine.entities.get("ana")!;
    engine.setRemotePosition("ana", 500, 600);
    engine.sync(
      people.map((p) => (p.id === "ana" ? { ...p, status: "busy" as const } : p)),
      "me",
    );
    run(engine, 5);
    expect(ana.x).toBe(500);
    expect(ana.y).toBe(600);
    expect(ana.visible).toBe(true);
  });

  it("ignores positions for someone who is offline until they come back", () => {
    const engine = liveEngine();
    const ben = engine.entities.get("ben")!;
    engine.setRemotePosition("ben", 500, 600);
    expect(ben.visible).toBe(false);

    engine.sync(
      people.map((p) => (p.id === "ben" ? { ...p, status: "online" as const } : p)),
      "me",
    );
    expect(ben.visible).toBe(true);
    expect(ben.x).toBe(500);
  });

  it("walks a teammate out of the door when they disconnect", () => {
    const engine = liveEngine();
    const ana = engine.entities.get("ana")!;
    engine.setRemotePosition("ana", 500, 600);
    engine.sync(
      people.map((p) => (p.id === "ana" ? { ...p, status: "offline" as const } : p)),
      "me",
    );
    expect(ana.visible).toBe(true);
    run(engine, 30);
    expect(ana.visible).toBe(false);

    // Coming back needs a fresh position: the old one is forgotten.
    engine.sync(people, "me");
    expect(ana.visible).toBe(false);
    engine.setRemotePosition("ana", 480, 870);
    expect(ana.visible).toBe(true);
  });

  it("never lets a message move your own character or leave the map", () => {
    const engine = liveEngine();
    const me = engine.player!;
    const before = { x: me.x, y: me.y };
    engine.setRemotePosition("me", 100, 100);
    expect({ x: me.x, y: me.y }).toEqual(before);

    engine.setRemotePosition("ana", -5000, 99999);
    const ana = engine.entities.get("ana")!;
    expect(ana.x).toBe(TILE);
    expect(ana.y).toBe(OFFICE_MAP.rows * TILE - TILE);
  });

  it("shows a teammate's wave, and doesn't invent waves back", () => {
    const engine = liveEngine();
    engine.setRemotePosition("ana", me_x(engine) + 40, engine.player!.y);
    engine.showWave("ana");
    expect(engine.entities.get("ana")!.emote).toBe("👋");
    run(engine, 3);
    engine.wave();
    run(engine, 1.5);
    expect(engine.entities.get("ana")!.emote).toBeNull();
  });
});

function me_x(engine: WorldEngine): number {
  return engine.player!.x;
}

describe("sitting", () => {
  const seat = (id: string) => OFFICE_MAP.seats.find((item) => item.id === id)!;
  const alone: WorldPerson[] = [{ id: "me", status: "online" }];

  function engineWithMeAt(id: string): WorldEngine {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(4));
    engine.sync(alone, "me");
    const spot = toPixels(seat(id));
    engine.player!.x = spot.x;
    engine.player!.y = spot.y;
    return engine;
  }

  it("has a chair drawn at every desk, and only stands at the ping-pong table", () => {
    for (const item of OFFICE_MAP.seats) {
      if (item.zone === "desks" || item.zone === "focus" || item.zone === "meeting") {
        expect(item.kind, item.id).toBe("chair");
        expect(item.facing, item.id).toBeDefined();
      }
    }
    expect(seat("lounge-7").kind).toBe("spot");
  });

  it("sits in the chair you are standing next to, and stands up when you walk off", () => {
    const engine = engineWithMeAt("desk-1-1");
    expect(engine.nearbySeat()?.id).toBe("desk-1-1");
    expect(engine.sit()).toBe(true);
    expect(engine.player!.sitting).toBe(true);
    expect(engine.player!.seatId).toBe("desk-1-1");
    expect(engine.nearbySeat()).toBeNull();

    engine.setInput(1, 0);
    run(engine, 0.3);
    expect(engine.player!.sitting).toBe(false);
    expect(engine.player!.seatId).toBeNull();
  });

  it("sinks into the sofa and gets back up in front of it", () => {
    const engine = engineWithMeAt("lounge-3");
    const standing = { x: engine.player!.x, y: engine.player!.y };
    expect(engine.sit("lounge-3")).toBe(true);
    expect(engine.player!.y).toBeGreaterThan(standing.y);
    engine.standUp();
    expect({ x: engine.player!.x, y: engine.player!.y }).toEqual(standing);
  });

  it("walks over and sits down when you click a chair", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(4));
    engine.sync(alone, "me");
    const chair = toPixels(seat("desk-4-3"));
    expect(engine.walkTo(chair.x, chair.y - 14)).toBe(true);
    run(engine, 8);
    expect(engine.player!.sitting).toBe(true);
    expect(engine.player!.seatId).toBe("desk-4-3");
  });

  it("won't let you sit where someone else is sitting", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(5));
    engine.setTeammateMode("live");
    engine.sync([...alone, { id: "ana", status: "online" }], "me");
    const spot = toPixels(seat("desk-2-2"));
    engine.setRemotePosition("ana", spot.x, spot.y, "desk-2-2");
    expect(engine.entities.get("ana")!.sitting).toBe(true);

    engine.player!.x = spot.x;
    engine.player!.y = spot.y;
    expect(engine.sit("desk-2-2")).toBe(false);

    // Ana gets up and walks off: the chair is free again.
    engine.setRemotePosition("ana", spot.x + 40, spot.y);
    expect(engine.entities.get("ana")!.sitting).toBe(false);
    expect(engine.sit("desk-2-2")).toBe(true);
  });

  it("seats sample teammates once they reach their chair", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(3));
    engine.sync(
      [
        { id: "me", status: "online" },
        { id: "ana", status: "online" },
      ],
      "me",
    );
    const ana = engine.entities.get("ana")!;
    expect(ana.sitting).toBe(true);
    engine.sync(
      [
        { id: "me", status: "online" },
        { id: "ana", status: "busy" },
      ],
      "me",
    );
    expect(ana.sitting).toBe(false);
    run(engine, 30);
    expect(ana.sitting).toBe(true);
    expect(["focus", "meeting"]).toContain(zoneAt(OFFICE_MAP, ana.x, ana.y)?.id);
  });
});

describe("things to use", () => {
  const thing = (id: string) => OFFICE_MAP.things.find((item) => item.id === id)!;
  const alone: WorldPerson[] = [{ id: "me", status: "online" }];

  function standAt(engine: WorldEngine, x: number, y: number) {
    engine.player!.x = x * TILE;
    engine.player!.y = y * TILE;
  }

  it("has a coffee machine, a whiteboard and every plant, all reachable on foot", () => {
    expect(thing("coffee").kind).toBe("coffee");
    expect(thing("board").kind).toBe("board");
    const plants = OFFICE_MAP.furniture.filter((item) => item.kind === "plant");
    expect(OFFICE_MAP.things.filter((item) => item.kind === "plant")).toHaveLength(plants.length);
    const door = toPixels(OFFICE_MAP.entrance);
    for (const item of OFFICE_MAP.things) {
      const spot = toPixels(item);
      const cell = nearestWalkable(grid, cellAt(spot.x, spot.y))!;
      expect(findPath(grid, cellAt(door.x, door.y), cell), item.id).not.toBeNull();
      const standing = { x: (cell.c + 0.5) * TILE, y: (cell.r + 0.5) * TILE };
      expect(Math.hypot(standing.x - spot.x, standing.y - spot.y), item.id).toBeLessThanOrEqual(item.reach);
    }
  });

  it("offers the coffee machine at the counter, and a coffee lasts a while", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(1));
    engine.sync(alone, "me");
    standAt(engine, 24.4, 2.6);
    const here = engine.nearby();
    expect(here?.kind === "thing" && here.thing.kind).toBe("coffee");
    engine.carry("☕", 90);
    run(engine, 60);
    expect(engine.player!.holding).toBe("☕");
    run(engine, 31);
    expect(engine.player!.holding).toBeNull();
  });

  it("offers to water a plant you stand beside, and nothing in an empty corridor", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(1));
    engine.sync(alone, "me");
    standAt(engine, 18.5, 9.5); // next to the plant in the desks' top-right corner
    const here = engine.nearby();
    expect(here?.kind === "thing" && here.thing.id).toBe("plant-desks-2");
    standAt(engine, 9, 13.5);
    expect(engine.nearby()).toBeNull();
  });

  it("offers 'stand up' while you sit, even beside something else", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(1));
    engine.sync(alone, "me");
    const seat = toPixels(OFFICE_MAP.seats.find((item) => item.id === "kitchen-1")!);
    engine.player!.x = seat.x;
    engine.player!.y = seat.y;
    expect(engine.sit("kitchen-1")).toBe(true);
    expect(engine.nearby()?.kind).toBe("stand");
  });

  it("shows a teammate's coffee and water drops from another browser", () => {
    const engine = new WorldEngine(OFFICE_MAP, seededRandom(5));
    engine.setTeammateMode("live");
    engine.sync([...alone, { id: "ana", status: "online" }], "me");
    engine.setRemotePosition("ana", 500, 600);
    engine.showRemoteEmote("ana", "☕", true);
    engine.showRemoteEmote("ana", "💧", false);
    const ana = engine.entities.get("ana")!;
    expect(ana.holding).toBe("☕");
    expect(ana.emote).toBe("💧");
  });
});

describe("the bigger office", () => {
  const door = toPixels(OFFICE_MAP.entrance);
  const fromDoor = cellAt(door.x, door.y);

  it("keeps the original office exactly where it was", () => {
    // The desks, the lounge and the front door haven't moved.
    expect(zoneAt(OFFICE_MAP, 9 * TILE, 13.5 * TILE)?.id).toBe("desks");
    expect(zoneAt(OFFICE_MAP, 25 * TILE, 15 * TILE)?.id).toBe("lounge");
    expect(OFFICE_MAP.entrance).toEqual({ x: 10, y: 18.3 });
  });

  it("can walk from the front door to every room's Places spot", () => {
    for (const zone of OFFICE_MAP.zones) {
      const spot = toPixels(zone.spot);
      expect(boxHitsSolid(grid, spot.x, spot.y, HALF_W, HALF_H), `${zone.id} spot is clear`).toBe(false);
      expect(zoneAt(OFFICE_MAP, spot.x, spot.y)?.id, `${zone.id} spot is inside the room`).toBe(zone.id);
      expect(findPath(grid, fromDoor, cellAt(spot.x, spot.y)), zone.id).not.toBeNull();
    }
  });

  it("gives every personal room a door, and a way in from the front door", () => {
    for (let index = 0; index < ROOM_COUNT; index += 1) {
      const room = personalRoomRect(index);
      const doorTile = personalRoomDoor(index);
      expect(isWalkable(grid, doorTile.x, doorTile.y), `room ${index + 1} door`).toBe(true);
      // The door is in the wall just above the room, and opens straight into it.
      expect(doorTile.y + 1).toBe(room.y);
      expect(doorTile.x >= room.x && doorTile.x < room.x + room.w).toBe(true);
      expect(isWalkable(grid, doorTile.x, room.y), `room ${index + 1} inside the door`).toBe(true);
      const middle = { c: room.x + 1, r: room.y + 1 };
      expect(isWalkable(grid, middle.c, middle.r)).toBe(true);
      expect(findPath(grid, fromDoor, middle), `room ${index + 1}`).not.toBeNull();
    }
  });

  it("gives every piece of furniture, seat, thing and wall decoration its own id", () => {
    for (const list of [OFFICE_MAP.furniture, OFFICE_MAP.seats, OFFICE_MAP.things, OFFICE_MAP.decor, OFFICE_MAP.zones]) {
      const ids = list.map((item) => item.id);
      expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
    }
  });

  it("gives every personal room an armchair to sit in, and shows you as Busy inside", () => {
    for (let index = 0; index < ROOM_COUNT; index += 1) {
      const seat = OFFICE_MAP.seats.find((item) => item.id === `room-${index + 1}-seat`);
      expect(seat, `room ${index + 1} seat`).toBeDefined();
      expect(personalRoomAt(seat!.x, seat!.y)).toBe(index);
      expect(findPath(grid, fromDoor, cellAt(seat!.x * TILE, seat!.y * TILE))).not.toBeNull();
      const middle = toPixels(personalRoomMiddle(index));
      expect(boxHitsSolid(grid, middle.x, middle.y, HALF_W, HALF_H)).toBe(false);
      const zone = zoneAt(OFFICE_MAP, middle.x, middle.y);
      expect(zone?.id).toBe("personal");
      expect(zone?.status).toBe("busy");
    }
    // The garden outside isn't part of any room.
    expect(personalRoomAt(55.5, 10.5)).toBe(-1);
  });

  it("sends you to a personal room nobody else is in", () => {
    expect(freePersonalRoom([])).toBe(0);
    expect(freePersonalRoom([personalRoomMiddle(0)])).toBe(1);
    expect(freePersonalRoom([personalRoomMiddle(0), personalRoomMiddle(1)])).toBe(2);
    expect(freePersonalRoom([personalRoomMiddle(1), { x: 5, y: 5 }])).toBe(0);
    // All taken: still somewhere to go.
    expect(freePersonalRoom([0, 1, 2].map(personalRoomMiddle))).toBe(0);
  });

  it("only lets you walk inside the building: never on the lawn or through the hedge", () => {
    for (let r = 0; r < OFFICE_MAP.rows; r += 1) {
      for (let c = 0; c < OFFICE_MAP.cols; c += 1) {
        const tile = OFFICE_MAP.layout[r][c];
        if (tile === "g" || tile === "h") expect(isWalkable(grid, c, r), `${c},${r}`).toBe(false);
      }
    }
    // Every walkable tile can be reached from the front door: no sealed-off pockets.
    const reachable = new Set<string>();
    const queue = [fromDoor];
    reachable.add(`${fromDoor.c},${fromDoor.r}`);
    while (queue.length > 0) {
      const { c, r } = queue.pop()!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = { c: c + dc, r: r + dr };
        const key = `${next.c},${next.r}`;
        if (!reachable.has(key) && isWalkable(grid, next.c, next.r)) {
          reachable.add(key);
          queue.push(next);
        }
      }
    }
    for (let r = 0; r < OFFICE_MAP.rows; r += 1) {
      for (let c = 0; c < OFFICE_MAP.cols; c += 1) {
        if (isWalkable(grid, c, r)) expect(reachable.has(`${c},${r}`), `${c},${r}`).toBe(true);
      }
    }
  });
});
