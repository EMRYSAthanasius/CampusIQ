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

  return (
    <div className="flex min-h-screen bg-[#F3FAF6] text-[#6B7280]">
      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 px-8 flex items-center justify-between border-b border-[#1B4332]/[0.06] shrink-0 bg-white/60 backdrop-blur-xl">
          <div>
            <h1 className="text-lg font-semibold text-[#1B4332]">Full-Length Mock Exams</h1>
            <p className="text-[11px] text-[#9CA3AF] font-mono uppercase tracking-wider">Simulated CBT Environment</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm border border-[#1B4332]/[0.06] rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-tr from-[#2E8B57] to-[#6EE7B7] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-[#2E8B57]/20">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-semibold text-[#1B4332] mb-4">Exam Engine Coming Soon</h2>
              <p className="text-[#6B7280] text-lg font-light leading-relaxed mb-10 max-w-2xl mx-auto">
                Prepare for the real deal with our full-length mock exams. Time-limited, proctored-style sessions designed to build your stamina and confidence for actual university CBTs.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Zap, label: 'Timed Sessions', desc: 'Real-world speed' },
                  { icon: Shield, label: 'Exam Mode', desc: 'No distractions' },
                  { icon: Trophy, label: 'Leaderboards', desc: 'Compete globally' },
                  { icon: FileText, label: 'Mixed Subjects', desc: 'Randomized banks' },
                ].map((item, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-[#F3FAF6] border border-[#1B4332]/[0.03] hover:border-[#2E8B57]/10 transition-all">
                    <div className="p-2 rounded-xl bg-white w-fit mx-auto mb-3 shadow-sm">
                      <item.icon className="w-5 h-5 text-[#2E8B57]" />
                    </div>
                    <p className="text-sm font-semibold text-[#1B4332] mb-1">{item.label}</p>
                    <p className="text-[10px] text-[#9CA3AF] leading-tight">{item.desc}</p>
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
