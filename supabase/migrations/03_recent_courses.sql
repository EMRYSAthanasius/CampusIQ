-- Migration: Recent Course Tracking
-- ============================================================

-- 1. Create user_course_history table
create table if not exists public.user_course_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  last_opened_at timestamptz not null default now(),
  unique(user_id, course_id)
);

alter table public.user_course_history enable row level security;

create policy "Users can view own course history" on public.user_course_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own course history" on public.user_course_history
  for insert with check (auth.uid() = user_id);

create policy "Users can update own course history" on public.user_course_history
  for update using (auth.uid() = user_id);

-- 2. Function to log course access
create or replace function public.log_course_access(p_course_id uuid)
returns void as $$
begin
  insert into public.user_course_history (user_id, course_id, last_opened_at)
  values (auth.uid(), p_course_id, now())
  on conflict (user_id, course_id)
  do update set last_opened_at = now();
end;
$$ language plpgsql security definer;
