'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'
import { recordWastageSchema, recordStockAdjustmentSchema } from '@/lib/validations/actions'
import { logAdminAction } from '@/lib/auth/auditLogger'

// ─── Get Stock with Total Valuation & Reorder Alerts ────────────────────────

export async function getInventoryStockWithValuation() {
  await requireUser(['inventory_manager', 'manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  try {
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw new Error(error.message)

    const list = ingredients || []
    const totalValuation = list.reduce(
      (acc, item) => acc + (Number(item.current_stock || 0) * Number(item.cost_per_unit || 0)),
      0
    )
    const lowStockItems = list.filter(
      (item) => Number(item.current_stock) <= Number(item.reorder_threshold)
    )

    return {
      success: true,
      ingredients: list,
      totalValuation,
      totalCount: list.length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    }
  } catch (err: any) {
    return { success: false, error: err.message, ingredients: [], totalValuation: 0, lowStockCount: 0, lowStockItems: [] }
  }
}

// ─── Record Wastage ─────────────────────────────────────────────────────────

export async function recordWastage(payload: {
  ingredientId: string
  quantity: number
  unit: string
  reason: 'expired' | 'burnt_damaged' | 'spill_prep_loss' | 'quality_rejection' | 'customer_complaint' | 'other'
  notes?: string
  recordedBy?: string
}) {
  const user = await requireUser(['inventory_manager', 'manager', 'super_admin'])
  
  const validData = recordWastageSchema.parse(payload)
  
  payload.recordedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    // 1. Fetch current ingredient cost & stock
    const { data: ingredient, error: ingErr } = await supabase
      .from('ingredients')
      .select('id, name, current_stock, cost_per_unit')
      .eq('id', payload.ingredientId)
      .single()

    if (ingErr || !ingredient) throw new Error('Ingredient not found')

    const unitCost = Number(ingredient.cost_per_unit || 0)
    const costImpact = unitCost * payload.quantity
    const previousStock = Number(ingredient.current_stock || 0)
    const newStock = Math.max(0, previousStock - payload.quantity)

    // 2. Insert Wastage Record
    const { data: waste, error: wasteErr } = await supabase
      .from('wastage_records')
      .insert({
        ingredient_id: payload.ingredientId,
        quantity: payload.quantity,
        unit: payload.unit || 'kg',
        unit_cost: unitCost,
        cost_impact: costImpact,
        reason: payload.reason,
        notes: payload.notes || null,
        recorded_by: payload.recordedBy || null,
      })
      .select()
      .single()

    if (wasteErr) throw new Error(wasteErr.message)

    // 3. Update Ingredient Stock
    await supabase
      .from('ingredients')
      .update({ current_stock: newStock })
      .eq('id', payload.ingredientId)

    // 4. Log Immutable Movement Ledger Entry
    await supabase.from('inventory_movements').insert({
      ingredient_id: payload.ingredientId,
      movement_type: 'wastage',
      quantity: -payload.quantity,
      unit_cost: unitCost,
      balance_after: newStock,
      reference_type: 'wastage',
      reference_id: waste.id,
      note: `Wastage: ${payload.reason} (${payload.quantity} ${payload.unit})`,
      created_by: payload.recordedBy || null,
    })

    // Log Audit Action
    await logAdminAction(user.id, 'record_wastage', validData)

    revalidatePath('/admin/inventory')
    revalidatePath('/admin/inventory/wastage')
    return { success: true, costImpact }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Record Stock Adjustment (Physical Count Variance) ──────────────────────

export async function recordStockAdjustment(payload: {
  ingredientId: string
  countedStock: number
  reason: string
  adjustedBy?: string
}) {
  const user = await requireUser(['inventory_manager', 'manager', 'super_admin'])
  
  const validData = recordStockAdjustmentSchema.parse(payload)
  
  payload.adjustedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    const { data: ingredient, error: ingErr } = await supabase
      .from('ingredients')
      .select('id, name, current_stock, cost_per_unit, unit')
      .eq('id', payload.ingredientId)
      .single()

    if (ingErr || !ingredient) throw new Error('Ingredient not found')

    const previousStock = Number(ingredient.current_stock || 0)
    const variance = payload.countedStock - previousStock
    const unitCost = Number(ingredient.cost_per_unit || 0)
    const costVariance = variance * unitCost
    const movementType = variance >= 0 ? 'adjustment_in' : 'adjustment_out'

    // 1. Insert Stock Adjustment
    const { data: adj, error: adjErr } = await supabase
      .from('stock_adjustments')
      .insert({
        ingredient_id: payload.ingredientId,
        previous_stock: previousStock,
        counted_stock: payload.countedStock,
        variance,
        cost_variance: costVariance,
        reason: payload.reason,
        status: 'approved',
        adjusted_by: payload.adjustedBy || null,
      })
      .select()
      .single()

    if (adjErr) throw new Error(adjErr.message)

    // 2. Set exact physical stock on ingredient
    await supabase
      .from('ingredients')
      .update({ current_stock: payload.countedStock })
      .eq('id', payload.ingredientId)

    // 3. Log to Movement Ledger
    await supabase.from('inventory_movements').insert({
      ingredient_id: payload.ingredientId,
      movement_type: movementType,
      quantity: variance,
      unit_cost: unitCost,
      balance_after: payload.countedStock,
      reference_type: 'stock_adjustment',
      reference_id: adj.id,
      note: `Adjustment: ${payload.reason} (Variance: ${variance > 0 ? '+' : ''}${variance} ${ingredient.unit})`,
      created_by: payload.adjustedBy || null,
    })

    // Log Audit Action
    await logAdminAction(user.id, 'record_stock_adjustment', validData)

    revalidatePath('/admin/inventory')
    revalidatePath('/admin/inventory/adjustments')
    return { success: true, variance, costVariance }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Get Movement Ledger History ────────────────────────────────────────────

export async function getInventoryMovementHistory(ingredientId?: string, limit = 100) {
  await requireUser(['inventory_manager', 'manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  let query = supabase
    .from('inventory_movements')
    .select(`
      *,
      ingredient:ingredients(id, name, unit),
      actor:profiles(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (ingredientId) {
    query = query.eq('ingredient_id', ingredientId)
  }

  const { data, error } = await query
  if (error) return { success: false, error: error.message, movements: [] }
  return { success: true, movements: data || [] }
}

// ─── Get Wastage Records History ────────────────────────────────────────────

export async function getWastageHistory(limit = 100) {
  await requireUser(['inventory_manager', 'manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('wastage_records')
    .select(`
      *,
      ingredient:ingredients(id, name, unit),
      recorder:profiles(id, name)
    `)
    .order('recorded_at', { ascending: false })
    .limit(limit)

  if (error) return { success: false, error: error.message, records: [] }
  return { success: true, records: data || [] }
}
