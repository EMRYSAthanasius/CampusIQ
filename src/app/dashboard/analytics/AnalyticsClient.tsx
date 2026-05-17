'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Zap, Activity, Award, BookOpen, Clock, Sparkles, RefreshCw, Gauge } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useTheme } from 'next-themes'
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

function SkeletonLayout({ profile }: { profile: Profile | null }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:pl-20 flex flex-col h-screen overflow-hidden">
        {/* header skeleton */}
        <div className="h-24 px-8 flex items-center justify-between shrink-0 border-b border-slate-100/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
          <div className="space-y-2">
            <Shimmer className="h-7 w-64" />
            <Shimmer className="h-3 w-40" />
          </div>
          <Shimmer className="h-10 w-28" />
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8">
          {/* stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
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
          {/* chart + speed row */}
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
          {/* subject breakdown row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-4">
              <Shimmer className="h-5 w-52" />
              {Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} className="h-14 w-full" />)}
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-4">
              <Shimmer className="h-5 w-44" />
              <Shimmer className="h-32 w-full rounded-3xl" />
              <Shimmer className="h-16 w-full" />
            </div>
          </div>
        </div>
      </main>
    </div>
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

  if (loading) return <SkeletonLayout profile={profile} />

  const courses = metrics?.courseAverages ?? []
  const speed = metrics?.speedAnalysis ?? { avgSecondsPerQuestion: 0, totalQuestions: 0, totalMinutes: 0, isPacingGood: true }
  const lowestCourse = courses[courses.length - 1] ?? null
  const weakest = metrics?.weakestSubject ?? lowestCourse?.courseCode ?? ''

  const isDark = resolvedTheme === 'dark'
  const tooltipStyle = {
    background: isDark ? 'rgba(24,24,27,0.95)' : 'rgba(255,255,255,0.95)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.1)'}`,
    borderRadius: '16px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    color: isDark ? '#f4f4f5' : '#1e293b',
  }

  const statsBar = [
    { label: 'Overall Accuracy', value: `${metrics?.overallAccuracy ?? 0}%`, icon: Award, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' },
    { label: 'Quizzes Completed', value: metrics?.totalAttempts ?? 0, icon: BookOpen, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/20' },
    { label: 'Avg Pacing', value: `${speed.avgSecondsPerQuestion}s / Q`, icon: Clock, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20' },
    { label: 'Total Study Min', value: `${speed.totalMinutes} min`, icon: Activity, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20' },
  ]

  // Needle angle: 0s = -90deg, 60s = 0deg, 120s+ = 90deg
  const needleAngle = Math.min(90, Math.max(-90, ((speed.avgSecondsPerQuestion / 120) * 180) - 90))

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 font-sans transition-colors duration-300">
      <Sidebar profile={profile} />

      <main className="flex-1 lg:pl-20 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-24 px-8 flex items-center justify-between shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-20 border-b border-slate-100/50 dark:border-zinc-800/50">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              Performance Insights <span className="text-emerald-500 font-medium">/ Diagnostics</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-widest mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {metrics?.hasRealData ? 'Live Tracking Active' : 'Demo Mode — Complete quizzes to unlock live data'}
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
        <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar scroll-smooth">
          <div className="max-w-[1400px] mx-auto space-y-8">

            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {statsBar.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[1.5rem] p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">{item.label}</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-zinc-50">{item.value}</span>
                  </div>
                  <div className={`p-3.5 rounded-2xl shrink-0 ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                </div>
              ))}
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
                    {metrics?.hasRealData ? 'Live' : 'Demo'}
                  </span>
                </div>

                {mounted && metrics?.trendData && metrics.trendData.length > 0 ? (
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
                  <div className="h-64 flex items-center justify-center">
                    <Shimmer className="h-full w-full" />
                  </div>
                )}
              </div>

              {/* Block 3: Speed Analysis */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Speed Analysis</h3>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mb-4">Avg response time per question across all tests</p>

                  {/* Speedometer */}
                  <div className="flex flex-col items-center justify-center my-4">
                    <div className="relative w-44 h-44 rounded-full border-8 border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950/40">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight">
                        {speed.avgSecondsPerQuestion}s
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider mt-1">per question</span>
                      {/* Needle */}
                      <div
                        className="absolute w-1.5 h-16 origin-bottom rounded-full transition-transform duration-1000"
                        style={{
                          background: speed.isPacingGood ? '#10b981' : '#f59e0b',
                          transform: `rotate(${needleAngle}deg)`,
                          bottom: '50%',
                          transformOrigin: 'bottom center',
                        }}
                      />
                      <div className="absolute w-4 h-4 rounded-full bg-slate-200 dark:bg-zinc-700 bottom-[calc(50%-8px)]" />
                    </div>
                    <div className="flex justify-between w-44 mt-2 px-2 text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      <span>Fast</span>
                      <span>Slow</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {speed.isPacingGood ? (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30 flex gap-2">
                      <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 leading-normal">
                        Great pacing! You are well within standard CBT limits.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30 flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 leading-normal">
                        Pacing exceeds 60s target. Skip tough questions and return during reviews.
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                    <span>Target: &lt; 60s / q</span>
                    <span>Status: {speed.isPacingGood ? 'Excellent' : 'Needs Work'}</span>
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
                  {courses.map((c, idx) => {
                    const isLowest = c.courseCode === weakest
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all ${isLowest ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30' : 'bg-slate-50/50 dark:bg-zinc-950/30 border-slate-100/50 dark:border-zinc-800/50'}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${isLowest ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'}`}>
                              {c.courseCode}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate max-w-[180px]">{c.courseTitle}</span>
                          </div>
                          <span className={`text-sm font-black ${isLowest ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-zinc-100'}`}>
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
                  })}
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

                  {lowestCourse ? (
                    <div className="space-y-4">
                      <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 flex flex-col items-center text-center">
                        <span className="text-3xl font-black text-amber-700 dark:text-amber-400">
                          {lowestCourse.courseCode}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Lowest Accuracy</span>
                        <span className="text-4xl font-extrabold text-slate-950 dark:text-white mt-3 tracking-tight">
                          {lowestCourse.average}%
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl">
                        <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 leading-relaxed">
                          💡 <span className="font-bold text-emerald-600 dark:text-emerald-400">Smart Insight:</span>{' '}
                          {weakest
                            ? `Reviewing your ${weakest} manuals will yield your highest score jump today. Focused active recall on highlighted summaries delivers immediate results.`
                            : 'No weak areas identified yet!'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 dark:text-zinc-500 text-sm">
                      No weakness analysis available yet.
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
    </div>
  )
}
