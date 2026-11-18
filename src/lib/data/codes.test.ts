import { describe, expect, it } from "vitest";
import { cleanCode, validateCode } from "./rules";

describe("office codes", () => {
  it("tidies however the code was typed or pasted", () => {
    expect(cleanCode("pkx4qz")).toBe("PKX4QZ");
    expect(cleanCode(" pkx-4qz ")).toBe("PKX4QZ");
    expect(cleanCode("https://pookies-nine.vercel.app/join/PKX4QZ")).toBe("PKX4QZ");
    expect(cleanCode("/join/pkx4qz")).toBe("PKX4QZ");
    expect(cleanCode("PKX4QZEXTRA")).toBe("PKX4QZ");
  });

  it("accepts six letters and numbers, without look-alikes", () => {
    expect(validateCode("PKX4QZ").ok).toBe(true);
    expect(validateCode("pkx-4qz").ok).toBe(true);
    expect(validateCode("").ok).toBe(false);
    expect(validateCode("PKX4").ok).toBe(false);
    // 0, O, 1, I and L are never used, so a code with them was mistyped.
    expect(validateCode("PKX0QZ").ok).toBe(false);
    expect(validateCode("PKXIQZ").ok).toBe(false);
  });
});
