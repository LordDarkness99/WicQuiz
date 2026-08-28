import { describe, it, expect } from "vitest";
import { scoreAnswers } from "../scoreAnswers";
import type { Answer, Question } from "@/shared/domain/types";

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    quiz_id: "quiz1",
    type: "multiple_choice",
    question_text: "Capital of France?",
    options: ["Paris", "London", "Berlin", "Rome"],
    correct_answer: "Paris",
    time_limit: 15,
    points_base: 1000,
    order_index: 0,
    image_url: null,
    is_joker: false,
    ...overrides,
  };
}

function makeAnswer(overrides: Partial<Answer> = {}): Answer {
  return {
    id: "a1",
    question_id: "q1",
    player_id: "p1",
    answer_value: "Paris",
    is_correct: false,
    points_earned: 0,
    answered_at: "",
    time_taken_ms: 0,
    ...overrides,
  };
}

describe("scoreAnswers", () => {
  it("scores a correct multiple-choice answer at full time", () => {
    const { updates, playerPointsMap } = scoreAnswers(makeQuestion(), [
      makeAnswer({ answer_value: "Paris", time_taken_ms: 0 }),
    ]);
    expect(updates).toEqual([
      { id: "a1", is_correct: true, points_earned: 1000 },
    ]);
    expect(playerPointsMap).toEqual({ p1: 1000 });
  });

  it("gives a wrong answer 0 points and omits it from the player map", () => {
    const { updates, playerPointsMap } = scoreAnswers(makeQuestion(), [
      makeAnswer({ answer_value: "London" }),
    ]);
    expect(updates[0]).toEqual({ id: "a1", is_correct: false, points_earned: 0 });
    expect(playerPointsMap).toEqual({});
  });

  it("doubles points for a joker question", () => {
    const { playerPointsMap } = scoreAnswers(
      makeQuestion({ is_joker: true }),
      [makeAnswer({ answer_value: "Paris", time_taken_ms: 0 })]
    );
    expect(playerPointsMap).toEqual({ p1: 2000 });
  });

  it("sums points per player across multiple answers", () => {
    const q = makeQuestion();
    const { playerPointsMap } = scoreAnswers(q, [
      makeAnswer({ id: "a1", player_id: "p1", answer_value: "Paris", time_taken_ms: 0 }),
      makeAnswer({ id: "a2", player_id: "p2", answer_value: "London" }),
    ]);
    expect(playerPointsMap.p1).toBe(1000);
    expect(playerPointsMap.p2).toBeUndefined();
  });

  it("scores a type_in answer with the reading grace", () => {
    const { updates } = scoreAnswers(
      makeQuestion({ type: "type_in", correct_answer: "paris" }),
      [makeAnswer({ answer_value: "Paris", time_taken_ms: 7500 })]
    );
    // (15000 - 7500) remaining => grace-adjusted 567
    expect(updates[0]).toEqual({ id: "a1", is_correct: true, points_earned: 567 });
  });

  it("marks a close slider answer correct when above half points", () => {
    const { updates } = scoreAnswers(
      makeQuestion({
        type: "slider",
        correct_answer: "50",
        slider_min: 0,
        slider_max: 100,
      }),
      [makeAnswer({ answer_value: "50", time_taken_ms: 0 })]
    );
    expect(updates[0].is_correct).toBe(true);
    expect(updates[0].points_earned).toBe(1000);
  });
});
