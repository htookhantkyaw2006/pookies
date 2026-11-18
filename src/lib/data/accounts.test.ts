import { describe, expect, it } from "vitest";
import { inviteToken } from "@/components/entry/WorkspaceSetup";
import { validateEmail, validatePassword } from "./rules";

describe("account rules", () => {
  it("wants a real-looking email address", () => {
    expect(validateEmail("robin@studio.co").ok).toBe(true);
    expect(validateEmail("  robin@studio.co ").ok).toBe(true);
    expect(validateEmail("").ok).toBe(false);
    expect(validateEmail("robin").ok).toBe(false);
    expect(validateEmail("robin@studio").ok).toBe(false);
    expect(validateEmail("ro bin@studio.co").ok).toBe(false);
  });

  it("wants a password of at least 8 characters", () => {
    expect(validatePassword("1234567").ok).toBe(false);
    expect(validatePassword("12345678").ok).toBe(true);
    expect(validatePassword("x".repeat(73)).ok).toBe(false);
  });
});

describe("pasting an invite link", () => {
  const token = "3f9a1c0b7e2d4a6f8b1c3e5d7f9a0b2c4d6e8f01";

  it("finds the token in a full link, a path, or on its own", () => {
    expect(inviteToken(`https://pookies-nine.vercel.app/join/${token}`)).toBe(token);
    expect(inviteToken(`  /join/${token}  `)).toBe(token);
    expect(inviteToken(token)).toBe(token);
  });

  it("ignores things that aren't invite links", () => {
    expect(inviteToken("")).toBeNull();
    expect(inviteToken("hello")).toBeNull();
    expect(inviteToken("https://pookies-nine.vercel.app/office")).toBeNull();
  });
});
