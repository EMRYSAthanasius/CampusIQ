'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ChevronRight,
  Search,
  Bell,
  Clock,
  Target,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Zap,
  ArrowUpRight,
  Calendar,
  Activity,
  FileText,
  Sparkles,
  Dna,
  FlaskConical,
  Atom,
  Calculator,
  Globe,
  GraduationCap
} from 'lucide-react'
import Link from 'next/link'
import { formatCourseTitle } from '@/lib/utils'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

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
  materials?: any[]
}

interface AnalyticsData {
  progress: string
  avgStudyTime: string
  quizzesDone: number
  personalBest: string
  chartData: { day: string, hours: number }[]
  focusDistribution: { code: string, title: string, percentage: number }[]
  standing: {
    streak: string
    consistency: string
    bestCourse: string
  }
}

const getCourseStyle = (code: string) => {
  const cleanCode = code.toUpperCase().replace(/\s+/g, '')
  if (cleanCode.startsWith('BIO')) {
    return {
      Icon: Dna,
      containerClass: 'bg-teal-50 dark:bg-teal-950/30 text-teal-650 dark:text-teal-450 border border-teal-100/50 dark:border-teal-900/30 shadow-sm',
      badgeClass: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border border-teal-100/30'
    }
  }
  if (cleanCode.startsWith('CHM')) {
    return {
      Icon: FlaskConical,
      containerClass: 'bg-rose-50 dark:bg-rose-950/30 text-rose-650 dark:text-rose-450 border border-rose-100/50 dark:border-rose-900/30 shadow-sm',
      badgeClass: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-100/30'
    }
  }
  if (cleanCode.startsWith('PHY')) {
    return {
      Icon: Atom,
      containerClass: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-450 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm',
      badgeClass: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/30'
    }
  }
  if (cleanCode.startsWith('MTH')) {
    return {
      Icon: Calculator,
      containerClass: 'bg-amber-50 dark:bg-amber-950/30 text-amber-650 dark:text-amber-455 border border-amber-100/50 dark:border-amber-900/30 shadow-sm',
      badgeClass: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100/30'
    }
  }
  if (cleanCode.startsWith('GST')) {
    return {
      Icon: Globe,
      containerClass: 'bg-sky-50 dark:bg-sky-950/30 text-sky-650 dark:text-sky-450 border border-sky-100/50 dark:border-sky-900/30 shadow-sm',
      badgeClass: 'text-sky-750 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 border border-sky-100/30'
    }
  }
  return {
    Icon: BookOpen,
    containerClass: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-450 border border-emerald-100/50 dark:border-emerald-900/30 shadow-sm',
    badgeClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/30'
  }
}

const getMetricStyle = (color: string) => {
  switch (color) {
    case 'emerald':
      return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400';
    case 'blue':
      return 'bg-blue-50 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400';
    case 'amber':
      return 'bg-amber-50 dark:bg-amber-950/20 border-amber-100/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-455';
    case 'violet':
      return 'bg-violet-50 dark:bg-violet-950/20 border-violet-100/50 dark:border-violet-900/30 text-violet-650 dark:text-violet-400';
    default:
      return 'bg-slate-50 dark:bg-zinc-800 border-slate-150 dark:border-zinc-700 text-slate-600 dark:text-zinc-400';
  }
}

const getMetricBgStyle = (color: string) => {
  switch (color) {
    case 'emerald': return 'bg-emerald-500/5';
    case 'blue': return 'bg-blue-500/5';
    case 'amber': return 'bg-amber-500/5';
    case 'violet': return 'bg-violet-500/5';
    default: return 'bg-slate-500/5';
  }
}


