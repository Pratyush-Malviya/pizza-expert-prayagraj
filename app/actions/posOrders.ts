'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'
import { voidPOSOrderSchema } from '@/lib/validations/actions'
import { logAdminAction } from '@/lib/auth/auditLogger'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface POSCartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  modifiers?: Array<{ id: string; name: string; price: number }>
  notes?: string
}

export interface CreatePOSOrderPayload {
  orderType: 'dine_in' | 'takeaway' | 'pickup' | 'delivery'
  items: POSCartItem[]
  tableId?: string
  guestCount?: number
  waiterId?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  discountType?: 'percentage' | 'flat' | 'coupon' | 'manager' | 'complimentary'
  discountValue?: number
  discountReason?: string
  notes?: string
  shiftId: string
  terminalId: string
  cashierId: string
}

// ─── Calculate POS Order Total (server-authoritative) ────────────────────────

export async function calculatePOSTotal(items: POSCartItem[], discountValue = 0, discountType = 'flat') {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  // Fetch real prices from DB
  const productIds = items.map((i) => i.productId)
  const { data: dbProducts } = await supabase
    .from('products')
    .select('id, name, price, is_available')
    .in('id', productIds)

  let subtotal = 0
  for (const item of items) {
    const dbProd = dbProducts?.find((p) => p.id === item.productId)
    const basePrice = dbProd ? Number(dbProd.price) : item.unitPrice
    const modifierTotal = (item.modifiers || []).reduce((acc, m) => acc + Number(m.price), 0)
    subtotal += (basePrice + modifierTotal) * item.quantity
  }

  // Fetch active default tax group
  const { data: taxGroup } = await supabase
    .from('tax_groups')
    .select('id, tax_rates(*)')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle()

  const taxRate = taxGroup?.tax_rates
    ? (taxGroup.tax_rates as any[]).reduce((sum: number, r: any) => sum + Number(r.rate), 0) / 100
    : 0.05

  let discount = 0
  if (discountValue > 0) {
    discount = discountType === 'percentage'
      ? Math.round(subtotal * (discountValue / 100) * 100) / 100
      : Math.min(discountValue, subtotal)
  }

  const taxableAmount = Math.max(0, subtotal - discount)
  const tax = Math.round(taxableAmount * taxRate * 100) / 100
  const total = Math.round((taxableAmount + tax) * 100) / 100

  return { subtotal, discount, tax, total, taxRate }
}

// ─── Create POS Order ────────────────────────────────────────────────────────

export async function createPOSOrder(payload: CreatePOSOrderPayload) {
  const user = await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  payload.cashierId = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    const totals = await calculatePOSTotal(
      payload.items,
      payload.discountValue || 0,
      payload.discountType || 'flat'
    )

    // 1. Generate KOT number
    const { count } = await supabase
      .from('kots')
      .select('*', { count: 'exact', head: true })
    const kotSeq = ((count || 0) + 1).toString().padStart(4, '0')
    const kotNumber = `KOT-${kotSeq}`

    // 2. Build address JSON for POS orders (minimal)
    const addressJson: Record<string, any> = {
      paymentMethod: 'pos',
      name: payload.customerName || 'Walk-in Customer',
      phone: payload.customerPhone || '',
      orderType: payload.orderType,
    }

    // 3. Create the order (uses existing canonical orders table)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: payload.customerId || null,
        source: 'pos',
        order_type: payload.orderType,
        table_id: payload.tableId || null,
        area_id: null, // set from table lookup if needed
        guest_count: payload.guestCount || 1,
        waiter_id: payload.waiterId || null,
        cashier_id: payload.cashierId,
        terminal_id: payload.terminalId,
        status: 'confirmed',
        payment_status: 'unpaid',
        fulfillment_status: 'new',
        subtotal: totals.subtotal,
        tax: totals.tax,
        delivery_fee: 0,
        discount: totals.discount,
        total: totals.total,
        kot_number: kotNumber,
        notes: payload.notes || null,
        address_json: addressJson,
      })
      .select()
      .single()

    if (orderErr) throw new Error(orderErr.message)

    // 4. Insert order items
    const isUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '')
    const { data: dbProducts } = await supabase.from('products').select('id, name').limit(100)
    const fallbackDbId = dbProducts?.[0]?.id

    const orderItems = payload.items.map((item) => {
      let resolvedProdId = item.productId
      if (!isUUID(resolvedProdId)) {
        const found = dbProducts?.find((p) => item.productName.toLowerCase().includes(p.name.toLowerCase()))
        resolvedProdId = found ? found.id : (fallbackDbId || item.productId)
      }
      return {
        order_id: order.id,
        product_id: resolvedProdId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        selected_options: { 
          productName: item.productName,
          modifiers: item.modifiers || [], 
          notes: item.notes || '' 
        },
      }
    })
    
    if (orderItems.length > 0 && orderItems.every(i => isUUID(i.product_id))) {
      await supabase.from('order_items').insert(orderItems)
    }

    // 5. Apply discount record
    if (totals.discount > 0 && payload.discountType) {
      await supabase.from('order_discounts').insert({
        order_id: order.id,
        type: payload.discountType,
        value: payload.discountValue || 0,
        discount_amount: totals.discount,
        reason: payload.discountReason || null,
        applied_by: payload.cashierId,
      })
    }

    // 6. Add status history
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'confirmed',
      changed_by: payload.cashierId,
      notes: `POS order created (${payload.orderType})`,
    })

    // 7. If dine-in, update table status to occupied
    if (payload.tableId && payload.orderType === 'dine_in') {
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', payload.tableId)

      await supabase.from('table_sessions').insert({
        table_id: payload.tableId,
        order_id: order.id,
        opened_by: payload.cashierId,
        guest_count: payload.guestCount || 1,
      })
    }

    revalidatePath('/admin/pos')
    revalidatePath('/admin/pos/orders')
    revalidatePath('/admin/kitchen')

    return { success: true, orderId: order.id, kotNumber, totals }
  } catch (err: any) {
    return { success: false, error: err.message || 'POS order creation failed' }
  }
}

