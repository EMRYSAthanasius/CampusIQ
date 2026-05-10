import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import QuizEngine from '@/components/QuizEngine'

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*, courses(code, title, color)')
    .eq('id', quizId)
    .single()

  if (!quiz) notFound()

  // Check subscription / access
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, role')
    .eq('id', user.id)
    .single()

  if (!quiz.is_free && profile?.subscription_status !== 'pro' && profile?.role !== 'admin') {
    redirect(`/dashboard/courses/${quiz.course_id}?locked=true`)
  }

  // Fetch questions for this quiz via junction table
  const { data: quizQuestions } = await supabase
    .from('quiz_questions')
    .select('question_id, order')
    .eq('quiz_id', quizId)
    .order('order')

  let questions: any[] = []
  if (quizQuestions && quizQuestions.length > 0) {
    const questionIds = quizQuestions.map(qq => qq.question_id)
    const { data: qData } = await supabase
      .from('questions')
      .select('*')
      .in('id', questionIds)
      .eq('is_active', true)

    // Sort by the quiz order
    const orderMap: Record<string, number> = {}
    quizQuestions.forEach(qq => { orderMap[qq.question_id] = qq.order })
    questions = (qData || []).sort((a, b) => orderMap[a.id] - orderMap[b.id])
  }

  return (
    <QuizEngine
      quiz={quiz}
      questions={questions}
      userId={user.id}
    />
  )
}
