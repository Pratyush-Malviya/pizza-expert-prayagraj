import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function requireUser(allowedRoles?: string[]) {
  const authClient = await createClient()
  const { data: { user }, error } = await authClient.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized')
  }

  // Super admin / Owner email always bypasses role restrictions
  const isOwnerOrSuperAdmin = 
    user.email === 'malviya.pratyush26@gmail.com' || 
    user.user_metadata?.role === 'super_admin'

  if (isOwnerOrSuperAdmin) {
    return user
  }

  if (allowedRoles && allowedRoles.length > 0) {
    let role = user.user_metadata?.role

    try {
      // Use admin client to reliably check profile status without RLS recursion
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        if (profile.is_active === false) {
          throw new Error('Account deactivated')
        }
        role = profile.role
      }
    } catch (e: any) {
      if (e.message === 'Account deactivated') throw e
      // Fallback to authClient check
      const { data: profile } = await authClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role) {
        role = profile.role
      }
    }

    if (role === 'super_admin' || role === 'admin') return user
    if (role === 'manager' && (allowedRoles.includes('staff') || allowedRoles.includes('cashier') || allowedRoles.includes('waiter') || allowedRoles.includes('manager'))) {
      return user
    }

    if (!role || !allowedRoles.includes(role)) {
      throw new Error(`Forbidden: Access requires ${allowedRoles.join(', ')} privileges.`)
    }
  }
  
  return user
}

