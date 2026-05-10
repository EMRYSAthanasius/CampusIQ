-- ============================================================
-- CampusIQ Master Schema — v2.0
-- Run this in Supabase SQL Editor (reset & re-apply)
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fast text search

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  role          text not null default 'student' check (role in ('student', 'admin')),
  university    text,
  faculty       text default 'Science',
  department    text,
  level         integer default 100 check (level in (100, 200, 300, 400, 500)),
  avatar_url    text,
  subscription_status text not null default 'free' check (subscription_status in ('free', 'pro', 'expired')),
  subscription_expires_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- COURSES
-- ============================================================
create table public.courses (
  id            uuid default uuid_generate_v4() primary key,
  code          varchar(20) not null unique,   -- e.g. MTH 101
  title         text not null,
  description   text,
  faculty       text not null default 'Science',
  level         integer not null default 100,
  units         integer not null default 2,
  is_active     boolean not null default true,
  color         text default '#6366f1',        -- UI accent color hex
  icon          text default 'BookOpen',       -- lucide icon name
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TOPICS (sub-categories within a course)
-- ============================================================
create table public.topics (
  id            uuid default uuid_generate_v4() primary key,
  course_id     uuid not null references public.courses(id) on delete cascade,
  name          text not null,
  description   text,
  "order"       integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- QUESTIONS (the massive question bank)
-- ============================================================
create table public.questions (
  id                   uuid default uuid_generate_v4() primary key,
  course_id            uuid not null references public.courses(id) on delete cascade,
  topic_id             uuid references public.topics(id) on delete set null,
  content              text not null,                -- supports Markdown / LaTeX
  options              jsonb not null,               -- string[]
  correct_option_index integer not null,
  explanation          text,
  difficulty           text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  source_year          integer,                      -- e.g. 2019 (past exam year)
  source_type          text default 'past_exam' check (source_type in ('past_exam', 'textbook', 'custom')),
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- GIN index for full-text search on questions
create index questions_content_trgm_idx on public.questions using gin (content gin_trgm_ops);

-- ============================================================
-- QUIZZES (defined exam sets)
-- ============================================================
create table public.quizzes (
  id                uuid default uuid_generate_v4() primary key,
  course_id         uuid not null references public.courses(id) on delete cascade,
  title             text not null,
  description       text,
  type              text not null default 'mock_exam' check (type in ('mock_exam', 'topic_practice', 'custom')),
  time_limit_minutes integer,                        -- null = untimed
  question_count    integer not null default 20,
  difficulty        text check (difficulty in ('easy', 'medium', 'hard', 'mixed')) default 'mixed',
  is_active         boolean not null default true,
  is_free           boolean not null default false,  -- free preview quizzes
  created_at        timestamptz not null default now()
);

-- ============================================================
-- QUIZ_QUESTIONS (junction — which questions belong to a quiz)
-- ============================================================
create table public.quiz_questions (
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  question_id   uuid not null references public.questions(id) on delete cascade,
  "order"       integer not null default 0,
  primary key (quiz_id, question_id)
);

-- ============================================================
-- QUIZ_ATTEMPTS (high-level tracking of each attempt)
-- ============================================================
create table public.quiz_attempts (
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

-- ============================================================
-- ATTEMPT_ANSWERS (granular per-question tracking)
-- ============================================================
create table public.attempt_answers (
  id                   uuid default uuid_generate_v4() primary key,
  attempt_id           uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id          uuid not null references public.questions(id) on delete cascade,
  selected_option_index integer,              -- null = skipped / marked for review
  is_correct           boolean not null default false,
  is_marked_for_review boolean not null default false,
  time_spent_seconds   integer default 0
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table public.subscriptions (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan            text not null default 'pro' check (plan in ('pro', 'enterprise')),
  status          text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  payment_ref     text,                              -- Paystack/Flutterwave reference
  amount_kobo     integer,                           -- amount in lowest currency unit
  started_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.topics          enable row level security;
alter table public.questions       enable row level security;
alter table public.quizzes         enable row level security;
alter table public.quiz_questions  enable row level security;
alter table public.quiz_attempts   enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.subscriptions   enable row level security;

-- Profiles
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Courses & Topics: public read
create policy "Courses are public" on public.courses
  for select using (true);
create policy "Topics are public" on public.topics
  for select using (true);

-- Questions: public read (RLS will restrict based on subscription at app layer)
create policy "Questions are public" on public.questions
  for select using (is_active = true);
create policy "Admins can manage questions" on public.questions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Quizzes: public read
create policy "Quizzes are public" on public.quizzes
  for select using (is_active = true);
create policy "Admins can manage quizzes" on public.quizzes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Quiz Questions: public read
create policy "Quiz questions are public" on public.quiz_questions
  for select using (true);

-- Attempts: own only
create policy "Users can view own attempts" on public.quiz_attempts
  for select using (auth.uid() = user_id);
create policy "Users can insert own attempts" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own attempts" on public.quiz_attempts
  for update using (auth.uid() = user_id);
create policy "Admins can view all attempts" on public.quiz_attempts
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Attempt answers: own only
create policy "Users can manage own attempt answers" on public.attempt_answers
  for all using (
    exists (select 1 from public.quiz_attempts where id = attempt_id and user_id = auth.uid())
  );

-- Subscriptions: own only
create policy "Users can view own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "Admins can manage subscriptions" on public.subscriptions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'student'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRIGGER: update profiles.updated_at
-- ============================================================
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger questions_updated_at
  before update on public.questions
  for each row execute procedure public.update_updated_at();

-- ============================================================
-- SEED DATA — 100 Level Science Courses
-- ============================================================
insert into public.courses (code, title, description, faculty, level, units, color, icon) values
('MTH 101', 'Elementary Mathematics I',          'Algebra, trigonometry, and introductory calculus for science students.',       'Science', 100, 3, '#6366f1', 'Calculator'),
('MTH 103', 'Elementary Mathematics II',         'Differentiation, integration, and sequences for science students.',            'Science', 100, 3, '#8b5cf6', 'Calculator'),
('PHY 101', 'General Physics I',                 'Mechanics, waves, thermodynamics and kinetic theory.',                         'Science', 100, 3, '#3b82f6', 'Atom'),
('PHY 102', 'General Physics II',                'Electricity, magnetism, optics, and modern physics.',                         'Science', 100, 3, '#0ea5e9', 'Zap'),
('CHM 101', 'General Chemistry I',               'Atomic structure, chemical bonding, and stoichiometry.',                      'Science', 100, 3, '#10b981', 'FlaskConical'),
('CHM 102', 'General Chemistry II',              'Chemical kinetics, equilibrium, electrochemistry, and organic chemistry.',    'Science', 100, 3, '#14b8a6', 'FlaskConical'),
('BIO 101', 'General Biology I',                 'Cell biology, genetics, and the origin of life.',                             'Science', 100, 3, '#22c55e', 'Leaf'),
('BIO 103', 'General Biology II',                'Ecology, evolution, plant and animal physiology.',                            'Science', 100, 3, '#84cc16', 'Leaf'),
('CSC 101', 'Introduction to Computer Science',  'Algorithms, problem solving, data representation, and programming basics.',   'Science', 100, 3, '#f59e0b', 'Code2'),
('GST 101', 'Use of English I',                  'Grammar, comprehension, essay writing and oral English.',                     'General', 100, 2, '#ef4444', 'BookOpen'),
('GST 102', 'Use of English II',                 'Advanced reading, academic writing, and communication skills.',               'General', 100, 2, '#f97316', 'BookOpen'),
('GST 103', 'Nigerian Peoples and Culture',      'History, culture, governance, and identity of Nigeria.',                     'General', 100, 2, '#ec4899', 'Globe'),
('GST 104', 'History and Philosophy of Science', 'Scientific method, history of science, ethics and philosophy.',              'General', 100, 2, '#a855f7', 'Microscope'),
('GST 107', 'The Good Study Guide',              'Effective study strategies, time management, and academic success.',          'General', 100, 2, '#06b6d4', 'GraduationCap');

-- ============================================================
-- SEED DATA — Topics for MTH 101
-- ============================================================
with c as (select id from public.courses where code = 'MTH 101')
insert into public.topics (course_id, name, "order") values
((select id from c), 'Set Theory',                 1),
((select id from c), 'Real Number System',          2),
((select id from c), 'Indices and Logarithms',      3),
((select id from c), 'Surds',                       4),
((select id from c), 'Quadratic Equations',         5),
((select id from c), 'Polynomials',                 6),
((select id from c), 'Trigonometry',                7),
((select id from c), 'Coordinate Geometry',         8),
((select id from c), 'Sequences and Series',        9),
((select id from c), 'Introductory Calculus',      10);

-- ============================================================
-- SEED DATA — Sample Questions for MTH 101
-- ============================================================
with c as (select id from public.courses where code = 'MTH 101')
insert into public.questions (course_id, content, options, correct_option_index, explanation, difficulty, source_year) values
(
  (select id from c),
  'If log₂(x) = 5, what is the value of x?',
  '["8", "16", "32", "64"]'::jsonb,
  2,
  'log₂(x) = 5 means 2⁵ = x, so x = 32.',
  'easy',
  2022
),
(
  (select id from c),
  'Solve for x: 3x² - 5x - 2 = 0',
  '["x = 2 or x = -1/3", "x = -2 or x = 1/3", "x = 2 or x = 1/3", "x = -2 or x = -1/3"]'::jsonb,
  0,
  'Using the quadratic formula or factoring: (3x + 1)(x - 2) = 0, so x = 2 or x = -1/3.',
  'medium',
  2021
),
(
  (select id from c),
  'What is the sum of the first 10 terms of the arithmetic progression 3, 7, 11, 15, ...?',
  '["190", "210", "200", "220"]'::jsonb,
  1,
  'S_n = n/2 × (2a + (n-1)d). Here a=3, d=4, n=10. S₁₀ = 10/2 × (6 + 36) = 5 × 42 = 210.',
  'medium',
  2020
),
(
  (select id from c),
  'Simplify: √75 + 2√48 - √108',
  '["5√3", "7√3", "9√3", "11√3"]'::jsonb,
  1,
  '√75 = 5√3, 2√48 = 8√3, √108 = 6√3. So 5√3 + 8√3 - 6√3 = 7√3.',
  'medium',
  2023
),
(
  (select id from c),
  'If A = {1,2,3,4,5} and B = {3,4,5,6,7}, find A ∩ B.',
  '["{3,4,5}", "{1,2,6,7}", "{1,2,3,4,5,6,7}", "{3,4}"]'::jsonb,
  0,
  'A ∩ B is the set of elements common to both A and B, which is {3, 4, 5}.',
  'easy',
  2022
),
(
  (select id from c),
  'Find the 15th term of the geometric progression 2, 6, 18, 54, ...',
  '["2 × 3¹⁴", "3 × 2¹⁴", "2 × 3¹⁵", "6 × 3¹³"]'::jsonb,
  0,
  'For a GP, T_n = ar^(n-1). Here a=2, r=3. T₁₅ = 2 × 3¹⁴.',
  'medium',
  2019
),
(
  (select id from c),
  'Differentiate y = 4x³ - 3x² + 5x - 7 with respect to x.',
  '["12x² - 6x + 5", "4x² - 3x + 5", "12x² + 6x - 5", "8x² - 6x + 5"]'::jsonb,
  0,
  'Using power rule: dy/dx = 3(4x²) - 2(3x) + 5 = 12x² - 6x + 5.',
  'easy',
  2021
),
(
  (select id from c),
  'Convert 135° to radians.',
  '["3π/4", "2π/3", "π/2", "5π/6"]'::jsonb,
  0,
  'To convert degrees to radians, multiply by π/180. 135 × π/180 = 3π/4.',
  'easy',
  2020
),
(
  (select id from c),
  'What are the roots of the equation x² - 7x + 10 = 0?',
  '["x = 2 and x = 5", "x = -2 and x = -5", "x = 1 and x = 10", "x = 2 and x = -5"]'::jsonb,
  0,
  'Factor: (x - 2)(x - 5) = 0, so x = 2 or x = 5.',
  'easy',
  2022
),
(
  (select id from c),
  'A line passes through (2, 3) and has a slope of -1/2. What is its equation?',
  '["y = -x/2 + 4", "y = -x/2 - 4", "y = 2x + 3", "y = x/2 + 4"]'::jsonb,
  0,
  'Using point-slope form: y - 3 = -1/2(x - 2) → y = -x/2 + 1 + 3 = -x/2 + 4.',
  'medium',
  2023
);

-- Sample questions for PHY 101
with c as (select id from public.courses where code = 'PHY 101')
insert into public.questions (course_id, content, options, correct_option_index, explanation, difficulty, source_year) values
(
  (select id from c),
  'A car accelerates from rest to 20 m/s in 5 seconds. What is its acceleration?',
  '["2 m/s²", "4 m/s²", "5 m/s²", "10 m/s²"]'::jsonb,
  1,
  'a = Δv/Δt = (20 - 0)/5 = 4 m/s².',
  'easy',
  2022
),
(
  (select id from c),
  'What is the SI unit of force?',
  '["Joule", "Pascal", "Newton", "Watt"]'::jsonb,
  2,
  'The SI unit of force is the Newton (N). 1 N = 1 kg⋅m/s².',
  'easy',
  2021
),
(
  (select id from c),
  'A body of mass 5 kg is moving with a velocity of 10 m/s. What is its kinetic energy?',
  '["25 J", "50 J", "250 J", "500 J"]'::jsonb,
  2,
  'KE = ½mv² = ½ × 5 × 10² = ½ × 5 × 100 = 250 J.',
  'easy',
  2020
),
(
  (select id from c),
  'Which of Newton''s laws states that every action has an equal and opposite reaction?',
  '["First Law", "Second Law", "Third Law", "Law of Gravitation"]'::jsonb,
  2,
  'Newton''s Third Law of Motion: For every action, there is an equal and opposite reaction.',
  'easy',
  2019
),
(
  (select id from c),
  'The period of a simple pendulum is given by T = 2π√(L/g). If L = 1m and g = 10 m/s², what is T approximately?',
  '["1.99 s", "3.14 s", "0.63 s", "6.28 s"]'::jsonb,
  0,
  'T = 2π√(1/10) = 2π × 0.316 ≈ 2π/3.16 ≈ 1.99 s ≈ 2 s.',
  'medium',
  2023
),
(
  (select id from c),
  'What is the velocity of sound in air at room temperature (approximately)?',
  '["343 m/s", "150 m/s", "1500 m/s", "3 × 10⁸ m/s"]'::jsonb,
  0,
  'The speed of sound in air at 20°C is approximately 343 m/s.',
  'easy',
  2022
),
(
  (select id from c),
  'A projectile is launched horizontally from a height of 20 m. How long does it take to hit the ground? (g = 10 m/s²)',
  '["1 s", "2 s", "√2 s", "4 s"]'::jsonb,
  1,
  'Using h = ½gt²: 20 = ½ × 10 × t², t² = 4, t = 2 s.',
  'medium',
  2021
),
(
  (select id from c),
  'What is the principle of conservation of energy?',
  '["Energy can be created but not destroyed", "Energy can be destroyed but not created", "Energy can neither be created nor destroyed, only converted", "Energy is always lost as heat"]'::jsonb,
  2,
  'The law of conservation of energy states that energy cannot be created or destroyed, only transformed from one form to another.',
  'easy',
  2020
),
(
  (select id from c),
  'A gas occupies 4 L at 300 K. What volume will it occupy at 600 K at constant pressure?',
  '["2 L", "4 L", "8 L", "12 L"]'::jsonb,
  2,
  'Using Charles Law: V₁/T₁ = V₂/T₂. 4/300 = V₂/600. V₂ = 8 L.',
  'medium',
  2019
),
(
  (select id from c),
  'Which quantity is a vector quantity?',
  '["Mass", "Temperature", "Speed", "Velocity"]'::jsonb,
  3,
  'Velocity is a vector quantity because it has both magnitude and direction. Speed is scalar.',
  'easy',
  2023
);

-- ============================================================
-- SEED DATA — Sample Quizzes
-- ============================================================
with mth as (select id from public.courses where code = 'MTH 101'),
     phy as (select id from public.courses where code = 'PHY 101')
insert into public.quizzes (course_id, title, description, type, time_limit_minutes, question_count, difficulty, is_free) values
((select id from mth), 'MTH 101 Mock Exam — Set A',      'Full 50-question mock exam simulating the university exam format.',      'mock_exam',       60,  10, 'mixed',  false),
((select id from mth), 'MTH 101 Practice — Algebra',     'Focused practice on algebra, surds and quadratic equations.',            'topic_practice',  30,  10, 'mixed',  true),
((select id from phy), 'PHY 101 Mock Exam — Set A',      'Full 50-question mock exam covering mechanics and waves.',               'mock_exam',       60,  10, 'mixed',  false),
((select id from phy), 'PHY 101 Practice — Mechanics',   'Focused questions on Newton''s laws, kinematics, and energy.',           'topic_practice',  30,  10, 'easy',   true);

-- Link questions to quizzes (MTH 101 Mock)
with q as (select id from public.quizzes where title = 'MTH 101 Mock Exam — Set A' limit 1),
     questions as (select id, row_number() over () as rn from public.questions where course_id = (select id from public.courses where code = 'MTH 101'))
insert into public.quiz_questions (quiz_id, question_id, "order")
select (select id from q), id, rn from questions;

-- Link questions to quizzes (MTH 101 Practice)
with q as (select id from public.quizzes where title = 'MTH 101 Practice — Algebra' limit 1),
     questions as (select id, row_number() over () as rn from public.questions where course_id = (select id from public.courses where code = 'MTH 101'))
insert into public.quiz_questions (quiz_id, question_id, "order")
select (select id from q), id, rn from questions;

-- Link questions to quizzes (PHY 101 Mock)
with q as (select id from public.quizzes where title = 'PHY 101 Mock Exam — Set A' limit 1),
     questions as (select id, row_number() over () as rn from public.questions where course_id = (select id from public.courses where code = 'PHY 101'))
insert into public.quiz_questions (quiz_id, question_id, "order")
select (select id from q), id, rn from questions;

-- Link questions to quizzes (PHY 101 Practice)
with q as (select id from public.quizzes where title = 'PHY 101 Practice — Mechanics' limit 1),
     questions as (select id, row_number() over () as rn from public.questions where course_id = (select id from public.courses where code = 'PHY 101'))
insert into public.quiz_questions (quiz_id, question_id, "order")
select (select id from q), id, rn from questions;
