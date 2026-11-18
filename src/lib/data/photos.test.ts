import { describe, expect, it } from "vitest";
import { WorldEngine } from "@/lib/world/engine";
import { OFFICE_MAP, PHOTO_BOOTH_AREA, TILE } from "@/lib/world/map";
import { canRemovePhoto, validatePhoto, withPhoto, PHOTO_WALL_SIZE } from "./rules";
import type { Member, Photo } from "./types";

const member = (id: string): Member => ({
  id,
  displayName: id,
  avatar: { color: "mint", shape: "bear" },
  timezone: "UTC",
  role: "member",
  status: "online",
  statusNote: "",
  statusUpdatedAt: 0,
  joinedAt: 0,
});

const photo = (id: string, people: string[], takenBy: string | null = people[0]): Photo => ({
  id,
  takenAt: 0,
  takenBy,
  backdrop: "garden",
  people: people.map((person) => ({ id: person, name: person, avatar: { color: "mint", shape: "bear" }, pose: "wave" })),
});

describe("photo rules", () => {
  const team = ["a", "b", "c", "d", "e"].map(member);

  it("needs you in it, one to four teammates, and a real backdrop", () => {
    expect(validatePhoto("garden", ["a", "b"], "a", team).ok).toBe(true);
    expect(validatePhoto("garden", ["b"], "a", team).ok).toBe(false);
    expect(validatePhoto("garden", [], "a", team).ok).toBe(false);
    expect(validatePhoto("garden", ["a", "b", "c", "d", "e"], "a", team).ok).toBe(false);
    expect(validatePhoto("garden", ["a", "a"], "a", team).ok).toBe(false);
    expect(validatePhoto("garden", ["a", "stranger"], "a", team).ok).toBe(false);
    expect(validatePhoto("disco", ["a"], "a", team).ok).toBe(false);
  });

  it("lets people in a photo, whoever took it, or an admin take it down", () => {
    const shot = photo("p", ["a", "b"], "c");
    expect(canRemovePhoto(shot, "a", false)).toBe(true);
    expect(canRemovePhoto(shot, "c", false)).toBe(true);
    expect(canRemovePhoto(shot, "d", false)).toBe(false);
    expect(canRemovePhoto(shot, "d", true)).toBe(true);
  });

  it("keeps the newest twelve on the wall", () => {
    let wall: Photo[] = [];
    for (let i = 0; i < 15; i += 1) wall = withPhoto(wall, photo(`p${i}`, ["a"]));
    expect(wall).toHaveLength(PHOTO_WALL_SIZE);
    expect(wall[0].id).toBe("p14");
    expect(wall.at(-1)?.id).toBe("p3");
  });
});

describe("the photo booth", () => {
  it("counts whoever stands on the spots, you first", () => {
    const engine = new WorldEngine(OFFICE_MAP, () => 0.5);
    engine.sync(
      [
        { id: "me", status: "online" },
        { id: "pal", status: "online" },
        { id: "far", status: "online" },
      ],
      "me",
    );
    const place = (id: string, x: number, y: number) => {
      const entity = engine.entities.get(id)!;
      entity.visible = true;
      entity.x = x * TILE;
      entity.y = y * TILE;
    };
    place("pal", 32.5, 22.6);
    place("me", 34.5, 22.6);
    place("far", 30, 10);
    expect(engine.peopleIn(PHOTO_BOOTH_AREA)).toEqual(["me", "pal"]);
  });

  it("has four spots inside the booth, and the booth and wall are in reach of them", () => {
    const spots = OFFICE_MAP.seats.filter((seat) => seat.id.startsWith("booth-"));
    expect(spots).toHaveLength(4);
    const buttons = OFFICE_MAP.things.filter((thing) => thing.kind === "booth");
    for (const spot of spots) {
      const { x, y, w, h } = PHOTO_BOOTH_AREA;
      expect(spot.x >= x && spot.x < x + w && spot.y >= y && spot.y < y + h).toBe(true);
      expect(buttons.some((thing) => Math.hypot(spot.x - thing.x, spot.y - thing.y) * TILE <= thing.reach)).toBe(true);
    }
  });
});
