'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, BookOpen, Layers, HelpCircle, X } from 'lucide-react'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<{
    courses: any[]
    topics: any[]
    questions: any[]
  }>({ courses: [], topics: [], questions: [] })
  const [loading, setLoading] = useState(false)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounce: update debouncedQuery 300ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Fetch results only when debouncedQuery actually settles
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults({ courses: [], topics: [], questions: [] })
      setLoading(false)
      return
    }

    let cancelled = false
    const fetchResults = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setResults(data)
        }
      } catch (err) {
        if (!cancelled) console.error('Search failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchResults()
    return () => { cancelled = true }
  }, [debouncedQuery])

  const handleSelectCourse = (courseId: string) => {
    setIsOpen(false)
    setQuery('')
    router.push(`/dashboard/courses/${courseId}`)
  }

  const handleSelectTopic = (courseId: string) => {
    setIsOpen(false)
    setQuery('')
    router.push(`/dashboard/courses/${courseId}`)
  }

  const hasResults = results.courses.length > 0 || results.topics.length > 0 || results.questions.length > 0

  return (
    <div ref={searchRef} className="relative flex items-center group w-full md:w-80 z-40">
      <Search className="w-4 h-4 absolute left-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-emerald-500 group-focus-within:scale-110 transition-all duration-300 stroke-[1.8]" />
      <input
        type="text"
        placeholder="Search courses, topics, questions..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        className="pl-11 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-xl text-sm focus:border-emerald-500 outline-none w-full transition-all shadow-sm focus:shadow-emerald-500/5 focus:shadow-md placeholder:text-slate-400 dark:placeholder:text-zinc-500"
      />
      {query && (
        <button 
          onClick={() => {
            setQuery('')
            setResults({ courses: [], topics: [], questions: [] })
          }}
          className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Results Dropdown Overlay */}
      {isOpen && (query.length >= 2 || loading) && (
        <div className="absolute top-13 left-0 w-full bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden max-h-96 overflow-y-auto backdrop-blur-md transition-all duration-200">
          {loading ? (
            <div className="flex items-center justify-center p-6 gap-2">
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Searching databases...</span>
            </div>
          ) : !hasResults ? (
            <div className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500">
              No matches found for <span className="font-semibold text-slate-600 dark:text-zinc-400">"{query}"</span>
            </div>
          ) : (
            <div className="p-2 space-y-3">
              {/* Courses Category */}
              {results.courses.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Courses
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => handleSelectCourse(course.id)}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 flex items-center justify-between text-sm transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="px-2 py-0.5 rounded-md text-[10px] font-black"
                            style={{ backgroundColor: `${course.color}15`, color: course.color }}
                          >
                            {course.code}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-zinc-200 line-clamp-1">{course.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics Category */}
              {results.topics.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Topics & Concepts
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleSelectTopic(topic.courses?.id)}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 flex flex-col gap-0.5 text-sm transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-slate-700 dark:text-zinc-200 line-clamp-1">{topic.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                          {topic.courses?.code} • {topic.courses?.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions Category */}
              {results.questions.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Matched Questions
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.questions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleSelectCourse(q.courses?.id)}
                        className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 flex flex-col gap-1 text-xs transition-colors cursor-pointer"
                      >
                        <span className="font-medium text-slate-600 dark:text-zinc-300 line-clamp-2 italic">"{q.content}"</span>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-1.5">
                          <span>{q.courses?.code}</span>
                          <span>•</span>
                          <span className="text-emerald-500 dark:text-emerald-400">{q.difficulty}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
