'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'
import { createPurchaseOrderSchema } from '@/lib/validations/actions'
import { logAdminAction } from '@/lib/auth/auditLogger'

export interface POLineItemInput {
  ingredientId: string
  quantityOrdered: number
  unitPrice: number
  taxRate?: number
}

// ─── Get Purchase Orders ────────────────────────────────────────────────────

export async function getPurchaseOrders(limit = 50) {
  await requireUser(['inventory_manager', 'manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  try {
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name, contact_person, phone, email, gstin),
        purchase_order_items(
          id,
          quantity_ordered,
          quantity_received,
          unit_price,
          line_total,
          ingredient:ingredients(id, name, unit)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return { success: true, purchaseOrders: orders || [] }
  } catch (err: any) {
    return { success: false, error: err.message, purchaseOrders: [] }
  }
}

// ─── Create Purchase Order ──────────────────────────────────────────────────

export async function createPurchaseOrder(payload: {
  supplierId: string
  items: POLineItemInput[]
  notes?: string
}) {
  const user = await requireUser(['inventory_manager', 'manager', 'super_admin'])
  
  const validData = createPurchaseOrderSchema.parse(payload)

  const supabase = createAdminClient()

  try {
    const totalAmount = payload.items.reduce(
      (acc, item) => acc + (item.quantityOrdered * item.unitPrice),
      0
    )

    // 1. Create PO Header
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id: payload.supplierId,
        status: 'ordered',
        total_amount: totalAmount,
        notes: payload.notes || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (poErr) throw new Error(poErr.message)

    // 2. Insert PO Line Items
    const lineItems = payload.items.map((item) => ({
      purchase_order_id: po.id,
      ingredient_id: item.ingredientId,
      quantity_ordered: item.quantityOrdered,
      quantity_received: 0,
      unit_price: item.unitPrice,
      tax_rate: item.taxRate || 0,
      line_total: item.quantityOrdered * item.unitPrice,
    }))

    const { error: itemsErr } = await supabase
      .from('purchase_order_items')
      .insert(lineItems)

    if (itemsErr) throw new Error(itemsErr.message)

    // Log Audit Action
    await logAdminAction(user.id, 'create_purchase_order', validData)

    revalidatePath('/admin/purchases')
    revalidatePath('/admin/suppliers')
    return { success: true, purchaseOrder: po }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Receive Goods Receipt Note (GRN) & Intake Stock ────────────────────────

export async function receiveGoodsReceipt(payload: {
  purchaseOrderId?: string
  supplierId: string
  invoiceNumber?: string
  invoiceDate?: string
  receivedBy?: string
  notes?: string
  items: Array<{
    ingredientId: string
    quantityReceived: number
    quantityAccepted: number
    quantityRejected: number
    rejectionReason?: string
    unitPrice: number
    batchNumber?: string
    expiryDate?: string
  }>
}) {
  const user = await requireUser(['inventory_manager', 'manager', 'super_admin'])
  payload.receivedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    const grnNumber = `GRN-${Date.now().toString().slice(-6)}`
    const totalAmount = payload.items.reduce(
      (acc, item) => acc + (item.quantityAccepted * item.unitPrice),
      0
    )

    // 1. Create Goods Receipt Header
    const { data: grn, error: grnErr } = await supabase
      .from('goods_receipts')
      .insert({
        grn_number: grnNumber,
        purchase_order_id: payload.purchaseOrderId || null,
        supplier_id: payload.supplierId,
        invoice_number: payload.invoiceNumber || null,
        invoice_date: payload.invoiceDate || null,
        total_amount: totalAmount,
        received_by: payload.receivedBy || null,
        status: 'completed',
        notes: payload.notes || null,
      })
      .select()
      .single()

    if (grnErr) throw new Error(grnErr.message)

    // 2. Process Items & Update Stock + Movements Ledger
    for (const item of payload.items) {
      // Insert GRN Item
      await supabase.from('goods_receipt_items').insert({
        goods_receipt_id: grn.id,
        ingredient_id: item.ingredientId,
        quantity_received: item.quantityReceived,
        quantity_accepted: item.quantityAccepted,
        quantity_rejected: item.quantityRejected,
        rejection_reason: item.rejectionReason || null,
        unit_price: item.unitPrice,
        batch_number: item.batchNumber || null,
        expiry_date: item.expiryDate || null,
      })

      if (item.quantityAccepted > 0) {
        // Fetch current stock
        const { data: ing } = await supabase
          .from('ingredients')
          .select('current_stock, cost_per_unit')
          .eq('id', item.ingredientId)
          .single()

        const prevStock = Number(ing?.current_stock || 0)
        const newStock = prevStock + item.quantityAccepted

        // Update Ingredient Stock & Unit Cost
        await supabase
          .from('ingredients')
          .update({
            current_stock: newStock,
            cost_per_unit: item.unitPrice, // update latest procurement price
          })
          .eq('id', item.ingredientId)

        // Log to Immutable Movements Ledger
        await supabase.from('inventory_movements').insert({
          ingredient_id: item.ingredientId,
          movement_type: 'purchase_receipt',
          quantity: item.quantityAccepted,
          unit_cost: item.unitPrice,
          balance_after: newStock,
          reference_type: 'goods_receipt',
          reference_id: grn.id,
          note: `GRN ${grnNumber} from Supplier (${item.quantityAccepted} accepted)`,
          created_by: payload.receivedBy || null,
        })
      }
    }

    // 3. If tied to a PO, update PO status & received quantities
    if (payload.purchaseOrderId) {
      await supabase
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', payload.purchaseOrderId)
    }

    revalidatePath('/admin/purchases')
    revalidatePath('/admin/inventory')
    return { success: true, grnNumber }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
