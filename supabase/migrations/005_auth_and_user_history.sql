-- Migration 005: Supabase Auth, Profiles, Ownership, and User Activity Logs

-- 1. Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for profiles lookup
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Trigger for auto-creating profile upon user signup in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1),
      'Pemain'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = EXCLUDED.display_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Add owner/user columns to existing tables
-- Quiz templates ownership
ALTER TABLE qt_quiz_templates
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_qt_quiz_templates_owner ON qt_quiz_templates(owner_id);

-- Question bank ownership
ALTER TABLE qt_question_bank
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_qt_question_bank_owner ON qt_question_bank(owner_id);

-- Rooms host user identity
ALTER TABLE qt_rooms
  ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qt_rooms_host_user ON qt_rooms(host_user_id);

-- Players user identity
ALTER TABLE qt_players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qt_players_user ON qt_players(user_id);

-- Prevent duplicate player in same room for authenticated user
CREATE UNIQUE INDEX IF NOT EXISTS idx_qt_players_room_user
  ON qt_players (room_id, user_id)
  WHERE user_id IS NOT NULL;

-- 3. Create user_quiz_logs table
CREATE TABLE IF NOT EXISTS user_quiz_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES qt_quiz_templates(id) ON DELETE SET NULL,
  room_id UUID REFERENCES qt_rooms(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (
    activity_type IN ('quiz_created', 'quiz_updated', 'room_hosted', 'quiz_joined', 'quiz_completed')
  ),
  score INTEGER,
  rank INTEGER,
  correct_answers INTEGER,
  total_questions INTEGER,
  idempotency_key TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_quiz_logs_user_date ON user_quiz_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_quiz_logs_activity ON user_quiz_logs(activity_type);

-- 4. Enable RLS on profiles and user_quiz_logs
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Profiles Policies
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
CREATE POLICY "Public can view profiles"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Quiz templates Policies (Owner isolated + legacy host_id compatibility)
DROP POLICY IF EXISTS "Anyone can read qt_quiz_templates" ON qt_quiz_templates;
CREATE POLICY "Users read own quiz templates"
  ON qt_quiz_templates FOR SELECT
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND auth.role() = 'authenticated'));

DROP POLICY IF EXISTS "Anyone can insert qt_quiz_templates" ON qt_quiz_templates;
CREATE POLICY "Users insert own quiz templates"
  ON qt_quiz_templates FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can update qt_quiz_templates" ON qt_quiz_templates;
CREATE POLICY "Users update own quiz templates"
  ON qt_quiz_templates FOR UPDATE
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND auth.role() = 'authenticated'))
  WITH CHECK (owner_id = auth.uid() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can delete qt_quiz_templates" ON qt_quiz_templates;
CREATE POLICY "Users delete own quiz templates"
  ON qt_quiz_templates FOR DELETE
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND auth.role() = 'authenticated'));

-- Question bank Policies
DROP POLICY IF EXISTS "Anyone can read qt_question_bank" ON qt_question_bank;
CREATE POLICY "Users read own question bank"
  ON qt_question_bank FOR SELECT
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND auth.role() = 'authenticated'));

DROP POLICY IF EXISTS "Anyone can insert qt_question_bank" ON qt_question_bank;
CREATE POLICY "Users insert own question bank"
  ON qt_question_bank FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can update qt_question_bank" ON qt_question_bank;
CREATE POLICY "Users update own question bank"
  ON qt_question_bank FOR UPDATE
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND auth.role() = 'authenticated'))
  WITH CHECK (owner_id = auth.uid() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can delete qt_question_bank" ON qt_question_bank;
CREATE POLICY "Users delete own question bank"
  ON qt_question_bank FOR DELETE
  USING (owner_id = auth.uid() OR (owner_id IS NULL AND auth.role() = 'authenticated'));

-- Rooms Policies
DROP POLICY IF EXISTS "Anyone can read rooms" ON qt_rooms;
CREATE POLICY "Anyone can read rooms"
  ON qt_rooms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can create rooms" ON qt_rooms;
CREATE POLICY "Anyone can create rooms"
  ON qt_rooms FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Host can update rooms" ON qt_rooms;
CREATE POLICY "Host can update rooms"
  ON qt_rooms FOR UPDATE
  USING (true);

-- Players Policies
DROP POLICY IF EXISTS "Anyone can read players" ON qt_players;
CREATE POLICY "Anyone can read room players"
  ON qt_players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can create players" ON qt_players;
CREATE POLICY "Users create own player seat"
  ON qt_players FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Anyone can update players" ON qt_players;
CREATE POLICY "Update player scores"
  ON qt_players FOR UPDATE
  USING (true);

-- Answers Policies
DROP POLICY IF EXISTS "Anyone can read answers" ON qt_answers;
CREATE POLICY "Read answers for scoring"
  ON qt_answers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can create answers" ON qt_answers;
CREATE POLICY "Submit answer"
  ON qt_answers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update answers" ON qt_answers;
CREATE POLICY "Host score answers"
  ON qt_answers FOR UPDATE
  USING (true);

-- User Quiz Logs Policies
DROP POLICY IF EXISTS "Users can read own quiz logs" ON user_quiz_logs;
CREATE POLICY "Users can read own quiz logs"
  ON user_quiz_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own quiz logs" ON user_quiz_logs;
CREATE POLICY "Users can insert own quiz logs"
  ON user_quiz_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());
