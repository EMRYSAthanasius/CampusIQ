'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Zap, Activity, Award, BookOpen, Clock, Sparkles, RefreshCw, Gauge, ArrowRight } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import type { Profile } from '@/types/database'

interface Metrics {
  hasRealData: boolean
  trendData: { date: string; score: number }[]
  courseAverages: { courseCode: string; courseTitle: string; average: number }[]
  speedAnalysis: { avgSecondsPerQuestion: number; totalQuestions: number; totalMinutes: number; isPacingGood: boolean }
  totalAttempts: number
  overallAccuracy: number
  weakestSubject: string
}

// ── Skeleton shimmer primitives ──────────────────────────────
function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-slate-100 dark:bg-zinc-800 ${className ?? ''}`} />
  )
}

function SkeletonLayout() {
  return (
    <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-28 md:pr-8 md:pt-8 flex flex-col">
        <div className="h-24 px-4 md:px-8 flex items-center justify-between shrink-0 border-b border-slate-100/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
          <div className="space-y-2">
            <Shimmer className="h-7 w-64" />
            <Shimmer className="h-3 w-40" />
          </div>
          <Shimmer className="h-10 w-28" />
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-10 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[1.5rem] p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <Shimmer className="h-2.5 w-16" />
                  <Shimmer className="h-7 w-20" />
                </div>
                <Shimmer className="h-12 w-12 rounded-2xl" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2.5rem] p-8 min-h-[420px] space-y-4">
              <Shimmer className="h-5 w-52" />
              <Shimmer className="h-3 w-72" />
              <Shimmer className="h-64 w-full mt-4" />
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-4">
              <Shimmer className="h-5 w-36" />
              <Shimmer className="h-3 w-52" />
              <div className="flex justify-center my-6">
                <Shimmer className="h-44 w-44 rounded-full" />
              </div>
              <Shimmer className="h-16 w-full" />
            </div>
          </div>
        </div>
      </main>
  )
}

export default function AnalyticsClient({ profile }: { profile: Profile | null }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  const loadMetrics = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    try {
      const res = await fetch('/api/analytics/metrics')
      const data = await res.json()
      if (data && !data.error) setMetrics(data as Metrics)
    } catch (err) {
      console.error('Failed to load live tracking metrics:', err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadMetrics()
  }, [])

  if (loading) return <SkeletonLayout />

  const courses = metrics?.courseAverages ?? []
  const speed = metrics?.speedAnalysis ?? { avgSecondsPerQuestion: 0, totalQuestions: 0, totalMinutes: 0, isPacingGood: true }
  const hasRealAttempts = metrics?.hasRealData ?? false
  const weakest = metrics?.weakestSubject ?? ''

  // Filter lowest scoring course that actually has an average > 0
  const activeEnrolledAverages = courses.filter(c => c.average > 0)
  const lowestActiveCourse = activeEnrolledAverages[activeEnrolledAverages.length - 1] ?? null

  const isDark = resolvedTheme === 'dark'
  const tooltipStyle = {
    background: isDark ? 'rgba(24,24,27,0.95)' : 'rgba(255,255,255,0.95)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.1)'}`,
    borderRadius: '16px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    color: isDark ? '#f4f4f5' : '#1e293b',
  }

  const statsBar = [
    { label: 'Overall Accuracy', value: `${metrics?.overallAccuracy ?? 0}%`, icon: Award, color: 'emerald' },
    { label: 'Quizzes Completed', value: metrics?.totalAttempts ?? 0, icon: BookOpen, color: 'sky' },
    { label: 'Avg Pacing', value: speed.avgSecondsPerQuestion > 0 ? `${speed.avgSecondsPerQuestion}s / Q` : 'N/A', icon: Clock, color: 'amber' },
    { label: 'Total Study Time', value: speed.totalMinutes > 0 ? `${speed.totalMinutes} min` : '0 min', icon: Activity, color: 'rose' },
  ]

  // Needle angle: 0s = 0deg (neutral/straight up), otherwise standard mapping
  const needleAngle = speed.avgSecondsPerQuestion > 0 
    ? Math.min(90, Math.max(-90, ((speed.avgSecondsPerQuestion / 120) * 180) - 90))
    : 0

  return (
    <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-28 md:pr-8 md:pt-8 flex flex-col relative">
        {/* Header */}
        <header className="h-24 px-4 md:px-8 flex items-center justify-between shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-20 border-b border-slate-100/50 dark:border-zinc-800/50">
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex flex-wrap items-center gap-2">
              Performance Insights <span className="text-emerald-500 font-medium">/ Diagnostics</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-widest mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {hasRealAttempts ? 'Real-Time Database Tracking Active' : 'Waiting for Quiz Data — Real-time telemetry initialized'}
            </p>
          </div>
          <button
            onClick={() => loadMetrics(true)}
            disabled={isRefreshing}
            className="p-3 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-emerald-600 hover:border-emerald-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold hidden sm:inline uppercase tracking-wider">Sync Data</span>
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-10 custom-scrollbar scroll-smooth">
          <div className="max-w-[1400px] mx-auto space-y-8">

            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {statsBar.map((item, idx) => {
                const getGlow = (c: string) => {
                  switch (c) {
                    case 'emerald': return 'bg-emerald-500/20 dark:bg-emerald-500/10';
                    case 'sky': return 'bg-sky-500/20 dark:bg-sky-500/10';
                    case 'amber': return 'bg-amber-500/20 dark:bg-amber-500/10';
                    case 'rose': return 'bg-rose-500/20 dark:bg-rose-500/10';
                    default: return 'bg-slate-500/20 dark:bg-slate-500/10';
                  }
                }
                const getGradient = (c: string) => {
                  switch (c) {
                    case 'emerald': return 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]';
                    case 'sky': return 'bg-gradient-to-tr from-sky-500 to-cyan-400 shadow-[0_0_20px_rgba(14,165,233,0.3)]';
                    case 'amber': return 'bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]';
                    case 'rose': return 'bg-gradient-to-tr from-rose-500 to-pink-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]';
                    default: return 'bg-gradient-to-tr from-slate-500 to-slate-400 shadow-[0_0_20px_rgba(100,116,139,0.3)]';
                  }
                }
                return (
                <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[1.5rem] p-6 shadow-sm flex items-center justify-between group hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-500/[0.02] transition-all duration-300">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-400 uppercase tracking-widest block mb-1">{item.label}</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-zinc-50">{item.value}</span>
                  </div>
                  <div className="w-14 h-14 relative flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <div className={`absolute inset-0 ${getGlow(item.color)} rounded-2xl rotate-6 blur-md transition-transform group-hover:rotate-12`} />
                    <div className={`absolute inset-0 ${getGradient(item.color)} rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 flex items-center justify-center overflow-hidden`}>
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '6px 6px' }} />
                      <item.icon className="w-6 h-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] z-10 relative" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              )})}
            </div>

            {/* ── Row 1: Score Trends + Speed ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Block 1: Score Trends Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-[2.5rem] p-8 shadow-sm flex flex-col min-h-[420px]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" /> Score Accuracy Trends
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500">Chronological accuracy rate from your quiz runs</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                    Live Status
                  </span>
                </div>

                {mounted && hasRealAttempts && metrics?.trendData && metrics.trendData.length > 0 ? (
                  <div className="h-64 w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.08)" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'rgba(128,128,128,0.6)', fontSize: 10, fontWeight: 600 }} />
                        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'rgba(128,128,128,0.6)', fontSize: 10, fontWeight: 600 }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Score']} />
                        <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#scoreGrad)" dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 border border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center bg-slate-50/10 dark:bg-zinc-900/10 min-h-[250px]">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-450 mb-4 shadow-sm animate-pulse flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 stroke-[1.8]" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-zinc-200">No Exam Score History Yet</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm mt-2 leading-relaxed font-medium">
                      Your diagnostic chart will populate in real time once you complete your first generated mock exam or practice session.
                    </p>
                    <Link
                      href="/dashboard/exams"
                      className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer uppercase tracking-wider group"
                    >
                      Take a Practice Quiz <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Block 3: Speed Analysis */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-500 shadow-sm shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <Gauge className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Speed Analysis</h3>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mb-4">Avg response time per question across all tests</p>

                  {/* Speedometer */}
                  <div className="flex flex-col items-center justify-center my-4">
                    <div className="relative w-44 h-44 rounded-full border-[10px] border-slate-50 dark:border-zinc-950 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-900/20 shadow-inner">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight">
                        {speed.avgSecondsPerQuestion > 0 ? `${speed.avgSecondsPerQuestion}s` : '0s'}
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider mt-1">per question</span>
                      {/* Needle */}
                      <div
                        className="absolute w-1 h-16 origin-bottom rounded-full transition-transform duration-1000 shadow-lg"
                        style={{
                          background: speed.avgSecondsPerQuestion === 0 ? 'rgba(128,128,128,0.4)' : (speed.isPacingGood ? '#10b981' : '#f59e0b'),
                          transform: `rotate(${needleAngle}deg)`,
                          bottom: '50%',
                          transformOrigin: 'bottom center',
                        }}
                      />
                      <div className="absolute w-4 h-4 rounded-full bg-slate-200 dark:bg-zinc-700 bottom-[calc(50%-8px)] border border-slate-350 dark:border-zinc-800 shadow" />
                    </div>
                    <div className="flex justify-between w-44 mt-2 px-2 text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      <span>Fast</span>
                      <span>Slow</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {speed.avgSecondsPerQuestion === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-800/40 flex gap-2">
                      <Clock className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 leading-normal">
                        No speed metrics recorded yet. Complete a timed practice test to evaluate pacing.
                      </p>
                    </div>
                  ) : speed.isPacingGood ? (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30 flex gap-2">
                      <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-450 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 leading-normal">
                        Great pacing! You are well within standard CBT limits.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30 flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-450 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-amber-800 dark:text-emerald-300 leading-normal">
                        Pacing exceeds 60s target. Skip tough questions and return during reviews.
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                    <span>Target: &lt; 60s / q</span>
                    <span>Status: {speed.avgSecondsPerQuestion === 0 ? 'N/A' : (speed.isPacingGood ? 'Excellent' : 'Needs Work')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 2: Subject Breakdown + Weakest Link ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Block 2: Subject Accuracy */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-[2.5rem] p-8 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-500" /> Subject Mastery Breakdown
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Average accuracy ranked across all active subjects</p>
                </div>
                <div className="space-y-4">
                  {courses.length > 0 ? (
                    courses.map((c, idx) => {
                      const isLowest = weakest ? c.courseCode === weakest : (lowestActiveCourse ? c.courseCode === lowestActiveCourse.courseCode : false)
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border transition-all ${isLowest ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30' : 'bg-slate-50/50 dark:bg-zinc-950/30 border-slate-100/50 dark:border-zinc-850'}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${isLowest ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-450' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'}`}>
                                {c.courseCode}
                              </span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate max-w-[220px]">{c.courseTitle}</span>
                            </div>
                            <span className={`text-sm font-black ${isLowest ? 'text-amber-600 dark:text-amber-450' : 'text-slate-900 dark:text-zinc-100'}`}>
                              {c.average}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${isLowest ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${c.average}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-400 dark:text-zinc-500 text-sm">
                      No active courses registered.
                    </div>
                  )}
                </div>
              </div>

              {/* Weakest Link Panel */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Weakest Link</h3>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Subject with the lowest accuracy average</p>

                  {hasRealAttempts && lowestActiveCourse ? (
                    <div className="space-y-4">
                      <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 flex flex-col items-center text-center">
                        <span className="text-3xl font-black text-amber-705 dark:text-amber-400">
                          {lowestActiveCourse.courseCode}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Lowest Accuracy</span>
                        <span className="text-4xl font-extrabold text-slate-950 dark:text-white mt-3 tracking-tight">
                          {lowestActiveCourse.average}%
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl">
                        <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 leading-relaxed">
                          💡 <span className="font-bold text-emerald-600 dark:text-emerald-450">Smart Insight:</span>{' '}
                          {weakest
                            ? `Reviewing your ${weakest} manuals will yield your highest score jump today. Focused active recall on highlighted summaries delivers immediate results.`
                            : 'Complete diagnostic tests to isolate weakest sectors.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 border-2 border-dashed border-slate-150 dark:border-zinc-800/80 rounded-3xl flex flex-col items-center justify-center p-6 text-center bg-slate-50/10 dark:bg-zinc-900/5 min-h-[220px]">
                      <div className="p-3 bg-amber-55 dark:bg-amber-950/20 rounded-xl text-amber-600 dark:text-amber-450 mb-3">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-300">Evaluating Strengths</h5>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500 max-w-[200px] mt-1.5 leading-normal">
                        No weakest subject has been isolated yet. Complete your first practice test to extract actionable diagnostic tips.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                  <span>AI-generated action item</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
  )
}
