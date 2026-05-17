import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { BarChart2, TrendingUp, Target, Zap } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 transition-colors duration-300">
      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-100/50 dark:border-zinc-800/50 shrink-0 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-xl z-20">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 font-heading">Performance Analytics</h1>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest font-mono">Your Academic Growth Metrics</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-[2.5rem] p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                <BarChart2 className="w-10 h-10 text-emerald-600 dark:text-emerald-450" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 mb-4 font-heading">Deep Analytics Coming Soon</h2>
              <p className="text-slate-500 dark:text-zinc-400 text-base leading-relaxed mb-10 max-w-xl mx-auto">
                We are crunching the numbers to give you the most detailed insight into your study patterns. Soon, you&apos;ll see performance trends, subject mastery, and predictive scoring.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { icon: TrendingUp, label: 'Score Trends', value: 'Coming Soon' },
                  { icon: Target, label: 'Subject Weakness', value: 'Calculating...' },
                  { icon: Zap, label: 'Speed Analysis', value: 'Initializing...' },
                ].map((item, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/50">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 w-fit mx-auto mb-3 shadow-sm text-emerald-600 dark:text-emerald-400">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-widest mb-1 font-mono">{item.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold font-mono">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
