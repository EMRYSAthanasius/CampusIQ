-- ============================================================
-- Migration: Smart Reader System
-- ============================================================

-- 1. Create course_materials table
create table public.course_materials (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  file_url text not null,
  parsed_content text, -- to store cached markdown/text
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_materials enable row level security;

create policy "Course materials are public" on public.course_materials
  for select using (is_active = true);

-- Trigger for updated_at
create trigger course_materials_updated_at
  before update on public.course_materials
  for each row execute procedure public.update_updated_at();

-- 2. Create user_progress (for document reading)
create table public.user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references public.course_materials(id) on delete cascade,
  last_position integer default 0,
  total_seconds_spent integer default 0,
  last_accessed_at timestamptz not null default now(),
  unique(user_id, material_id)
);

alter table public.user_progress enable row level security;

create policy "Users can view own progress" on public.user_progress
  for select using (auth.uid() = user_id);

create policy "Users can insert own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update own progress" on public.user_progress
  for update using (auth.uid() = user_id);

-- 3. Update profiles table to add daily_goal_seconds
alter table public.profiles
add column if not exists daily_goal_seconds integer default 7200;

-- 4. Update profiles table subscription_status constraint to include 'ultra'
alter table public.profiles
drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
add constraint profiles_subscription_status_check
check (subscription_status in ('free', 'pro', 'ultra', 'expired'));
