-- =========================================================================
-- CampusIQ Consolidated Master Migration Script
-- INSTRUCTIONS: Copy all the SQL code in this file, open your Supabase Dashboard,
-- go to the SQL Editor, paste this code, and click "Run".
-- =========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. UPGRADE PROFILES TABLE (Ensure all fields exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty text DEFAULT 'Science';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_goal_seconds integer DEFAULT 7200;

-- Ensure role exists with constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role text NOT NULL DEFAULT 'student' CHECK (role in ('student', 'admin'));
  END IF;
END $$;

-- Ensure subscription_status exists and is of type text
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_status text NOT NULL DEFAULT 'free';
  ELSE
    -- If it exists, ensure it is text (in case it was created as an enum like subscription_tier)
    ALTER TABLE public.profiles ALTER COLUMN subscription_status TYPE text USING subscription_status::text;
  END IF;
END $$;

-- Apply subscription_status check constraint safely
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status in ('free', 'pro', 'ultra', 'expired'));


-- 2. UPGRADE COURSES TABLE
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS faculty text NOT NULL DEFAULT 'Science';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 100;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS units integer NOT NULL DEFAULT 2;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS color text DEFAULT '#6366f1';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS icon text DEFAULT 'BookOpen';

-- Ensure code has a unique constraint if possible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_code_key'
  ) THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_code_key UNIQUE (code);
  END IF;
END $$;


-- 3. CREATE TOPICS TABLE
CREATE TABLE IF NOT EXISTS public.topics (
  id            uuid default uuid_generate_v4() primary key,
  course_id     uuid not null references public.courses(id) on delete cascade,
  name          text not null,
  description   text,
  "order"       integer not null default 0,
  created_at    timestamptz not null default now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Topics are public" ON public.topics;
CREATE POLICY "Topics are public" ON public.topics FOR SELECT USING (true);


-- 4. UPGRADE QUIZZES TABLE
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'mock_exam' CHECK (type in ('mock_exam', 'topic_practice', 'custom'));
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS time_limit_minutes integer;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS question_count integer NOT NULL DEFAULT 20;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;


-- 5. UPGRADE QUESTIONS TABLE
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) on delete cascade;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id) on delete set null;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty in ('easy', 'medium', 'hard'));
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS source_year integer;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'past_exam' CHECK (source_type in ('past_exam', 'textbook', 'custom'));
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();

-- GIN index for fast search on questions
CREATE INDEX IF NOT EXISTS questions_content_trgm_idx ON public.questions USING gin (content gin_trgm_ops);

-- Sync course_id from quiz_id for existing questions
UPDATE public.questions q
SET course_id = (SELECT course_id FROM public.quizzes qz WHERE qz.id = q.quiz_id)
WHERE q.course_id IS NULL;


-- 6. CREATE QUIZ_QUESTIONS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  question_id   uuid not null references public.questions(id) on delete cascade,
  "order"       integer not null default 0,
  primary key (quiz_id, question_id)
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quiz questions are public" ON public.quiz_questions;
CREATE POLICY "Quiz questions are public" ON public.quiz_questions FOR SELECT USING (true);


-- 7. CREATE QUIZ_ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  quiz_id         uuid not null references public.quizzes(id) on delete cascade,
  score           integer not null default 0,
  total_questions integer not null,
  percentage      numeric(5,2) generated always as (
                    case when total_questions > 0
                    then (score::numeric / total_questions) * 100
                    else 0 end
                  ) stored,
  time_taken_seconds integer,
  status          text not null default 'completed' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert own attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can update own attempts" ON public.quiz_attempts FOR UPDATE USING (auth.uid() = user_id);


-- 8. CREATE ATTEMPT_ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id                   uuid default uuid_generate_v4() primary key,
  attempt_id           uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id          uuid not null references public.questions(id) on delete cascade,
  selected_option_index integer,
  is_correct           boolean not null default false,
  is_marked_for_review boolean not null default false,
  time_spent_seconds   integer default 0
);

ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own attempt answers" ON public.attempt_answers;
CREATE POLICY "Users can manage own attempt answers" ON public.attempt_answers FOR ALL USING (
  exists (select 1 from public.quiz_attempts where id = attempt_id and user_id = auth.uid())
);


-- 9. CREATE STUDY_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid references public.course_materials(id) on delete set null,
  duration_seconds integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz default now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own study sessions" ON public.study_sessions;
CREATE POLICY "Users can view own study sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own study sessions" ON public.study_sessions;
CREATE POLICY "Users can insert own study sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 10. RE-CREATE USER_PROGRESS TABLE (Repurposed for Reading Progress)
DROP TABLE IF EXISTS public.user_progress CASCADE;

CREATE TABLE public.user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references public.course_materials(id) on delete cascade,
  last_position integer default 0,
  total_seconds_spent integer default 0,
  last_accessed_at timestamptz not null default now(),
  read_chunks jsonb default '[]'::jsonb,
  unique(user_id, material_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);


-- 11. CREATE USER_COURSE_HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.user_course_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  last_opened_at timestamptz not null default now(),
  unique(user_id, course_id)
);

ALTER TABLE public.user_course_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own course history" ON public.user_course_history;
CREATE POLICY "Users can view own course history" ON public.user_course_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own course history" ON public.user_course_history;
CREATE POLICY "Users can insert own course history" ON public.user_course_history FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own course history" ON public.user_course_history;
CREATE POLICY "Users can update own course history" ON public.user_course_history FOR UPDATE USING (auth.uid() = user_id);

-- Log course access function
CREATE OR REPLACE FUNCTION public.log_course_access(p_course_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_course_history (user_id, course_id, last_opened_at)
  VALUES (auth.uid(), p_course_id, now())
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET last_opened_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 12. CLEANUP OBSOLETE EXAM_QUESTIONS TABLE
DROP TABLE IF EXISTS public.exam_questions CASCADE;



-- 13. CREATE SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan            text not null default 'pro' check (plan in ('pro', 'enterprise')),
  status          text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  payment_ref     text,
  amount_kobo     integer,
  started_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);


-- 14. ENSURE UPDATED_AT TRIGGER IS CONFIGURED
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger language plpgsql AS $$
BEGIN
  new.updated_at = now();
  return new;
END;
$$;

DROP TRIGGER IF EXISTS course_materials_updated_at ON public.course_materials;
CREATE TRIGGER course_materials_updated_at
  BEFORE UPDATE ON public.course_materials
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

DROP TRIGGER IF EXISTS questions_updated_at ON public.questions;
CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();


-- 15. ENSURE MATERIALS BUCKET IS SET TO PUBLIC & SELECT POLICY EXISTS
UPDATE storage.buckets SET public = true WHERE id = 'materials';

DROP POLICY IF EXISTS "Materials are publicly accessible" ON storage.objects;
CREATE POLICY "Materials are publicly accessible" ON storage.objects FOR SELECT USING ( bucket_id = 'materials' );

-- Allow inserts to course_materials for scripts
DROP POLICY IF EXISTS "Allow inserts to course_materials" ON public.course_materials;
CREATE POLICY "Allow inserts to course_materials" ON public.course_materials FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Allow public course materials reads
DROP POLICY IF EXISTS "Course materials are public" ON public.course_materials;
CREATE POLICY "Course materials are public" ON public.course_materials FOR SELECT USING (is_active = true);
