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
}

export interface QuizFormData {
  title: string;
  questions: QuestionFormData[];
}
