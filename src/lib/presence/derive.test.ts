import { describe, expect, it } from "vitest";
import type { Member, PresenceEntry } from "@/lib/data/types";
import {
  buildRoom,
  countAround,
  groupRoom,
  latestEntryByUser,
  resolvePresence,
} from "./derive";

function member(id: string, displayName: string): Member {
  return {
    id,
    displayName,
    avatar: { color: "mint", shape: "bear" },
    timezone: "UTC",
    role: "member",
    status: "online",
    statusNote: "",
    statusUpdatedAt: 0,
    joinedAt: 0,
  };
}

function entry(
  userId: string,
  connectionId: string,
  status: PresenceEntry["status"],
  updatedAt: number,
  note = "",
): PresenceEntry {
  return { userId, connectionId, status, note, updatedAt };
}

describe("latestEntryByUser", () => {
  it("keeps the most recently updated tab for each person", () => {
    const latest = latestEntryByUser([
      entry("a", "tab-1", "online", 100),
      entry("a", "tab-2", "busy", 300, "Deep work"),
      entry("a", "tab-3", "away", 200),
      entry("b", "tab-1", "away", 50),
    ]);
    expect(latest.get("a")).toMatchObject({ status: "busy", note: "Deep work" });
    expect(latest.get("b")).toMatchObject({ status: "away" });
    expect(latest.size).toBe(2);
  });

  it("is empty when nobody is connected", () => {
    expect(latestEntryByUser([]).size).toBe(0);
  });
});

describe("resolvePresence", () => {
  it("shows someone with no connection as offline, without a note or time", () => {
    expect(resolvePresence("ghost", new Map())).toEqual({
      status: "offline",
      note: "",
      updatedAt: null,
    });
  });

  it("uses the live entry when there is one", () => {
    const latest = latestEntryByUser([entry("a", "t", "away", 42, "At lunch")]);
    expect(resolvePresence("a", latest)).toEqual({
      status: "away",
      note: "At lunch",
      updatedAt: 42,
    });
  });
});

describe("buildRoom and groupRoom", () => {
  const members = [
    member("zed", "Zed"),
    member("me", "Robin"),
    member("amy", "Amy"),
    member("bo", "Bo"),
    member("off", "Ola"),
  ];
  const entries = [
    entry("zed", "t", "online", 1),
    entry("me", "t", "online", 2),
    entry("amy", "t", "online", 3),
    entry("bo", "t", "busy", 4),
  ];

  it("ignores a saved status when the person is not connected", () => {
    const room = buildRoom(members, entries, "me");
    const ola = room.find((r) => r.member.id === "off");
    expect(ola?.member.status).toBe("online");
    expect(ola?.presence.status).toBe("offline");
  });

  it("puts you first in your group, then everyone else by name", () => {
    const groups = groupRoom(buildRoom(members, entries, "me"));
    expect(groups.online.map((r) => r.member.displayName)).toEqual(["Robin", "Amy", "Zed"]);
    expect(groups.busy.map((r) => r.member.id)).toEqual(["bo"]);
    expect(groups.away).toEqual([]);
    expect(groups.offline.map((r) => r.member.id)).toEqual(["off"]);
  });

  it("counts everyone connected as around, whatever their status", () => {
    expect(countAround(buildRoom(members, entries, "me"))).toBe(4);
    expect(countAround(buildRoom(members, [], "me"))).toBe(0);
  });
});
