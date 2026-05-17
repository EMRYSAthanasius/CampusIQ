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

  let { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (!course) {
    // Try to fetch by course code (case-insensitive) if id is not a standard UUID
    const { data: byCodeCourse } = await supabase
      .from('courses')
      .select('*')
      .eq('code', courseId)
      .single()

    course = byCodeCourse
  }

  // Construct fallback if course doesn't exist in courses database table yet (e.g. freshly uploaded storage folder)
  if (!course) {
    course = {
      id: courseId,
      code: courseId,
      title: `Course ${courseId}`,
      description: `Verbatim study manuals, quizzes, and learning analytics for ${courseId}.`,
      color: 'emerald',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any
  }

  // Log course access for "Recent Courses" tracking (only run if course.id is a valid UUID to prevent database exceptions)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id)
  if (isUUID) {
    await supabase.rpc('log_course_access', { p_course_id: course.id })
  }

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*')
    .eq('course_id', course.id)
    .eq('is_active', true)
    .order('created_at')

  const { data: topics } = await supabase
    .from('topics')
    .select('*')
    .eq('course_id', course.id)
    .order('order')

  const { data: questionCounts } = await supabase
    .from('questions')
    .select('id, difficulty')
    .eq('course_id', course.id)
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