// ─── Create KOT ────────────────────────────────────────────────────────────

export async function createKOT(
  orderId: string,
  items: POSCartItem[],
  options: { tableId?: string; orderType?: string; customerName?: string; guestCount?: number; station?: string }
) {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  try {
    const { count } = await supabase.from('kots').select('*', { count: 'exact', head: true })
    const kotSeq = ((count || 0) + 1).toString().padStart(4, '0')
    const kotNumber = `KOT-${kotSeq}`

    const { data: kot, error } = await supabase
      .from('kots')
      .insert({
        order_id: orderId,
        kot_number: kotNumber,
        table_id: options.tableId || null,
        order_type: options.orderType || 'takeaway',
        customer_name: options.customerName || 'Walk-in',
        guest_count: options.guestCount || 1,
        station: options.station || null,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Insert KOT items
    const kotItems = items.map((item) => ({
      kot_id: kot.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      modifiers: item.modifiers || [],
      notes: item.notes || null,
      status: 'pending',
    }))

    await supabase.from('kot_items').insert(kotItems)

    revalidatePath('/admin/kitchen')
    revalidatePath('/admin/pos')

    return { success: true, kotId: kot.id, kotNumber }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Void KOT ──────────────────────────────────────────────────────────────

export async function voidKOT(kotId: string, reason: string, voidedBy: string) {
  const user = await requireUser(['cashier', 'manager', 'super_admin'])
  voidedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('kots')
    .update({ status: 'cancelled', voided_at: new Date().toISOString(), void_reason: reason, voided_by: voidedBy })
    .eq('id', kotId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/kitchen')
  return { success: true }
}

// ─── Hold Order ────────────────────────────────────────────────────────────

export async function holdOrder(
  cashierId: string,
  terminalId: string,
  orderData: object,
  label?: string
) {
  const user = await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  cashierId = user.id // Override with authenticated user
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('held_orders')
    .insert({ cashier_id: cashierId, terminal_id: terminalId, order_data: orderData, label: label || null, is_active: true })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/pos/held')
  return { success: true, heldOrderId: data.id }
}

// ─── Resume Held Order ─────────────────────────────────────────────────────

export async function resumeHeldOrder(heldOrderId: string) {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('held_orders')
    .update({ is_active: false, resumed_at: new Date().toISOString() })
    .eq('id', heldOrderId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/pos/held')
  return { success: true, orderData: data.order_data }
}

// ─── Get Active KOTs for Kitchen ──────────────────────────────────────────

export async function getActiveKOTs() {
  await requireUser(['kitchen_manager', 'staff', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('kots')
    .select(`
      *,
      kot_items(*),
      tables(table_number, area_id),
      orders(source, order_type, customer_name:address_json->name, total)
    `)
    .in('status', ['pending', 'sent', 'acknowledged', 'preparing'])
    .order('created_at', { ascending: true })

  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

// ─── Update KOT Status ─────────────────────────────────────────────────────

export async function updateKOTStatus(kotId: string, status: string) {
  await requireUser(['kitchen_manager', 'staff', 'manager', 'super_admin'])
  const supabase = createAdminClient()
  const { error } = await supabase.from('kots').update({ status }).eq('id', kotId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/kitchen')
  return { success: true }
}

// ─── 86'd / Quick Out-of-Stock Toggle ──────────────────────────────────────

export async function toggleProduct86(productId: string, isAvailable: boolean) {
  await requireUser(['cashier', 'kitchen_manager', 'staff', 'manager', 'super_admin'])
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('products')
    .update({ is_available: isAvailable })
    .eq('id', productId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/pos')
  revalidatePath('/menu')
  return { success: true, isAvailable }
}

// ─── Fetch Active Table Running Order ──────────────────────────────────────

export async function fetchActiveTableOrder(tableId: string) {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  // Find active table session or unpaid confirmed order for this table
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*, products(name, price, is_veg))
    `)
    .eq('table_id', tableId)
    .eq('order_type', 'dine_in')
    .in('status', ['confirmed', 'preparing', 'ready', 'served', 'delivered'])
    .in('payment_status', ['unpaid', 'partially_paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !order) return { success: false, order: null }
  return { success: true, order }
}
