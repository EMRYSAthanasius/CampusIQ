import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Explicitly select only columns that physically exist in public.profiles table
  // to avoid 'Could not find column in schema cache' or 'column does not exist' database errors.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, subscription_status, created_at, updated_at')
    .eq('id', user.id)
    .single()

  // Retrieve academic details and notification states directly from Supabase Auth user_metadata
  // which behaves as a highly reliable, real-time fallback store.
  const mergedProfile = {
    ...profile,
    full_name: profile?.full_name || user.user_metadata?.full_name || '',
    university: user.user_metadata?.university || '',
    faculty: user.user_metadata?.faculty || 'Science',
    department: user.user_metadata?.department || '',
    level: user.user_metadata?.level || 100,
    notifications: user.user_metadata?.notifications || {
      streak: true,
      materials: true,
      performance: false
    }
  }

  return <SettingsClient initialProfile={mergedProfile as any} />
}
