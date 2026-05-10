'use client'

import { motion } from 'framer-motion'
import {
  BookOpen,
  ChevronRight,
  Play,
  Search,
  BarChart2,
  Clock,
  Target,
  Trophy,
  CheckCircle2,
  TrendingUp,
  FileText,
  Zap,
  Flame,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from './Sidebar'
import type { Profile, Course } from '@/types/database'

interface DashboardClientProps {
  profile: Profile | null
  courses: Course[]
  recentAttempts: any[]
  stats: {
    totalAttempts: number
    avgScore: number
    bestScore: number
  }
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function getScoreBg(score: number) {
  if (score >= 70) return 'bg-emerald-500/10 border-emerald-500/20'
  if (score >= 50) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

/* Empty state SVG — clean minimalist illustration */
function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <svg width="120" height="100" viewBox="0 0 120 100" fill="none" className="mb-5 opacity-40">
        <rect x="10" y="20" width="100" height="70" rx="8" stroke="#64748B" strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx="60" cy="45" r="12" stroke="#6366F1" strokeWidth="1.5" opacity="0.5" />
        <path d="M55 45L58 48L65 41" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        <rect x="35" y="65" width="50" height="4" rx="2" fill="#334155" />
        <rect x="42" y="73" width="36" height="3" rx="1.5" fill="#1E293B" />
      </svg>
      <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
      <p className="text-xs text-slate-600">{subtitle}</p>
    </div>
  )
}

export default function DashboardClient({ profile, courses, recentAttempts, stats }: DashboardClientProps) {
  const firstName = profile?.full_name?.split(' ')[0] || 'Student'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-white/[0.04] shrink-0 bg-[#0F172A]/80 backdrop-blur-xl">
          <div>
            <h1 className="text-lg font-semibold text-slate-50">
              {greeting}, <span className="text-indigo-400">{firstName}</span>
            </h1>
            <p className="text-[11px] text-slate-600 font-mono uppercase tracking-wider">
              2025/2026 Academic Session
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block group">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Search courses..."
                className="pl-9 pr-4 py-2 bg-slate-800/50 border border-white/[0.06] rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-56 transition-all text-slate-300 placeholder:text-slate-600"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1360px] mx-auto">

            {/* ── Bento Grid ── */}
            <div className="grid grid-cols-12 gap-4 auto-rows-min">

              {/* ── Row 1: Stats ── */}
              {/* Quizzes Taken — 3 cols */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="col-span-12 sm:col-span-6 lg:col-span-3 bento-card p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-indigo-500/8 border border-indigo-500/15">
                    <FileText className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-wider">
                    {stats.totalAttempts === 0 ? 'Get Started' : 'Total'}
                  </span>
                </div>
                <div className="text-3xl font-light text-slate-50 tracking-tight font-mono">
                  {stats.totalAttempts}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium">Quizzes Completed</p>
              </motion.div>

              {/* Average Score — 3 cols */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="col-span-12 sm:col-span-6 lg:col-span-3 bento-card p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
                    <Target className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${
                    stats.avgScore >= 70 ? 'text-emerald-500' : stats.avgScore >= 50 ? 'text-amber-500' : 'text-slate-600'
                  }`}>
                    {stats.avgScore >= 70 ? 'Excellent' : stats.avgScore >= 50 ? 'Good' : 'Improving'}
                  </span>
                </div>
                <div className={`text-3xl font-light tracking-tight font-mono ${getScoreColor(stats.avgScore)}`}>
                  {stats.avgScore}<span className="text-lg text-slate-600">%</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium">Average Score</p>
              </motion.div>

              {/* Best Score — 3 cols */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="col-span-12 sm:col-span-6 lg:col-span-3 bento-card p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-amber-500/8 border border-amber-500/15">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-amber-600 uppercase tracking-wider">
                    Personal Best
                  </span>
                </div>
                <div className="text-3xl font-light text-slate-50 tracking-tight font-mono">
                  {stats.bestScore}<span className="text-lg text-slate-600">%</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium">Highest Score</p>
              </motion.div>

              {/* Courses Available — 3 cols */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="col-span-12 sm:col-span-6 lg:col-span-3 bento-card p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-violet-500/8 border border-violet-500/15">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-violet-500 uppercase tracking-wider">
                    100 Level
                  </span>
                </div>
                <div className="text-3xl font-light text-slate-50 tracking-tight font-mono">
                  {courses.length}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium">Courses Available</p>
              </motion.div>

              {/* ── Row 2: Quick Start + Daily Goal ── */}
              {/* Quick Start Quiz — Large card, 8 cols */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
                className="col-span-12 lg:col-span-8 bento-card p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.15em]">Quick Start</h2>
                    </div>
                    <Link href="/dashboard/courses" className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                      All Courses <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {courses.slice(0, 4).map((course, i) => (
                      <Link key={course.id} href={`/dashboard/courses/${course.id}`}>
                        <div className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 border border-white/[0.04] hover:border-indigo-500/20 hover:bg-slate-800/50 transition-all cursor-pointer">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${course.color}15`, border: `1px solid ${course.color}30` }}>
                            <span className="text-xs font-mono font-bold" style={{ color: course.color }}>
                              {course.code.split(' ')[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-200 truncate group-hover:text-slate-50 transition-colors">
                              {course.title}
                            </p>
                            <p className="text-[11px] font-mono text-slate-600">{course.code}</p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-700 group-hover:text-indigo-400 transition-colors shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Daily Goal / Performance — 4 cols */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="col-span-12 lg:col-span-4 bento-card p-6"
              >
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.15em]">Performance</h2>
                </div>

                {stats.totalAttempts === 0 ? (
                  <EmptyState
                    title="No data yet"
                    subtitle="Complete a quiz to track your performance."
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Score arc visualization */}
                    <div className="flex items-center justify-center py-4">
                      <div className="relative w-28 h-28">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="#1E293B" strokeWidth="6" />
                          <circle
                            cx="50" cy="50" r="42" fill="none"
                            stroke={stats.avgScore >= 70 ? '#10B981' : stats.avgScore >= 50 ? '#F59E0B' : '#EF4444'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${stats.avgScore * 2.64} 264`}
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-2xl font-mono font-light ${getScoreColor(stats.avgScore)}`}>{stats.avgScore}</span>
                          <span className="text-[9px] text-slate-600 uppercase tracking-wider">Avg %</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: 'Best Score', value: `${stats.bestScore}%`, color: getScoreColor(stats.bestScore) },
                        { label: 'Total Attempts', value: stats.totalAttempts.toString(), color: 'text-slate-300' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                          <span className="text-[12px] text-slate-500">{item.label}</span>
                          <span className={`text-[13px] font-mono font-semibold ${item.color}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* ── Row 3: Recent Activity + CTA ── */}
              {/* Recent Activity — 5 cols */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 }}
                className="col-span-12 lg:col-span-5 bento-card p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.15em]">Recent Activity</h2>
                  </div>
                  {recentAttempts.length > 0 && (
                    <Link href="/dashboard/history" className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                      View all →
                    </Link>
                  )}
                </div>

                {recentAttempts.length === 0 ? (
                  <EmptyState
                    title="No recent activity"
                    subtitle="Your quiz attempts will appear here."
                  />
                ) : (
                  <div className="space-y-2">
                    {recentAttempts.map((attempt) => {
                      const quiz = attempt.quizzes as any
                      const course = quiz?.courses as any
                      const pct = Math.round(Number(attempt.percentage))
                      return (
                        <div key={attempt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-white/[0.03] hover:border-white/[0.06] transition-all">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${getScoreBg(pct)}`}>
                            <CheckCircle2 className={`w-3.5 h-3.5 ${getScoreColor(pct)}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-slate-300 truncate">
                              {quiz?.title || 'Quiz'}
                            </p>
                            <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                              {course?.code} • <span className={`font-semibold ${getScoreColor(pct)}`}>{pct}%</span>
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>

              {/* CTA / Getting Started — 7 cols */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42 }}
                className="col-span-12 lg:col-span-7 bento-card p-6 relative overflow-hidden"
              >
                <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-indigo-500/[0.05] rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/[0.03] rounded-full blur-[50px] pointer-events-none" />

                <div className="relative z-10">
                  {stats.totalAttempts === 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Flame className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.15em]">Get Started</h2>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-50 mb-2">Take your first quiz</h3>
                      <p className="text-[13px] text-slate-500 font-light mb-6 max-w-md leading-relaxed">
                        Start with a free practice quiz in any course. You&apos;ll get instant feedback, explanations, and performance tracking from day one.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link href="/dashboard/courses">
                          <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold rounded-lg transition-all flex items-center gap-2">
                            Browse Courses <ChevronRight className="w-4 h-4" />
                          </button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart2 className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.15em]">Score Analytics</h2>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-5">
                        {courses.slice(0, 3).map(course => (
                          <div key={course.id} className="p-3 rounded-xl bg-slate-800/30 border border-white/[0.04] text-center">
                            <span className="text-[10px] font-mono font-bold block mb-1" style={{ color: course.color }}>
                              {course.code}
                            </span>
                            <span className="text-lg font-mono font-light text-slate-300">—</span>
                            <span className="text-[10px] text-slate-600 block mt-0.5">No data</span>
                          </div>
                        ))}
                      </div>

                      <Link href="/dashboard/analytics">
                        <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold rounded-lg transition-all flex items-center gap-2">
                          View Analytics <ChevronRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </>
                  )}
                </div>
              </motion.div>

              {/* ── Row 4: More courses ── */}
              {courses.length > 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48 }}
                  className="col-span-12 bento-card p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.15em]">All Courses</h2>
                    </div>
                    <Link href="/dashboard/courses" className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                      View Library <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {courses.slice(0, 14).map((course) => (
                      <Link key={course.id} href={`/dashboard/courses/${course.id}`}>
                        <div className="group text-center p-4 rounded-xl bg-slate-800/20 border border-white/[0.03] hover:border-indigo-500/20 hover:bg-slate-800/40 transition-all cursor-pointer">
                          <span className="text-xs font-mono font-bold block mb-1.5 text-slate-400 group-hover:text-indigo-400 transition-colors" style={{ color: course.color }}>
                            {course.code}
                          </span>
                          <p className="text-[11px] text-slate-600 truncate leading-tight">{course.title.split(/[:(]/)[0].trim()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
