'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

import { isPrimarySuperAdmin } from '@/lib/auth/rbac'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || serviceKey === 'your-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel environment variables. Please set a valid Supabase service_role key.')
  }

  return createClient(url, serviceKey)
}

export async function inviteStaffMember(formData: FormData) {
  try {
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const role = formData.get('role') as string
    const department = (formData.get('department') as string) || null

    if (!email || !name || !role) {
      return { success: false, error: 'Name, email, and role are required' }
    }

    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // 1. Invite user via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(
      email,
      { data: { name, role } }
    )

    if (inviteError) {
      return { success: false, error: inviteError.message }
    }

    const userId = inviteData.user.id

    // 2. Insert/Update the profile
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .upsert({
        id: userId,
        name: name,
        role: role,
        is_active: true,
        invite_status: 'pending',
        invited_by: currentUser?.id || null,
      })

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    // 3. Insert staff details if department provided
    if (department) {
      await getSupabaseAdmin()
        .from('staff_details')
        .upsert({
          id: userId,
          department: department,
          updated_at: new Date().toISOString(),
        })
    }

    // 4. Log Audit Event
    await logAudit({
      actorId: currentUser?.id,
      action: 'staff.invited',
      targetTable: 'profiles',
      targetId: userId,
      after: { email, name, role, department, invite_status: 'pending' },
    })

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function updateStaffRole(userId: string, newRole: string) {
  try {
    if ((isPrimarySuperAdmin(userId) || userId.toLowerCase() === 'usr-01') && newRole !== 'super_admin') {
      return {
        success: false,
        error: '👑 Super Admin accounts are permanently locked and cannot be demoted from the Super Admin role.',
      }
    }

    const admin = getSupabaseAdmin()
    const { data: beforeProfile } = await admin.from('profiles').select('role, name').eq('id', userId).single()

    if (beforeProfile?.role === 'super_admin' && newRole !== 'super_admin') {
      return {
        success: false,
        error: '👑 Super Admin accounts are permanently locked and cannot be demoted from the Super Admin role.',
      }
    }

    const { error } = await admin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit({
      action: 'staff.role_changed',
      targetTable: 'profiles',
      targetId: userId,
      before: { role: beforeProfile?.role },
      after: { role: newRole },
    })

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function deactivateStaffMember(userId: string) {
  try {
    if (isPrimarySuperAdmin(userId) || userId.toLowerCase() === 'usr-01') {
      return {
        success: false,
        error: '👑 Super Admin accounts are permanently protected and cannot be deactivated.',
      }
    }

    const admin = getSupabaseAdmin()
    const { data: beforeProfile } = await admin.from('profiles').select('is_active, role, name').eq('id', userId).single()

    if (beforeProfile?.role === 'super_admin') {
      return {
        success: false,
        error: '👑 Super Admin accounts are permanently protected and cannot be deactivated.',
      }
    }

    const { error } = await admin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Revoke user authentication sessions
    try {
      await admin.auth.admin.signOut(userId, 'global')
    } catch {
      // SignOut global might fail if user has no active auth token session, continue safely
    }

    // Mark user sessions as revoked in custom user_sessions table
    await admin
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)

    await logAudit({
      action: 'staff.deactivated',
      targetTable: 'profiles',
      targetId: userId,
      before: { is_active: beforeProfile?.is_active },
      after: { is_active: false },
    })

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to deactivate staff member' }
  }
}

export async function reactivateStaffMember(userId: string) {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('profiles')
      .update({ is_active: true })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit({
      action: 'staff.reactivated',
      targetTable: 'profiles',
      targetId: userId,
      before: { is_active: false },
      after: { is_active: true },
    })

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reactivate staff member' }
  }
}

export async function updateStaffDetails(userId: string, department: string, employeeCode?: string) {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('staff_details')
      .upsert({
        id: userId,
        department,
        employee_code: employeeCode || null,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit({
      action: 'staff.details_updated',
      targetTable: 'staff_details',
      targetId: userId,
      after: { department, employeeCode },
    })

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update staff details' }
  }
}

