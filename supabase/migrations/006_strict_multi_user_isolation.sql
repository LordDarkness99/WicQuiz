-- =====================================================================
-- Migration 006: Strict Multi-User Data Isolation & RLS Security
-- =====================================================================
-- Ensures that each user (e.g. ricofirmansya250@gmail.com and 
-- 24051204173@mhs.unesa.ac.id) only sees and manages their own quizzes,
-- question bank items, and game session histories.
-- =====================================================================

-- 1. Ensure owner_id column exists on all relevant tables
ALTER TABLE IF EXISTS qt_quiz_templates
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_qt_quiz_templates_owner ON qt_quiz_templates(owner_id);

ALTER TABLE IF EXISTS qt_question_bank
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_qt_question_bank_owner ON qt_question_bank(owner_id);

ALTER TABLE IF EXISTS qt_session_results
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_qt_session_results_owner ON qt_session_results(owner_id);

ALTER TABLE IF EXISTS qt_rooms
  ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qt_rooms_host_user ON qt_rooms(host_user_id);


-- 2. Associate older unassigned templates with Rico's account so they do not leak
UPDATE qt_quiz_templates
SET owner_id = '86212253-cc71-4939-9a6d-8b78e06cbb51'
WHERE owner_id IS NULL;

UPDATE qt_question_bank
SET owner_id = '86212253-cc71-4939-9a6d-8b78e06cbb51'
WHERE owner_id IS NULL;


-- 3. Enable Row Level Security (RLS)
ALTER TABLE qt_quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qt_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE qt_session_results ENABLE ROW LEVEL SECURITY;


-- 4. Strict RLS Policies for qt_quiz_templates
-- A user can only SELECT their own quiz templates
DROP POLICY IF EXISTS "Users read own quiz templates" ON qt_quiz_templates;
DROP POLICY IF EXISTS "Anyone can read qt_quiz_templates" ON qt_quiz_templates;
CREATE POLICY "Users read own quiz templates"
  ON qt_quiz_templates FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  );

-- A user can only INSERT quiz templates belonging to themselves
DROP POLICY IF EXISTS "Users insert own quiz templates" ON qt_quiz_templates;
DROP POLICY IF EXISTS "Anyone can insert qt_quiz_templates" ON qt_quiz_templates;
CREATE POLICY "Users insert own quiz templates"
  ON qt_quiz_templates FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  );

-- A user can only UPDATE their own quiz templates
DROP POLICY IF EXISTS "Users update own quiz templates" ON qt_quiz_templates;
DROP POLICY IF EXISTS "Anyone can update qt_quiz_templates" ON qt_quiz_templates;
CREATE POLICY "Users update own quiz templates"
  ON qt_quiz_templates FOR UPDATE
  USING (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  )
  WITH CHECK (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  );

-- A user can only DELETE their own quiz templates
DROP POLICY IF EXISTS "Users delete own quiz templates" ON qt_quiz_templates;
DROP POLICY IF EXISTS "Anyone can delete qt_quiz_templates" ON qt_quiz_templates;
CREATE POLICY "Users delete own quiz templates"
  ON qt_quiz_templates FOR DELETE
  USING (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  );


-- 5. Strict RLS Policies for qt_question_bank
DROP POLICY IF EXISTS "Users read own question bank" ON qt_question_bank;
DROP POLICY IF EXISTS "Anyone can read qt_question_bank" ON qt_question_bank;
CREATE POLICY "Users read own question bank"
  ON qt_question_bank FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users insert own question bank" ON qt_question_bank;
DROP POLICY IF EXISTS "Anyone can insert qt_question_bank" ON qt_question_bank;
CREATE POLICY "Users insert own question bank"
  ON qt_question_bank FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own question bank" ON qt_question_bank;
DROP POLICY IF EXISTS "Anyone can update qt_question_bank" ON qt_question_bank;
CREATE POLICY "Users update own question bank"
  ON qt_question_bank FOR UPDATE
  USING (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  )
  WITH CHECK (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own question bank" ON qt_question_bank;
DROP POLICY IF EXISTS "Anyone can delete qt_question_bank" ON qt_question_bank;
CREATE POLICY "Users delete own question bank"
  ON qt_question_bank FOR DELETE
  USING (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  );


-- 6. Strict RLS Policies for qt_session_results
DROP POLICY IF EXISTS "Users read own session results" ON qt_session_results;
DROP POLICY IF EXISTS "Anyone can read qt_session_results" ON qt_session_results;
CREATE POLICY "Users read own session results"
  ON qt_session_results FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users insert own session results" ON qt_session_results;
DROP POLICY IF EXISTS "Anyone can insert qt_session_results" ON qt_session_results;
CREATE POLICY "Users insert own session results"
  ON qt_session_results FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() 
    OR host_id = auth.uid()::text
    OR auth.role() = 'authenticated'
  );
