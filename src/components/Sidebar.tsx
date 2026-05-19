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
  Shield,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'


const NAV_ITEMS = [
  { name: 'Dashboard', icon: Home, href: '/dashboard' },
  { name: 'Course Library', icon: Library, href: '/dashboard/courses' },
  { name: 'Mock Exams', icon: FileText, href: '/dashboard/exams' },
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

  const NAV_ITEMS = [
    { name: 'Dashboard', icon: Home, href: '/dashboard' },
    { name: 'Library', icon: Library, href: '/dashboard/courses' },
    { name: 'Exams', icon: FileText, href: '/dashboard/exams' },
    { name: 'Analytics', icon: BarChart2, href: '/dashboard/analytics' },
  ]

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 fixed left-0 top-0 h-screen bg-white dark:bg-zinc-950 border-r border-slate-100 dark:border-zinc-900 justify-between py-8 z-50 transition-all duration-300">
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
              <Link key={item.name} href={item.href} title={item.name}>
                <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group ${
                  active 
                    ? 'bg-emerald-50 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400' 
                    : 'text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-zinc-800/50'
                }`}>
                  {active && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute -left-4 w-1.5 h-6 bg-emerald-600 dark:bg-emerald-400 rounded-r-full"
                    />
                  )}
                  <item.icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  
                  {/* Tooltip on hover */}
                  <div className="absolute left-16 bg-slate-800 dark:bg-zinc-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.name}
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
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group ${
            isActive('/dashboard/settings') 
              ? 'bg-slate-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400' 
              : 'text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
          }`}>
            <Settings className="w-5 h-5" />
          </div>
        </Link>

        <form action={logout}>
          <button 
            type="submit"
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all group"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </form>
      </div>
    </aside>
  )
}
