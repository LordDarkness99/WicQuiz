import type {
  GameState,
  Question,
  LeaderboardEntry,
} from "@/shared/domain/types";

/**
 * Canonical realtime broadcast event names for a room channel (`room:<code>`).
 * These strings are a runtime contract between host, display, and player
 * clients — do not rename without coordinating all three.
 */
export const REALTIME_EVENTS = {
  GAME_STATE_CHANGE: "game_state_change",
  QUESTION_REVEAL: "question_reveal",
  TIMER_TICK: "timer_tick",
  ANSWER_REVEALED: "answer_revealed",
  LEADERBOARD_UPDATE: "leaderboard_update",
  SUSPENSE_MODE: "suspense_mode",
  FINAL_REVEAL_START: "final_reveal_start",
} as const;

export type RealtimeEvent =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export interface GameStatePayload {
  state: GameState;
  current_question_index?: number;
}

export interface QuestionRevealPayload {
  question: Question;
  question_number: number;
  total_questions: number;
}

export interface AnswerSubmittedPayload {
  player_id: string;
  player_name: string;
  question_id: string;
}

export interface TimerTickPayload {
  time_remaining: number;
  time_limit: number;
}

export interface LeaderboardUpdatePayload {
  leaderboard: LeaderboardEntry[];
}

export interface PlayerResult {
  isCorrect: boolean;
  pointsEarned: number;
}

export interface AnswerRevealPayload {
  questionId: string;
  correctAnswer: string;
  playerResults: Record<string, PlayerResult>;
  nextImageUrl?: string | null;
}
