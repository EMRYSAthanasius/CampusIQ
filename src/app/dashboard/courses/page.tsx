import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CoursesClient from './CoursesClient'

export const metadata = {
  title: 'Course Library — CampusIQ',
  description: 'Browse all 100-level science courses and start practicing with past exam questions.',
}

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('is_active', true)
    .order('code')

  // Count quizzes and questions per course
  const { data: quizCounts } = await supabase
    .from('quizzes')
    .select('course_id')
    .eq('is_active', true)

  const { data: questionCounts } = await supabase
    .from('questions')
    .select('course_id')
    .eq('is_active', true)

  const quizCountMap: Record<string, number> = {}
  const questionCountMap: Record<string, number> = {}

  ;(quizCounts || []).forEach(q => {
    quizCountMap[q.course_id] = (quizCountMap[q.course_id] || 0) + 1
  })
  ;(questionCounts || []).forEach(q => {
    questionCountMap[q.course_id] = (questionCountMap[q.course_id] || 0) + 1
  })

  return (
    <CoursesClient
      profile={profile}
      courses={courses || []}
      quizCountMap={quizCountMap}
      questionCountMap={questionCountMap}
    />
  )
}
