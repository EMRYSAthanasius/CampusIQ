'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Home,
  Clock,
  Flag,
  AlertCircle,
  Trophy,
  Loader2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Question, Quiz } from '@/types/database'

interface QuizEngineProps {
  quiz: Quiz & { courses: { code: string; title: string; color: string } }
  questions: Question[]
  userId: string
}

type AnswerState = {
  selectedIndex: number | null
  isMarked: boolean
  timeSpent: number
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function ScoreGrade(pct: number) {
  if (pct >= 70) return { label: 'Excellent', color: 'text-emerald-400', ring: '#10B981' }
  if (pct >= 50) return { label: 'Good', color: 'text-amber-400', ring: '#F59E0B' }
  if (pct >= 40) return { label: 'Pass', color: 'text-orange-400', ring: '#F97316' }
  return { label: 'Needs Work', color: 'text-red-400', ring: '#EF4444' }
}

export default function QuizEngine({ quiz, questions, userId }: QuizEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<AnswerState[]>(
    questions.map(() => ({ selectedIndex: null, isMarked: false, timeSpent: 0 }))
  )
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [timeLeft, setTimeLeft] = useState(
    quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null
  )
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const questionStartTimeRef = useRef(questionStartTime)
  const [showNav, setShowNav] = useState(false)

  useEffect(() => {
    questionStartTimeRef.current = questionStartTime
  }, [questionStartTime])

  useEffect(() => {
    if (timeLeft === null || isFinished) return
    if (timeLeft <= 0) { handleFinishQuiz(); return }
    const timer = setInterval(() => {
      setTimeLeft(t => (t !== null ? t - 1 : null))
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isFinished])

  const handleFinishQuiz = useCallback(async () => {
    if (isFinished) return
    setIsFinished(true)
    setIsSaving(true)

    const finalAnswers = [...answers]
    const currentSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000)
    finalAnswers[currentIdx] = {
      ...finalAnswers[currentIdx],
      timeSpent: (finalAnswers[currentIdx].timeSpent || 0) + currentSpent,
    }

    const score = finalAnswers.filter((a, i) => a.selectedIndex === questions[i].correct_option_index).length
    const totalTime = finalAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0)
    const supabase = createClient()

    try {
      const { data: attempt } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          quiz_id: quiz.id,
          score,
          total_questions: questions.length,
          time_taken_seconds: totalTime,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (attempt?.id) {
        const answerRows = finalAnswers.map((a, i) => ({
          attempt_id: attempt.id,
          question_id: questions[i].id,
          selected_option_index: a.selectedIndex,
          is_correct: a.selectedIndex === questions[i].correct_option_index,
          is_marked_for_review: a.isMarked,
          time_spent_seconds: a.timeSpent || 0,
        }))
        await supabase.from('attempt_answers').insert(answerRows)
      }
    } catch (e) {
      console.error('Failed to save attempt:', e)
    }

    setIsSaving(false)
  }, [answers, currentIdx, isFinished, questions, quiz.id, userId])

  const navigateToQuestion = (idx: number) => {
    const spent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000)
    setAnswers(prev => {
      const updated = [...prev]
      updated[currentIdx] = { ...updated[currentIdx], timeSpent: (updated[currentIdx].timeSpent || 0) + spent }
      return updated
    })
    setCurrentIdx(idx)
    setIsSubmitted(false)
    setQuestionStartTime(Date.now())
    setShowNav(false)
  }

  const handleSelectOption = (idx: number) => {
    if (isSubmitted || isFinished) return
    setAnswers(prev => {
      const updated = [...prev]
      updated[currentIdx] = { ...updated[currentIdx], selectedIndex: idx }
      return updated
    })
  }

  const handleSubmitAnswer = () => {
    if (answers[currentIdx].selectedIndex === null) return
    setIsSubmitted(true)
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      navigateToQuestion(currentIdx + 1)
    } else {
      handleFinishQuiz()
    }
  }

  const handleToggleMark = () => {
    setAnswers(prev => {
      const updated = [...prev]
      updated[currentIdx] = { ...updated[currentIdx], isMarked: !updated[currentIdx].isMarked }
      return updated
    })
  }

  // ── Empty State ──
  if (questions.length === 0) {
    return (
      <div className="zen-mode flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <svg width="120" height="100" viewBox="0 0 120 100" fill="none" className="mx-auto mb-6 opacity-40">
            <rect x="10" y="20" width="100" height="70" rx="8" stroke="#64748B" strokeWidth="1.5" strokeDasharray="4 3" />
            <path d="M45 55L55 45L75 65" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            <circle cx="50" cy="42" r="5" stroke="#6366F1" strokeWidth="1.5" opacity="0.5" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-50 mb-2">No questions available</h2>
          <p className="text-[13px] text-slate-500 mb-6">This quiz doesn&apos;t have any questions yet.</p>
          <Link href="/dashboard">
            <button className="px-5 py-2.5 bg-indigo-600 text-white text-[13px] rounded-lg font-semibold hover:bg-indigo-500 transition-all">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Results Screen ──
  if (isFinished && !isSaving) {
    const finalAnswers = answers
    const score = finalAnswers.filter((a, i) => a.selectedIndex === questions[i].correct_option_index).length
    const skipped = finalAnswers.filter(a => a.selectedIndex === null).length
    const wrong = questions.length - score - skipped
    const percentage = Math.round((score / questions.length) * 100)
    const grade = ScoreGrade(percentage)

    return (
      <div className="zen-mode flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl"
        >
          {/* Score arc */}
          <div className="flex justify-center mb-6">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1E293B" strokeWidth="5" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={grade.ring}
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 264' }}
                  animate={{ strokeDasharray: `${percentage * 2.64} 264` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-mono font-light ${grade.color}`}>{percentage}</span>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">percent</span>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-slate-50 mb-1">Quiz Complete</h1>
            <p className="text-[13px] text-slate-500">{quiz.title}</p>
            <p className={`text-sm font-semibold mt-2 ${grade.color}`}>{grade.label}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Correct', value: score, color: 'text-emerald-400', bg: 'bg-emerald-500/8' },
              { label: 'Wrong', value: wrong, color: 'text-red-400', bg: 'bg-red-500/8' },
              { label: 'Skipped', value: skipped, color: 'text-slate-500', bg: 'bg-slate-800/50' },
            ].map(s => (
              <div key={s.label} className={`p-4 rounded-xl ${s.bg} border border-white/[0.04] text-center`}>
                <div className={`text-2xl font-mono font-light ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-600 uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Question grid */}
          <div className="bento-card p-5 mb-6">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600 mb-3">Question Breakdown</h3>
            <div className="grid grid-cols-10 gap-1.5">
              {questions.map((q, i) => {
                const a = finalAnswers[i]
                const correct = a.selectedIndex === q.correct_option_index
                const isSkipped = a.selectedIndex === null
                return (
                  <div
                    key={q.id}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-mono font-bold border ${
                      isSkipped ? 'bg-slate-800/50 border-white/[0.04] text-slate-600' :
                      correct ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard">
              <button className="w-full py-3 bg-slate-800 border border-white/[0.06] text-slate-300 text-[13px] font-semibold rounded-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                <Home className="w-4 h-4" /> Dashboard
              </button>
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="py-3 bg-indigo-600 text-white text-[13px] font-semibold rounded-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (isSaving) {
    return (
      <div className="zen-mode flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Saving your results...</p>
        </div>
      </div>
    )
  }

  // ── Quiz Interface — Zen Mode ──
  const currentQ = questions[currentIdx]
  const currentAnswer = answers[currentIdx]
  const answeredCount = answers.filter(a => a.selectedIndex !== null).length
  const markedCount = answers.filter(a => a.isMarked).length
  const progressPercent = (answeredCount / questions.length) * 100

  return (
    <div className="zen-mode flex flex-col">
      {/* Top bar — minimal */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-white/[0.04] shrink-0 bg-[#0F172A]/90 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <button className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all">
              <X className="w-4 h-4" />
            </button>
          </Link>
          <div className="h-4 w-px bg-white/[0.06]" />
          <div>
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">{(quiz as any).courses?.code}</p>
            <p className="text-[13px] text-slate-300 font-medium truncate max-w-[250px]">{quiz.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-mono font-semibold ${
              timeLeft <= 60 ? 'bg-red-500/8 border-red-500/20 text-red-400' :
              timeLeft <= 300 ? 'bg-amber-500/8 border-amber-500/20 text-amber-400' :
              'bg-slate-800/50 border-white/[0.06] text-slate-400'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              {formatTime(timeLeft)}
            </div>
          )}

          <div className="text-[13px] text-slate-600 font-mono">
            <span className="text-slate-300 font-semibold">{currentIdx + 1}</span>
            <span className="mx-0.5">/</span>
            {questions.length}
          </div>

          {/* Mobile nav toggle */}
          <button
            onClick={() => setShowNav(!showNav)}
            className="md:hidden px-3 py-1.5 bg-slate-800 border border-white/[0.06] text-slate-400 text-[11px] font-semibold rounded-lg"
          >
            {answeredCount}/{questions.length}
          </button>

          <button
            onClick={() => {
              if (confirm('Submit quiz? Unanswered questions will be marked as skipped.')) handleFinishQuiz()
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold rounded-lg transition-all"
          >
            Submit
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-[2px] bg-slate-800">
        <motion.div className="h-full bg-indigo-500" animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigator — collapsible on mobile */}
        <aside className={`${showNav ? 'flex' : 'hidden'} md:flex flex-col w-56 border-r border-white/[0.04] bg-[#0F172A] p-4 overflow-y-auto hide-scrollbar shrink-0`}>
          <div className="mb-4">
            <h3 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-700 mb-3">Navigator</h3>
            <div className="flex gap-3 text-[10px] text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500/40 rounded-sm" /> {answeredCount} done</span>
              {markedCount > 0 && <span className="flex items-center gap-1"><Flag className="w-2.5 h-2.5 text-amber-400" /> {markedCount}</span>}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {questions.map((_, i) => {
              const ans = answers[i]
              const isActive = i === currentIdx
              const answered = ans.selectedIndex !== null
              return (
                <button
                  key={i}
                  onClick={() => navigateToQuestion(i)}
                  className={`aspect-square rounded text-[10px] font-mono font-semibold transition-all relative ${
                    isActive ? 'bg-indigo-600 text-white' :
                    answered ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' :
                    'bg-slate-800/40 text-slate-600 border border-white/[0.04] hover:border-white/[0.08] hover:text-slate-400'
                  }`}
                >
                  {i + 1}
                  {ans.isMarked && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Question Area — centered, distraction-free */}
        <main className="flex-1 overflow-y-auto flex justify-center px-6 py-10">
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                initial={{ x: 16, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -16, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Question header */}
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-500/8 px-2 py-1 rounded-md border border-indigo-500/15">
                      Q{currentIdx + 1}
                    </span>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-1 rounded-md border uppercase ${
                      currentQ.difficulty === 'easy' ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/15' :
                      currentQ.difficulty === 'medium' ? 'bg-amber-500/8 text-amber-400 border-amber-500/15' :
                      'bg-red-500/8 text-red-400 border-red-500/15'
                    }`}>
                      {currentQ.difficulty}
                    </span>
                    {currentQ.source_year && (
                      <span className="text-[10px] font-mono text-slate-700">{currentQ.source_year}</span>
                    )}
                  </div>
                  <button
                    onClick={handleToggleMark}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${
                      currentAnswer.isMarked
                        ? 'bg-amber-500/8 border-amber-500/20 text-amber-400'
                        : 'bg-transparent border-white/[0.06] text-slate-600 hover:text-slate-400 hover:border-white/[0.1]'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    {currentAnswer.isMarked ? 'Flagged' : 'Flag'}
                  </button>
                </div>

                {/* Question text */}
                <h2 className="text-lg md:text-xl font-medium text-slate-100 leading-relaxed mb-8">
                  {currentQ.content}
                </h2>

                {/* Options */}
                <div className="space-y-2.5">
                  {(currentQ.options as string[]).map((opt, idx) => {
                    const isSelected = currentAnswer.selectedIndex === idx
                    const isCorrect = isSubmitted && idx === currentQ.correct_option_index
                    const isWrong = isSubmitted && isSelected && !isCorrect

                    let borderColor = 'border-white/[0.06] hover:border-white/[0.1]'
                    let bg = 'bg-slate-800/30 hover:bg-slate-800/50'
                    if (isSelected && !isSubmitted) { borderColor = 'border-indigo-500/40'; bg = 'bg-indigo-500/8' }
                    if (isCorrect) { borderColor = 'border-emerald-500/40'; bg = 'bg-emerald-500/8' }
                    if (isWrong) { borderColor = 'border-red-500/40'; bg = 'bg-red-500/8' }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-4 rounded-xl border ${borderColor} ${bg} transition-all duration-150 flex items-center justify-between gap-4 disabled:cursor-default`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 text-[12px] font-mono font-bold transition-all ${
                            isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                            isWrong ? 'border-red-500 bg-red-500 text-white' :
                            isSelected ? 'border-indigo-400 bg-indigo-500 text-white' :
                            'border-white/[0.1] text-slate-600'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={`text-[14px] ${isCorrect ? 'text-emerald-200' : isWrong ? 'text-red-200' : 'text-slate-300'}`}>
                            {opt}
                          </span>
                        </div>
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                        {isWrong && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                  {isSubmitted && currentQ.explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`mt-5 p-4 rounded-xl border ${
                        currentAnswer.selectedIndex === currentQ.correct_option_index
                          ? 'bg-emerald-500/5 border-emerald-500/15'
                          : 'bg-red-500/5 border-red-500/15'
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2 text-slate-500">Explanation</p>
                      <p className="text-[13px] text-slate-300 leading-relaxed">{currentQ.explanation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-10">
                  <button
                    onClick={() => navigateToQuestion(Math.max(0, currentIdx - 1))}
                    disabled={currentIdx === 0}
                    className="px-4 py-2.5 bg-slate-800 border border-white/[0.06] text-slate-400 rounded-lg text-[13px] font-medium hover:bg-slate-700 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>

                  {!isSubmitted ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={currentAnswer.selectedIndex === null}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-all"
                    >
                      Confirm Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                      {currentIdx < questions.length - 1 ? (
                        <>Next <ChevronRight className="w-4 h-4" /></>
                      ) : (
                        <>Finish <Trophy className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
