import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import CourseDetailClient from './CourseDetailClient'

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (!course) notFound()

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_active', true)
    .order('created_at')

  const { data: topics } = await supabase
    .from('topics')
    .select('*')
    .eq('course_id', courseId)
    .order('order')

  const { data: questionCounts } = await supabase
    .from('questions')
    .select('id, difficulty')
    .eq('course_id', courseId)
    .eq('is_active', true)

  const { data: userAttempts } = await supabase
    .from('quiz_attempts')
    .select('quiz_id, score, total_questions, percentage, completed_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .in('quiz_id', (quizzes || []).map(q => q.id))

  const attemptMap: Record<string, { score: number; total: number; percentage: number; date: string }> = {}
  ;(userAttempts || []).forEach(a => {
    const existing = attemptMap[a.quiz_id]
    const pct = Number(a.percentage)
    if (!existing || pct > existing.percentage) {
      attemptMap[a.quiz_id] = {
        score: a.score,
        total: a.total_questions,
        percentage: pct,
        date: a.completed_at || '',
      }
    }
  })

  const difficultyCount = {
    easy: (questionCounts || []).filter(q => q.difficulty === 'easy').length,
    medium: (questionCounts || []).filter(q => q.difficulty === 'medium').length,
    hard: (questionCounts || []).filter(q => q.difficulty === 'hard').length,
  }

  return (
    <CourseDetailClient
      profile={profile}
      course={course}
      quizzes={quizzes || []}
      topics={topics || []}
      totalQuestions={questionCounts?.length || 0}
      difficultyCount={difficultyCount}
      attemptMap={attemptMap}
    />
  )
}
