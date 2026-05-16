'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  BookOpen, 
  FileText, 
  HelpCircle, 
  ChevronRight, 
  Filter, 
  ArrowUpRight,
  Database,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import type { Course, Profile } from '@/types/database'

interface CoursesClientProps {
  profile: Profile | null
  courses: Course[]
  quizCountMap: Record<string, number>
  questionCountMap: Record<string, number>
  materialCountMap: Record<string, number>
}

const FACULTY_FILTERS = ['All', 'Science', 'General']

export default function CoursesClient({ 
  profile, 
  courses, 
  quizCountMap, 
  questionCountMap,
  materialCountMap 
}: CoursesClientProps) {
  const [search, setSearch] = useState('')
  const [facultyFilter, setFacultyFilter] = useState('All')
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/user/analytics')
        const data = await res.json()
        if (data && !data.error) setAnalytics(data)
      } catch (err) {}
    }
    fetchAnalytics()
  }, [])

  const filtered = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase())
    const matchFaculty = facultyFilter === 'All' || c.faculty === facultyFilter
    return matchSearch && matchFaculty
  })

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 font-sans">
      <Sidebar profile={profile} />

      <main className="flex-1 lg:pl-20 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-24 px-8 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md z-20 border-b border-slate-100/50">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Course Library <span className="text-emerald-500 font-medium">/ Catalog</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">
              {courses.length} courses available • Level 100-400
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:flex items-center group">
              <Search className="w-4 h-4 absolute left-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-slate-100/50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-emerald-100 outline-none w-64 transition-all"
              />
            </div>
            <button className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all">
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar scroll-smooth">
          <div className="max-w-[1400px] mx-auto space-y-10">
            
            {/* Filter Section */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Filter className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-center gap-2">
                {FACULTY_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFacultyFilter(f)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      facultyFilter === f
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200'
                        : 'bg-white text-slate-500 border-slate-100 hover:border-emerald-200 hover:text-emerald-600'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((course, i) => {
                const materialCount = materialCountMap[course.id] || 0
                const progress = analytics?.focusDistribution?.find((f: any) => f.code === course.code)?.percentage || 0

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative"
                  >
                    <Link href={`/materials/${course.id}`} className="block">
                      <div className="group bg-white/80 backdrop-blur-md rounded-[2rem] border border-slate-100 p-7 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between min-h-[240px] relative overflow-hidden">
                        
                        {/* Background Accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-500" />

                        <div>
                          <div className="flex justify-between items-start">
                            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1.5 rounded-lg max-w-max uppercase tracking-wider">
                              {course.faculty || 'Core'}
                            </span>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Database className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">{materialCount} Manuals</span>
                            </div>
                          </div>

                          <h3 className="text-xl font-bold text-slate-900 mt-5 group-hover:text-emerald-600 transition-colors leading-tight">
                            {course.code}: {course.title}
                          </h3>
                        </div>

                        <div className="mt-6 space-y-4">
                          {/* Micro Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                              <span className="text-slate-400">Course Progress</span>
                              <span className="text-emerald-600">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-emerald-500 rounded-full" 
                              />
                            </div>
                          </div>

                          <div className="w-full text-center bg-slate-900 group-hover:bg-emerald-600 text-white font-bold text-xs py-3.5 rounded-2xl transition-all duration-200 shadow-sm shadow-slate-900/10 group-hover:shadow-lg group-hover:shadow-emerald-500/20 flex items-center justify-center gap-2">
                            View Course Workspace <ArrowUpRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-24 bg-white/50 backdrop-blur-sm rounded-[3rem] border border-dashed border-slate-200">
                <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400">No courses matching your search</h3>
                <p className="text-sm text-slate-500 mt-2">Try broad terms or clear your filters to find more.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
