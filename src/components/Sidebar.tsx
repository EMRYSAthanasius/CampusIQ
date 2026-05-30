'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Home,
  Library,
  FileText,
  BarChart2,
  Clock,
  Settings,
  LogOut,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface NavItem {
  name: string
  icon: any
  href: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Home', icon: Home, href: '/dashboard' },
  { name: 'Courses', icon: Library, href: '/dashboard/courses' },
  { name: 'Exams', icon: FileText, href: '/dashboard/exams' },
  { name: 'Analytics', icon: BarChart2, href: '/dashboard/analytics' },
  { name: 'History', icon: Clock, href: '/dashboard/history' },
]

interface SidebarProps {
  profile: Profile | null
}

export default function Sidebar({ profile: initialProfile }: SidebarProps) {
  const [profile, setProfile] = useState(initialProfile)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    let channel: RealtimeChannel
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile(data)
      channel = supabase.channel('profile-changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        setProfile(payload.new as Profile)
      }).subscribe()
    }
    setupSubscription()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [supabase])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-20 fixed left-0 top-0 h-screen bg-white dark:bg-zinc-950 border-r border-slate-100 dark:border-zinc-900 justify-between py-8 z-50 transition-all duration-300">
      <div className="flex flex-col items-center gap-10">
        {/* Logo */}
        <Link href="/dashboard" className="relative group">
          <div className="w-12 h-12 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="CampusIQ Logo" 
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-sm"
            />
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link key={item.name} href={item.href} title={item.name} className="relative block">
                <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group border ${
                  active 
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5' 
                    : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-zinc-900/60 hover:border-slate-100 dark:hover:border-zinc-800'
                }`}>
                  {active && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute -left-4 w-1.5 h-6 bg-emerald-600 dark:bg-emerald-400 rounded-r-full"
                    />
                  )}
                  <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${active ? 'stroke-[2.5px] text-emerald-600 dark:text-emerald-400' : 'stroke-2'}`} />
                  
                  {/* Amber locked status indicator dot */}
                  {item.badge && (
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-amber-500 rounded-full border border-white dark:border-zinc-950 animate-pulse" />
                  )}
                  
                  {/* Tooltip on hover (outside container z-[9999] floating) */}
                  <div className="absolute left-16 bg-slate-800 dark:bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-[9999] shadow-lg flex items-center gap-1.5 border border-slate-700/30 dark:border-zinc-800/50">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1 py-0.5 rounded font-sans">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>
      </div>
 
      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-6">
        <Link href="/dashboard/settings" title="Settings">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group border ${
            isActive('/dashboard/settings') 
              ? 'bg-slate-100 dark:bg-zinc-800 border-slate-200/50 dark:border-zinc-700/50 text-emerald-600 dark:text-emerald-400 shadow-sm' 
              : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-zinc-900/60 hover:border-slate-100 dark:hover:border-zinc-800'
          }`}>
            <Settings className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
            
            {/* Settings Tooltip */}
            <div className="absolute left-16 bg-slate-800 dark:bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-[9999] shadow-lg border border-slate-700/30 dark:border-zinc-800/50">
              Settings
            </div>
          </div>
        </Link>

        <form action={logout}>
          <button 
            type="submit"
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 bg-transparent border border-transparent hover:bg-rose-50/80 dark:hover:bg-rose-950/20 hover:border-rose-100/50 dark:hover:border-rose-900/20 transition-all duration-300 group cursor-pointer relative shadow-sm hover:shadow-rose-500/5"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
            
            {/* Sign Out Tooltip */}
            <div className="absolute left-16 bg-slate-800 dark:bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-[9999] shadow-lg border border-slate-700/30 dark:border-zinc-800/50">
              Sign Out
            </div>
          </button>
        </form>
      </div>
    </aside>
  )
}
