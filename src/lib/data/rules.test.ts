import { describe, expect, it } from "vitest";
import {
  PLANT_FRESH_MS,
  PLANT_THIRSTY_MS,
  plantMood,
  CHECKIN_FIELD_MAX,
  canChangeRole,
  canRemoveMember,
  cleanLine,
  cleanText,
  inviteState,
  validateCheckIn,
  validateName,
} from "./rules";
import type { Invite, Member, Role } from "./types";

function member(id: string, role: Role): Member {
  return {
    id,
    displayName: id,
    avatar: { color: "sky", shape: "cat" },
    timezone: "UTC",
    role,
    status: "online",
    statusNote: "",
    statusUpdatedAt: 0,
    joinedAt: 0,
  };
}

describe("cleanLine and cleanText", () => {
  it("collapses whitespace, trims and caps a single line", () => {
    expect(cleanLine("  at   lunch \n back at 1 ", 80)).toBe("at lunch back at 1");
    expect(cleanLine("abcdef", 3)).toBe("abc");
  });

  it("keeps line breaks in longer text", () => {
    expect(cleanText("  one\r\ntwo  ", 100)).toBe("one\ntwo");
  });
});

describe("validateName", () => {
  it("rejects empty and over-long names", () => {
    expect(validateName("   ", "Your name", 40).ok).toBe(false);
    expect(validateName("x".repeat(41), "Your name", 40).ok).toBe(false);
    expect(validateName("Robin", "Your name", 40).ok).toBe(true);
  });
});

describe("validateCheckIn", () => {
  it("needs a line about today", () => {
    expect(validateCheckIn({ yesterday: "Did things", today: "  ", blockers: "" }).ok).toBe(false);
    expect(validateCheckIn({ yesterday: "", today: "Ship it", blockers: "" }).ok).toBe(true);
  });

  it("caps the length of each answer", () => {
    const long = "x".repeat(CHECKIN_FIELD_MAX + 1);
    expect(validateCheckIn({ yesterday: long, today: "ok", blockers: "" }).ok).toBe(false);
  });
});

describe("canChangeRole", () => {
  it("only lets admins change roles", () => {
    const members = [member("admin", "admin"), member("a", "member"), member("b", "member")];
    expect(canChangeRole(members, "a", "b", "admin").ok).toBe(false);
    expect(canChangeRole(members, "admin", "b", "admin").ok).toBe(true);
  });

  it("refuses to demote the last admin", () => {
    const solo = [member("admin", "admin"), member("a", "member")];
    expect(canChangeRole(solo, "admin", "admin", "member").ok).toBe(false);

    const pair = [member("admin", "admin"), member("other", "admin")];
    expect(canChangeRole(pair, "admin", "admin", "member").ok).toBe(true);
  });

  it("refuses when the target has already left", () => {
    expect(canChangeRole([member("admin", "admin")], "admin", "gone", "admin").ok).toBe(false);
  });
});

describe("canRemoveMember", () => {
  const members = [member("admin", "admin"), member("a", "member"), member("b", "member")];

  it("only lets admins remove people", () => {
    expect(canRemoveMember(members, "a", "b").ok).toBe(false);
    expect(canRemoveMember(members, "admin", "b").ok).toBe(true);
  });

  it("never lets you remove yourself", () => {
    expect(canRemoveMember(members, "admin", "admin").ok).toBe(false);
  });

  it("lets one admin remove another while an admin remains", () => {
    const pair = [member("admin", "admin"), member("other", "admin")];
    expect(canRemoveMember(pair, "admin", "other").ok).toBe(true);
  });
});

describe("inviteState", () => {
  const invite: Invite = {
    id: "i",
    token: "t",
    createdBy: "admin",
    createdAt: 0,
    expiresAt: 1_000,
    revokedAt: null,
    useCount: 0,
  };

  it("is active until it expires", () => {
    expect(inviteState(invite, 999)).toBe("active");
    expect(inviteState(invite, 1_000)).toBe("expired");
  });

  it("stays revoked even before its expiry", () => {
    expect(inviteState({ ...invite, revokedAt: 10 }, 20)).toBe("revoked");
  });
});

describe("plantMood", () => {
  const now = 1_000_000_000_000;
  it("is fresh for a day, fine for a few, then thirsty", () => {
    expect(plantMood(now - 1000, now)).toBe("fresh");
    expect(plantMood(now - PLANT_FRESH_MS - 1, now)).toBe("fine");
    expect(plantMood(now - PLANT_THIRSTY_MS - 1, now)).toBe("thirsty");
  });
  it("treats a plant nobody has watered as thirsty", () => {
    expect(plantMood(undefined, now)).toBe("thirsty");
  });
});
