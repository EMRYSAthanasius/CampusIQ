'use client'

import { useState, useEffect, useCallback } from 'react'
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
  BarChart
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
  const [examStats, setExamStats] = useState({ correct: 0, wrong: 0, skipped: 0, timeSpent: 0 })
  const [showMistakes, setShowMistakes] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [quizId, setQuizId] = useState<string | null>(null)

  const supabase = createClient()

  const filteredCourses = courses.filter(c => {
    return c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  })

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
        setShowMistakes(false)
      } else {
        alert(data.error || 'No questions found for this course yet.')
        setStage('SELECT_COURSE')
      }
    } catch (err) {
      console.error(err)
      setStage('SELECT_COURSE')
    }
  }

  const submitQuiz = useCallback(async (forced = false) => {
    let correct = 0
    let wrong = 0
    let skipped = 0
    
    questions.forEach((q, idx) => {
      const userAns = answers[idx]
      if (!userAns) {
        skipped++
      } else if (userAns === q.correct_answer) {
        correct++
      } else {
        wrong++
      }
    })
    
    const percentage = Math.round((correct / questions.length) * 100)
    const timeSpent = 1200 - timeLeft

    setScore(percentage)
    setExamStats({ correct, wrong, skipped, timeSpent })
    setStage('RESULTS')
    setShowMistakes(false)

    // Save attempt to Supabase
    if (selectedCourse && quizId) {
      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_id: quizId,
        score: correct,
        total_questions: questions.length,
        status: 'completed',
        completed_at: new Date().toISOString()
      })

      await supabase.from('study_sessions').insert({
        user_id: user.id,
        duration_seconds: timeSpent,
        started_at: new Date(Date.now() - timeSpent * 1000).toISOString(),
        ended_at: new Date().toISOString()
      })
    }
  }, [questions, answers, selectedCourse, quizId, timeLeft, user.id, supabase])

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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
                <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all duration-300 ${timeLeft <= 300 ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200'}`}>
                  {timeLeft <= 300 ? <AlertCircle className="w-5 h-5 animate-bounce" /> : <Clock className="w-4 h-4" />}
                  {formatTime(timeLeft)}
                </div>
                <div className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                  Question {currentIndex + 1} of {questions.length}
                </div>
              </div>
              
              <button 
                onClick={() => { if(confirm('Are you sure you want to submit?')) submitQuiz(false) }}
                className="px-4 py-2 md:px-6 md:py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-lg hover:shadow-xl uppercase tracking-wider cursor-pointer"
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
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900/35 text-emerald-800 dark:text-emerald-300 shadow-md shadow-emerald-500/5' 
                            : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:border-emerald-100 hover:bg-slate-50 dark:hover:bg-zinc-850'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 group-hover:bg-emerald-100'}`}>
                          {letter}
                        </div>
                        <span className="font-medium">{opt}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Navigation Arrows */}
              <div className="flex justify-between items-center mt-10 pt-8 border-t border-slate-50 dark:border-zinc-800/50">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <div className="hidden md:flex flex-1" />
                <button
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Number Bar Navigation */}
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 rounded-[2rem] border border-slate-100 dark:border-zinc-800/80 shadow-lg flex flex-col items-center">
              <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
                <div className="flex justify-start md:justify-center gap-2 min-w-max px-2">
                  {questions.map((_, i) => {
                    const isAnswered = !!answers[i]
                    const isActive = i === currentIndex
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`w-12 h-12 shrink-0 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center cursor-pointer ${
                          isActive 
                            ? 'border-blue-500 shadow-xl shadow-blue-500/20 scale-110 z-10' 
                            : 'border-transparent hover:scale-105'
                        } ${
                          isAnswered 
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                            : 'bg-red-500 text-white shadow-md shadow-red-500/20'
                        }`}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-2 uppercase tracking-widest flex items-center gap-2">
                <BarChart className="w-4 h-4" /> {Object.keys(answers).length} / {questions.length} Answered
              </p>
            </div>

          </motion.div>
        )}

        {/* STAGE 3: Results / Dashboard */}
        {stage === 'RESULTS' && !showMistakes && (
          <motion.div
            key="results-dashboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto space-y-8 py-8"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100">Exam Analysis</h2>
              <p className="text-slate-500 dark:text-zinc-400">Detailed breakdown of your mock CBT performance.</p>
            </div>

            {/* Top Banner (Pass/Fail) */}
            <div className={`p-8 md:p-12 rounded-[3rem] border flex flex-col md:flex-row items-center justify-between gap-8 ${score >= 50 ? 'bg-emerald-500 border-emerald-400 text-white shadow-2xl shadow-emerald-500/30' : 'bg-red-500 border-red-400 text-white shadow-2xl shadow-red-500/30'}`}>
               <div className="text-center md:text-left">
                 <p className="text-white/80 font-bold uppercase tracking-widest text-sm mb-1">Final Score</p>
                 <p className="text-7xl font-black">{score}%</p>
               </div>
               <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                 {score >= 50 ? <Trophy className="w-16 h-16 text-white drop-shadow-lg" /> : <AlertCircle className="w-16 h-16 text-white drop-shadow-lg" />}
               </div>
               <div className="text-center md:text-right">
                 <p className="text-white/80 font-bold uppercase tracking-widest text-sm mb-1">Status</p>
                 <p className="text-6xl font-black">{score >= 50 ? 'PASSED' : 'FAILED'}</p>
               </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                <p className="text-3xl font-black text-slate-800 dark:text-zinc-100">{examStats.correct}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Correct</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center shadow-sm">
                <XCircle className="w-10 h-10 text-red-500 mb-3" />
                <p className="text-3xl font-black text-slate-800 dark:text-zinc-100">{examStats.wrong}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Wrong</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center shadow-sm">
                <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
                <p className="text-3xl font-black text-slate-800 dark:text-zinc-100">{examStats.skipped}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Skipped</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center shadow-sm">
                <Clock className="w-10 h-10 text-blue-500 mb-3" />
                <p className="text-3xl font-black text-slate-800 dark:text-zinc-100">{formatTime(examStats.timeSpent)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Time Spent</p>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <button 
                onClick={() => setStage('SELECT_COURSE')} 
                className="py-4 px-6 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-[1.5rem] font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                 <ArrowRight className="w-5 h-5" /> Go Home
              </button>
              
              <button 
                onClick={() => startQuiz(selectedCourse!)} 
                className="py-4 px-6 bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-900 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform cursor-pointer shadow-xl shadow-slate-900/10 dark:shadow-white/10"
              >
                 <RefreshCcw className="w-5 h-5" /> Retake Exam
              </button>
              
              <button 
                onClick={() => {
                  const isPremium = user?.subscription_status === 'pro' || user?.subscription_status === 'ultra';
                  if (isPremium) {
                    setShowMistakes(true)
                  } else {
                    alert('Reviewing detailed mistakes is a premium feature. Please upgrade to Pro or Ultra to unlock this detailed breakdown!')
                  }
                }} 
                className="py-4 px-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform cursor-pointer shadow-xl shadow-orange-500/20 group"
              >
                {user?.subscription_status === 'pro' || user?.subscription_status === 'ultra' ? <Eye className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                Show Mistakes
              </button>
            </div>
          </motion.div>
        )}

        {/* STAGE 4: Premium Mistakes Review */}
        {stage === 'RESULTS' && showMistakes && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="max-w-4xl mx-auto space-y-8 py-6"
          >
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 dark:border-zinc-800/80 shadow-sm sticky top-4 z-30">
               <div>
                 <h2 className="text-2xl font-black flex items-center gap-2"><Eye className="text-orange-500" /> Review Mistakes</h2>
                 <p className="text-slate-500 text-sm font-bold tracking-widest uppercase mt-1">Premium Analysis Unlocked</p>
               </div>
               <button 
                 onClick={() => setShowMistakes(false)} 
                 className="px-6 py-3 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold cursor-pointer hover:scale-105 transition-transform"
               >
                 Back to Summary
               </button>
             </div>

             <div className="space-y-6">
               {questions.map((q, idx) => {
                 const userAns = answers[idx]
                 const isCorrect = userAns === q.correct_answer
                 const isSkipped = !userAns

                 let borderClass = 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20'
                 let badgeClass = 'bg-red-500 text-white'
                 
                 if (isCorrect) {
                   borderClass = 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/20'
                   badgeClass = 'bg-emerald-500 text-white'
                 } else if (isSkipped) {
                   borderClass = 'border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20'
                   badgeClass = 'bg-amber-500 text-white'
                 }

                 return (
                   <div key={idx} className={`p-6 md:p-8 rounded-[2rem] border-2 ${borderClass}`}>
                     <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${badgeClass}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 w-full space-y-6">
                          <h4 className="text-xl font-bold text-slate-900 dark:text-zinc-100 leading-snug">{q.question_text}</h4>
                          
                          <div className="space-y-3">
                            {q.options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx)
                              const isUserChoice = userAns === letter
                              const isActualCorrect = q.correct_answer === letter

                              let style = 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 opacity-60' 
                              let icon = null

                              if (isActualCorrect) {
                                style = 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold opacity-100 shadow-md ring-2 ring-emerald-500/20'
                                icon = <CheckCircle2 className="w-6 h-6 ml-auto text-emerald-600 dark:text-emerald-400" />
                              } else if (isUserChoice && !isCorrect) {
                                style = 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-900 dark:text-red-100 font-bold opacity-100'
                                icon = <XCircle className="w-6 h-6 ml-auto text-red-600 dark:text-red-400" />
                              }

                              return (
                                <div key={optIdx} className={`p-4 md:p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${style}`}>
                                   <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-sm font-black">{letter}</div>
                                   <span className="text-base">{opt}</span>
                                   {icon}
                                </div>
                              )
                            })}
                          </div>
                          
                          {isSkipped && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-bold">
                              <AlertCircle className="w-4 h-4"/> You skipped this question.
                            </div>
                          )}
                        </div>
                     </div>
                   </div>
                 )
               })}
             </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
