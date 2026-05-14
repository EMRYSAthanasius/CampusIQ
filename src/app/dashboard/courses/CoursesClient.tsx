'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, BookOpen, FileText, HelpCircle, ChevronRight, Filter } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import type { Course, Profile } from '@/types/database'

interface CoursesClientProps {
  profile: Profile | null
  courses: Course[]
  quizCountMap: Record<string, number>
  questionCountMap: Record<string, number>
}

const FACULTY_FILTERS = ['All', 'Science', 'General']

const COLOR_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  '#6366f1': { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/20', dot: 'bg-indigo-400' },
  '#8b5cf6': { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/20', dot: 'bg-violet-400' },
  '#3b82f6': { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  '#0ea5e9': { bg: 'bg-sky-500/10', text: 'text-sky-300', border: 'border-sky-500/20', dot: 'bg-sky-400' },
  '#10b981': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  '#14b8a6': { bg: 'bg-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/20', dot: 'bg-teal-400' },
  '#22c55e': { bg: 'bg-green-500/10', text: 'text-green-300', border: 'border-green-500/20', dot: 'bg-green-400' },
  '#84cc16': { bg: 'bg-lime-500/10', text: 'text-lime-300', border: 'border-lime-500/20', dot: 'bg-lime-400' },
  '#f59e0b': { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  '#ef4444': { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/20', dot: 'bg-red-400' },
  '#f97316': { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  '#ec4899': { bg: 'bg-pink-500/10', text: 'text-pink-300', border: 'border-pink-500/20', dot: 'bg-pink-400' },
  '#a855f7': { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/20', dot: 'bg-purple-400' },
  '#06b6d4': { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
}

function getStyle(color: string) {
  return COLOR_STYLES[color] || COLOR_STYLES['#6366f1']
}

export default function CoursesClient({ profile, courses, quizCountMap, questionCountMap }: CoursesClientProps) {
  const [search, setSearch] = useState('')
  const [facultyFilter, setFacultyFilter] = useState('All')

  const filtered = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase())
    const matchFaculty = facultyFilter === 'All' || c.faculty === facultyFilter
    return matchSearch && matchFaculty
  })

  return (
    <div className="flex min-h-screen bg-[#F3FAF6] text-[#6B7280]">
      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 px-8 flex items-center justify-between border-b border-white/[0.04] shrink-0">
          <div>
            <h1 className="text-2xl font-semibold text-[#1B4332]">Course Library</h1>
            <p className="text-xs text-[#9CA3AF] mt-0.5 uppercase tracking-wide font-medium">
              {courses.length} courses available — All Levels
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-[1400px] mx-auto">

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by course code, title, or description..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-[#1B4332]/[0.08] rounded-xl text-sm text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#2E8B57]/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500 shrink-0" />
                {FACULTY_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFacultyFilter(f)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      facultyFilter === f
                        ? 'bg-[#2E8B57]/15 text-[#2E8B57] border border-[#2E8B57]/30'
                        : 'bg-white/60 text-[#6B7280] border border-[#1B4332]/[0.06] hover:border-[#1B4332]/[0.12] hover:text-[#1B4332]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count */}
            <p className="text-xs text-[#9CA3AF] mb-5 font-medium">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
            </p>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((course, i) => {
                const style = getStyle(course.color)
                const quizCount = quizCountMap[course.id] || 0
                const questionCount = questionCountMap[course.id] || 0

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                  >
                    <Link href={`/dashboard/courses/${course.id}`}>
                      <div className={`group h-full p-6 rounded-2xl ${style.bg} border ${style.border} hover:border-opacity-50 hover:scale-[1.01] transition-all duration-200 cursor-pointer flex flex-col`}>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-5">
                          <span className={`text-xs font-bold tracking-widest uppercase bg-black/20 px-2.5 py-1 rounded-lg ${style.text}`}>
                            {course.code}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium ${style.text} opacity-70 uppercase tracking-wider`}>
                              {course.faculty}
                            </span>
                          </div>
                        </div>

                        {/* Title and description */}
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-[#1B4332] mb-2 group-hover:opacity-90 leading-snug">
                            {course.title}
                          </h3>
                          <p className="text-xs text-[#9CA3AF] font-light leading-relaxed line-clamp-2">
                            {course.description}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="mt-5 pt-4 border-t border-[#1B4332]/[0.06] grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <FileText className={`w-3 h-3 ${style.text}`} />
                              <span className="text-sm font-semibold text-[#1B4332]">{quizCount}</span>
                            </div>
                            <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Quizzes</span>
                          </div>
                          <div className="text-center border-x border-[#1B4332]/[0.06]">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <HelpCircle className={`w-3 h-3 ${style.text}`} />
                              <span className="text-sm font-semibold text-white">{questionCount}</span>
                            </div>
                            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Questions</span>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <BookOpen className={`w-3 h-3 ${style.text}`} />
                              <span className="text-sm font-semibold text-white">{course.units}</span>
                            </div>
                            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Units</span>
                          </div>
                        </div>

                        {/* CTA */}
                        <div className={`mt-4 flex items-center justify-between ${style.text} text-xs font-semibold`}>
                          <span>View Course</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <BookOpen className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#6B7280] mb-2">No courses found</h3>
                <p className="text-sm text-[#9CA3AF]">Try adjusting your search or filter.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
