import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/DashboardClient'
import { redirect } from 'next/navigation'

export const revalidate = 0

export const metadata = {
  title: 'Dashboard — CampusIQ',
  description: 'Track your progress, access courses, and continue your exam preparation journey.',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch recently accessed courses
  const { data: historyData } = await supabase
    .from('user_course_history')
    .select(`
      course_id,
      last_opened_at,
      courses (*)
    `)
    .eq('user_id', user.id)
    .order('last_opened_at', { ascending: false })
    .limit(3)

  let dashboardCourses = historyData?.map(h => h.courses) || []

  // Fallback to top 3 courses if no history
  if (dashboardCourses.length === 0) {
    const { data: fallbackCourses } = await supabase
      .from('courses')
      .select('*')
      .order('code')
      .limit(3)
    dashboardCourses = fallbackCourses || []
  }

  // Fetch course materials
  const { data: courseMaterials } = await supabase
    .from('course_materials')
    .select('id, course_id, title')

  // Fetch recent attempts
  const { data: recentAttempts } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      quizzes (
        title, type,
        courses ( code, title, color )
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5)

  // Fetch aggregate stats
  const { data: statsData } = await supabase
    .from('quiz_attempts')
    .select('score, total_questions, percentage')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const totalAttempts = statsData?.length || 0
  const avgScore = totalAttempts > 0
    ? Math.round((statsData || []).reduce((sum, a) => sum + Number(a.percentage), 0) / totalAttempts)
    : 0
  const bestScore = totalAttempts > 0
    ? Math.round(Math.max(...(statsData || []).map(a => Number(a.percentage))))
    : 0

  return (
    <DashboardClient
      profile={profile}
      courses={dashboardCourses as any || []}
      recentAttempts={recentAttempts || []}
      stats={{ totalAttempts, avgScore, bestScore }}
      materials={courseMaterials || []}
    />
  )
}
