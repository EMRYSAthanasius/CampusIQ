import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from "@/components/MobileNav"
import type { Profile } from '@/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, subscription_status, updated_at')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 transition-colors duration-300 relative">
      <Sidebar profile={profile as Profile | null} />
      <div className="flex-1 flex flex-col min-h-screen">
        {children}
      </div>
      <MobileNav />
    </div>
  )
}
