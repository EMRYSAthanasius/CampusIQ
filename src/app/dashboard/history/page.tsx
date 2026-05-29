import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Clock, History as HistoryIcon, Search, Calendar } from 'lucide-react'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-28 md:pr-8 md:pt-8 flex flex-col">
      <header className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 shrink-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Study History</h1>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono uppercase tracking-wider">Your Journey at a Glance</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center group">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              <HistoryIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-500 stroke-[1.6]" />
            </div>
            <h2 className="text-3xl font-semibold text-slate-900 dark:text-zinc-100 mb-4">History Timeline Coming Soon</h2>
            <p className="text-slate-600 dark:text-zinc-400 text-lg font-light leading-relaxed mb-10">
              Review your past quiz attempts, re-read explanations, and track your improvement over time. Your academic legacy is being recorded.
            </p>
            
            <div className="space-y-4 text-left max-w-md mx-auto">
              {[
                { icon: Calendar, label: 'Date-based tracking', desc: 'See what you studied each day' },
                { icon: Search, label: 'Deep search', desc: 'Find specific questions from the past' },
                { icon: Clock, label: 'Retake history', desc: 'Compare your scores over time' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#151618] border border-slate-150 dark:border-zinc-800/80 group hover:border-emerald-500/20 transition-all duration-300">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 text-emerald-650 dark:text-emerald-450 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shrink-0">
                    <item.icon className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
