'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'
import { processPOSPaymentSchema, processPOSRefundSchema, voidPOSOrderSchema } from '@/lib/validations/actions'
import { logAdminAction } from '@/lib/auth/auditLogger'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface POSPaymentTender {
  tenderType: 'cash' | 'upi' | 'card' | 'razorpay' | 'house_account' | 'voucher'
  amount: number
  reference?: string
  changeGiven?: number
}

export interface ProcessPOSPaymentPayload {
  orderId: string
  shiftId: string
  tenders: POSPaymentTender[]
  orderTotal: number
}

// ─── Process POS Payment ────────────────────────────────────────────────────

export async function processPOSPayment(payload: ProcessPOSPaymentPayload) {
  try {
    const user = await requireUser(['cashier', 'manager', 'super_admin', 'admin'])
    const validData = processPOSPaymentSchema.parse(payload)
    const supabase = createAdminClient()

    const { orderId, shiftId, tenders, orderTotal } = payload

    // Validate total tendered covers order total
    const totalTendered = tenders.reduce((sum, t) => sum + t.amount, 0)
    if (totalTendered < orderTotal - 0.01) {
      return { success: false, error: `Insufficient payment. Required ₹${orderTotal.toFixed(2)}, tendered ₹${totalTendered.toFixed(2)}` }
    }

    // Insert each tender row
    const tenderRows = tenders.map((t) => ({
      order_id: orderId,
      shift_id: shiftId ? shiftId : null,
      tender_type: t.tenderType,
      amount: t.amount,
      change_given: t.changeGiven || 0,
      reference: t.reference || null,
      status: 'completed',
    }))

    const { error: payErr } = await supabase.from('order_payments').insert(tenderRows)
    if (payErr) throw new Error(payErr.message)

    // Mark order as paid
    const { error: orderErr } = await supabase
      .from('orders')
      .update({ payment_status: 'paid', fulfillment_status: 'completed' })
      .eq('id', orderId)
    if (orderErr) throw new Error(orderErr.message)

    // Record cash movement in shift if shiftId is present
    if (shiftId) {
      for (const t of tenders) {
        if (t.tenderType === 'cash') {
          await supabase.from('cash_movements').insert({
            shift_id: shiftId,
            type: 'sale',
            amount: t.amount - (t.changeGiven || 0),
            reference_id: orderId,
            note: `Cash sale — Order ${orderId.slice(0, 8).toUpperCase()}`,
          })
        }
      }
    }

    // Add status history
    const paymentDesc = tenders.map((t) => `${t.tenderType} ₹${t.amount}`).join(' + ')
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status: 'delivered',
      notes: `Payment received: ${paymentDesc}`,
    })

    // Log Audit Action
    await logAdminAction(user.id, 'process_pos_payment', validData)

    revalidatePath('/admin/pos')
    revalidatePath('/admin/pos/orders')
    revalidatePath('/admin/payments')

    return {
      success: true,
      changeAmount: Math.max(0, totalTendered - orderTotal),
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Payment processing failed' }
  }
}

// ─── Process Refund ─────────────────────────────────────────────────────────

export async function processPOSRefund(
  orderId: string,
  amount: number,
  reason: string,
  initiatedBy: string,
  shiftId: string
) {
  const user = await requireUser(['manager', 'super_admin'])
  
  const validData = processPOSRefundSchema.parse({ orderId, amount, reason, shiftId })
  initiatedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    // Create refund request
    const { error: refErr } = await supabase.from('refund_requests').insert({
      order_id: orderId,
      payment_gateway: 'pos_cash',
      amount,
      reason,
      initiated_by: initiatedBy,
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    if (refErr) throw new Error(refErr.message)

    // Update order payment status
    await supabase
      .from('orders')
      .update({ payment_status: 'refunded' })
      .eq('id', orderId)

    // Record cash movement (outgoing)
    await supabase.from('cash_movements').insert({
      shift_id: shiftId,
      type: 'refund',
      amount: -Math.abs(validData.amount),
      reference_id: orderId,
      note: `Refund for order ${validData.orderId}: ${validData.reason}`,
    })

    // Audit log
    await supabase.from('audit_log').insert({
      actor_id: initiatedBy,
      action: 'pos_refund',
      target_table: 'orders',
      target_id: orderId,
      after: { refund_amount: amount, reason },
    })

    // Log Audit Action
    await logAdminAction(user.id, 'process_pos_refund', validData)

    revalidatePath('/admin/pos')
    revalidatePath('/admin/pos/orders')
    revalidatePath('/admin/payments')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Get POS Orders (active + recent) ──────────────────────────────────────

export async function getPOSOrders(limit = 50) {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, payment_status, fulfillment_status, source, order_type,
      subtotal, tax, discount, total, created_at, notes, kot_number,
      address_json, guest_count,
      order_items(quantity, unit_price, products(name)),
      kots(id, kot_number, status, station),
      order_payments(tender_type, amount)
    `)
    .eq('source', 'pos')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

// ─── Void/Cancel POS Order ─────────────────────────────────────────────────

export async function voidPOSOrder(orderId: string, reason: string, voidedBy: string) {
  const user = await requireUser(['manager', 'super_admin'])
  
  const validData = voidPOSOrderSchema.parse({ orderId, reason })
  voidedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', fulfillment_status: 'cancelled', payment_status: 'refunded', notes: `Voided: ${validData.reason}` })
    .eq('id', validData.orderId)

  if (error) return { success: false, error: error.message }

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    status: 'cancelled',
    changed_by: voidedBy,
    notes: `Order voided: ${reason}`,
  })

  // Log Audit Action
  await logAdminAction(user.id, 'void_pos_order', validData)

  await supabase.from('audit_log').insert({
    actor_id: voidedBy,
    action: 'pos_void_order',
    target_table: 'orders',
    target_id: orderId,
    after: { reason },
  })

  revalidatePath('/admin/pos/orders')
  return { success: true }
}
