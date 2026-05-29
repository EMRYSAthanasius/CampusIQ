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
import { useRouter } from 'next/navigation'
import type { Course, Profile } from '@/types/database'
import { formatCourseTitle } from '@/lib/utils'


interface CoursesClientProps {
  profile: Profile | null
  courses: Course[]
  quizCountMap: Record<string, number>
  questionCountMap: Record<string, number>
  materialCountMap: Record<string, number>
  courseToMaterialMap?: Record<string, string>
}

const FACULTY_FILTERS = ['All', 'Science', 'General']

export default function CoursesClient({ 
  profile, 
  courses, 
  quizCountMap, 
  questionCountMap,
  materialCountMap,
  courseToMaterialMap = {}
}: CoursesClientProps) {
  const router = useRouter()
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

  const handleRandomCourse = () => {
    if (courses.length === 0) return
    const randomIdx = Math.floor(Math.random() * courses.length)
    const randomCourse = courses[randomIdx]
    const targetMaterialId = courseToMaterialMap[randomCourse.id]
    const targetHref = targetMaterialId ? `/materials/${targetMaterialId}` : `/dashboard/courses/${randomCourse.id}`
    router.push(targetHref)
  }

  const filtered = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase())
    const matchFaculty = facultyFilter === 'All' || c.faculty === facultyFilter
    return matchSearch && matchFaculty
  })

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-28 md:pr-8 md:pt-8 flex flex-col relative">
        {/* Top Header */}
        <header className="h-24 px-4 md:px-8 flex items-center justify-between shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-20 border-b border-slate-100/50 dark:border-zinc-800/50">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              Course Library <span className="text-emerald-500 font-medium">/ Catalog</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-widest mt-1">
              {courses.length} courses available • Level 100
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleRandomCourse}
              title="AI Smart Revision Suggestion"
              className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-xl text-slate-400 dark:text-zinc-400 hover:text-emerald-600 hover:border-emerald-100 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-emerald-500/5 group"
            >
              <Sparkles className="w-5 h-5 text-emerald-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 stroke-[1.8] animate-pulse" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-10 custom-scrollbar scroll-smooth">
          <div className="max-w-[1400px] mx-auto space-y-10">
            
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/30 rounded-xl shrink-0 text-emerald-650 dark:text-emerald-400 shadow-sm flex items-center justify-center">
                  <Filter className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="flex items-center gap-2">
                  {FACULTY_FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setFacultyFilter(f)}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                        facultyFilter === f
                          ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-lg shadow-slate-200 dark:shadow-none'
                          : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-100 dark:border-zinc-800/80 hover:border-emerald-200 hover:text-emerald-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex items-center group w-full md:w-[350px]">
                <Search className="w-5 h-5 absolute left-4 text-slate-400 group-focus-within:text-emerald-500 group-focus-within:scale-110 transition-all duration-300 stroke-[1.8]" />
                <input
                  type="text"
                  placeholder="Search catalog by code, title..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-sm focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-800 dark:text-zinc-100 outline-none transition-all shadow-sm focus:shadow-emerald-500/5 focus:shadow-md"
                />
              </div>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((course, i) => {
                const materialCount = materialCountMap[course.id] || 0
                const progress = analytics?.focusDistribution?.find((f: any) => f.code === course.code)?.percentage || 0
                const targetMaterialId = courseToMaterialMap[course.id]
                const targetHref = targetMaterialId ? `/materials/${targetMaterialId}` : `/dashboard/courses/${course.id}`

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative"
                  >
                    <Link href={targetHref} className="block">
                      <div className="group bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-100 dark:border-zinc-800/80 p-7 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between min-h-[240px] relative overflow-hidden">
                        
                        {/* Background Accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-500" />

                        <div>
                          <div className="flex justify-between items-start">
                            <span className="bg-emerald-50 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-3 py-1.5 rounded-lg max-w-max uppercase tracking-wider">
                              {course.faculty || 'Core'}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mt-5 group-hover:text-emerald-600 transition-colors leading-tight">
                            {formatCourseTitle(course.code, course.title)}
                          </h3>
                        </div>

                        <div className="mt-6 space-y-4">
                          {/* Micro Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                              <span className="text-slate-400 dark:text-zinc-400">Course Progress</span>
                              <span className="text-emerald-600 dark:text-emerald-400">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-emerald-500 rounded-full" 
                              />
                            </div>
                          </div>

                          <div className="w-full text-center bg-slate-50 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:text-emerald-700 border border-slate-200/80 dark:border-zinc-700/80 font-bold text-xs py-3.5 rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2">
                            View Course Workspace <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-24 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-[3rem] border border-dashed border-slate-200 dark:border-zinc-800">
                <BookOpen className="w-16 h-16 text-slate-200 dark:text-zinc-800 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400 dark:text-zinc-500">No courses matching your search</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">Try broad terms or clear your filters to find more.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
