'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home,
  Library,
  FileText,
  BarChart2,
  Clock,
  Settings,
  GraduationCap,
  LogOut,
  Shield,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import type { Profile } from '@/types/database'

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

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <aside className="glass w-[260px] h-screen flex flex-col hidden lg:flex sticky top-0 left-0 shrink-0">
      {/* Logo */}
      <div className="p-6 pb-4 flex items-center gap-3 shrink-0">
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-xl">
          <GraduationCap className="w-5 h-5 text-indigo-400" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-50">
          Campus<span className="font-light text-slate-500">IQ</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1 px-3 space-y-0.5 overflow-y-auto hide-scrollbar">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.15em] mb-2 px-3 mt-2">
          Student Portal
        </div>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.name} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                active
                  ? 'bg-indigo-500/8 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
              }`}>
                {active && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-500"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <item.icon className={`w-[18px] h-[18px] ${active ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'} transition-colors`} />
                <span className={`text-[13px] font-medium transition-colors`}>
                  {item.name}
                </span>
              </div>
            </Link>
          )
        })}

        {profile?.role === 'admin' && (
          <>
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.15em] mb-2 px-3 mt-5">
              Administration
            </div>
            <Link href="/admin">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                isActive('/admin')
                  ? 'bg-amber-500/8 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
              }`}>
                <Shield className={`w-[18px] h-[18px] ${isActive('/admin') ? 'text-amber-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                <span className="text-[13px] font-medium">Admin Panel</span>
              </div>
            </Link>
          </>
        )}

        <div className="pt-2">
          <Link href="/dashboard/settings">
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              isActive('/dashboard/settings')
                ? 'bg-white/5 text-slate-100'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
            }`}>
              <Settings className="w-[18px] h-[18px] text-slate-600 group-hover:text-slate-400 transition-colors" />
              <span className="text-[13px] font-medium">Settings</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* Profile */}
      <div className="p-3 mt-auto">
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/[0.04]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-200 truncate">
                {profile?.full_name || 'Student'}
              </p>
              <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">
                {profile?.subscription_status === 'pro' ? 'Pro Plan' : 'Free Plan'}
              </p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-slate-600 hover:text-red-400 hover:bg-red-500/8 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
