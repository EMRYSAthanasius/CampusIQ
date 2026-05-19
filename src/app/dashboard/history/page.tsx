import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Clock, History as HistoryIcon, Search, Calendar } from 'lucide-react'

export default async function HistoryPage() {
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

      <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-72 md:pr-8 md:pt-8 flex flex-col">
        <header className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-[#1B4332]/[0.06] shrink-0 bg-white/60 backdrop-blur-xl">
          <div>
            <h1 className="text-lg font-semibold text-[#1B4332]">Study History</h1>
            <p className="text-[11px] text-[#9CA3AF] font-mono uppercase tracking-wider">Your Journey at a Glance</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm border border-[#1B4332]/[0.06] rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-[#2E8B57]/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <HistoryIcon className="w-10 h-10 text-[#2E8B57]" />
              </div>
              <h2 className="text-3xl font-semibold text-[#1B4332] mb-4">History Timeline Coming Soon</h2>
              <p className="text-[#6B7280] text-lg font-light leading-relaxed mb-10">
                Review your past quiz attempts, re-read explanations, and track your improvement over time. Your academic legacy is being recorded.
              </p>
              
              <div className="space-y-4 text-left max-w-md mx-auto">
                {[
                  { icon: Calendar, label: 'Date-based tracking', desc: 'See what you studied each day' },
                  { icon: Search, label: 'Deep search', desc: 'Find specific questions from the past' },
                  { icon: Clock, label: 'Retake history', desc: 'Compare your scores over time' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-[#F3FAF6] border border-[#1B4332]/[0.03]">
                    <div className="p-2 rounded-xl bg-white">
                      <item.icon className="w-5 h-5 text-[#2E8B57]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1B4332]">{item.label}</p>
                      <p className="text-xs text-[#9CA3AF]">{item.desc}</p>
                    </div>
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
