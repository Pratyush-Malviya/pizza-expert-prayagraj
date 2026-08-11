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

