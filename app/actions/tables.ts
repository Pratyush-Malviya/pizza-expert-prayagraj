'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'billing' | 'cleaning' | 'blocked'

// ─── Get Floor Layout ─────────────────────────────────────────────────────────

export async function getFloorLayout() {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  try {
    // 1. Fetch Areas
    const { data: areas, error: areaErr } = await supabase
      .from('areas')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (areaErr) throw new Error(areaErr.message)

    // 2. Fetch Tables with Waiters & Active Sessions
    const { data: tables, error: tableErr } = await supabase
      .from('tables')
      .select(`
        *,
        assigned_waiter:profiles!tables_assigned_waiter_id_fkey(id, name, role),
        area:areas(id, name)
      `)
      .eq('is_active', true)
      .order('table_number', { ascending: true })

    if (tableErr) throw new Error(tableErr.message)

    // 3. Fetch Active Table Sessions
    const { data: sessions, error: sessErr } = await supabase
      .from('table_sessions')
      .select(`
        *,
        order:orders(
          id,
          total,
          subtotal,
          status,
          payment_status,
          fulfillment_status,
          kot_number,
          created_at,
          order_items(
            id,
            quantity,
            unit_price,
            product:products(name)
          ),
          kots(
            id,
            kot_number,
            status,
            station
          )
        )
      `)
      .is('closed_at', null)

    if (sessErr) throw new Error(sessErr.message)

    // 4. Map active session to each table
    const tableWithSessionMap = (tables || []).map((t) => {
      const activeSession = sessions?.find((s) => s.table_id === t.id)
      return {
        ...t,
        activeSession: activeSession || null,
      }
    })

    return {
      success: true,
      areas: areas || [],
      tables: tableWithSessionMap,
    }
  } catch (err: any) {
    return { success: false, error: err.message, areas: [], tables: [] }
  }
}

// ─── Update Table Status ────────────────────────────────────────────────────

export async function updateTableStatus(tableId: string, status: TableStatus) {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('tables')
    .update({ status })
    .eq('id', tableId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/pos/tables')
  revalidatePath('/admin/pos')
  return { success: true }
}

// ─── Open Table Session ─────────────────────────────────────────────────────

export async function openTableSession(
  tableId: string,
  guestCount: number = 1,
  waiterId?: string,
  openedBy?: string
) {
  const user = await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  openedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    // 1. Create session
    const { data: session, error: sessErr } = await supabase
      .from('table_sessions')
      .insert({
        table_id: tableId,
        guest_count: guestCount,
        opened_by: openedBy || null,
        opened_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (sessErr) throw new Error(sessErr.message)

    // 2. Update table
    const { error: tableErr } = await supabase
      .from('tables')
      .update({
        status: 'occupied',
        current_session_id: session.id,
        assigned_waiter_id: waiterId || null,
      })
      .eq('id', tableId)

    if (tableErr) throw new Error(tableErr.message)

    revalidatePath('/admin/pos/tables')
    revalidatePath('/admin/pos')
    return { success: true, session }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Close Table Session (Mark Cleaned / Available) ──────────────────────────

export async function closeTableSession(tableId: string, markStatus: TableStatus = 'available') {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  try {
    // 1. Close open session
    await supabase
      .from('table_sessions')
      .update({ closed_at: new Date().toISOString() })
      .eq('table_id', tableId)
      .is('closed_at', null)

    // 2. Reset table state
    const { error } = await supabase
      .from('tables')
      .update({
        status: markStatus,
        current_session_id: null,
        merged_with: null,
      })
      .eq('id', tableId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/pos/tables')
    revalidatePath('/admin/pos')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Transfer Table (Move Order to Another Table) ───────────────────────────

export async function transferTable(
  fromTableId: string,
  toTableId: string,
  reason?: string,
  transferredBy?: string
) {
  const user = await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  transferredBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    // 1. Get active session on fromTable
    const { data: session, error: sessErr } = await supabase
      .from('table_sessions')
      .select('id, order_id')
      .eq('table_id', fromTableId)
      .is('closed_at', null)
      .maybeSingle()

    if (sessErr || !session) throw new Error('No active session on source table')

    // 2. Update session to target table
    await supabase
      .from('table_sessions')
      .update({ table_id: toTableId })
      .eq('id', session.id)

    // 3. Update orders table_id if attached
    if (session.order_id) {
      await supabase
        .from('orders')
        .update({ table_id: toTableId })
        .eq('id', session.order_id)

      await supabase
        .from('kots')
        .update({ table_id: toTableId })
        .eq('order_id', session.order_id)
    }

    // 4. Update source table (available/cleaning) and target table (occupied)
    await supabase
      .from('tables')
      .update({ status: 'cleaning', current_session_id: null })
      .eq('id', fromTableId)

    await supabase
      .from('tables')
      .update({ status: 'occupied', current_session_id: session.id })
      .eq('id', toTableId)

    // 5. Log transfer
    await supabase.from('table_transfers').insert({
      from_table_id: fromTableId,
      to_table_id: toTableId,
      order_id: session.order_id || null,
      session_id: session.id,
      transferred_by: transferredBy || null,
      reason: reason || 'Customer requested relocation',
    })

    revalidatePath('/admin/pos/tables')
    revalidatePath('/admin/pos')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Merge Tables ───────────────────────────────────────────────────────────

export async function mergeTables(
  primaryTableId: string,
  secondaryTableId: string,
  mergedBy?: string
) {
  const user = await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  mergedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    const { data: primarySession } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('table_id', primaryTableId)
      .is('closed_at', null)
      .maybeSingle()

    // Mark secondary table as merged
    await supabase
      .from('tables')
      .update({
        status: 'occupied',
        merged_with: primaryTableId,
        current_session_id: primarySession?.id || null,
      })
      .eq('id', secondaryTableId)

    // Audit log merge
    await supabase.from('table_merges').insert({
      primary_table_id: primaryTableId,
      secondary_table_id: secondaryTableId,
      session_id: primarySession?.id || null,
      merged_by: mergedBy || null,
    })

    revalidatePath('/admin/pos/tables')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Assign Waiter ──────────────────────────────────────────────────────────

export async function assignWaiter(tableId: string, waiterId: string | null) {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('tables')
    .update({ assigned_waiter_id: waiterId })
    .eq('id', tableId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/pos/tables')
  return { success: true }
}

// ─── Add Table / Area ───────────────────────────────────────────────────────

export async function createTable(tableNumber: string, capacity: number, areaId: string) {
  await requireUser(['manager', 'super_admin'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('tables')
    .insert({
      table_number: tableNumber,
      capacity,
      area_id: areaId,
      status: 'available',
      is_active: true,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/pos/tables')
  return { success: true, table: data }
}

export async function createArea(name: string, description?: string) {
  await requireUser(['manager', 'super_admin'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('areas')
    .insert({
      name,
      description: description || null,
      sort_order: 99,
      is_active: true,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/pos/tables')
  return { success: true, area: data }
}
