'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Library, 
  FileText, 
  BarChart2, 
  Settings 
} from 'lucide-react'
import { motion } from 'framer-motion'

const NAV_ITEMS = [
  { name: 'Home', icon: Home, href: '/dashboard' },
  { name: 'Courses', icon: Library, href: '/dashboard/courses' },
  { name: 'Exams', icon: FileText, href: '/dashboard/exams' },
  { name: 'Analytics', icon: BarChart2, href: '/dashboard/analytics' },
  { name: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

export default function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 z-50 px-2 pt-2 items-center justify-around" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href)
        return (
          <Link key={item.name} href={item.href} className="relative flex flex-col items-center justify-center w-full gap-1 pb-1 group">
            <div className={`relative p-2 rounded-xl transition-all duration-300 border ${
              active 
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/30 dark:border-emerald-900/20 shadow-sm shadow-emerald-500/5' 
                : 'text-slate-450 dark:text-zinc-500 bg-transparent border-transparent hover:text-emerald-650'
            }`}>
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-xl -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <span className={`text-[10px] font-bold tracking-wide transition-colors ${
              active ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-500 dark:text-zinc-400'
            }`}>
              {item.name}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
