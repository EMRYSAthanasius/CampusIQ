'use client'

import { useState, useRef } from 'react'
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
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '@/components/Sidebar'

interface SettingsClientProps {
  initialProfile: Profile | null
}

export default function SettingsClient({ initialProfile }: SettingsClientProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [fullName, setFullName] = useState(initialProfile?.full_name || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage(null)

      // 1. Get current user session to ensure we have a valid ID
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('You must be logged in to update your profile.')
      }

      console.log('Target User ID:', user.id)

      // 2. Perform update
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)


      if (error) throw error

      setProfile(prev => prev ? { ...prev, full_name: fullName } : null)
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      console.error('Update failed:', error)
      setMessage({ type: 'error', text: error.message || 'Error updating profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setMessage(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('You must be logged in to upload a profile picture.')
      }
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `avatars/${fileName}`


      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}. Make sure the 'avatars' bucket exists and is public.`)
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 3. Update Profile in DB
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)


      if (updateError) {
        console.error('Update error:', updateError)
        throw new Error('Failed to update profile record.')
      }

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      setMessage({ type: 'success', text: 'Profile picture updated successfully!' })
      
      // Auto-hide success message
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      console.error('Profile update failed:', error)
      setMessage({ type: 'error', text: error.message || 'Error updating profile picture' })
    } finally {
      setUploading(false)
    }
  }


  const initials = getInitials(profile?.full_name)

  return (
    <div className="flex min-h-screen bg-[#F3FAF6]">
      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 px-8 flex items-center justify-between border-b border-[#1B4332]/[0.06] shrink-0 bg-white/60 backdrop-blur-xl">
          <div>
            <h1 className="text-lg font-semibold text-[#1B4332]">Settings</h1>
            <p className="text-[11px] text-[#9CA3AF] font-mono uppercase tracking-wider">Account & Preference Management</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Profile Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#1B4332]/[0.06] rounded-3xl p-8 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-[0.15em] mb-8">Personal Profile</h2>
              
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar Display */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#2E8B57] to-[#6EE7B7] flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-lg border-4 border-white relative">
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
                    className="absolute -bottom-2 -right-2 p-2.5 bg-[#2E8B57] text-white rounded-xl shadow-lg hover:bg-[#256d46] transition-all hover:scale-110 active:scale-95 disabled:opacity-50 z-30"
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
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1 block">Display Name</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name"
                          className="flex-1 bg-[#F3FAF6] border border-[#1B4332]/[0.06] rounded-xl px-4 py-2.5 text-[#1B4332] text-sm focus:outline-none focus:ring-2 focus:ring-[#2E8B57]/20 transition-all font-semibold"
                        />
                        <button 
                          type="submit"
                          disabled={saving || fullName === profile?.full_name}
                          className="px-4 py-2.5 bg-[#2E8B57] text-white rounded-xl text-xs font-bold hover:bg-[#256d46] disabled:opacity-50 disabled:bg-[#9CA3AF] transition-all whitespace-nowrap"
                        >
                          {saving ? 'Saving...' : 'Save Name'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <p className="text-[#6B7280] text-sm">{profile?.university || 'University Student'} • {profile?.department || 'Institution'}</p>
                      
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2E8B57]/8 border border-[#2E8B57]/15 w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2E8B57] animate-pulse" />
                        <span className="text-[10px] font-bold text-[#2E8B57] uppercase tracking-wider">
                          {profile?.subscription_status === 'pro' ? 'Pro Member' : 'Free Account'}
                        </span>
                      </div>
                    </div>
                  </form>
                </div>

              </div>

              {/* Status Message */}
              <AnimatePresence>
                {message && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-8 p-4 rounded-2xl flex items-center gap-3 overflow-hidden ${
                      message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}
                  >
                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="text-sm font-medium">{message.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Other Settings Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Shield, label: 'Security & Password', desc: 'Manage your authentication' },
                { icon: Bell, label: 'Notification Settings', desc: 'Choose what you hear' },
                { icon: User, label: 'Academic Details', desc: 'University, Faculty, Level' },
                { icon: SettingsIcon, label: 'App Preferences', desc: 'Theme and language' },
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-3xl bg-white/70 border border-[#1B4332]/[0.06] flex items-start gap-4 hover:border-[#2E8B57]/20 transition-all cursor-not-allowed group">
                  <div className="p-3 rounded-2xl bg-[#F3FAF6] text-[#2E8B57] group-hover:scale-110 transition-transform">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1B4332] text-sm mb-1">{item.label}</h4>
                    <p className="text-xs text-[#9CA3AF]">{item.desc}</p>
                    <span className="inline-block mt-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">Coming Soon</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
