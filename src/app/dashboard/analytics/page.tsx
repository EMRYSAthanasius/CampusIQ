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
    <div className="flex min-h-screen bg-[#F3FAF6] text-[#6B7280]">
      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 px-8 flex items-center justify-between border-b border-[#1B4332]/[0.06] shrink-0 bg-white/60 backdrop-blur-xl">
          <div>
            <h1 className="text-lg font-semibold text-[#1B4332]">Performance Analytics</h1>
            <p className="text-[11px] text-[#9CA3AF] font-mono uppercase tracking-wider">Your Academic Growth Metrics</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm border border-[#1B4332]/[0.06] rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-[#2E8B57]/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <BarChart2 className="w-10 h-10 text-[#2E8B57]" />
              </div>
              <h2 className="text-3xl font-semibold text-[#1B4332] mb-4">Deep Analytics Coming Soon</h2>
              <p className="text-[#6B7280] text-lg font-light leading-relaxed mb-10">
                We are crunching the numbers to give you the most detailed insight into your study patterns. Soon, you&apos;ll see performance trends, subject mastery, and predictive scoring.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { icon: TrendingUp, label: 'Score Trends', value: 'Coming Soon' },
                  { icon: Target, label: 'Subject Weakness', value: 'Calculating...' },
                  { icon: Zap, label: 'Speed Analysis', value: 'Initializing...' },
                ].map((item, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-[#F3FAF6] border border-[#1B4332]/[0.03]">
                    <div className="p-2 rounded-lg bg-white w-fit mx-auto mb-3">
                      <item.icon className="w-5 h-5 text-[#2E8B57]" />
                    </div>
                    <p className="text-xs font-bold text-[#1B4332] uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-[10px] text-[#9CA3AF] font-mono">{item.value}</p>
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