export default function DashboardClient({ profile, courses, recentAttempts, stats, materials = [] }: DashboardClientProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/user/analytics')
        const data = await res.json()
        if (data && !data.error) {
          setAnalytics(data)
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const metrics = [
    { label: 'Your Progress', value: analytics?.progress || '0%', sub: 'Course Completion', icon: Activity, color: 'emerald' },
    { label: 'Avg Study Time', value: analytics?.avgStudyTime || '0h', sub: 'Daily Engagement', icon: Clock, color: 'blue' },
    { label: 'Quizzes Done', value: analytics?.quizzesDone || 0, sub: 'Mock Test Count', icon: Target, color: 'amber' },
    { label: 'Personal Best', value: analytics?.personalBest || '0%', sub: 'Score Streak', icon: Trophy, color: 'violet' },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
      <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-28 md:pr-8 md:pt-8 flex flex-col relative">
        {/* Top Header */}
        <header className="sticky top-0 h-auto md:h-24 py-4 md:py-0 px-4 md:px-8 flex flex-col md:flex-row md:items-center justify-between shrink-0 bg-slate-50/80 dark:bg-zinc-950/80 border-b border-slate-100/50 dark:border-zinc-800/50 backdrop-blur-md z-30 gap-4 md:gap-0 transition-colors duration-300">
          <div className="flex justify-between items-start w-full md:w-auto">
            <div className="flex flex-col pr-4 md:pr-0">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span>{greeting},</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="truncate max-w-[120px] sm:max-w-none">{profile?.full_name?.split(' ')[0] || 'Scholar'}</span>
                  <span className="inline-block animate-bounce-subtle text-xl shrink-0">👋</span>
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1 md:mt-0">
                Track your metrics, clear your courses, and maximize your performance today.
              </p>
            </div>
            
            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-xl text-slate-400 hover:text-emerald-600 transition-all cursor-pointer group"
              >
                <Bell className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 stroke-[1.8]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border-2 border-white dark:border-zinc-800 shadow-sm overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-700 font-bold">
                    {profile?.full_name?.charAt(0) || 'S'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
            <div className="relative flex items-center group w-full md:w-auto">
              <Search className="w-4 h-4 absolute left-4 text-slate-400 group-focus-within:text-emerald-500 group-focus-within:scale-110 transition-all duration-300 stroke-[1.8]" />
              <input
                type="text"
                placeholder="Quick search courses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 text-slate-800 dark:text-zinc-100 rounded-xl text-sm focus:border-emerald-500 outline-none w-full md:w-64 transition-all shadow-sm focus:shadow-emerald-500/5 focus:shadow-md"
              />
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all group cursor-pointer"
              >
                <Bell className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 stroke-[1.8]" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-100 dark:border-zinc-800/80">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 leading-tight">{profile?.full_name || 'Scholar'}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{profile?.subscription_status || 'Free'}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-100 border-2 border-white dark:border-zinc-800 shadow-sm overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-700 font-bold">
                      {profile?.full_name?.charAt(0) || 'S'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dropdown Notifications Panel */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-4 md:right-8 top-44 md:top-24 w-80 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl z-50 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h4 className="text-sm font-bold text-slate-850 dark:text-zinc-100">Study Notifications</h4>
                <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-650 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-3 items-start p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all group">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/30 rounded-xl shrink-0 text-emerald-650 dark:text-emerald-450 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Zap className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-150">Study Streak Active!</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal">Maintain your {analytics?.standing?.streak || '0 Days'} streak by revising today!</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all group">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30 rounded-xl shrink-0 text-blue-600 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <BookOpen className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-150">Level Manuals Synced</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal">All 100 Level core course materials are synchronized with your catalog.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-10 space-y-8 scroll-smooth custom-scrollbar">
          
          {/* Row 1: Metrics Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group p-5 bg-white dark:bg-zinc-900 border border-slate-100/80 dark:border-zinc-800/80 rounded-[2rem] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
              >
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
                    <div className="h-2 w-16 bg-slate-100 dark:bg-zinc-800 rounded" />
                    <div className="h-6 w-24 bg-slate-100 dark:bg-zinc-800 rounded" />
                    <div className="h-2 w-20 bg-slate-100 dark:bg-zinc-800 rounded" />
                  </div>
                ) : (
                  <>
                    <div className={`absolute top-0 right-0 w-24 h-24 ${getMetricBgStyle(metric.color)} rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-500`} />
                    <div className="relative z-10">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${getMetricStyle(metric.color)}`}>
                        <metric.icon className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">{metric.label}</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-black text-slate-800 dark:text-zinc-100">{metric.value}</h3>
                        {idx === 0 && analytics && (
                          <span className="text-[10px] font-bold text-emerald-500">
                            +{Math.round(parseFloat(analytics.progress) * 0.15) || 5}% this week ↑
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-1">{metric.sub}</p>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>

          {/* Row 2: Analytics Split Section */}
          <div className="grid grid-cols-12 gap-4 md:gap-8">
            {/* Left: Performance Charts & Activities */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="p-8 bg-white dark:bg-zinc-900 border border-slate-100/80 dark:border-zinc-800/80 rounded-[2.5rem] shadow-sm min-h-[480px]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Study Intensity</h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Weekly distribution of your learning hours</p>
                  </div>
                  <select className="bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-lg text-[10px] font-bold px-3 py-1.5 outline-none text-slate-800 dark:text-zinc-100 focus:border-emerald-200">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                
                <div className="h-[280px] w-full">
                  {loading ? (
                    <div className="w-full h-full bg-slate-50/50 dark:bg-zinc-950/50 rounded-2xl animate-pulse flex items-center justify-center">
                      <Activity className="w-8 h-8 text-slate-200 animate-spin-slow" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics?.chartData || []}>
                        <defs>
                          <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="day" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                          dy={10}
                        />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="hours" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorHours)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50 dark:border-zinc-800/80">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {recentAttempts.length > 0 ? recentAttempts.slice(0, 3).map((attempt, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-zinc-950/30 rounded-2xl border border-slate-100/30 dark:border-zinc-800/20 group hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 hover:border-emerald-100/50 dark:hover:border-emerald-900/30 transition-all duration-300 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                            <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[1.8]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-zinc-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-450 transition-colors duration-200">{attempt.quizzes?.title}</p>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">{new Date(attempt.completed_at).toLocaleDateString()} — Quiz Attempt</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{Math.round(attempt.percentage)}%</p>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Score</p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-6">
                        <p className="text-xs text-slate-500 dark:text-zinc-400">No recent activities found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Scorecard & Distribution */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-8">
              <div className="p-8 bg-emerald-600 dark:bg-emerald-700 rounded-[2.5rem] shadow-lg shadow-slate-900/10 dark:shadow-zinc-950/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-500" />
                <div className="relative z-10 text-white">
                  <div className="mb-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Current Standing</p>
                    <p className="text-xs font-medium opacity-90">Based on your recent consistency and performance peaks.</p>
                  </div>
                  <div className="space-y-4">
                    {loading ? (
                      [1, 2, 3].map(i => (
                        <div key={i} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0 animate-pulse">
                          <div className="h-2 w-20 bg-white/20 rounded" />
                          <div className="h-2 w-12 bg-white/20 rounded" />
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                          <span className="text-[11px] font-bold opacity-70 uppercase tracking-wider">Weekly Streak</span>
                          <span className="text-sm font-black">{analytics?.standing?.streak || '0 Days'}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                          <span className="text-[11px] font-bold opacity-70 uppercase tracking-wider">Consistency</span>
                          <span className="text-sm font-black">{analytics?.standing?.consistency || '0%'}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                          <span className="text-[11px] font-bold opacity-70 uppercase tracking-wider">Best Course</span>
                          <span className="text-sm font-black">{analytics?.standing?.bestCourse || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white dark:bg-zinc-900 border border-slate-100/80 dark:border-zinc-800/80 rounded-[2.5rem] shadow-sm flex-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-6 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                    <Target className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span>Focus Distribution</span>
                </h3>
                <div className="space-y-6">
                  {loading ? (
                    [1, 2, 3, 4].map(i => (
                      <div key={i} className="space-y-2 animate-pulse">
                        <div className="flex justify-between">
                          <div className="h-2 w-16 bg-slate-100 dark:bg-zinc-800 rounded" />
                          <div className="h-2 w-8 bg-slate-100 dark:bg-zinc-800 rounded" />
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 dark:bg-zinc-950 rounded-full" />
                      </div>
                    ))
                  ) : (
                    analytics?.focusDistribution && analytics.focusDistribution.length > 0 ? (
                      analytics.focusDistribution.map((course, i) => (
                        <div key={i} className="space-y-2 group">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 group-hover:text-emerald-600 transition-colors">{course.code}</span>
                            <span className="text-[10px] font-black text-slate-500 dark:text-zinc-400">{course.percentage}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${course.percentage}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-emerald-500 rounded-full" 
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-widest">No course data yet</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Recent Courses Shelf */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <BookOpen className="w-4 h-4 stroke-[1.8]" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Recent Courses</h2>
              </div>
              <Link href="/dashboard/courses" className="text-xs font-bold text-emerald-600 hover:underline">
                View All Courses
              </Link>
            </div>

            {(() => {
              const filteredCourses = courses.filter(course => {
                const titleMatch = course.title.toLowerCase().includes(searchQuery.toLowerCase())
                const codeMatch = course.code.toLowerCase().includes(searchQuery.toLowerCase())
                return titleMatch || codeMatch
              })
              const displayedCourses = searchQuery ? filteredCourses : filteredCourses.slice(0, 3)

              return displayedCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedCourses.map((course, idx) => {
                    const material = materials.find(m => m.course_id === course.id);
                    const styleInfo = getCourseStyle(course.code);
                    const CourseIcon = styleInfo.Icon;

                    return (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-6 bg-white dark:bg-zinc-900 border border-slate-100/80 dark:border-zinc-800/80 rounded-[2rem] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group"
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${styleInfo.containerClass}`}>
                          <CourseIcon className="w-6 h-6 stroke-[1.8]" />
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 px-3 py-1 rounded-lg w-fit ${styleInfo.badgeClass}`}>
                          {course.code}
                        </p>
                        <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100 mb-4 line-clamp-2 h-12 leading-snug">
                          {formatCourseTitle(course.code, course.title)}
                        </h3>
                        <Link href={material ? `/materials/${material.id}` : `/dashboard/courses/${course.id}`}>
                          <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all hover:shadow-md flex items-center justify-center gap-2 cursor-pointer">
                            {material ? 'Open Workspace' : 'Read Document'} <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-200 dark:border-zinc-800 py-16 px-6 text-center">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-zinc-100 mb-2">
                    {searchQuery ? 'No matching courses found' : 'No recent courses found'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                    {searchQuery 
                      ? 'Try typing another course code or name, or browse the entire catalog.'
                      : 'Head over to the Course Library to open your first manual and start learning! 📚'
                    }
                  </p>
                  {searchQuery ? (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="mt-6 inline-block px-8 py-3 bg-slate-900 dark:bg-emerald-650 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-emerald-600 transition-all cursor-pointer"
                    >
                      Clear Search Query
                    </button>
                  ) : (
                    <Link href="/dashboard/courses" className="mt-6 inline-block px-8 py-3 bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-emerald-600 transition-all">
                      Browse Catalog
                    </Link>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  )
}
