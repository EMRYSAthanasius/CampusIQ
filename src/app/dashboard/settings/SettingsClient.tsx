'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database'
import { 
  Camera, 
  Loader2, 
  User, 
  Shield, 
  Bell, 
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Moon,
  Sun
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '@/components/Sidebar'
import { useTheme } from 'next-themes'

interface ExtendedProfile extends Omit<Profile, 'university' | 'faculty' | 'department' | 'level'> {
  university?: string | null
  faculty?: string | null
  department?: string | null
  level?: number | null
  notifications?: {
    streak: boolean
    materials: boolean
    performance: boolean
  }
}

interface SettingsClientProps {
  initialProfile: ExtendedProfile | null
}

type TabType = 'profile' | 'security' | 'notifications' | 'academic' | 'preferences'

export default function SettingsClient({ initialProfile }: SettingsClientProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [fullName, setFullName] = useState(initialProfile?.full_name || '')
  
  // Tab Management
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  // Academic Details
  const [university, setUniversity] = useState(initialProfile?.university || '')
  const [faculty, setFaculty] = useState(initialProfile?.faculty || 'Science')
  const [department, setDepartment] = useState(initialProfile?.department || '')
  const [level, setLevel] = useState(initialProfile?.level || 100)

  // Security
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Preferences (Global next-themes)
  const { theme, setTheme } = useTheme()

  // Notifications states
  const [notifStreak, setNotifStreak] = useState(initialProfile?.notifications?.streak ?? true)
  const [notifMaterials, setNotifMaterials] = useState(initialProfile?.notifications?.materials ?? true)
  const [notifPerformance, setNotifPerformance] = useState(initialProfile?.notifications?.performance ?? false)

  // Loading/UI states
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('You must be logged in to update your profile.')
      }

      // 1. Update the profiles DB table (holds id, full_name, avatar_url)
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) throw error

      // 2. Sync to auth user_metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName }
      })

      setProfile(prev => prev ? { ...prev, full_name: fullName } : null)
      setMessage({ type: 'success', text: 'Display name updated successfully!' })
      router.refresh()
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      console.error('Update failed:', error)
      setMessage({ type: 'error', text: error.message || 'Error updating profile' })
    } finally {
      setSaving(false)
    }
  }

  // Refactored to update Auth user_metadata rather than database profiles table,
  // bypassing missing database column problems beautifully!
  const handleAcademicUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('You must be logged in to update your academic details.')
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          university,
          faculty,
          department,
          level: Number(level)
        }
      })

      if (error) throw error

      setProfile(prev => prev ? { 
        ...prev, 
        university, 
        faculty, 
        department, 
        level: Number(level) as any 
      } : null)
      setMessage({ type: 'success', text: 'Academic details updated successfully!' })
      router.refresh()
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      console.error('Academic update failed:', error)
      setMessage({ type: 'error', text: error.message || 'Error updating academic details' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match!' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      console.error('Password update failed:', error)
      setMessage({ type: 'error', text: error.message || 'Error updating password' })
    } finally {
      setSaving(false)
    }
  }

  // Refactored to dynamically handle auto-saving notification toggles into user_metadata
  const handleToggleNotification = async (key: 'streak' | 'materials' | 'performance', value: boolean) => {
    let nextStreak = notifStreak
    let nextMaterials = notifMaterials
    let nextPerformance = notifPerformance

    if (key === 'streak') {
      setNotifStreak(value)
      nextStreak = value
    } else if (key === 'materials') {
      setNotifMaterials(value)
      nextMaterials = value
    } else if (key === 'performance') {
      setNotifPerformance(value)
      nextPerformance = value
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.auth.updateUser({
          data: {
            notifications: {
              streak: nextStreak,
              materials: nextMaterials,
              performance: nextPerformance
            }
          }
        })
      }
    } catch (err) {
      console.error('Failed to auto-save notification config:', err)
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setMessage(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to upload a profile picture.')
      }

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${user.id}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      setMessage({ type: 'success', text: 'Profile picture updated successfully!' })
      router.refresh()
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      console.error('Profile picture update failed:', error)
      setMessage({ type: 'error', text: error.message || 'Error updating profile picture' })
    } finally {
      setUploading(false)
    }
  }

  const initials = getInitials(profile?.full_name)

  const cards = [
    { id: 'security' as TabType, icon: Shield, label: 'Security & Password', desc: 'Manage your authentication credentials' },
    { id: 'notifications' as TabType, icon: Bell, label: 'Notification Settings', desc: 'Manage study streaks and reminders' },
    { id: 'academic' as TabType, icon: User, label: 'Academic Details', desc: 'Set University, Faculty, Level and Department' },
    { id: 'preferences' as TabType, icon: SettingsIcon, label: 'App Preferences', desc: 'Configure themes, light and dark modes' },
  ]

  // Dynamic status check (Free Account, Pro Member, Ultra Member, etc.)
  const subscriptionLabel = (() => {
    const status = profile?.subscription_status || 'free'
    if (status === 'free') return 'Free Account'
    return `${status.charAt(0).toUpperCase() + status.slice(1)} Member`
  })()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
      <Sidebar profile={profile as any} />

      <main className="w-full min-h-screen pt-4 pb-24 px-4 md:pl-72 md:pr-8 md:pt-8 flex flex-col">
        <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-slate-100/50 dark:border-zinc-800/50 shrink-0 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-xl z-20">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-heading">Settings</h1>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest font-mono">Account & Preference Management</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-10 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Status Message */}
            <AnimatePresence>
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${
                    message.type === 'success' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-850 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30' 
                      : 'bg-red-50 dark:bg-red-950/30 text-red-850 dark:text-red-300 border-red-100 dark:border-red-900/30'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <span className="text-sm font-medium">{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Profile Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2rem] p-8 shadow-sm"
            >
              <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6 font-mono">Personal Profile</h2>
              
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar Display */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-3xl font-black text-white overflow-hidden shadow-lg border-4 border-white dark:border-zinc-800 relative">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name || 'Scholar'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="relative z-10">{initials}</span>
                    )}
                    
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px] z-20">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-2 -right-2 p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 z-30 cursor-pointer"
                    title="Upload profile picture"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left w-full">
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-1.5 block font-mono">Display Name</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name"
                          className="flex-1 bg-slate-100/70 text-slate-900 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
                        />
                        <button 
                          type="submit"
                          disabled={saving || fullName === profile?.full_name}
                          className="px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-450 dark:disabled:bg-zinc-800 transition-all whitespace-nowrap cursor-pointer shadow-sm"
                        >
                          {saving ? 'Saving...' : 'Save Name'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <p className="text-slate-550 dark:text-zinc-400 text-sm font-semibold">
                        {profile?.university || 'University student'} • {profile?.faculty || 'Science'} • {profile?.department || 'Department not set'}
                      </p>
                      
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/30 w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">
                          {subscriptionLabel}
                        </span>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Interactive Settings Tab Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map((item) => {
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(isActive ? 'profile' : item.id)}
                    className={`p-6 rounded-3xl bg-white dark:bg-zinc-900 border text-left flex items-start gap-4 transition-all group relative cursor-pointer ${
                      isActive 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-lg' 
                        : 'border-slate-100 dark:border-zinc-800 hover:border-emerald-500/30 shadow-sm'
                    }`}
                  >
                    <div className={`p-3.5 rounded-2xl transition-transform group-hover:scale-110 ${
                      isActive ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 pr-6">
                      <h4 className="font-bold text-slate-900 dark:text-zinc-50 text-sm mb-1">{item.label}</h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Dynamic Settings Sub-Panels */}
            <AnimatePresence mode="wait">
              {activeTab !== 'profile' && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2rem] p-8 shadow-md"
                >
                  
                  {/* TAB 1: Security & Password */}
                  {activeTab === 'security' && (
                    <form onSubmit={handlePasswordUpdate} className="space-y-6">
                      <div className="flex items-center gap-3 mb-2 border-b border-slate-100 dark:border-zinc-800 pb-4">
                        <Shield className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50 font-heading">Security & Password</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                          <label className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-1.5 block font-mono">New Password</label>
                          <input 
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            className="w-full bg-slate-100/70 text-slate-900 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 rounded-2xl px-5 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-10 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="relative">
                          <label className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-1.5 block font-mono">Confirm New Password</label>
                          <input 
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Match your password"
                            className="w-full bg-slate-100/70 text-slate-900 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 rounded-2xl px-5 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-10 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          type="submit"
                          disabled={saving || !newPassword || !confirmPassword}
                          className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:bg-slate-400 shadow-md shadow-emerald-100 dark:shadow-none cursor-pointer"
                        >
                          {saving ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 2: Notification Settings (Auto-saving toggle handlers) */}
                  {activeTab === 'notifications' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2 border-b border-slate-100 dark:border-zinc-800 pb-4">
                        <Bell className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50 font-heading">Notification Settings</h3>
                      </div>

                      <div className="space-y-5">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-zinc-50">Study Streak Alerts</p>
                            <p className="text-xs text-slate-550 dark:text-zinc-400">Get notified to maintain your weekly academic streaks.</p>
                          </div>
                          <button
                            onClick={() => handleToggleNotification('streak', !notifStreak)}
                            className={`w-12 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${notifStreak ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-850'}`}
                          >
                            <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute shadow ${notifStreak ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-zinc-50">New Study Materials</p>
                            <p className="text-xs text-slate-550 dark:text-zinc-400">Get alerts when new level manuals or past questions are uploaded.</p>
                          </div>
                          <button
                            onClick={() => handleToggleNotification('materials', !notifMaterials)}
                            className={`w-12 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${notifMaterials ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-850'}`}
                          >
                            <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute shadow ${notifMaterials ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-zinc-50">Performance Diagnostics</p>
                            <p className="text-xs text-slate-550 dark:text-zinc-400">Weekly email summaries analyzing your strengths and consistency.</p>
                          </div>
                          <button
                            onClick={() => handleToggleNotification('performance', !notifPerformance)}
                            className={`w-12 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${notifPerformance ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-850'}`}
                          >
                            <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute shadow ${notifPerformance ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Academic Details */}
                  {activeTab === 'academic' && (
                    <form onSubmit={handleAcademicUpdate} className="space-y-6">
                      <div className="flex items-center gap-3 mb-2 border-b border-slate-100 dark:border-zinc-800 pb-4">
                        <User className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50 font-heading">Academic Profile</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-1.5 block font-mono">University</label>
                          <input 
                            type="text"
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            placeholder="e.g. University of Ibadan"
                            className="w-full bg-slate-100/70 text-slate-900 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-1.5 block font-mono">Faculty</label>
                          <input 
                            type="text"
                            value={faculty}
                            onChange={(e) => setFaculty(e.target.value)}
                            placeholder="e.g. Science"
                            className="w-full bg-slate-100/70 text-slate-900 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-1.5 block font-mono">Department</label>
                          <input 
                            type="text"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            placeholder="e.g. Chemistry"
                            className="w-full bg-slate-100/70 text-slate-900 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-1.5 block font-mono">Cohort Level</label>
                          <select 
                            value={level}
                            onChange={(e) => setLevel(Number(e.target.value) as 100 | 200 | 300 | 400 | 500)}
                            disabled
                            className="w-full bg-slate-200/50 dark:bg-zinc-900/50 border border-slate-300 dark:border-zinc-800 rounded-2xl px-5 py-3 text-slate-500 dark:text-zinc-455 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold cursor-not-allowed"
                          >
                            <option value={100}>100 Level (Locked Cohort)</option>
                            <option value={200}>200 Level</option>
                            <option value={300}>300 Level</option>
                            <option value={400}>400 Level</option>
                          </select>
                          <span className="text-[9px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-mono block mt-1">Locked for early cohort beta release</span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          type="submit"
                          disabled={saving || (
                            university === profile?.university &&
                            faculty === profile?.faculty &&
                            department === profile?.department
                          )}
                          className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:bg-slate-450 dark:disabled:bg-zinc-800 shadow-md shadow-emerald-100 dark:shadow-none cursor-pointer"
                        >
                          {saving ? 'Updating...' : 'Update Details'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 4: App Preferences (Theme Toggling) */}
                  {activeTab === 'preferences' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2 border-b border-slate-100 dark:border-zinc-800 pb-4">
                        <SettingsIcon className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50 font-heading">App Preferences & Theme</h3>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-slate-900 dark:text-zinc-50 uppercase tracking-widest mb-4 block font-mono">Workspace Color Theme</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => setTheme('light')}
                            className={`cursor-pointer p-6 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-3 w-full ${
                              theme === 'light' 
                                ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-600 font-bold' 
                                : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:border-emerald-500/20'
                            }`}
                          >
                            <Sun className="w-8 h-8" />
                            <div className="text-center">
                              <p className="text-sm font-bold text-slate-900 dark:text-zinc-50">Light Mode</p>
                              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Original mint design system</p>
                            </div>
                          </button>

                          <button
                            onClick={() => setTheme('dark')}
                            className={`cursor-pointer p-6 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-3 w-full ${
                              theme === 'dark' 
                                ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-600 font-bold' 
                                : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:border-emerald-500/20'
                            }`}
                          >
                            <Moon className="w-8 h-8" />
                            <div className="text-center">
                              <p className="text-sm font-bold text-slate-900 dark:text-zinc-50">Dark Mode</p>
                              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Professional standard dark charcoal</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </main>
    </div>
  )
}
