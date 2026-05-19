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
  { name: 'Stats', icon: BarChart2, href: '/dashboard/analytics' },
  { name: 'Profile', icon: Settings, href: '/dashboard/settings' },
]

export default function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t z-50 px-2 items-center justify-around" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href)
        return (
          <Link key={item.name} href={item.href} className="relative flex flex-col items-center justify-center w-full h-full gap-1">
            <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${
              active ? 'text-[#2E8B57]' : 'text-[#9CA3AF]'
            }`}>
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 bg-[#2E8B57]/10 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
            </div>
            <span className={`text-[10px] font-medium transition-colors ${
              active ? 'text-[#1B4332]' : 'text-[#9CA3AF]'
            }`}>
              {item.name}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
