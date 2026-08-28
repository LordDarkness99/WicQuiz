import { describe, it, expect } from "vitest";
import { generateRoomCode } from "../client";

describe("generateRoomCode", () => {
  it("returns a 6-character string", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it("only contains valid characters (no ambiguous chars I/O)", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ0-9]{6}$/);
  });

  it("generates unique codes across multiple calls", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateRoomCode()));
    expect(codes.size).toBeGreaterThan(40);
  });
});
