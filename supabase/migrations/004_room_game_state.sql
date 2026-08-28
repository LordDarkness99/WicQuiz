-- Track current question index and quiz id in the room for late-join catch-up
ALTER TABLE qt_rooms
  ADD COLUMN IF NOT EXISTS current_question_index integer DEFAULT -1,
  ADD COLUMN IF NOT EXISTS current_quiz_id uuid REFERENCES qt_quizzes(id);
