'use client'

import { useActionState, useState } from 'react'
import { signup, type AuthState } from '@/app/actions/auth'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, User, AlertCircle, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

const initialState: AuthState = undefined

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a letter', test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'Contains a number', test: (p: string) => /[0-9]/.test(p) },
]

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#162033] to-[#0F172A] border-r border-white/5 p-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-40 left-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-40 right-10 w-60 h-60 bg-purple-600/10 rounded-full blur-[80px]" />
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
            Join thousands of<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              top performers.
            </span>
          </h2>
          <p className="text-slate-400 text-lg font-light leading-relaxed max-w-md">
            Stop cramming scattered PDFs. Start practicing structured past questions with instant feedback and progress analytics.
          </p>

          <div className="mt-12 space-y-5">
            {[
              'Free access to practice quizzes for all 14 courses',
              'Detailed explanations for every question',
              'Track your performance and identify weak areas',
              'Built specifically for Nigerian 100-level science students',
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-slate-300 font-light">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-sm">© 2026 CampusIQ — Your Exam Partner</p>
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

          <h1 className="text-3xl font-semibold text-white mb-2">Create your account</h1>
          <p className="text-slate-400 mb-10 font-light">
            Start for free. No credit card required.
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
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Chidi Okeke"
                  className="w-full pl-11 pr-4 py-3.5 bg-[#1E293B] border border-white/[0.06] rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                />
              </div>
              {state?.errors?.full_name && (
                <p className="mt-1.5 text-xs text-red-400">{state.errors.full_name[0]}</p>
              )}
            </div>

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
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              {/* Password strength indicators */}
              {password.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {passwordRequirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${req.test(password) ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-white/5 border border-white/[0.06]'}`}>
                        {req.test(password) && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      </div>
                      <span className={`text-xs ${req.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {state?.errors?.password && (
                <p className="mt-1.5 text-xs text-red-400">{state.errors.password[0]}</p>
              )}
            </div>

            <button
              type="submit"
              id="signup-submit-btn"
              disabled={pending}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 mt-6"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Free Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-slate-600 mt-4 leading-relaxed">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
