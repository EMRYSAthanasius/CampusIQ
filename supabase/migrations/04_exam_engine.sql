-- Migration: Exam Engine & Question Bank
-- ============================================================

-- 1. Create exam_questions table
create table if not exists public.exam_questions (
  id uuid default uuid_generate_v4() primary key,
  course_code varchar(50) not null,
  question_text text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  explanation text,
  created_at timestamptz not null default now()
);

-- Index for fast course-based lookups
create index if not exists idx_exam_questions_course_code on public.exam_questions(course_code);

alter table public.exam_questions enable row level security;

create policy "Exam questions are readable by all authenticated users" on public.exam_questions
  for select using (auth.role() = 'authenticated');

-- 2. Update quizzes table if needed (optional, keeping it simple for now)
