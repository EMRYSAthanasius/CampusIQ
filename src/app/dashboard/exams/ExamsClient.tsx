'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  Clock, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Trophy,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Lock,
  Eye,
  BarChart,
  Sparkles,
  Target,
  BrainCircuit,
  X,
  Home
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
  explanation?: string | null
}

export default function ExamsClient({ courses, user }: { courses: Course[], user: any }) {
  const [stage, setStage] = useState<Stage>('SELECT_COURSE')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(1200) // 20 minutes
  const [totalTime, setTotalTime] = useState(1200)
  const [loadingCourseCode, setLoadingCourseCode] = useState<string | null>(null)
  
  // Results State
  const [score, setScore] = useState(0)
  const [examStats, setExamStats] = useState({ correct: 0, wrong: 0, skipped: 0, timeSpent: 0, pacing: 0 })
  const [topics, setTopics] = useState<{name: string, score: number}[]>([])
  const [showMistakes, setShowMistakes] = useState(false)
  
  // Review State
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null)
  const [aiExplanation, setAiExplanation] = useState<any>(null)
  const [isExplaining, setIsExplaining] = useState(false)

  // Custom overlays/modals instead of browser alerts/confirms
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [showNoQuestionsModal, setShowNoQuestionsModal] = useState(false)
  const [noQuestionsMessage, setNoQuestionsMessage] = useState('')
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [quizId, setQuizId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const classifyQuestion = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes('calculate') || lower.includes('compute') || lower.includes('determine') || lower.includes('solve') || lower.includes('value of') || lower.includes('formula') || lower.includes('equation') || lower.includes('find the') || lower.includes('using')) {
      return 'Application & Calculation'
    }
    if (lower.includes('explain') || lower.includes('why') || lower.includes('how') || lower.includes('describe') || lower.includes('concept') || lower.includes('theory') || lower.includes('relationship') || lower.includes('difference') || lower.includes('principle')) {
      return 'Conceptual Understanding'
    }
    return 'Factual Recall & Knowledge'
  }

  const filteredCourses = courses.filter(c => {
    return c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  })

  const startQuiz = async (course: Course) => {
    setSelectedCourse(course)
    setLoadingCourseCode(course.code)
    
    try {
      const res = await fetch(`/api/generate-quiz?courseCode=${course.code}&t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned status ${res.status}`);
      }
      const data = await res.json()
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
        if (data.quizId) setQuizId(data.quizId)
        setStage('ACTIVE_QUIZ')
        const duration = data.durationSeconds || 1200
        setTotalTime(duration)
        setTimeLeft(duration)
        setCurrentIndex(0)
        setAnswers({})
        setShowMistakes(false)
      } else {
        setNoQuestionsMessage(data.error || 'No questions found for this course yet.')
        setShowNoQuestionsModal(true)
      }
    } catch (err: any) {
      console.error(err)
      setNoQuestionsMessage(err?.message || 'A network error occurred while loading CBT questions. Please try again.')
      setShowNoQuestionsModal(true)
    } finally {
      setLoadingCourseCode(null)
    }
  }

  const submitQuiz = useCallback(async (forced = false) => {
    let correct = 0
    let wrong = 0
    let skipped = 0
    
    questions.forEach((q, idx) => {
      const userAns = answers[idx]
      if (!userAns) skipped++
      else if (userAns === q.correct_answer) correct++
      else wrong++
    })
    
    const percentage = Math.round((correct / questions.length) * 100)
    const timeSpent = totalTime - timeLeft
    const pacing = Math.round(timeSpent / questions.length) // seconds per question

    // Calculate authentic topics based on rule classifier
    const categories = {
      'Factual Recall & Knowledge': { correct: 0, total: 0 },
      'Conceptual Understanding': { correct: 0, total: 0 },
      'Application & Calculation': { correct: 0, total: 0 }
    }

    questions.forEach((q, idx) => {
      const cat = classifyQuestion(q.question_text)
      categories[cat].total++
      if (answers[idx] === q.correct_answer) {
        categories[cat].correct++
      }
    })

    const calculatedTopics = Object.keys(categories).map(catName => {
      const cat = categories[catName as keyof typeof categories]
      return {
        name: catName,
        score: cat.total > 0 ? Math.round((cat.correct / cat.total) * 100) : 0
      }
    })

    setScore(percentage)
    setExamStats({ correct, wrong, skipped, timeSpent, pacing })
    setTopics(calculatedTopics)
    setStage('RESULTS')
    setShowMistakes(false)
    setSelectedReviewIndex(0) // Default selected review question

    // Save attempt to Supabase
    if (selectedCourse) {
      if (!quizId) {
        console.error('Failed to sync quiz results with database: quizId is null')
        setDbError('Unable to save attempt: Quiz identifier is missing. Please contact support.')
      } else {
        try {
          const { error: attemptErr } = await supabase.from('quiz_attempts').insert({
            user_id: user.id,
            quiz_id: quizId,
            score: correct,
            total_questions: questions.length,
            time_taken_seconds: timeSpent,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          if (attemptErr) throw attemptErr

          const { error: sessionErr } = await supabase.from('study_sessions').insert({
            user_id: user.id,
            duration_seconds: timeSpent,
            started_at: new Date(Date.now() - timeSpent * 1000).toISOString(),
            ended_at: new Date().toISOString()
          })
          if (sessionErr) throw sessionErr
        } catch (dbErr: any) {
          console.error('Failed to sync quiz results with database:', dbErr)
          setDbError(dbErr.message || 'Database connection error. Your session is saved locally.')
        }
      }
    }
  }, [questions, answers, selectedCourse, quizId, timeLeft, totalTime, user.id, supabase])

  // Timer logic
  useEffect(() => {
    if (stage !== 'ACTIVE_QUIZ') return

    if (timeLeft <= 0) {
      submitQuiz(true)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [stage, timeLeft, submitQuiz])

  // beforeunload protection
  useEffect(() => {
    if (stage !== 'ACTIVE_QUIZ') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave? Your quiz progress will be lost.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [stage])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Load AI Explanation
  const loadExplanation = async (idx: number) => {
    setSelectedReviewIndex(idx)
    setAiExplanation(null)

    const q = questions[idx]
    if (q.explanation) {
      setIsExplaining(false)
      return
    }

    setIsExplaining(true)
    try {
      const res = await fetch('/api/quiz/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question_text,
          options: q.options,
          correctAnswer: q.correct_answer,
          userAnswer: answers[idx]
        })
      })
      const data = await res.json()
      if (data.explanation) setAiExplanation(data.explanation)
      else setAiExplanation({ error: data.error || 'Failed to generate explanation.' })
    } catch(e) {
      setAiExplanation({ error: 'Error connecting to AI service.' })
    } finally {
      setIsExplaining(false)
    }
  }

  // Automatically load first explanation when entering review mode
  useEffect(() => {
    if (showMistakes && selectedReviewIndex === 0 && !aiExplanation && !isExplaining) {
      loadExplanation(0)
    }
  }, [showMistakes])

  // Score Ring Calculation
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

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
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-450 font-black text-xs uppercase tracking-widest shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    {course.code.slice(0, 3)}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-2">
                    {formatCourseTitle(course.code, course.title)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-8 line-clamp-2">{course.description}</p>
                  
                  <button 
                    onClick={() => !loadingCourseCode && startQuiz(course)}
                    disabled={!!loadingCourseCode}
                    className="w-full py-4 bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 group/btn cursor-pointer shadow-sm hover:shadow-md hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingCourseCode === course.code ? (
                      <>
                        Opening Questions... <RefreshCcw className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        Start Mock CBT <Zap className="w-4 h-4 group-hover/btn:fill-current" />
                      </>
                    )}
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

        {/* Bypassed Loading Stage */}

        {/* STAGE 2: Active Quiz */}
        {stage === 'ACTIVE_QUIZ' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto space-y-6 pb-20"
          >
            {/* Top Bar: Submit Button */}
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setShowSubmitConfirmModal(true)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-black rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-emerald-500/20 uppercase tracking-wider cursor-pointer"
              >
                Submit Exam
              </button>
            </div>

            {/* Centered Timer */}
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Remaining Time</p>
              <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-black text-2xl transition-all duration-300 ${timeLeft <= 300 ? 'text-red-500 animate-pulse' : 'text-slate-800 dark:text-zinc-100'}`}>
                {timeLeft <= 300 && <AlertCircle className="w-6 h-6 animate-bounce" />}
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-zinc-800/80 p-5 md:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none min-h-[350px] md:min-h-[400px] flex flex-col relative overflow-hidden">
              <div className="text-center mb-6">
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                  Question {currentIndex + 1} of {questions.length}
                </span>
              </div>
              
              <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-zinc-100 leading-tight text-center mb-8 px-4">
                {questions[currentIndex].question_text}
              </h3>

              <div className="w-16 h-1 bg-slate-100 dark:bg-zinc-800 mx-auto mb-5 md:mb-8 rounded-full" />

              <div className="space-y-4 flex-1">
                {(questions[currentIndex]?.options || []).map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx)
                  const isSelected = answers[currentIndex] === letter
                  return (
                    <button
                      key={idx}
                      onClick={() => setAnswers(prev => ({ ...prev, [currentIndex]: letter }))}
                      className={`w-full text-left p-4 md:p-5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50 dark:bg-[#1a1b1e] border-emerald-500 shadow-sm text-emerald-900 dark:text-emerald-400' 
                          : 'bg-slate-50 dark:bg-[#1a1b1e] border-transparent text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#25262b]'
                      }`}
                    >
                      <span className={`font-bold text-[15px] ${isSelected ? 'text-emerald-700 dark:text-emerald-500' : 'text-slate-500 dark:text-zinc-500'}`}>
                        {letter}.
                      </span>
                      <span className="font-medium text-[15px]">{opt}</span>
                    </button>
                  )
                })}
              </div>

              {/* Navigation Arrows */}
              <div className="flex justify-between items-center mt-6 md:mt-12 pt-4 md:pt-6">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 disabled:opacity-0 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" /> Previous
                </button>
                <button
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    currentIndex === questions.length - 1 
                      ? 'opacity-0' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md hover:shadow-emerald-500/20'
                  }`}
                >
                  Next <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bottom Number Bar Navigation (Wrapped) */}
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-zinc-800/80 shadow-sm flex flex-col items-center">
              <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                <BarChart className="w-4 h-4" /> {Object.keys(answers).length} / {questions.length} Answered
              </p>
              
              <div className="flex flex-wrap justify-center gap-3 w-full">
                {questions.map((_, i) => {
                  const isAnswered = !!answers[i]
                  const isActive = i === currentIndex
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-10 h-10 shrink-0 rounded-xl font-black text-sm transition-all border flex items-center justify-center cursor-pointer ${
                        isActive 
                          ? 'border-slate-900 dark:border-zinc-100 scale-110 z-10' 
                          : 'border-transparent hover:scale-105'
                      } ${
                        isAnswered 
                          ? 'bg-emerald-600 text-white border-transparent' 
                          : 'bg-slate-50 dark:bg-[#1a1b1e] text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>

          </motion.div>
        )}

        {/* STAGE 3: Real-Time Accuracy Dashboard */}
        {stage === 'RESULTS' && !showMistakes && (
          <motion.div
            key="results-dashboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-5xl mx-auto space-y-8 py-8"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100">Exam Analysis</h2>
              <p className="text-slate-500 dark:text-zinc-400">Real-time accuracy metrics and topic breakdown.</p>
            </div>

            {/* Database sync error visual banner */}
            {dbError && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 px-6 py-4 rounded-2xl flex items-center justify-between text-xs font-bold gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                  <span>{dbError}</span>
                </div>
                <button onClick={() => setDbError(null)} className="text-[10px] uppercase font-black tracking-widest hover:underline cursor-pointer">
                  Dismiss
                </button>
              </div>
            )}

            {/* Top Multi-Column Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Score Ring Card */}
              <div className="col-span-1 md:col-span-2 bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col md:flex-row items-center justify-center gap-10">
                <div className="relative flex items-center justify-center">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-zinc-800" />
                    <circle 
                      cx="96" 
                      cy="96" 
                      r={radius} 
                      stroke="currentColor" 
                      strokeWidth="12" 
                      fill="transparent" 
                      strokeDasharray={circumference} 
                      strokeDashoffset={strokeDashoffset} 
                      strokeLinecap="round"
                      className={`${score >= 50 ? 'text-emerald-500' : 'text-red-500'} transition-all duration-1000 ease-out`} 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-slate-900 dark:text-zinc-100">{examStats.correct}<span className="text-2xl text-slate-400">/{questions.length}</span></span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Correct</span>
                  </div>
                </div>
                
                <div className="text-center md:text-left space-y-2">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Final Grade</p>
                  <p className="text-6xl font-black text-slate-900 dark:text-zinc-100">{score}%</p>
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border ${score >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400'}`}>
                    {score >= 50 ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4" />}
                    {score >= 50 ? 'PASSED' : 'FAILED'}
                  </div>
                </div>
              </div>

              {/* Pacing Tracker (Contrast & dark mode white-on-white fix) */}
              <div className="bg-emerald-600 dark:bg-zinc-900 dark:border dark:border-zinc-800 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-emerald-500/20 flex flex-col items-center justify-center text-center text-white dark:text-zinc-100">
                <Clock className="w-12 h-12 mb-4 text-white dark:text-emerald-450 opacity-90" />
                <p className="text-5xl font-black mb-2">{examStats.pacing}s</p>
                <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Per Question</p>
                <div className="mt-6 w-full h-1 bg-white/20 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (examStats.pacing / 60) * 100)}%` }} />
                </div>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-2 text-center">Pacing Tracker</p>
              </div>
            </div>

            {/* Subject Weakness Breakdown */}
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 shadow-sm group">
              <h3 className="text-lg font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2.5 mb-6 group-hover:translate-x-0.5 transition-transform duration-300">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0 flex items-center justify-center">
                  <Target className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span>Subject Weakness Breakdown</span>
              </h3>
              
              <div className="space-y-6">
                {topics.map((topic, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span className="text-slate-700 dark:text-zinc-300">{topic.name}</span>
                      <span className={topic.score >= 50 ? 'text-emerald-500' : 'text-red-500'}>{topic.score}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${topic.score}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: i * 0.2 }}
                        className={`h-full rounded-full ${topic.score >= 50 ? 'bg-emerald-400' : 'bg-rose-400'}`} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <button 
                onClick={() => setStage('SELECT_COURSE')} 
                className="flex-1 py-3.5 md:py-4 px-4 md:px-6 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-[1.5rem] font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow-md group"
              >
                 <Home className="w-5 h-5 stroke-[1.8] transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" /> Home Dashboard
              </button>
              
              <button 
                onClick={() => {
                  const isPremium = user?.subscription_status === 'pro' || user?.subscription_status === 'ultra';
                  if (isPremium) {
                    setShowMistakes(true)
                  } else {
                    setShowPremiumModal(true)
                  }
                }} 
                className="flex-[2] py-3.5 md:py-4 px-4 md:px-6 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-[1.5rem] font-bold flex items-center justify-center gap-3 transition-all cursor-pointer group shadow-sm hover:shadow-md hover:shadow-emerald-500/20"
              >
                {user?.subscription_status !== 'pro' && user?.subscription_status !== 'ultra' && <Lock className="w-5 h-5 stroke-[1.8] transition-transform duration-300 group-hover:-translate-y-0.5" />}
                <span className="group-hover:translate-x-0.5 transition-transform duration-300">Check Mistakes</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STAGE 4: Premium AI Question Navigation Grid */}
        {stage === 'RESULTS' && showMistakes && selectedReviewIndex !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="max-w-6xl mx-auto py-6"
          >
            <div className="flex flex-col lg:flex-row gap-8">
              
              {/* Sidebar: Navigation Grid */}
              <div className="w-full lg:w-80 shrink-0 space-y-6">
                <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 dark:border-zinc-800/80 shadow-sm sticky top-4">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-[11px] font-black tracking-widest uppercase mb-1">Premium Analysis</p>
                    </div>
                    <button 
                      onClick={() => setShowMistakes(false)} 
                      className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <XCircle className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {questions.map((q, idx) => {
                      const isCorrect = answers[idx] === q.correct_answer
                      const isActive = idx === selectedReviewIndex
                      return (
                        <button
                          key={idx}
                          onClick={() => loadExplanation(idx)}
                          className={`w-12 h-12 shrink-0 rounded-full font-bold text-sm transition-all flex items-center justify-center cursor-pointer ${
                            isActive ? 'ring-1 ring-slate-900 dark:ring-white scale-110 z-10' : 'hover:scale-105'
                          } ${
                            isCorrect 
                              ? 'bg-slate-50 dark:bg-[#1a1b1e] text-emerald-600 dark:text-emerald-500' 
                              : 'bg-slate-50 dark:bg-[#1a1b1e] text-rose-600 dark:text-rose-500'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Main Content: Question & AI Explanation */}
              <div className="flex-1 space-y-6">
                
                {/* Question Viewer */}
                <div className="bg-white dark:bg-[#121315] p-5 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${answers[selectedReviewIndex] === questions[selectedReviewIndex].correct_answer ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 md:mb-4 block mt-1">Question {selectedReviewIndex + 1}</span>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-zinc-100 leading-snug mb-6 md:mb-8">
                    {questions[selectedReviewIndex].question_text}
                  </h3>

                  <div className="space-y-3 md:space-y-4">
                    {questions[selectedReviewIndex].options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx)
                      const isUserChoice = answers[selectedReviewIndex] === letter
                      const isActualCorrect = questions[selectedReviewIndex].correct_answer === letter

                      let style = 'bg-slate-50 dark:bg-[#1a1b1e] border-transparent text-slate-500 dark:text-slate-400'

                      if (isActualCorrect) {
                        style = 'bg-white dark:bg-[#1a1b1e] border-emerald-500 dark:border-emerald-500 text-slate-800 dark:text-zinc-200'
                      } else if (isUserChoice && !isActualCorrect) {
                        style = 'bg-white dark:bg-[#1a1b1e] border-rose-500 dark:border-rose-500 text-slate-800 dark:text-zinc-200'
                      }

                      const explanationText = aiExplanation && !aiExplanation.error ? aiExplanation[letter] : null
                      let prefix = null;
                      let mainText = explanationText;
                      if (explanationText?.startsWith('Right answer. ')) {
                        prefix = <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-bold mb-2"><CheckCircle2 className="w-4 h-4" /> Right answer</div>;
                        mainText = explanationText.substring('Right answer. '.length);
                      } else if (explanationText?.startsWith('Not quite. ')) {
                        prefix = <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 font-bold mb-2"><X className="w-4 h-4" /> Not quite</div>;
                        mainText = explanationText.substring('Not quite. '.length);
                      }

                      return (
                        <div key={optIdx} className={`rounded-[1.25rem] md:rounded-xl border flex flex-col overflow-hidden transition-all ${style}`}>
                           <div className="p-4 md:p-5 flex items-start gap-3">
                             <span className="text-sm md:text-[15px] font-bold">{letter}.</span>
                             <span className="flex-1 text-sm md:text-[15px]">{opt}</span>
                           </div>
                           {mainText && (
                             <div className="px-5 md:px-12 pb-5 pt-0 text-sm leading-relaxed">
                               {prefix}
                               <div className="text-slate-500 dark:text-slate-400">{mainText}</div>
                             </div>
                           )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Instant Cached Explanation */}
                  {questions[selectedReviewIndex]?.explanation && (
                    <div className="mt-8 p-6 md:p-8 bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-100/40 dark:border-emerald-900/10 rounded-[2rem] text-sm">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-450 font-black mb-3">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                        <span className="uppercase tracking-wider text-[11px] font-black">Explanation</span>
                      </div>
                      <div className="text-slate-600 dark:text-zinc-350 leading-relaxed font-semibold">
                        {questions[selectedReviewIndex].explanation}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Explanation Status */}
                {isExplaining && (
                  <div className="mt-8 flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold animate-pulse py-5 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/40 shadow-inner">
                    <Sparkles className="w-5 h-5 animate-spin" /> Generating inline AI breakdown...
                  </div>
                )}
                
                {aiExplanation?.error && (
                  <div className="mt-8 p-6 text-red-600 bg-red-50 dark:bg-red-950/20 rounded-[2rem] border border-red-100 dark:border-red-900/40 text-center font-bold flex flex-col items-center justify-center gap-2">
                    <XCircle className="w-6 h-6" /> 
                    <span>{aiExplanation.error}</span>
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="mt-6 flex items-center justify-between gap-4">
                  <button
                    onClick={() => selectedReviewIndex !== null && selectedReviewIndex > 0 && loadExplanation(selectedReviewIndex - 1)}
                    disabled={selectedReviewIndex === 0}
                    className="flex-1 py-3.5 md:py-4 px-4 md:px-6 bg-slate-100 dark:bg-[#1a1b1e] text-slate-600 dark:text-zinc-400 border border-transparent dark:border-zinc-800 rounded-[1rem] font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" /> <span className="hidden sm:inline">Previous</span>
                  </button>
                  <button
                    onClick={() => selectedReviewIndex !== null && selectedReviewIndex < questions.length - 1 && loadExplanation(selectedReviewIndex + 1)}
                    disabled={selectedReviewIndex === questions.length - 1}
                    className="flex-1 py-3.5 md:py-4 px-4 md:px-6 bg-emerald-600 text-white rounded-[1rem] font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <span className="hidden sm:inline">Next Question</span> <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Sleek Custom Modals */}
      <AnimatePresence>
        {/* Modal 1: Submit Confirmation Modal */}
        {showSubmitConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-[2rem] p-8 max-w-md w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 relative mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-amber-500/20 dark:bg-amber-500/10 rounded-2xl rotate-3 blur-md transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] backdrop-blur-xl border border-white/30 dark:border-white/10 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }} />
                  <svg className="w-9 h-9 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] z-10 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-zinc-100">Submit Exam Session?</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Are you sure you want to end your simulated CBT session now? We will save your attempt and calculate your grade immediately.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowSubmitConfirmModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSubmitConfirmModal(false)
                    submitQuiz(false)
                  }}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Yes, Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 2: Premium Upgrade Modal */}
        {showPremiumModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-[2rem] p-8 max-w-md w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 relative mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-2xl -rotate-3 blur-md transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-xl border border-white/30 dark:border-white/10 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }} />
                  <svg className="w-9 h-9 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] z-10 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-zinc-100">Premium Feature Locked</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                  The AI-Powered CBT Mistakes Grid is reserved for Pro and Ultra subscribers. Level up your revision with custom explanations and predictive analytics!
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowPremiumModal(false)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Explore Upgrade Options
                </button>
                <button
                  onClick={() => setShowPremiumModal(false)}
                  className="w-full py-3 bg-transparent text-slate-400 dark:text-zinc-500 text-xs font-bold hover:underline cursor-pointer"
                >
                  Close Notice
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 3: No Questions Found Modal */}
        {showNoQuestionsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-[2rem] p-8 max-w-md w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 relative mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-rose-500/20 dark:bg-rose-500/10 rounded-2xl rotate-6 blur-md transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-600 to-pink-500 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.4)] backdrop-blur-xl border border-white/30 dark:border-white/10 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }} />
                  <svg className="w-9 h-9 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] z-10 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-zinc-100">CBT Questions Unavailable</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                  {noQuestionsMessage || "We could not find questions for this course in the repository yet. Our academic team is actively compiling manuals for early release."}
                </p>
              </div>
              <button
                onClick={() => setShowNoQuestionsModal(false)}
                className="w-full py-3.5 bg-slate-900 dark:bg-zinc-850 hover:bg-slate-850 dark:hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Dismiss Notice
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
