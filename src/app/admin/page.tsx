import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './AdminDashboardClient'

export const metadata = {
  title: 'Admin Panel — CampusIQ',
  description: 'Manage courses, questions, and users.',
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch aggregate stats
  const [
    { count: userCount },
    { count: questionCount },
    { count: courseCount },
    { count: attemptCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
  ])

  // Fetch recent questions
  const { data: recentQuestions } = await supabase
    .from('questions')
    .select('*, courses(code, title)')
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch all courses for question upload
  const { data: courses } = await supabase
    .from('courses')
    .select('id, code, title')
    .order('code')

  return (
    <AdminDashboardClient
      profile={profile}
      stats={{
        userCount: userCount || 0,
        questionCount: questionCount || 0,
        courseCount: courseCount || 0,
        attemptCount: attemptCount || 0,
      }}
      recentQuestions={recentQuestions || []}
      courses={courses || []}
    />
  )
}
