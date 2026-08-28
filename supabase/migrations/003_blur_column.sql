-- Add blur flag to both questions tables
ALTER TABLE qt_questions ADD COLUMN IF NOT EXISTS is_image_blurred boolean NOT NULL DEFAULT false;
ALTER TABLE qt_question_bank ADD COLUMN IF NOT EXISTS is_image_blurred boolean NOT NULL DEFAULT false;
