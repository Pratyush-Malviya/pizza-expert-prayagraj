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
