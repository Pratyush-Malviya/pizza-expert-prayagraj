'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

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

    if (!email || !name || !role) {
      return { success: false, error: 'All fields are required' }
    }

    // 1. Invite the user via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(
      email,
      { data: { name, role } }
    )

    if (inviteError) {
      return { success: false, error: inviteError.message }
    }

    const userId = inviteData.user.id

    // 2. Insert/Update the profile with the assigned role
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .upsert({
        id: userId,
        name: name,
        role: role,
      })

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function updateStaffRole(userId: string, newRole: string) {
  try {
    const { error } = await getSupabaseAdmin()
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}
