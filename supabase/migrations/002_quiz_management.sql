-- Quiz Management: Question Bank, Templates, Session Results

-- Standalone question bank (not tied to a room/quiz)
create table qt_question_bank (
  id uuid primary key default uuid_generate_v4(),
  host_id text not null,
  type text not null,
  question_text text not null,
  options jsonb,
  correct_answer text not null,
  time_limit integer not null default 15,
  points_base integer not null default 1000,
  image_url text,
  is_joker boolean not null default false,
  slider_min numeric,
  slider_max numeric,
  slider_tolerance numeric,
  video_url text,
  video_start_seconds integer default 0,
  video_end_seconds integer,
  audio_url text,
  category text,
  tags text[],
  times_used integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Saved quiz templates (separate from live rooms)
create table qt_quiz_templates (
  id uuid primary key default uuid_generate_v4(),
  host_id text not null,
  title text not null,
  description text,
  question_ids uuid[],
  question_order jsonb,
  is_draft boolean not null default true,
  times_run integer not null default 0,
  last_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Game session results (run history)
create table qt_session_results (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references qt_rooms(id),
  quiz_template_id uuid references qt_quiz_templates(id),
  host_id text not null,
  title text not null,
  player_count integer not null default 0,
  question_count integer not null default 0,
  final_leaderboard jsonb,
  question_stats jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index idx_qt_question_bank_host on qt_question_bank(host_id);
create index idx_qt_quiz_templates_host on qt_quiz_templates(host_id);
create index idx_qt_session_results_host on qt_session_results(host_id);

-- RLS
alter table qt_question_bank enable row level security;
alter table qt_quiz_templates enable row level security;
alter table qt_session_results enable row level security;

create policy "Anyone can read qt_question_bank" on qt_question_bank for select using (true);
create policy "Anyone can insert qt_question_bank" on qt_question_bank for insert with check (true);
create policy "Anyone can update qt_question_bank" on qt_question_bank for update using (true);
create policy "Anyone can delete qt_question_bank" on qt_question_bank for delete using (true);

create policy "Anyone can read qt_quiz_templates" on qt_quiz_templates for select using (true);
create policy "Anyone can insert qt_quiz_templates" on qt_quiz_templates for insert with check (true);
create policy "Anyone can update qt_quiz_templates" on qt_quiz_templates for update using (true);
create policy "Anyone can delete qt_quiz_templates" on qt_quiz_templates for delete using (true);

create policy "Anyone can read qt_session_results" on qt_session_results for select using (true);
create policy "Anyone can insert qt_session_results" on qt_session_results for insert with check (true);
