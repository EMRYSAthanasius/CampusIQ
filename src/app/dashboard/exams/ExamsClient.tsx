'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  Clock, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Send,
  Trophy,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/types/database'
import { formatCourseTitle } from '@/lib/utils'


type Stage = 'SELECT_COURSE' | 'LOADING' | 'ACTIVE_QUIZ' | 'RESULTS'

interface Question {
  id: string
  question_text: string
  options: string[]
  correct_answer: string
}

export default function ExamsClient({ courses, user }: { courses: Course[], user: any }) {
  const [stage, setStage] = useState<Stage>('SELECT_COURSE')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(1200) // 20 minutes
  const [score, setScore] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [quizId, setQuizId] = useState<string | null>(null)

  const supabase = createClient()

  const filteredCourses = courses.filter(c => {
    return c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Start Quiz
  const startQuiz = async (course: Course) => {
    setSelectedCourse(course)
    setStage('LOADING')
    
    try {
      const res = await fetch(`/api/quiz/fetch?courseCode=${course.code}`)
      const data = await res.json()
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
        if (data.quizId) setQuizId(data.quizId)
        setStage('ACTIVE_QUIZ')
        setTimeLeft(1200)
        setCurrentIndex(0)
        setAnswers({})
      } else {
        alert(data.error || 'No questions found for this course yet.')
        setStage('SELECT_COURSE')
      }
    } catch (err) {
      console.error(err)
      setStage('SELECT_COURSE')
    }
  }

  // Timer logic
  useEffect(() => {
    if (stage !== 'ACTIVE_QUIZ') return

    if (timeLeft <= 0) {
      submitQuiz()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [stage, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const submitQuiz = useCallback(async () => {
    let correctCount = 0
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correct_answer) {
        correctCount++
      }
    })
    
    const percentage = Math.round((correctCount / questions.length) * 100)
    setScore(percentage)
    setStage('RESULTS')

    // Save attempt to Supabase
    if (selectedCourse && quizId) {
      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_id: quizId,
        score: correctCount,
        total_questions: questions.length,
        status: 'completed',
        completed_at: new Date().toISOString()
      })

      const durationSeconds = 1200 - timeLeft
      await supabase.from('study_sessions').insert({
        user_id: user.id,
        duration_seconds: durationSeconds,
        started_at: new Date(Date.now() - durationSeconds * 1000).toISOString(),
        ended_at: new Date().toISOString()
      })
    }
  }, [questions, answers, selectedCourse, quizId, timeLeft, user.id])

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        
        {/* STAGE 1: Course Selection */}
        {stage === 'SELECT_COURSE' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100">Choose Your Subject</h2>
              <p className="text-slate-500 dark:text-zinc-400">Select a course to start a simulated CBT session.</p>
            </div>

            <div className="max-w-md mx-auto relative flex items-center group">
              <Search className="w-5 h-5 absolute left-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                placeholder="Search course code or title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-sm focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-800 dark:text-zinc-100 outline-none transition-all shadow-sm focus:shadow-md"
              />
            </div>

            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                <div 
                  key={course.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-sm rounded-[2rem] p-8 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-450 font-bold group-hover:scale-110 transition-transform">
                    {course.code.slice(0, 3)}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-2">
                    {formatCourseTitle(course.code, course.title)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-8 line-clamp-2">{course.description}</p>
                  
                  <button 
                    onClick={() => startQuiz(course)}
                    className="w-full py-4 bg-slate-900 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 group/btn cursor-pointer"
                  >
                    Start Mock CBT <Zap className="w-4 h-4 group-hover/btn:fill-current" />
                  </button>
                </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-16 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-[3rem] border border-dashed border-slate-200 dark:border-zinc-800">
                <Search className="w-12 h-12 text-slate-200 dark:text-zinc-800 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400 dark:text-zinc-500">No courses found</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">Try a different search term.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* LOADING STAGE */}
        {stage === 'LOADING' && (
          <motion.div 
            key="loading"
            className="flex flex-col items-center justify-center py-40 space-y-6"
          >
            <RefreshCcw className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-slate-500 dark:text-zinc-400 font-bold tracking-widest uppercase text-xs">Generating Randomized Exam Pool...</p>
          </motion.div>
        )}

        {/* STAGE 2: Active Quiz */}
        {stage === 'ACTIVE_QUIZ' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Header: Timer & Progress */}
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-4 z-30 p-4 md:p-6 rounded-[2rem] border border-slate-100 dark:border-zinc-800/80 shadow-xl flex flex-wrap items-center justify-between gap-4 md:gap-0">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm ${timeLeft < 300 ? 'bg-red-50 dark:bg-red-950/30 text-red-655 dark:text-red-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200'}`}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeLeft)}
                </div>
                <div className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                  Question {currentIndex + 1} of {questions.length}
                </div>
              </div>
              
              <button 
                onClick={() => { if(confirm('Are you sure you want to submit?')) submitQuiz() }}
                className="px-4 py-2 md:px-6 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-200 dark:shadow-none uppercase tracking-wider cursor-pointer"
              >
                Submit Exam
              </button>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800/80 p-5 md:p-10 shadow-sm min-h-[400px] flex flex-col justify-between">
              <div className="space-y-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                  {questions[currentIndex].question_text}
                </h3>

                <div className="space-y-3">
                  {questions[currentIndex].options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx)
                    const isSelected = answers[currentIndex] === letter
                    return (
                      <button
                        key={idx}
                        onClick={() => setAnswers(prev => ({ ...prev, [currentIndex]: letter }))}
                        className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center gap-4 group cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900/35 text-emerald-800 dark:text-emerald-300' 
                            : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:border-emerald-100 hover:bg-slate-50 dark:hover:bg-zinc-850'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 group-hover:bg-emerald-100'}`}>
                          {letter}
                        </div>
                        <span className="font-medium">{opt}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center mt-10 pt-8 border-t border-slate-50 dark:border-zinc-800/50">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {questions.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-emerald-500' : 'w-1.5 bg-slate-100 dark:bg-zinc-800'}`} 
                    />
                  ))}
                </div>
                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-20" />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* STAGE 3: Results */}
        {stage === 'RESULTS' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center space-y-10 py-10"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-slate-100 dark:border-zinc-800/80 p-6 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
              
              <div className="w-24 h-24 bg-emerald-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Trophy className="w-12 h-12 text-emerald-500" />
              </div>

              <div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-zinc-100 mb-2">Exam Completed!</h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Your performance has been logged to your dashboard metrics.</p>
              </div>

              <div className="py-10 border-y border-slate-50 dark:border-zinc-800/50 flex justify-center gap-10 md:gap-20">
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-zinc-450 uppercase tracking-widest mb-1">Score</p>
                  <p className="text-5xl font-black text-slate-900 dark:text-zinc-100">{score}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-550 dark:text-zinc-450 uppercase tracking-widest mb-1">Status</p>
                  <p className={`text-5xl font-black ${score >= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {score >= 50 ? 'PASS' : 'FAIL'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => startQuiz(selectedCourse!)}
                  className="py-4 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCcw className="w-4 h-4" /> Retake Mock
                </button>
                <button 
                  onClick={() => setStage('SELECT_COURSE')}
                  className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-100 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  Other Courses <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
