import { SupabaseClient } from '@supabase/supabase-js'

export async function verifyAdminRole(supabase: SupabaseClient): Promise<{ isAdmin: boolean; userId: string | null }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { isAdmin: false, userId: null }
  }

  const { data: profile, error: dbError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (dbError || !profile || profile.role !== 'admin') {
    return { isAdmin: false, userId: user.id }
  }

  return { isAdmin: true, userId: user.id }
}
