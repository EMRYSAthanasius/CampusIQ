'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  HelpCircle,
  BookOpen,
  BarChart2,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { ChevronLeft as ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import type { Profile, Course, Question } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface RecentQuestion extends Question {
  courses: Pick<Course, 'code' | 'title'> | null
}

interface AdminDashboardClientProps {
  profile: Profile
  stats: { userCount: number; questionCount: number; courseCount: number; attemptCount: number }
  recentQuestions: RecentQuestion[]
  courses: Pick<Course, 'id' | 'code' | 'title'>[]
}

type AddState = 'idle' | 'saving' | 'success' | 'error'

export default function AdminDashboardClient({ profile, stats, recentQuestions, courses }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'users'>('overview')
  const [addState, setAddState] = useState<AddState>('idle')
  const [addError, setAddError] = useState('')
  const [questions, setQuestions] = useState<RecentQuestion[]>(recentQuestions)

  // Form state for adding a question
  const [form, setForm] = useState({
    course_id: courses[0]?.id || '',
    content: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correct_option_index: 0,
    explanation: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    source_year: '',
  })

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.content || !form.optionA || !form.optionB || !form.optionC || !form.optionD) {
      setAddError('Please fill in the question and all 4 options.')
      return
    }

    setAddState('saving')
    setAddError('')

    const supabase = createClient()
    const { error, data } = await supabase
      .from('questions')
      .insert({
        course_id: form.course_id,
        content: form.content,
        options: [form.optionA, form.optionB, form.optionC, form.optionD],
        correct_option_index: form.correct_option_index,
        explanation: form.explanation || null,
        difficulty: form.difficulty,
        source_year: form.source_year ? parseInt(form.source_year) : null,
        source_type: 'past_exam',
      })
      .select('*, courses(code, title)')
      .single()

    if (error) {
      setAddState('error')
      setAddError(error.message)
    } else {
      setAddState('success')
      // Cast the returned data to RecentQuestion
      const newQuestion = data as unknown as RecentQuestion
      setQuestions(prev => [newQuestion, ...prev])
      // Reset form
      setForm(f => ({ ...f, content: '', optionA: '', optionB: '', optionC: '', optionD: '', explanation: '', source_year: '' }))
      setTimeout(() => setAddState('idle'), 2000)
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('questions').delete().eq('id', id)
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div className="flex min-h-screen bg-[#F3FAF6] text-[#6B7280]">
      <Sidebar profile={profile} />

      <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-72 md:pr-8 md:pt-8 flex flex-col">
        <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-[#1B4332]/[0.06] shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="p-2 rounded-lg bg-white border border-[#1B4332]/[0.08] hover:bg-[#F3FAF6] transition-all text-[#6B7280] hover:text-[#1B4332]">
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-[#1B4332]">Admin Panel</h1>
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Platform Management</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white border border-[#1B4332]/[0.08] rounded-xl p-1 gap-1">
            {[
              { label: 'Overview', value: 'overview' },
              { label: 'Questions', value: 'questions' },
              { label: 'Users', value: 'users' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as 'overview' | 'questions' | 'users')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.value
                    ? 'bg-[#2E8B57] text-white'
                    : 'text-[#6B7280] hover:text-[#1B4332]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <div className="max-w-[1400px] mx-auto">

            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { label: 'Total Users', value: stats.userCount, icon: Users, color: 'text-[#2E8B57]', bg: 'bg-[#2E8B57]/10', border: 'border-[#2E8B57]/20' },
                    { label: 'Questions', value: stats.questionCount, icon: HelpCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Courses', value: stats.courseCount, icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                    { label: 'Quiz Attempts', value: stats.attemptCount, icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`p-6 rounded-2xl ${stat.bg} border ${stat.border}`}
                    >
                      <div className={`p-2.5 rounded-xl ${stat.bg} border ${stat.border} w-fit mb-4`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div className="text-3xl font-light text-[#1B4332]">{stat.value.toLocaleString()}</div>
                      <div className="text-sm text-[#6B7280] mt-1">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Recent questions table */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Recent Questions</h2>
                  <div className="rounded-2xl border border-[#1B4332]/[0.06] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1B4332]/[0.06] bg-[#F3FAF6]">
                          <th className="text-left py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Course</th>
                          <th className="text-left py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Question</th>
                          <th className="text-left py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Difficulty</th>
                          <th className="text-left py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Year</th>
                          <th className="py-3 px-5" />
                        </tr>
                      </thead>
                      <tbody>
                        {questions.slice(0, 8).map(q => (
                          <tr key={q.id} className="border-b border-[#1B4332]/[0.06] hover:bg-[#F3FAF6] transition-colors">
                            <td className="py-3 px-5">
                              <span className="text-xs font-bold text-[#2E8B57] bg-[#2E8B57]/10 px-2 py-0.5 rounded">
                                {q.courses?.code}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-[#1B4332] max-w-xs truncate">{q.content}</td>
                            <td className="py-3 px-5">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {q.difficulty}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-[#9CA3AF] text-xs">{q.source_year || '—'}</td>
                            <td className="py-3 px-5">
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-red-500 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'questions' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Add Question Form */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-5 flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-[#2E8B57]" /> Add New Question
                  </h2>

                  <form onSubmit={handleAddQuestion} className="space-y-4 p-6 rounded-2xl bg-white/70 border border-[#1B4332]/[0.06]">
                    {/* Course */}
                    <div>
                      <label className="block text-xs font-medium text-[#1B4332] mb-1.5">Course</label>
                      <select
                        value={form.course_id}
                        onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                        className="w-full py-2.5 px-3 bg-white border border-[#1B4332]/10 rounded-xl text-sm text-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#2E8B57]/50"
                      >
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Question */}
                    <div>
                      <label className="block text-xs font-medium text-[#1B4332] mb-1.5">Question Text</label>
                      <textarea
                        value={form.content}
                        onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                        rows={3}
                        placeholder="Enter the question..."
                        className="w-full py-2.5 px-3 bg-white border border-[#1B4332]/10 rounded-xl text-sm text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#2E8B57]/50 resize-none"
                      />
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-400">Answer Options</label>
                      {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((key, i) => (
                        <div key={key} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, correct_option_index: i }))}
                            className={`w-7 h-7 rounded-full border-2 text-xs font-bold shrink-0 transition-all ${
                              form.correct_option_index === i
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-[#1B4332]/15 text-[#9CA3AF] hover:border-[#1B4332]/30'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}
                          </button>
                          <input
                            type="text"
                            value={form[key]}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className="flex-1 py-2 px-3 bg-white border border-[#1B4332]/10 rounded-xl text-sm text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#2E8B57]/50"
                          />
                        </div>
                      ))}
                      <p className="text-[10px] text-[#9CA3AF]">Click the letter to set it as the correct answer</p>
                    </div>

                    {/* Difficulty and Year */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#1B4332] mb-1.5">Difficulty</label>
                        <select
                          value={form.difficulty}
                          onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                          className="w-full py-2.5 px-3 bg-white border border-[#1B4332]/10 rounded-xl text-sm text-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#2E8B57]/50"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#1B4332] mb-1.5">Source Year</label>
                        <input
                          type="number"
                          value={form.source_year}
                          onChange={e => setForm(f => ({ ...f, source_year: e.target.value }))}
                          placeholder="e.g. 2022"
                          className="w-full py-2.5 px-3 bg-white border border-[#1B4332]/10 rounded-xl text-sm text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#2E8B57]/50"
                        />
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="block text-xs font-medium text-[#1B4332] mb-1.5">Explanation (optional)</label>
                      <textarea
                        value={form.explanation}
                        onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                        rows={2}
                        placeholder="Explain why the answer is correct..."
                        className="w-full py-2.5 px-3 bg-white border border-[#1B4332]/10 rounded-xl text-sm text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#2E8B57]/50 resize-none"
                      />
                    </div>

                    {addError && (
                      <div className="flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {addError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={addState === 'saving'}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        addState === 'success'
                          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                          : 'bg-[#2E8B57] hover:bg-[#256d46] text-white shadow-lg shadow-[#2E8B57]/20'
                      } disabled:opacity-60`}
                    >
                      {addState === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> :
                       addState === 'success' ? <><CheckCircle2 className="w-4 h-4" />Saved!</> :
                       <><Plus className="w-4 h-4" />Add Question</>}
                    </button>
                  </form>
                </div>

                {/* Recent Questions list */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-5">
                    All Questions ({questions.length} shown)
                  </h2>
                  <div className="space-y-3">
                    {questions.map(q => (
                      <div key={q.id} className="p-4 rounded-xl bg-white/70 border border-[#1B4332]/[0.06] hover:border-[#1B4332]/[0.12] transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-[#2E8B57]">{q.courses?.code}</span>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {q.difficulty}
                              </span>
                              {q.source_year && <span className="text-[9px] text-[#9CA3AF]">{q.source_year}</span>}
                            </div>
                            <p className="text-sm text-[#1B4332] line-clamp-2">{q.content}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="text-center py-20">
                <Users className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#6B7280] mb-2">User management</h3>
                <p className="text-[#9CA3AF] text-sm">Detailed user analytics and management tools coming soon.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
