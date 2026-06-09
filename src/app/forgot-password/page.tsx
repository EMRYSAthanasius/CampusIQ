'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, AlertCircle, Loader2, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [isRecovery, setIsRecovery] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Detect if we landed here with a recovery session or hash fragment
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      // If we have an active session or a recovery flag in hash/URL
      if (session || window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=')) {
        setIsRecovery(true)
      }
    }
    checkSession()

    // Listen for auth state changes just in case recovery event fires
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage('A password reset link has been sent to your email address.')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to send reset link.')
      }
    } catch {
      setStatus('error')
      setMessage('A network error occurred. Please try again.')
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('Passwords do not match.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setStatus('error')
        setMessage(error.message)
      } else {
        setStatus('success')
        setMessage('Your password has been successfully reset. You can now log in.')
        // Redirect to login after a brief delay
        setTimeout(() => {
          window.location.href = '/auth/login'
        }, 2000)
      }
    } catch {
      setStatus('error')
      setMessage('Failed to update password. Please try again.')
    }
  }

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
            Recover your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E8B57] to-[#6EE7B7]">
              CampusIQ Account.
            </span>
          </h2>
          <p className="text-[#6B7280] text-lg font-light leading-relaxed max-w-md">
            Nigeria&apos;s premier CBT practice and AI learning assistant for science undergraduates.
          </p>
        </div>

        <p className="relative z-10 text-[#9CA3AF] text-sm">© 2026 CampusIQ — Built for Nigerian Science Students</p>
      </div>

      {/* Right Panel — Recovery Form */}
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

          <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#2E8B57] transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          {isRecovery ? (
            /* Set New Password Form */
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#1B4332] tracking-tight">Set New Password</h1>
                <p className="text-[#6B7280] mt-2">Enter a secure new password for your account.</p>
              </div>

              {status === 'success' ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center text-center gap-3">
                  <CheckCircle2 className="w-12 h-12 text-[#2E8B57]" />
                  <h3 className="font-semibold text-[#1B4332] text-lg">Password Changed</h3>
                  <p className="text-sm text-[#6B7280]">{message}</p>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  {status === 'error' && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>{message}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#1B4332]">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-[#1B4332]/10 rounded-xl text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]/50 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#1B4332]">Confirm New Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-[#1B4332]/10 rounded-xl text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]/50 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-3.5 bg-[#2E8B57] hover:bg-[#256d46] disabled:opacity-60 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#2E8B57]/20"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Request Password Reset Email Form */
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#1B4332] tracking-tight">Forgot Password</h1>
                <p className="text-[#6B7280] mt-2">Enter your email and we will send you a secure link to reset your password.</p>
              </div>

              {status === 'success' ? (
                <div className="p-6 rounded-2xl bg-[#2E8B57]/10 border border-[#2E8B57]/20 flex flex-col items-center text-center gap-3">
                  <CheckCircle2 className="w-12 h-12 text-[#2E8B57]" />
                  <h3 className="font-semibold text-[#1B4332] text-lg">Check Your Email</h3>
                  <p className="text-sm text-[#6B7280]">{message}</p>
                  <Link
                    href="/auth/login"
                    className="mt-4 px-6 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#2E8B57] transition-all"
                  >
                    Return to Login
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-5">
                  {status === 'error' && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>{message}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#1B4332]">School or Personal Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@university.edu.ng"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-[#1B4332]/10 rounded-xl text-[#1B4332] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]/50 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-3.5 bg-[#2E8B57] hover:bg-[#256d46] disabled:opacity-60 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#2E8B57]/20"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
