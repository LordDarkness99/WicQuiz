import {
  scoreStandardQuestion,
  calculateSliderPoints,
  applyJokerMultiplier,
  calculateTypeInPoints,
} from "@/features/scoring";
import type { Answer, Question } from "@/shared/domain/types";

export interface AnswerScoreUpdate {
  id: string;
  is_correct: boolean;
  points_earned: number;
}

export interface ScoredAnswers {
  updates: AnswerScoreUpdate[];
  playerPointsMap: Record<string, number>;
}

/**
 * Pure scoring pass for a finished question: given the submitted answers,
 * compute each answer's correctness/points and the per-player point totals.
 * No I/O — the caller is responsible for persisting `updates` and applying
 * `playerPointsMap` to player scores.
 */
export function scoreAnswers(
  question: Question,
  answers: Answer[]
): ScoredAnswers {
  const updates: AnswerScoreUpdate[] = [];
  const playerPointsMap: Record<string, number> = {};

  for (const answer of answers) {
    let points = 0;
    let isCorrect = false;

    const timeTakenMs = answer.time_taken_ms || 0;
    const timeLimitMs = question.time_limit * 1000;
    const timeRemainingMs = Math.max(0, timeLimitMs - timeTakenMs);

    switch (question.type) {
      case "multiple_choice":
      case "true_false":
      case "image_question":
      case "video_question":
      case "audio_question": {
        const result = scoreStandardQuestion(
          answer.answer_value,
          question.correct_answer,
          timeRemainingMs,
          timeLimitMs,
          question.is_joker,
          question.points_base
        );
        points = result.points;
        isCorrect = result.isCorrect;
        break;
      }
      case "slider": {
        const playerVal = parseFloat(answer.answer_value);
        const correctVal = parseFloat(question.correct_answer);
        if (!isNaN(playerVal) && !isNaN(correctVal)) {
          points = calculateSliderPoints(
            playerVal,
            correctVal,
            question.slider_min ?? 0,
            question.slider_max ?? 100,
            timeRemainingMs,
            timeLimitMs,
            question.points_base
          );
          points = applyJokerMultiplier(points, question.is_joker);
          isCorrect = points > question.points_base * 0.5;
        }
        break;
      }
      case "type_in": {
        const result = calculateTypeInPoints(
          answer.answer_value,
          question.correct_answer,
          timeRemainingMs,
          timeLimitMs,
          question.points_base
        );
        points = applyJokerMultiplier(result.points, question.is_joker);
        isCorrect = result.isCorrect;
        break;
      }
    }

    updates.push({
      id: answer.id,
      is_correct: isCorrect,
      points_earned: points,
    });

    if (points > 0) {
      playerPointsMap[answer.player_id] =
        (playerPointsMap[answer.player_id] || 0) + points;
    }
  }

  return { updates, playerPointsMap };
}
