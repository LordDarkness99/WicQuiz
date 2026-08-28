import { describe, it, expect } from "vitest";
import {
  calculateTimeDecayPoints,
  applyJokerMultiplier,
  calculateSliderPoints,
  calculateTypeInPoints,
  scoreStandardQuestion,
} from "../domain/scoring";

describe("calculateTimeDecayPoints", () => {
  it("returns full points when all time remains", () => {
    expect(calculateTimeDecayPoints(15000, 15000)).toBe(1000);
  });

  it("applies the 1s reading grace before decaying at 50% time remaining", () => {
    // First second is free: adjusted = (7500 + 1000) / 15000 ≈ 0.567
    expect(calculateTimeDecayPoints(7500, 15000)).toBe(567);
  });

  it("awards full points while still inside the 1s grace window", () => {
    expect(calculateTimeDecayPoints(14500, 15000)).toBe(1000);
  });

  it("returns 0 when time is 0 or negative", () => {
    expect(calculateTimeDecayPoints(0, 15000)).toBe(0);
    expect(calculateTimeDecayPoints(-100, 15000)).toBe(0);
  });

  it("caps at 1.0 ratio when time remaining exceeds limit", () => {
    expect(calculateTimeDecayPoints(20000, 15000)).toBe(1000);
  });

  it("respects custom pointsBase", () => {
    expect(calculateTimeDecayPoints(15000, 15000, 500)).toBe(500);
  });
});

describe("applyJokerMultiplier", () => {
  it("doubles points when isJoker is true", () => {
    expect(applyJokerMultiplier(500, true)).toBe(1000);
  });

  it("returns unchanged points when isJoker is false", () => {
    expect(applyJokerMultiplier(500, false)).toBe(500);
  });

  it("doubles 0 points (still 0)", () => {
    expect(applyJokerMultiplier(0, true)).toBe(0);
  });
});

describe("calculateSliderPoints", () => {
  it("returns full points for exact answer", () => {
    const pts = calculateSliderPoints(50, 50, 0, 100, 15000, 15000);
    expect(pts).toBe(1000);
  });

  it("returns 0 for maximally wrong answer", () => {
    const pts = calculateSliderPoints(0, 100, 0, 100, 15000, 15000);
    expect(pts).toBe(0);
  });

  it("returns proportional points for near-correct answer", () => {
    // 75 out of 100 range, distance = 25, proximity = 0.75, full time
    const pts = calculateSliderPoints(75, 100, 0, 100, 15000, 15000);
    expect(pts).toBe(750);
  });

  it("returns pointsBase when range is 0", () => {
    const pts = calculateSliderPoints(50, 50, 50, 50, 15000, 15000);
    expect(pts).toBe(1000);
  });

  it("applies time decay", () => {
    // Half time, exact answer → 500 points
    const pts = calculateSliderPoints(50, 50, 0, 100, 7500, 15000);
    expect(pts).toBe(500);
  });
});

describe("calculateTypeInPoints", () => {
  it("awards points for case-insensitive exact match", () => {
    const result = calculateTypeInPoints("Paris", "paris", 15000, 15000);
    expect(result.isCorrect).toBe(true);
    expect(result.points).toBe(1000);
  });

  it("strips whitespace when comparing", () => {
    const result = calculateTypeInPoints("  paris  ", "paris", 15000, 15000);
    expect(result.isCorrect).toBe(true);
  });

  it("returns 0 for wrong answer", () => {
    const result = calculateTypeInPoints("London", "Paris", 15000, 15000);
    expect(result.isCorrect).toBe(false);
    expect(result.points).toBe(0);
  });

  it("applies time decay (with 1s grace) on correct answer", () => {
    const result = calculateTypeInPoints("paris", "paris", 7500, 15000);
    expect(result.points).toBe(567);
  });
});

describe("scoreStandardQuestion", () => {
  it("returns full points for correct answer at full time", () => {
    const result = scoreStandardQuestion("A", "A", 15000, 15000, false);
    expect(result.isCorrect).toBe(true);
    expect(result.points).toBe(1000);
  });

  it("returns 0 for wrong answer", () => {
    const result = scoreStandardQuestion("B", "A", 15000, 15000, false);
    expect(result.isCorrect).toBe(false);
    expect(result.points).toBe(0);
  });

  it("applies joker multiplier on correct answer", () => {
    const result = scoreStandardQuestion("A", "A", 15000, 15000, true);
    expect(result.points).toBe(2000);
  });

  it("case-insensitive comparison", () => {
    const result = scoreStandardQuestion("true", "True", 15000, 15000, false);
    expect(result.isCorrect).toBe(true);
  });

  it("joker does NOT multiply wrong answer", () => {
    const result = scoreStandardQuestion("B", "A", 15000, 15000, true);
    expect(result.points).toBe(0);
  });
});
