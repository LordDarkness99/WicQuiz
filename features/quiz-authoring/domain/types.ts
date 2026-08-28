import type { QuestionType } from "@/shared/domain/types";

// Form DTOs used while authoring a quiz, before persistence.
export interface QuestionFormData {
  type: QuestionType;
  question_text: string;
  options: string[];
  correct_answer: string;
  time_limit: number;
  image_url: string;
  is_joker: boolean;
  is_image_blurred?: boolean;
  slider_min: number;
  slider_max: number;
  slider_tolerance?: number;
  video_url: string;
  video_start_seconds: number;
  video_end_seconds: number | null;
  audio_url: string;
}

export interface QuizFormData {
  title: string;
  questions: QuestionFormData[];
}
