'use client'

import { useActionState, useState } from 'react'
import { login, type AuthState } from '@/app/actions/auth'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

const initialState: AuthState = undefined

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#162033] to-[#0F172A] border-r border-white/[0.04] p-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-semibold tracking-tight text-white">
            Campus<span className="font-light text-slate-400">IQ</span>
          </span>
        </div>

        <div className="relative z-10">
          <h2 className="text-5xl font-semibold text-white tracking-tight leading-tight mb-6">
            Your academic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              edge starts here.
            </span>
          </h2>
          <p className="text-slate-400 text-lg font-light leading-relaxed max-w-md">
            Access 5,000+ past exam questions across 14 100-level science courses. Practice smarter, score higher.
          </p>

          <div className="mt-12 space-y-4">
            {[
              { stat: '14', label: 'Science Courses' },
              { stat: '5,000+', label: 'Past Questions' },
              { stat: '100%', label: 'Exam Focused' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1E293B] border border-white/[0.06] flex items-center justify-center">
                  <span className="text-lg font-mono font-bold text-indigo-400">{item.stat}</span>
                </div>
                <span className="text-slate-300 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-sm">© 2026 CampusIQ — Built for Nigerian Science Students</p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 rounded-xl">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-white">
              Campus<span className="font-light text-slate-400">IQ</span>
            </span>
          </div>

          <h1 className="text-3xl font-semibold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 mb-10 font-light">
            Sign in to access your courses and progress.
          </p>

          {state?.message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{state.message}</p>
            </motion.div>
          )}

          <form action={action} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@university.edu.ng"
                  className="w-full pl-11 pr-4 py-3.5 bg-[#1E293B] border border-white/[0.06] rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                />
              </div>
              {state?.errors?.email && (
                <p className="mt-1.5 text-xs text-red-400">{state.errors.email[0]}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-[#1E293B] border border-white/[0.06] rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {state?.errors?.password && (
                <p className="mt-1.5 text-xs text-red-400">{state.errors.password[0]}</p>
              )}
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={pending}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 mt-6"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
