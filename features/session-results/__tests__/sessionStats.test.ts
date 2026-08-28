import { describe, it, expect } from "vitest";
import {
  computeAvgTimeMap,
  computeCorrectCountMap,
  buildQuestionStat,
} from "../application/sessionStats";

describe("computeAvgTimeMap", () => {
  it("averages times per player and rounds", () => {
    const map = computeAvgTimeMap([
      { player_id: "p1", time_taken_ms: 1000 },
      { player_id: "p1", time_taken_ms: 2000 },
      { player_id: "p2", time_taken_ms: 3001 },
    ]);
    expect(map).toEqual({ p1: 1500, p2: 3001 });
  });

  it("returns an empty map for no answers", () => {
    expect(computeAvgTimeMap([])).toEqual({});
  });
});

describe("computeCorrectCountMap", () => {
  it("counts only correct answers per player", () => {
    const map = computeCorrectCountMap([
      { player_id: "p1", is_correct: true },
      { player_id: "p1", is_correct: false },
      { player_id: "p1", is_correct: true },
      { player_id: "p2", is_correct: false },
    ]);
    expect(map).toEqual({ p1: 2 });
  });
});

describe("buildQuestionStat", () => {
  it("aggregates totals, correct count, and average time", () => {
    const stat = buildQuestionStat("q1", "Capital?", [
      { is_correct: true, time_taken_ms: 1000 },
      { is_correct: false, time_taken_ms: 3000 },
    ]);
    expect(stat).toEqual({
      questionId: "q1",
      text: "Capital?",
      totalAnswers: 2,
      correctCount: 1,
      avgTimeMs: 2000,
    });
  });

  it("reports zero average time when there are no answers", () => {
    const stat = buildQuestionStat("q1", "Capital?", []);
    expect(stat).toEqual({
      questionId: "q1",
      text: "Capital?",
      totalAnswers: 0,
      correctCount: 0,
      avgTimeMs: 0,
    });
  });
});
