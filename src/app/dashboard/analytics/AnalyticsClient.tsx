'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  Activity,
  Award,
  BookOpen,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Gauge
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import Sidebar from '@/components/Sidebar'
import type { Profile } from '@/types/database'

interface AnalyticsClientProps {
  profile: Profile | null
}

export default function AnalyticsClient({ profile }: AnalyticsClientProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)

  const fetchMetrics = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true)
    try {
      const res = await fetch('/api/analytics/metrics')
      const json = await res.json()
      if (json && !json.error) {
        setData(json)
      }
    } catch (e) {
      console.error('Failed to fetch analytics metrics:', e)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchMetrics()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
        <Sidebar profile={profile} />
        <main className="flex-1 flex flex-col h-screen justify-center items-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 animate-pulse uppercase tracking-widest">
              Calculating Academics...
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Find lowest average course for weakness identification
  const courses = data?.courseAverages || []
  let lowestCourse = courses.reduce((lowest: any, current: any) => {
    if (!lowest) return current
    return current.average < lowest.average ? current : lowest
  }, null as any)

  // Fallback if no courses
  if (!lowestCourse && courses.length > 0) {
    lowestCourse = courses[0]
  }

  const speed = data?.speedAnalysis || {
    avgSecondsPerQuestion: 42,
    totalQuestions: 120,
    totalMinutes: 84,
    isPacingGood: true
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 font-sans transition-colors duration-300">
      <Sidebar profile={profile} />

      <main className="flex-1 lg:pl-20 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-24 px-8 flex items-center justify-between shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-20 border-b border-slate-100/50 dark:border-zinc-800/50">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              Performance Insights <span className="text-emerald-500 font-medium">/ Diagnostics</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-widest mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {data?.hasRealData ? 'Live Tracking Enabled' : 'Simulated Diagnostic Mode'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchMetrics(true)}
              disabled={isRefreshing}
              className="p-3 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-xl text-slate-500 dark:text-zinc-450 hover:text-emerald-600 hover:border-emerald-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs font-bold hidden sm:inline uppercase tracking-wider">Sync Data</span>
            </button>
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar scroll-smooth">
          <div className="max-w-[1400px] mx-auto space-y-8">
            
            {/* Overview Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Overall Acc', value: `${Math.round(courses.reduce((sum: number, c: any) => sum + c.average, 0) / (courses.length || 1))}%`, icon: Award, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' },
                { label: 'Completed Quizzes', value: speed.totalQuestions / 10 || 12, icon: BookOpen, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/20' },
                { label: 'Pacing Metrics', value: `${speed.avgSecondsPerQuestion}s / Q`, icon: Clock, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20' },
                { label: 'Focus Hours', value: `${Math.round(speed.totalMinutes / 60)} hrs`, icon: Activity, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[1.5rem] p-6 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                      {item.label}
                    </span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-zinc-50">
                      {item.value}
                    </span>
                  </div>
                  <div className={`p-3.5 rounded-2xl ${item.color} shrink-0`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>

            {/* Performance Blocks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Block 1: Score Trends Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between min-h-[420px]">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" /> Score Accuracy Trends
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">Timeline accuracy rate from chronological quiz runs</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                      Chronological
                    </span>
                  </div>

                  {mounted && data?.trendData ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.08)" />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'rgba(128,128,128,0.6)', fontSize: 10, fontWeight: 600 }}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'rgba(128,128,128,0.6)', fontSize: 10, fontWeight: 600 }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid rgba(16, 185, 129, 0.1)',
                              borderRadius: '16px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                              color: '#1e293b'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#scoreColor)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 w-full flex items-center justify-center text-slate-350 dark:text-zinc-650">
                      Chart Engine Initializing...
                    </div>
                  )}
                </div>
              </div>

              {/* Block 3: Speed Analysis Metrics */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Gauge className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Speed Analysis</h3>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mb-6">Calculated average response time per question across your tests</p>

                  <div className="relative flex flex-col items-center justify-center my-6">
                    {/* Speedometer Gauge Representation */}
                    <div className="relative w-44 h-44 rounded-full border-8 border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950/40">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight">
                        {speed.avgSecondsPerQuestion}s
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider mt-1">
                        per question
                      </span>

                      {/* Needle Dial representation */}
                      <div 
                        className="absolute w-2 h-16 origin-bottom rounded-full transition-transform duration-1000 bg-amber-500/20"
                        style={{
                          transform: `rotate(${Math.min(180, (speed.avgSecondsPerQuestion / 120) * 180 - 90)}deg)`,
                          bottom: '50%'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {speed.isPacingGood ? (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30">
                      <div className="flex gap-2">
                        <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-450 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-emerald-850 dark:text-emerald-300 leading-normal">
                          Great pacing! You are well within standard CBT limits.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30">
                      <div className="flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-450 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-amber-850 dark:text-amber-300 leading-normal">
                          Pacing exceeds 60s target. Try skipping tough blocks and returning during reviews.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                    <span>Target Bench: &lt; 60s / q</span>
                    <span>Status: {speed.isPacingGood ? 'Excellent' : 'Needs Work'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Block 2: Subject Accuracy / Weakness Identifier */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Card List of Subject Accuracies */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-[2.5rem] p-8 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-500" /> Subject accuracy breakdown
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Mastery rankings based on aggregate quiz score percentages</p>
                </div>

                <div className="space-y-4">
                  {courses.map((c: any, idx: number) => {
                    const isLowest = lowestCourse && lowestCourse.courseCode === c.courseCode
                    return (
                      <div 
                        key={idx}
                        className={`p-4.5 rounded-2xl border transition-all ${
                          isLowest 
                            ? 'bg-amber-50/10 dark:bg-amber-950/10 border-amber-500/20 shadow-sm' 
                            : 'bg-slate-50/50 dark:bg-zinc-950/30 border-slate-100/50 dark:border-zinc-850'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                              isLowest 
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-450' 
                                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {c.courseCode}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                              {c.courseTitle}
                            </span>
                          </div>
                          <span className={`text-xs font-black ${isLowest ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-zinc-100'}`}>
                            {c.average}% Acc
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isLowest ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${c.average}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Subject Weakness Panel */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Weakest Link Identified</h3>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mb-6">Subject area displaying the lowest accuracy levels during evaluation</p>

                  {lowestCourse ? (
                    <div className="space-y-6">
                      <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 flex flex-col items-center text-center">
                        <span className="text-3xl font-black text-amber-700 dark:text-amber-400">
                          {lowestCourse.courseCode}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">
                          Lowest Accuracy
                        </span>
                        <span className="text-4xl font-extrabold text-slate-950 dark:text-white mt-4 tracking-tight">
                          {lowestCourse.average}%
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl">
                        <p className="text-xs font-medium text-slate-655 leading-relaxed dark:text-zinc-400">
                          💡 <span className="font-bold text-emerald-600 dark:text-emerald-450">Smart Insight:</span> Reviewing your {lowestCourse.courseCode} study guide could give you your biggest score jump today! Focused active recall on highlighted summaries will yield immediate results.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-350 dark:text-zinc-650">
                      No weakness analysis possible yet.
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                  <span>Action item generated</span>
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
