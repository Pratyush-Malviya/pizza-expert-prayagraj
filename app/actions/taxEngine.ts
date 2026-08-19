'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'

// ─── Get Tax Groups & Components ────────────────────────────────────────────

export async function getTaxConfig() {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  try {
    const { data: groups, error } = await supabase
      .from('tax_groups')
      .select('*, tax_rates(*)')
      .eq('is_active', true)
      .order('is_default', { ascending: false })

    if (error) throw new Error(error.message)
    return { success: true, taxGroups: groups || [] }
  } catch (err: any) {
    return { success: false, error: err.message, taxGroups: [] }
  }
}

// ─── Save Tax Group & Component Rates ───────────────────────────────────────

export async function saveTaxGroup(payload: {
  name: string
  description?: string
  isDefault: boolean
  rates: Array<{ componentName: string; rate: number; isInclusive: boolean }>
}) {
  await requireUser(['manager', 'super_admin'])
  const supabase = createAdminClient()

  try {
    // 1. If marking default, clear other defaults
    if (payload.isDefault) {
      await supabase
        .from('tax_groups')
        .update({ is_default: false })
        .neq('name', payload.name)
    }

    // 2. Upsert Tax Group
    const { data: group, error: grpErr } = await supabase
      .from('tax_groups')
      .upsert({
        name: payload.name,
        description: payload.description || null,
        is_default: payload.isDefault,
        is_active: true,
      }, { onConflict: 'name' })
      .select()
      .single()

    if (grpErr) throw new Error(grpErr.message)

    // 3. Delete old rates & insert new
    await supabase.from('tax_rates').delete().eq('tax_group_id', group.id)

    const rateRows = payload.rates.map((r) => ({
      tax_group_id: group.id,
      component_name: r.componentName,
      rate: r.rate,
      is_inclusive: r.isInclusive,
    }))

    const { error: ratesErr } = await supabase.from('tax_rates').insert(rateRows)
    if (ratesErr) throw new Error(ratesErr.message)

    revalidatePath('/admin/settings/taxes')
    revalidatePath('/admin/pos')
    return { success: true, taxGroup: group }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Calculate Order Taxes dynamically from Active Tax Group ─────────────────

export async function calculateOrderTaxes(subtotal: number) {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  try {
    const { data: taxGroup } = await supabase
      .from('tax_groups')
      .select('*, tax_rates(*)')
      .eq('is_default', true)
      .single()

    const rates = taxGroup?.tax_rates || [
      { component_name: 'CGST', rate: 2.5, is_inclusive: false },
      { component_name: 'SGST', rate: 2.5, is_inclusive: false },
    ]

    const totalRatePct = rates.reduce((sum: number, r: any) => sum + Number(r.rate || 0), 0)
    const totalTaxAmount = Math.round(subtotal * (totalRatePct / 100) * 100) / 100

    const components = rates.map((r: any) => ({
      name: r.component_name,
      rate: Number(r.rate),
      amount: Math.round(subtotal * (Number(r.rate) / 100) * 100) / 100,
    }))

    return {
      success: true,
      groupName: taxGroup?.name || 'GST 5%',
      totalRatePct,
      totalTaxAmount,
      components,
    }
  } catch (err: any) {
    return {
      success: false,
      groupName: 'GST 5%',
      totalRatePct: 5,
      totalTaxAmount: Math.round(subtotal * 0.05 * 100) / 100,
      components: [
        { name: 'CGST', rate: 2.5, amount: Math.round(subtotal * 0.025 * 100) / 100 },
        { name: 'SGST', rate: 2.5, amount: Math.round(subtotal * 0.025 * 100) / 100 },
      ],
    }
  }
}
