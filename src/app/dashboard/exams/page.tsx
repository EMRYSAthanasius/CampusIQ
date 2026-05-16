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

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .order('code')

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 text-[#6B7280]">
      <Sidebar profile={profile} />

      <main className="flex-1 lg:pl-20 flex flex-col h-screen overflow-hidden">
        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-100/50 shrink-0 bg-white/60 backdrop-blur-xl z-20">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Exam Engine</h1>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Simulated CBT Environment</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            <ExamsClient courses={courses || []} user={user} />
          </div>
        </div>
      </main>
    </div>
  )
}

import ExamsClient from './ExamsClient'
