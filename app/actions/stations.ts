'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'

// ─── Get Kitchen Stations ───────────────────────────────────────────────────

export async function getKitchenStations() {
  await requireUser(['kitchen_manager', 'staff', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('kitchen_stations')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

// ─── Get KOTs By Station ────────────────────────────────────────────────────

export async function getStationKOTs(stationCode?: string) {
  await requireUser(['kitchen_manager', 'staff', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  let query = supabase
    .from('kots')
    .select(`
      *,
      kot_items(*),
      tables(id, table_number, area_id, areas(name)),
      orders(id, source, order_type, customer_name:address_json->name, total)
    `)
    .in('status', ['pending', 'sent', 'acknowledged', 'preparing'])
    .order('created_at', { ascending: true })

  if (stationCode && stationCode !== 'ALL') {
    query = query.eq('station', stationCode)
  }

  const { data, error } = await query
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

// ─── Hold / Fire / Recall KOT ───────────────────────────────────────────────

export async function holdKOT(kotId: string, reason?: string) {
  await requireUser(['kitchen_manager', 'staff', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('kots')
    .update({
      status: 'pending',
      void_reason: reason || 'Hold on preparation',
    })
    .eq('id', kotId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/kitchen')
  return { success: true }
}

export async function fireKOT(kotId: string) {
  await requireUser(['kitchen_manager', 'staff', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('kots')
    .update({
      status: 'preparing',
      sent_at: new Date().toISOString(),
    })
    .eq('id', kotId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/kitchen')
  return { success: true }
}

export async function recallKOT(kotId: string) {
  await requireUser(['kitchen_manager', 'staff', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('kots')
    .update({
      status: 'recalled',
      voided_at: new Date().toISOString(),
    })
    .eq('id', kotId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/kitchen')
  return { success: true }
}

// ─── Update Individual KOT Item Status ──────────────────────────────────────

export async function updateKOTItemStatus(itemId: string, status: 'pending' | 'preparing' | 'ready' | 'cancelled') {
  await requireUser(['kitchen_manager', 'staff', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('kot_items')
    .update({ status })
    .eq('id', itemId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/kitchen')
  return { success: true }
}
