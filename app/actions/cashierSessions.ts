'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'
import { closeCashierShiftSchema } from '@/lib/validations/actions'
import { logAdminAction } from '@/lib/auth/auditLogger'

// ─── Open Shift ─────────────────────────────────────────────────────────────

export async function openCashierShift(
  cashierId: string,
  terminalId: string,
  openingCash: number
) {
  const user = await requireUser(['cashier', 'manager', 'super_admin'])
  cashierId = user.id // Override with authenticated user
  const supabase = createAdminClient()

  // Check no existing open shift for this cashier/terminal
  const { data: existingShift } = await supabase
    .from('cashier_shifts')
    .select('id')
    .eq('cashier_id', cashierId)
    .eq('terminal_id', terminalId)
    .eq('status', 'open')
    .maybeSingle()

  if (existingShift) {
    return { success: false, error: 'A shift is already open for this terminal. Close it first.' }
  }

  const { data: shift, error } = await supabase
    .from('cashier_shifts')
    .insert({
      cashier_id: cashierId,
      terminal_id: terminalId,
      opening_cash: openingCash,
      status: 'open',
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Record opening float cash movement
  await supabase.from('cash_movements').insert({
    shift_id: shift.id,
    type: 'opening_float',
    amount: openingCash,
    note: 'Opening cash float',
  })

  revalidatePath('/admin/pos/shifts')
  return { success: true, shiftId: shift.id, shift }
}

// ─── Get Active Shift ───────────────────────────────────────────────────────

export async function getActiveShift(cashierId: string) {
  const user = await requireUser(['cashier', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('cashier_shifts')
    .select(`
      *,
      pos_terminals(name),
      cash_movements(type, amount, created_at, note)
    `)
    .eq('cashier_id', cashierId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .maybeSingle()

  if (error) return { success: false, error: error.message, data: null }
  return { success: true, data }
}

// ─── Get Shift Summary (expected cash calculation) ──────────────────────────

export async function getShiftSummary(shiftId: string) {
  await requireUser(['cashier', 'manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  const { data: shift } = await supabase
    .from('cashier_shifts')
    .select('*, pos_terminals(name)')
    .eq('id', shiftId)
    .single()

  const { data: movements } = await supabase
    .from('cash_movements')
    .select('*')
    .eq('shift_id', shiftId)
    .order('created_at', { ascending: true })

  const { data: payments } = await supabase
    .from('order_payments')
    .select('tender_type, amount, change_given, status, order_id')
    .eq('shift_id', shiftId)
    .eq('status', 'completed')

  // Aggregate
  const openingFloat = movements?.find((m) => m.type === 'opening_float')?.amount || 0
  const cashSales = payments?.filter((p) => p.tender_type === 'cash').reduce((s, p) => s + Number(p.amount) - Number(p.change_given || 0), 0) || 0
  const upiSales = payments?.filter((p) => p.tender_type === 'upi').reduce((s, p) => s + Number(p.amount), 0) || 0
  const cardSales = payments?.filter((p) => p.tender_type === 'card').reduce((s, p) => s + Number(p.amount), 0) || 0
  const cashRefunds = movements?.filter((m) => m.type === 'refund').reduce((s, m) => s + Math.abs(Number(m.amount)), 0) || 0
  const paidOuts = movements?.filter((m) => m.type === 'paid_out').reduce((s, m) => s + Number(m.amount), 0) || 0
  const totalOrders = payments?.length || 0

  const expectedCash = Number(openingFloat) + cashSales - cashRefunds - paidOuts

  return {
    success: true,
    shift,
    summary: {
      openingFloat,
      cashSales,
      upiSales,
      cardSales,
      cashRefunds,
      paidOuts,
      expectedCash,
      totalOrders,
      totalSales: cashSales + upiSales + cardSales,
    },
    movements: movements || [],
  }
}

// ─── Close Shift ────────────────────────────────────────────────────────────

export async function closeCashierShift(
  shiftId: string,
  actualCash: number,
  notes?: string
) {
  const user = await requireUser(['cashier', 'manager', 'super_admin'])
  
  // 1. Validate Payload
  const validData = closeCashierShiftSchema.parse({ shiftId, actualCash, notes })
  
  const supabase = createAdminClient()

  const summary = await getShiftSummary(validData.shiftId)
  if (!summary.success) return { success: false, error: 'Could not load shift summary' }

  const expectedCash = summary.summary.expectedCash
  const variance = validData.actualCash - expectedCash

  const { error } = await supabase
    .from('cashier_shifts')
    .update({
      closing_cash: actualCash,
      expected_cash: expectedCash,
      cash_variance: variance,
      status: 'closed',
      closed_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq('id', shiftId)

  if (error) return { success: false, error: error.message }

  // Record closing count movement
  await supabase.from('cash_movements').insert({
    shift_id: validData.shiftId,
    type: 'closing_count',
    amount: validData.actualCash,
    note: `Closing cash count. Variance: ₹${variance.toFixed(2)}`,
  })

  // Log Audit Action
  await logAdminAction(user.id, 'close_cashier_shift', {
    ...validData,
    expectedCash,
    variance,
  })

  revalidatePath('/admin/pos/shifts')
  return {
    success: true,
    variance,
    isOver: variance > 0,
    isShort: variance < 0,
    summary: summary.summary,
  }
}

// ─── Get All Shifts (for reports) ──────────────────────────────────────────

export async function getAllShifts(limit = 30) {
  await requireUser(['manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('cashier_shifts')
    .select(`
      *,
      pos_terminals(name),
      profiles!cashier_shifts_cashier_id_fkey(name)
    `)
    .order('opened_at', { ascending: false })
    .limit(limit)

  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

// ─── Cash Paid-Out (remove cash from drawer) ───────────────────────────────

export async function recordCashPaidOut(shiftId: string, amount: number, note: string) {
  await requireUser(['cashier', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { error } = await supabase.from('cash_movements').insert({
    shift_id: shiftId,
    type: 'paid_out',
    amount,
    note,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/pos/shifts')
  return { success: true }
}
