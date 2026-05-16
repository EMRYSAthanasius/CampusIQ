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
  FileText
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
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

export default function DashboardClient({ profile, courses, recentAttempts, stats, materials = [] }: DashboardClientProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

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
    <div className="flex min-h-screen bg-[#FAFDFA]">
      <Sidebar profile={profile} />

      <main className="flex-1 lg:pl-20 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-24 px-8 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md z-20">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {greeting}, {profile?.full_name?.split(' ')[0] || 'Scholar'} <span className="animate-bounce-subtle text-xl">👋</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Track your metrics, clear your courses, and maximize your performance today.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:flex items-center group">
              <Search className="w-4 h-4 absolute left-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                placeholder="Quick search..."
                className="pl-10 pr-4 py-2.5 bg-slate-100/50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-emerald-100 outline-none w-64 transition-all"
              />
            </div>
            <button className="relative p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all group">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">{profile?.full_name || 'Scholar'}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{profile?.subscription_status || 'Free'}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 border-2 border-white shadow-sm overflow-hidden">
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
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-8 scroll-smooth custom-scrollbar">
          
          {/* Row 1: Metrics Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group p-5 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
              >
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                    <div className="h-2 w-16 bg-slate-100 rounded" />
                    <div className="h-6 w-24 bg-slate-100 rounded" />
                    <div className="h-2 w-20 bg-slate-100 rounded" />
                  </div>
                ) : (
                  <>
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${metric.color}-500/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-500`} />
                    <div className="relative z-10">
                      <div className={`w-10 h-10 rounded-xl bg-${metric.color}-50 border border-${metric.color}-100 flex items-center justify-center mb-4`}>
                        <metric.icon className={`w-5 h-5 text-${metric.color}-600`} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{metric.label}</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-black text-slate-800">{metric.value}</h3>
                        {idx === 0 && analytics && (
                          <span className="text-[10px] font-bold text-emerald-500">+12% ↑</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">{metric.sub}</p>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>

          {/* Row 2: Analytics Split Section */}
          <div className="grid grid-cols-12 gap-8">
            {/* Left: Performance Charts & Activities */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="p-8 bg-white border border-slate-100/80 rounded-[2.5rem] shadow-sm min-h-[480px]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Study Intensity</h2>
                    <p className="text-xs text-slate-500">Weekly distribution of your learning hours</p>
                  </div>
                  <select className="bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold px-3 py-1.5 outline-none focus:border-emerald-200">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                
                <div className="h-[280px] w-full">
                  {loading ? (
                    <div className="w-full h-full bg-slate-50/50 rounded-2xl animate-pulse flex items-center justify-center">
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

                <div className="mt-8 pt-8 border-t border-slate-50">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {recentAttempts.length > 0 ? recentAttempts.slice(0, 3).map((attempt, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl group hover:bg-emerald-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <Zap className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">{attempt.quizzes?.title}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{new Date(attempt.completed_at).toLocaleDateString()} — Quiz Attempt</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">{Math.round(attempt.percentage)}%</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Score</p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-6">
                        <p className="text-xs text-slate-400">No recent activities found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Scorecard & Distribution */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
              <div className="p-8 bg-emerald-600 rounded-[2.5rem] shadow-xl shadow-emerald-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-500" />
                <div className="relative z-10 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-6">Current Standing</p>
                  <div className="mb-8">
                    <h3 className="text-4xl font-black mb-2">Alpha</h3>
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

              <div className="p-8 bg-white border border-slate-100/80 rounded-[2.5rem] shadow-sm flex-1">
                <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" /> Focus Distribution
                </h3>
                <div className="space-y-6">
                  {loading ? (
                    [1, 2, 3, 4].map(i => (
                      <div key={i} className="space-y-2 animate-pulse">
                        <div className="flex justify-between">
                          <div className="h-2 w-16 bg-slate-100 rounded" />
                          <div className="h-2 w-8 bg-slate-100 rounded" />
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full" />
                      </div>
                    ))
                  ) : (
                    analytics?.focusDistribution && analytics.focusDistribution.length > 0 ? (
                      analytics.focusDistribution.map((course, i) => (
                        <div key={i} className="space-y-2 group">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">{course.code}</span>
                            <span className="text-[10px] font-black text-slate-400">{course.percentage}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
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
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No course data yet</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Recommended Course Library Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-800">Active Course Library</h2>
              </div>
              <Link href="/dashboard/courses" className="text-xs font-bold text-emerald-600 hover:underline">
                View All Courses
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course, idx) => {
                const material = materials.find(m => m.course_id === course.id);
                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + idx * 0.05 }}
                    className="p-6 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" style={{ color: course.color }}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{course.code}</p>
                    <h3 className="text-base font-bold text-slate-800 mb-4 line-clamp-2 h-12 leading-snug">
                      {course.title}
                    </h3>
                    <Link href={material ? `/materials/${material.id}` : `/dashboard/courses/${course.id}`}>
                      <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2">
                        {material ? 'Open Workspace' : 'Read Document'} <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
