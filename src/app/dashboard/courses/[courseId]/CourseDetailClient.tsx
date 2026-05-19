'use client'

import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Play,
  CheckCircle2,
  Clock,
  HelpCircle,
  BookOpen,
  Target,
  Lock,
  Tag,
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import type { Course, Quiz, Topic, Profile } from '@/types/database'

interface CourseDetailClientProps {
  profile: Profile | null
  course: Course
  quizzes: Quiz[]
  topics: Topic[]
  totalQuestions: number
  difficultyCount: { easy: number; medium: number; hard: number }
  attemptMap: Record<string, { score: number; total: number; percentage: number; date: string }>
}

function getScoreColor(pct: number) {
  if (pct >= 70) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getDifficultyColor(difficulty: string | null) {
  if (difficulty === 'easy') return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
  if (difficulty === 'medium') return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
  if (difficulty === 'hard') return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
  return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function CourseDetailClient({
  profile, course, quizzes, topics, totalQuestions, difficultyCount, attemptMap
}: CourseDetailClientProps) {
  const isPro = profile?.subscription_status === 'pro'

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-300 transition-colors duration-300">
      <Sidebar profile={profile} />

      <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-72 md:pr-8 md:pt-8 flex flex-col">
        <header className="h-20 px-8 flex items-center gap-4 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
          <Link href="/dashboard/courses">
            <button className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{course.code}</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">{course.title}</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-[1200px] mx-auto space-y-8">

            {/* Course Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-3xl border border-white/10 dark:border-white/5 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${course.color}22, ${course.color}08)` }}
            >
              <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full blur-3xl opacity-20" style={{ background: course.color }} />
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-black/30 text-white/70">
                      {course.code}
                    </span>
                    <span className="text-xs text-white/50 font-medium">{course.faculty}</span>
                  </div>
                  <h2 className="text-3xl font-semibold text-white mb-3 tracking-tight">{course.title}</h2>
                  <p className="text-white/60 font-light max-w-lg">{course.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full md:w-auto shrink-0">
                  {[
                    { label: 'Questions', value: totalQuestions, icon: HelpCircle },
                    { label: 'Quizzes', value: quizzes.length, icon: BookOpen },
                    { label: 'Units', value: course.units, icon: Target },
                  ].map(item => (
                    <div key={item.label} className="text-center p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-white/20 dark:border-zinc-800/50">
                      <item.icon className="w-5 h-5 text-white/70 dark:text-zinc-400 mx-auto mb-2" />
                      <div className="text-2xl font-light text-white dark:text-zinc-100">{item.value}</div>
                      <div className="text-[10px] text-white/60 dark:text-zinc-500 uppercase tracking-wider mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Difficulty breakdown */}
              {totalQuestions > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-4">
                  {[
                    { label: 'Easy', count: difficultyCount.easy, color: 'bg-emerald-500' },
                    { label: 'Medium', count: difficultyCount.medium, color: 'bg-amber-500' },
                    { label: 'Hard', count: difficultyCount.hard, color: 'bg-red-500' },
                  ].map(d => (
                    <div key={d.label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${d.color}`} />
                      <span className="text-xs text-white/50 font-medium">{d.count} {d.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quizzes */}
              <div className="lg:col-span-2">
                <h2 className="text-xs font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase mb-5 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Available Quizzes
                </h2>

                {quizzes.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <BookOpen className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-zinc-400">No quizzes available yet for this course.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quizzes.map((quiz, i) => {
                      const attempt = attemptMap[quiz.id]
                      const isLocked = !quiz.is_free && !isPro
                      return (
                        <motion.div
                          key={quiz.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="group p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getDifficultyColor(quiz.difficulty)}`}>
                                  {quiz.difficulty || 'Mixed'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                                  quiz.type === 'mock_exam'
                                    ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                                    : 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20'
                                }`}>
                                  {quiz.type === 'mock_exam' ? 'Mock Exam' : 'Practice'}
                                </span>
                                {quiz.is_free && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-wider">
                                    Free
                                  </span>
                                )}
                                {isLocked && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> Pro
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100 mb-1">{quiz.title}</h3>
                              {quiz.description && (
                                <p className="text-xs text-slate-400 dark:text-zinc-500 font-light">{quiz.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <HelpCircle className="w-3 h-3" /> {quiz.question_count} questions
                                </span>
                                {quiz.time_limit_minutes && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {quiz.time_limit_minutes} min
                                  </span>
                                )}
                                {attempt && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    Best: <span className={`font-semibold ${getScoreColor(attempt.percentage)}`}>{Math.round(attempt.percentage)}%</span>
                                    <span className="text-slate-400 dark:text-zinc-500">• {formatDate(attempt.date)}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {isLocked ? (
                              <Link href="/dashboard/upgrade">
                                <button className="px-5 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-semibold rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center gap-2 shrink-0">
                                  <Lock className="w-3.5 h-3.5" /> Unlock
                                </button>
                              </Link>
                            ) : (
                              <Link href={`/quiz/${quiz.id}`}>
                                <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-600/20 group-hover:shadow-emerald-600/30">
                                  <Play className="w-3.5 h-3.5" />
                                  {attempt ? 'Retake' : 'Start'}
                                </button>
                              </Link>
                            )}
                          </div>

                          {/* Progress bar if attempted */}
                          {attempt && (
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
                              <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 mb-1">
                                <span>Best Score</span>
                                <span className={getScoreColor(attempt.percentage)}>
                                  {attempt.score}/{attempt.total} correct
                                </span>
                              </div>
                              <div className="h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${attempt.percentage}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${
                                    attempt.percentage >= 70 ? 'bg-emerald-500' :
                                    attempt.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Topics sidebar */}
              <div>
                <h2 className="text-xs font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase mb-5 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" /> Topics Covered
                </h2>
                {topics.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 dark:text-zinc-500 text-sm">No topics listed yet.</div>
                ) : (
                  <div className="space-y-2">
                    {topics.map((topic, i) => (
                      <motion.div
                        key={topic.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700 transition-all"
                      >
                        <div className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{i + 1}</span>
                        </div>
                        <span className="text-sm text-slate-700 dark:text-zinc-300 font-light">{topic.name}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
