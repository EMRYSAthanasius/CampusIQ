'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Award, FileText, CheckCircle2, ChevronRight, AlertCircle, Loader2, Sparkles } from 'lucide-react'
function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const suffix = options?.addSuffix ? ' ago' : '';

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m${suffix}`;
  if (diffHours < 24) return `${diffHours}h${suffix}`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d${suffix}`;
}


interface Course {
  id: string
  code: string
  title: string
  color: string
  icon: string
}

interface Quiz {
  id: string
  title: string
  type: 'mock_exam' | 'topic_practice' | 'custom'
  courses: Course
}

interface Attempt {
  id: string
  score: number
  total_questions: number
  percentage: number
  time_taken_seconds: number | null
  status: 'in_progress' | 'completed' | 'abandoned'
  started_at: string
  completed_at: string | null
  quizzes: Quiz
}

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const res = await fetch('/api/user/attempts')
        if (!res.ok) throw new Error('Failed to load attempt history')
        const data = await res.json()
        setAttempts(data.attempts || [])
      } catch (err: any) {
        setError(err.message || 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchAttempts()
  }, [])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getQuizTypeLabel = (type: string) => {
    if (type === 'mock_exam') return 'Mock Exam'
    if (type === 'topic_practice') return 'Topic Practice'
    return 'Custom Quiz'
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 70) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
    if (percentage >= 45) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30'
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950/50 p-6 md:p-10 ml-0 md:ml-20 transition-all duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#1B4332] dark:text-zinc-50 tracking-tight font-sora">
              Quiz <span className="text-[#2E8B57]">History</span>
            </h1>
            <p className="text-[#6B7280] dark:text-zinc-400 mt-2 text-sm max-w-md">
              Track your performance, review past exam attempts, and monitor your progress over time.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-[#2E8B57] animate-spin" />
            <p className="text-sm text-slate-500 dark:text-zinc-400">Loading your history...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        ) : attempts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-3xl shadow-sm"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#2E8B57]/10 flex items-center justify-center text-[#2E8B57] mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#1B4332] dark:text-zinc-100 font-sora">No Quiz Attempts Found</h3>
            <p className="text-slate-400 dark:text-zinc-500 max-w-sm mt-2 text-sm">
              You haven't completed any quizzes yet. Head over to the Exams tab or Courses page to start learning!
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-2">
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-sm p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2E8B57]/10 text-[#2E8B57] flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800 dark:text-zinc-100">{attempts.length}</span>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Quizzes Taken</p>
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-sm p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800 dark:text-zinc-100">
                    {Math.round(attempts.reduce((acc, curr) => acc + curr.percentage, 0) / attempts.length)}%
                  </span>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Avg. Score</p>
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-sm p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800 dark:text-zinc-100">
                    {Math.max(...attempts.map(a => a.percentage))}%
                  </span>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Highest Score</p>
                </div>
              </div>
            </div>

            {/* Attempts list */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-700 dark:text-zinc-300 font-sora mt-4">All Quiz Attempts</h2>
              
              {attempts.map((attempt, index) => {
                const quiz = attempt.quizzes
                const course = quiz?.courses
                const dateDist = attempt.completed_at 
                  ? formatDistanceToNow(new Date(attempt.completed_at), { addSuffix: true }) 
                  : formatDistanceToNow(new Date(attempt.started_at), { addSuffix: true })

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={attempt.id}
                    className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-sm p-5 rounded-3xl hover:shadow-md hover:border-slate-200/60 dark:hover:border-zinc-800 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    {/* Course and Quiz Metadata */}
                    <div className="flex items-center gap-4">
                      {course && (
                        <div 
                          className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-slate-100/50 dark:border-zinc-800"
                          style={{ backgroundColor: `${course.color}15`, color: course.color }}
                        >
                          <span className="text-xs font-black tracking-tight">{course.code}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-zinc-100 leading-tight">
                          {quiz?.title || 'Dynamic Mock Exam'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                            {getQuizTypeLabel(quiz?.type)}
                          </span>
                          <span className="text-slate-400 dark:text-zinc-500 text-xs flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {dateDist}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Score */}
                    <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-50 dark:border-zinc-800/50 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Duration</span>
                        <p className="text-sm font-bold text-slate-700 dark:text-zinc-300 mt-0.5">
                          {formatDuration(attempt.time_taken_seconds)}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Questions</span>
                        <p className="text-sm font-bold text-slate-700 dark:text-zinc-300 mt-0.5">
                          {attempt.score}/{attempt.total_questions}
                        </p>
                      </div>

                      <div className={`px-4 py-2 border rounded-2xl flex items-center justify-center shrink-0 ${getScoreColor(attempt.percentage)}`}>
                        <span className="text-lg font-black font-sans">{Math.round(attempt.percentage)}%</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
