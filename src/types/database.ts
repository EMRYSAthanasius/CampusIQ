// CampusIQ — Supabase Database Types
// Auto-sync these with your Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Role = 'student' | 'admin'
export type SubscriptionStatus = 'free' | 'pro' | 'ultra' | 'expired'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuizType = 'mock_exam' | 'topic_practice' | 'custom'
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned'

export interface Profile {
  id: string
  full_name: string | null
  role: Role
  university: string | null
  faculty: string | null
  department: string | null
  level: 100 | 200 | 300 | 400 | 500
  avatar_url: string | null
  subscription_status: SubscriptionStatus
  subscription_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  code: string
  title: string
  description: string | null
  faculty: string
  level: number
  units: number
  is_active: boolean
  color: string
  icon: string
  created_at: string
}

export interface Topic {
  id: string
  course_id: string
  name: string
  description: string | null
  order: number
  created_at: string
}

export interface Question {
  id: string
  course_id: string
  topic_id: string | null
  content: string
  options: string[]
  correct_option_index: number
  explanation: string | null
  difficulty: Difficulty
  source_year: number | null
  source_type: 'past_exam' | 'textbook' | 'custom'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Quiz {
  id: string
  course_id: string
  title: string
  description: string | null
  type: QuizType
  time_limit_minutes: number | null
  question_count: number
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' | null
  is_active: boolean
  is_free: boolean
  created_at: string
}

export interface QuizQuestion {
  quiz_id: string
  question_id: string
  order: number
}

export interface QuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  score: number
  total_questions: number
  percentage: number
  time_taken_seconds: number | null
  status: AttemptStatus
  started_at: string
  completed_at: string | null
}

export interface AttemptAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_option_index: number | null
  is_correct: boolean
  is_marked_for_review: boolean
  time_spent_seconds: number
}

export interface Subscription {
  id: string
  user_id: string
  plan: 'pro' | 'enterprise'
  status: 'active' | 'cancelled' | 'expired'
  payment_ref: string | null
  amount_kobo: number | null
  started_at: string
  expires_at: string
  created_at: string
}

// Extended types with relations
export interface QuizWithCourse extends Quiz {
  courses: Pick<Course, 'code' | 'title' | 'color' | 'icon'>
}

export interface AttemptWithQuiz extends QuizAttempt {
  quizzes: Pick<Quiz, 'title' | 'type'> & {
    courses: Pick<Course, 'code' | 'title' | 'color'>
  }
}

export interface QuestionWithTopic extends Question {
  topics: Pick<Topic, 'name'> | null
}
