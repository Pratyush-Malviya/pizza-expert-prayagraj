'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function updateNotificationPreferences(prefs: {
  email_orders: boolean
  email_marketing: boolean
  sms_orders: boolean
  sms_marketing: boolean
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: prefs })
      .eq('id', user.id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/account/profile')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update preferences' }
  }
}

export async function exportMyData() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Fetch Addresses
    const { data: addresses } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)

    // Fetch Orders & Order Items
    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)

    const exportBlob = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: profile || {},
      addresses: addresses || [],
      orders: orders || []
    }

    return { success: true, data: exportBlob }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to export data' }
  }
}

export async function requestAccountDeactivation() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', user.id)

    if (error) return { success: false, error: error.message }

    await logAudit({
      actorId: user.id,
      action: 'customer.self_deactivated',
      targetTable: 'profiles',
      targetId: user.id,
      after: { is_active: false, grace_period_days: 30 }
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to deactivate account' }
  }
}
