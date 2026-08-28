import { describe, it, expect } from "vitest";
import { generateHorseName, getHorseEmoji } from "../domain/horses";

describe("generateHorseName", () => {
  it("returns a string with two words", () => {
    const name = generateHorseName();
    const parts = name.split(" ");
    expect(parts).toHaveLength(2);
  });

  it("returns non-empty string", () => {
    const name = generateHorseName();
    expect(name.length).toBeGreaterThan(0);
  });

  it("generates varied names across multiple calls", () => {
    const names = new Set(Array.from({ length: 20 }, () => generateHorseName()));
    // With 25x25=625 combinations, 20 calls should produce some variety
    expect(names.size).toBeGreaterThan(5);
  });
});

describe("getHorseEmoji", () => {
  it("returns a valid horse emoji", () => {
    const validEmojis = ["🐎", "🏇", "🐴", "🦄"];
    const emoji = getHorseEmoji();
    expect(validEmojis).toContain(emoji);
  });
});
