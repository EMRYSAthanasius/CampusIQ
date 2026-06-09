'use client'

import { Suspense, useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, type AuthState } from '@/app/actions/auth'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'

const initialState: AuthState = undefined

function LoginPageContent() {
  const [state, action, pending] = useActionState(login, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const wasRedirected = searchParams.get('redirect') === 'protected'


  return (
    <div className="min-h-screen bg-[#F3FAF6] flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#e8f5ee] to-[#F3FAF6] border-r border-[#1B4332]/[0.06] p-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-96 h-96 bg-[#2E8B57]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-[#6EE7B7]/15 rounded-full blur-[80px]" />
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="CampusIQ Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-[#1B4332] font-sora">
            Campus<span className="text-[#2E8B57]">IQ</span>
          </span>
        </Link>

        <div className="relative z-10">
          <h2 className="text-5xl font-semibold text-[#1B4332] tracking-tight leading-tight mb-6">
            Your academic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E8B57] to-[#6EE7B7]">
              edge starts here.
            </span>
          </h2>
          <p className="text-[#6B7280] text-lg font-light leading-relaxed max-w-md">
            Access 5,000+ past exam questions across 14 100-level science courses. Practice smarter, score higher.
          </p>

          <div className="mt-12 space-y-4">
            {[
              { stat: '14', label: 'Science Courses' },
              { stat: '5,000+', label: 'Past Questions' },
              { stat: '100%', label: 'Exam Focused' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-[#1B4332]/[0.06] flex items-center justify-center shadow-sm">
                  <span className="text-lg font-sans font-bold text-[#2E8B57]">{item.stat}</span>
                </div>
                <span className="text-[#1B4332] font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[#9CA3AF] text-sm">© 2026 CampusIQ — Built for Nigerian Science Students</p>
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
          <Link href="/" className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-10 h-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="CampusIQ Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#1B4332] font-sora">
              Campus<span className="text-[#2E8B57]">IQ</span>
            </span>
          </Link>

          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#2E8B57] transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {wasRedirected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-[#2E8B57]/10 border border-[#2E8B57]/20 flex items-start gap-3"
            >
              <Lock className="w-5 h-5 text-[#2E8B57] shrink-0 mt-0.5" />
              <p className="text-sm text-[#1B4332]">Sign in to access your courses and dashboard.</p>
            </motion.div>
          )}

          <h1 className="text-3xl font-semibold text-[#1B4332] mb-2">Welcome back</h1>
          <p className="text-[#6B7280] mb-10 font-light">
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
              <label htmlFor="email" className="block text-sm font-medium text-[#1B4332] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@university.edu.ng"
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#1B4332]/10 rounded-xl text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]/50 focus:border-[#2E8B57]/50 transition-all text-sm"
                />
              </div>
              {state?.errors?.email && (
                <p className="mt-1.5 text-xs text-red-400">{state.errors.email[0]}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-[#1B4332]">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-[#2E8B57] hover:text-[#256d46] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-white border border-[#1B4332]/10 rounded-xl text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]/50 focus:border-[#2E8B57]/50 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
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
              className="w-full py-3.5 bg-[#2E8B57] hover:bg-[#256d46] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#2E8B57]/20 hover:shadow-[#2E8B57]/30 mt-6"
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

          <p className="text-center text-sm text-[#6B7280] mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-[#2E8B57] hover:text-[#256d46] font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}
