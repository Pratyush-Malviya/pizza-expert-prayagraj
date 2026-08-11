'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || serviceKey === 'your-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel environment variables.')
  }

  return createClient(url, serviceKey)
}

export async function blockCustomer(userId: string) {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    try {
      await admin.auth.admin.signOut(userId, 'global')
    } catch {}

    await admin
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)

    await logAudit({
      action: 'customer.blocked',
      targetTable: 'profiles',
      targetId: userId,
      before: { is_active: true },
      after: { is_active: false },
    })

    revalidatePath('/admin/customers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to block customer' }
  }
}

export async function unblockCustomer(userId: string) {
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
      action: 'customer.unblocked',
      targetTable: 'profiles',
      targetId: userId,
      before: { is_active: false },
      after: { is_active: true },
    })

    revalidatePath('/admin/customers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to unblock customer' }
  }
}

export async function adjustLoyaltyPoints(userId: string, deltaPoints: number, reason: string) {
  try {
    const admin = getSupabaseAdmin()
    const { data: profile, error: fetchErr } = await admin
      .from('profiles')
      .select('loyalty_points')
      .eq('id', userId)
      .single()

    if (fetchErr || !profile) {
      return { success: false, error: fetchErr?.message || 'Customer profile not found' }
    }

    const currentPoints = profile.loyalty_points || 0
    const newPoints = Math.max(0, currentPoints + deltaPoints)

    const { error: updateErr } = await admin
      .from('profiles')
      .update({ loyalty_points: newPoints })
      .eq('id', userId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    await logAudit({
      action: 'customer.loyalty_adjusted',
      targetTable: 'profiles',
      targetId: userId,
      before: { loyalty_points: currentPoints },
      after: { loyalty_points: newPoints, delta: deltaPoints, reason },
    })

    revalidatePath('/admin/customers')
    return { success: true, newPoints }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to adjust loyalty points' }
  }
}

export async function getCustomerDetails(userId: string) {
  try {
    const admin = getSupabaseAdmin()

    // 1. Fetch addresses
    const { data: addresses } = await admin
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })

    // 2. Fetch recent orders
    const { data: orders } = await admin
      .from('orders')
      .select('id, total, status, created_at, order_items(id, quantity, product_name, price)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      success: true,
      addresses: addresses || [],
      orders: orders || [],
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch customer details' }
  }
}

export async function getCustomerAuditLogs(userId: string) {
  try {
    const admin = getSupabaseAdmin()
    const { data: logs } = await admin
      .from('audit_log')
      .select('*')
      .or(`actor_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20)

    return { success: true, logs: logs || [] }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch audit logs' }
  }
}

export async function createCustomer(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = (formData.get('phone') as string) || null
    const role = (formData.get('role') as string) || 'customer'
    const loyaltyPoints = Number(formData.get('loyalty_points') || 0)
    const password = (formData.get('password') as string) || 'PizzaExpert@2026'

    if (!name || !email) {
      return { success: false, error: 'Name and Email are required' }
    }

    const admin = getSupabaseAdmin()
    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // Create user in Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    const userId = authData.user.id

    // Upsert profile
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        name,
        phone,
        role,
        loyalty_points: loyaltyPoints,
        is_active: true,
        invite_status: 'accepted'
      })

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    await logAudit({
      actorId: currentUser?.id,
      action: 'customer.created',
      targetTable: 'profiles',
      targetId: userId,
      after: { name, email, phone, role, loyalty_points: loyaltyPoints }
    })

    revalidatePath('/admin/customers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create user' }
  }
}

export async function updateCustomer(userId: string, data: {
  name: string
  phone?: string | null
  role?: string
  loyalty_points?: number
  is_active?: boolean
}) {
  try {
    const admin = getSupabaseAdmin()
    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    const { data: beforeProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const { error } = await admin
      .from('profiles')
      .update({
        name: data.name,
        phone: data.phone ?? beforeProfile?.phone,
        role: data.role ?? beforeProfile?.role ?? 'customer',
        loyalty_points: data.loyalty_points ?? beforeProfile?.loyalty_points ?? 0,
        is_active: data.is_active ?? beforeProfile?.is_active ?? true
      })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit({
      actorId: currentUser?.id,
      action: 'customer.updated',
      targetTable: 'profiles',
      targetId: userId,
      before: beforeProfile,
      after: data
    })

    revalidatePath('/admin/customers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update customer' }
  }
}

export async function deleteCustomer(userId: string) {
  try {
    const admin = getSupabaseAdmin()
    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    const { data: beforeProfile } = await admin
      .from('profiles')
      .select('id, name, phone, role')
      .eq('id', userId)
      .single()

    // Delete profile
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    // Delete from auth.users if not a guest virtual ID
    if (!userId.startsWith('guest-')) {
      try {
        await admin.auth.admin.deleteUser(userId)
      } catch (e) {
        // Ignore if user isn't in auth.users
      }
    }

    await logAudit({
      actorId: currentUser?.id,
      action: 'customer.deleted',
      targetTable: 'profiles',
      targetId: userId,
      before: beforeProfile
    })

    revalidatePath('/admin/customers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete customer' }
  }
}

export async function seedDemoCustomers() {
  try {
    const admin = getSupabaseAdmin()

    const sampleCustomers = [
      {
        id: '11111111-1111-4111-a111-111111111111',
        name: 'Rahul Sharma',
        phone: '+919876543210',
        role: 'customer',
        loyalty_points: 250,
        is_active: true,
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
      {
        id: '22222222-2222-4222-a222-222222222222',
        name: 'Priya Verma',
        phone: '+919812345678',
        role: 'customer',
        loyalty_points: 480,
        is_active: true,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: '33333333-3333-4333-a333-333333333333',
        name: 'Amit Patel',
        phone: '+919988776655',
        role: 'customer',
        loyalty_points: 120,
        is_active: true,
        created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
      },
      {
        id: '44444444-4444-4444-a444-444444444444',
        name: 'Neha Gupta',
        phone: '+919711223344',
        role: 'customer',
        loyalty_points: 50,
        is_active: false,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
    ]

    for (const cust of sampleCustomers) {
      await admin.from('profiles').upsert(cust)

      // Add sample address
      await admin.from('addresses').upsert({
        id: `addr-${cust.id.slice(0, 8)}`,
        user_id: cust.id,
        label: 'Home',
        line1: 'Civil Lines, Near Subhash Chouraha',
        city: 'Prayagraj',
        state: 'Uttar Pradesh',
        pincode: '211001',
        is_default: true,
      })
    }

    revalidatePath('/admin/customers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to seed sample customers' }
  }
}


