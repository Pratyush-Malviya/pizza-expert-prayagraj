import { createClient } from '@/lib/supabase/server'

export async function requireUser(allowedRoles?: string[]) {
  const authClient = await createClient()
  const { data: { user }, error } = await authClient.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized')
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const { data: profile } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw new Error('Forbidden')
    }
  }
  
  return user
}
