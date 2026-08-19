'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'

// ─── Menu Engineering Quadrant Analysis ─────────────────────────────────────

export type QuadrantType = 'star' | 'plowhorse' | 'puzzle' | 'dog'

export interface MenuItemEngineering {
  id: string
  name: string
  price: number
  ingredientCost: number
  grossMargin: number
  foodCostPercentage: number
  totalQuantitySold: number
  totalRevenue: number
  quadrant: QuadrantType
  categoryName?: string
}

export async function getMenuEngineeringData(days = 30) {
  await requireUser(['manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  try {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // 1. Fetch Products & Categories
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, price, category:categories(name), is_available')
      .order('name')

    if (prodErr) throw new Error(prodErr.message)

    // 2. Fetch Recipe Items (Ingredient Costs)
    const { data: recipeItems } = await supabase
      .from('recipe_items')
      .select('product_id, quantity, ingredient:ingredients(cost_per_unit)')

    // 3. Fetch Order Items in the selected time window
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price, order:orders!inner(created_at, payment_status)')
      .gte('order.created_at', fromDate)
      .eq('order.payment_status', 'paid')

    // 4. Compute Volume & Margin per Product
    const itemsList: MenuItemEngineering[] = (products || []).map((product) => {
      const items = (recipeItems || []).filter((r: any) => r.product_id === product.id)
      const ingredientCost = items.reduce((sum: number, r: any) => {
        return sum + (Number(r.quantity || 0) * Number(r.ingredient?.cost_per_unit || 0))
      }, 0)

      const sellingPrice = Number(product.price || 0)
      const grossMargin = Math.max(0, sellingPrice - ingredientCost)
      const foodCostPercentage = sellingPrice > 0 ? (ingredientCost / sellingPrice) * 100 : 0

      // Compute total units sold
      const productSales = (orderItems || []).filter((oi: any) => oi.product_id === product.id)
      const totalQuantitySold = productSales.reduce((sum: number, oi: any) => sum + Number(oi.quantity || 0), 0)
      const totalRevenue = totalQuantitySold * sellingPrice

      return {
        id: product.id,
        name: product.name,
        price: sellingPrice,
        ingredientCost,
        grossMargin,
        foodCostPercentage: Math.round(foodCostPercentage * 10) / 10,
        totalQuantitySold,
        totalRevenue,
        quadrant: 'dog', // will be evaluated based on averages
        categoryName: (product.category as any)?.name || 'General',
      }
    })

    // 5. Calculate Average Margin & Average Popularity Volume
    const totalVolume = itemsList.reduce((sum, item) => sum + item.totalQuantitySold, 0)
    const avgVolume = itemsList.length > 0 ? totalVolume / itemsList.length : 1
    const totalMarginSum = itemsList.reduce((sum, item) => sum + item.grossMargin, 0)
    const avgMargin = itemsList.length > 0 ? totalMarginSum / itemsList.length : 1

    // 6. Assign Quadrants
    const categorized = itemsList.map((item) => {
      const isHighMargin = item.grossMargin >= avgMargin
      const isHighVolume = item.totalQuantitySold >= avgVolume

      let quadrant: QuadrantType = 'dog'
      if (isHighMargin && isHighVolume) quadrant = 'star'
      else if (!isHighMargin && isHighVolume) quadrant = 'plowhorse'
      else if (isHighMargin && !isHighVolume) quadrant = 'puzzle'
      else quadrant = 'dog'

      return { ...item, quadrant }
    })

    return {
      success: true,
      items: categorized,
      avgMargin,
      avgVolume,
      starsCount: categorized.filter((i) => i.quadrant === 'star').length,
      plowhorsesCount: categorized.filter((i) => i.quadrant === 'plowhorse').length,
      puzzlesCount: categorized.filter((i) => i.quadrant === 'puzzle').length,
      dogsCount: categorized.filter((i) => i.quadrant === 'dog').length,
    }
  } catch (err: any) {
    return { success: false, error: err.message, items: [], avgMargin: 0, avgVolume: 0, starsCount: 0, plowhorsesCount: 0, puzzlesCount: 0, dogsCount: 0 }
  }
}

// ─── Profit & Loss (P&L) Summary ────────────────────────────────────────────

export async function getProfitAndLossSummary(days = 30) {
  await requireUser(['manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  try {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // 1. Fetch Paid Orders
    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('id, subtotal, discount, tax, total, created_at')
      .gte('created_at', fromDate)
      .eq('payment_status', 'paid')

    if (ordErr) throw new Error(ordErr.message)

    const grossSales = (orders || []).reduce((sum, o) => sum + Number(o.subtotal || 0), 0)
    const totalDiscounts = (orders || []).reduce((sum, o) => sum + Number(o.discount || 0), 0)
    const totalTax = (orders || []).reduce((sum, o) => sum + Number(o.tax || 0), 0)
    const netSales = grossSales - totalDiscounts

    // 2. Fetch Order Items & Calculate COGS (Cost of Goods Sold from BOM)
    const orderIds = (orders || []).map((o) => o.id)
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .in('order_id', orderIds.length > 0 ? orderIds : ['00000000-0000-0000-0000-000000000000'])

    const { data: recipeItems } = await supabase
      .from('recipe_items')
      .select('product_id, quantity, ingredient:ingredients(cost_per_unit)')

    let totalCOGS = 0
    for (const oi of (orderItems || [])) {
      const boms = (recipeItems || []).filter((r: any) => r.product_id === oi.product_id)
      const itemCost = boms.reduce((s: number, r: any) => s + (Number(r.quantity || 0) * Number(r.ingredient?.cost_per_unit || 0)), 0)
      totalCOGS += itemCost * Number(oi.quantity || 0)
    }

    // 3. Fetch Wastage Losses
    const { data: wastage } = await supabase
      .from('wastage_records')
      .select('cost_impact')
      .gte('recorded_at', fromDate)

    const totalWastage = (wastage || []).reduce((sum, w) => sum + Number(w.cost_impact || 0), 0)

    // 4. Gross Profit & Margins
    const totalCostOfFood = totalCOGS + totalWastage
    const grossProfit = netSales - totalCostOfFood
    const grossMarginPercentage = netSales > 0 ? (grossProfit / netSales) * 100 : 0
    const foodCostPercentage = netSales > 0 ? (totalCostOfFood / netSales) * 100 : 0

    return {
      success: true,
      summary: {
        grossSales,
        totalDiscounts,
        netSales,
        totalTax,
        totalCOGS,
        totalWastage,
        totalCostOfFood,
        grossProfit,
        grossMarginPercentage: Math.round(grossMarginPercentage * 10) / 10,
        foodCostPercentage: Math.round(foodCostPercentage * 10) / 10,
        orderCount: orders?.length || 0,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      summary: {
        grossSales: 0, totalDiscounts: 0, netSales: 0, totalTax: 0,
        totalCOGS: 0, totalWastage: 0, totalCostOfFood: 0, grossProfit: 0,
        grossMarginPercentage: 0, foodCostPercentage: 0, orderCount: 0,
      },
    }
  }
}

// ─── Day-End Closing Z-Report ───────────────────────────────────────────────

export async function generateDayEndReport(reportDateStr?: string, closedBy?: string, notes?: string) {
  const user = await requireUser(['manager', 'super_admin', 'accountant'])
  closedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    const targetDate = reportDateStr ? new Date(reportDateStr) : new Date()
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).toISOString()
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999).toISOString()
    const dateFormatted = targetDate.toISOString().split('T')[0]

    // 1. Fetch Orders for the day
    const { data: orders } = await supabase
      .from('orders')
      .select('id, subtotal, discount, tax, total, payment_status')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .eq('payment_status', 'paid')

    const totalGrossSales = (orders || []).reduce((s, o) => s + Number(o.subtotal || 0), 0)
    const totalDiscounts = (orders || []).reduce((s, o) => s + Number(o.discount || 0), 0)
    const totalNetSales = totalGrossSales - totalDiscounts
    const totalTax = (orders || []).reduce((s, o) => s + Number(o.tax || 0), 0)
    const totalTaxCGST = totalTax / 2
    const totalTaxSGST = totalTax / 2

    // 2. Fetch Payment Tenders
    const orderIds = (orders || []).map((o) => o.id)
    const { data: payments } = await supabase
      .from('order_payments')
      .select('tender_type, amount, change_given')
      .in('order_id', orderIds.length > 0 ? orderIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'completed')

    const totalCash = (payments || []).filter((p) => p.tender_type === 'cash').reduce((s, p) => s + Number(p.amount) - Number(p.change_given || 0), 0)
    const totalUPI = (payments || []).filter((p) => p.tender_type === 'upi').reduce((s, p) => s + Number(p.amount), 0)
    const totalCard = (payments || []).filter((p) => p.tender_type === 'card').reduce((s, p) => s + Number(p.amount), 0)

    // 3. Cashier Shifts & Cash Drawer Variance
    const { data: shifts } = await supabase
      .from('cashier_shifts')
      .select('opening_cash, closing_cash, expected_cash, cash_variance')
      .gte('opened_at', startOfDay)
      .lte('opened_at', endOfDay)

    const cashOpeningFloat = (shifts || []).reduce((s, sh) => s + Number(sh.opening_cash || 0), 0)
    const cashExpected = (shifts || []).reduce((s, sh) => s + Number(sh.expected_cash || 0), 0)
    const cashActual = (shifts || []).reduce((s, sh) => s + Number(sh.closing_cash || 0), 0)
    const cashVariance = (shifts || []).reduce((s, sh) => s + Number(sh.cash_variance || 0), 0)

    // 4. Wastage & Refunds
    const [{ data: wastage }, { data: refunds }] = await Promise.all([
      supabase.from('wastage_records').select('cost_impact').gte('recorded_at', startOfDay).lte('recorded_at', endOfDay),
      supabase.from('refund_requests').select('amount').gte('processed_at', startOfDay).lte('processed_at', endOfDay),
    ])

    const totalWastageLoss = (wastage || []).reduce((s, w) => s + Number(w.cost_impact || 0), 0)
    const totalRefunds = (refunds || []).reduce((s, r) => s + Number(r.amount || 0), 0)

    // 5. Upsert Day End Report
    const { data: zReport, error } = await supabase
      .from('day_end_reports')
      .upsert({
        report_date: dateFormatted,
        total_gross_sales: totalGrossSales,
        total_net_sales: totalNetSales,
        total_tax_cgst: totalTaxCGST,
        total_tax_sgst: totalTaxSGST,
        total_discounts: totalDiscounts,
        total_cash: totalCash,
        total_upi: totalUPI,
        total_card: totalCard,
        total_refunds: totalRefunds,
        total_wastage_loss: totalWastageLoss,
        total_cogs: 0,
        gross_profit: totalNetSales - totalWastageLoss,
        cash_opening_float: cashOpeningFloat,
        cash_expected: cashExpected,
        cash_actual: cashActual,
        cash_variance: cashVariance,
        total_orders: orders?.length || 0,
        cashier_shifts_count: shifts?.length || 0,
        closed_by: closedBy || null,
        closed_at: new Date().toISOString(),
        notes: notes || null,
      }, { onConflict: 'report_date' })
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath('/admin/reports/z-report')
    return { success: true, zReport }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getDayEndReports(limit = 30) {
  await requireUser(['manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('day_end_reports')
    .select(`
      *,
      closed_by_profile:profiles!day_end_reports_closed_by_fkey(name)
    `)
    .order('report_date', { ascending: false })
    .limit(limit)

  if (error) return { success: false, error: error.message, reports: [] }
  return { success: true, reports: data || [] }
}
