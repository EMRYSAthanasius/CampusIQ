import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { FileText, Trophy, Shield, Zap } from 'lucide-react'

export default async function ExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 1. List course subdirectories directly from the storage bucket
  const { data: folders, error: storageError } = await supabase
    .storage
    .from('materials')
    .list('', {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' }
    })

  if (storageError) {
    console.error('Failed to list course folders from storage:', storageError);
  }

  // Filter out subdirectories (folders in Supabase storage typically have !f.id)
  const courseCodes = (folders || [])
    .filter(f => !f.id && f.name !== '.emptyFolderPlaceholder')
    .map(f => f.name)

  // 2. Fetch courses from db to map metadata properties
  const { data: dbCourses } = await supabase
    .from('courses')
    .select('*')

  // 3. Map dynamic directories to database items or build robust fallback entities
  const mappedCourses = courseCodes.map((code, index) => {
    const dbCourse = dbCourses?.find(c => c.code.replace(/\s+/g, '').toUpperCase() === code.replace(/\s+/g, '').toUpperCase())
    if (dbCourse) return dbCourse

    const colors = ['emerald', 'teal', 'cyan', 'indigo', 'emerald']
    const color = colors[index % colors.length]

    return {
      id: code, // Dynamic fallback identifier (course code)
      code: code,
      title: `Course ${code}`,
      description: `Verbatim study manuals, quizzes, and learning analytics for ${code}.`,
      color: color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  })

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 transition-colors duration-300">
      <Sidebar profile={profile} />

      <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-72 md:pr-8 md:pt-8 flex flex-col">
        <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-slate-100/50 dark:border-zinc-800/50 shrink-0 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-xl z-20">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Exam Engine</h1>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Simulated CBT Environment</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            <ExamsClient courses={mappedCourses as any || []} user={user} />
          </div>
        </div>
      </main>
    </div>
  )
}

import ExamsClient from './ExamsClient'
