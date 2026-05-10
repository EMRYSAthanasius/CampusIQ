-- CampusIQ Supabase Schema

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Courses table
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  code varchar(50) not null,
  title varchar(255) not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Quizzes table
create table public.quizzes (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title varchar(255) not null,
  difficulty varchar(20) check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Questions table
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  content text not null,
  options jsonb not null, -- Array of strings
  correct_option_index integer not null,
  explanation text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User Progress table
create table public.user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  score integer not null,
  total_questions integer not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.courses enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.user_progress enable row level security;

-- Create policies

-- Courses: readable by everyone
create policy "Courses are viewable by everyone" on public.courses
  for select using (true);

-- Quizzes: readable by everyone
create policy "Quizzes are viewable by everyone" on public.quizzes
  for select using (true);

-- Questions: readable by everyone
create policy "Questions are viewable by everyone" on public.questions
  for select using (true);

-- User Progress: users can only see and insert their own progress
create policy "Users can view own progress" on public.user_progress
  for select using (auth.uid() = user_id);

create policy "Users can insert own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);

-- Insert Mock Data
insert into public.courses (code, title, description) values
('CS101', 'Introduction to Computer Science', 'Learn the basics of programming and computer architecture.'),
('BIO101', 'Introduction to Biology', 'Explore the fundamental concepts of biology and life sciences.');

-- Note: You'll need to retrieve the course UUIDs to insert mock quizzes and questions.
