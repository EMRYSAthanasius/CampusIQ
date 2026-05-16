-- Migration: Analytics & Study Tracking
-- ============================================================

-- 1. Create study_sessions table
create table if not exists public.study_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid references public.course_materials(id) on delete set null,
  duration_seconds integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz default now()
);

alter table public.study_sessions enable row level security;

create policy "Users can view own study sessions" on public.study_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own study sessions" on public.study_sessions
  for insert with check (auth.uid() = user_id);

-- 2. Update user_progress to track read chunks
-- (We'll store read chunks as a jsonb array of chunk IDs or just a count)
alter table public.user_progress
add column if not exists read_chunks jsonb default '[]'::jsonb;
