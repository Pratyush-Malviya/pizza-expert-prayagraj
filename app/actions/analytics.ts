'use server'

import { createAdminClient } from '@/lib/supabase/server'

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY

// ─── PostHog HogQL Helper ────────────────────────────────────
async function queryPostHog(sql: string): Promise<any[] | null> {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_API_KEY) return null
  try {
    const res = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${POSTHOG_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.results ?? null
  } catch { return null }
}

// ─── 1. PostHog KPI Metrics ──────────────────────────────────
export interface PostHogMetrics {
  totalTrackedUsers: number | null
  activeSessionsToday: number | null
  funnelPageviews: number | null
  funnelAddToCart: number | null
  funnelCheckout: number | null
  funnelOrders: number | null
  conversionRate: number | null
  phAvailable: boolean
}

export async function fetchPostHogMetrics(): Promise<PostHogMetrics> {
  const [usersRows, sessionsRows, funnelRows] = await Promise.all([
    queryPostHog(`SELECT count(DISTINCT person_id) FROM events WHERE timestamp >= now() - INTERVAL 7 DAY AND person_id != ''`),
    queryPostHog(`SELECT count(DISTINCT "$session_id") FROM events WHERE toDate(timestamp) = today() AND "$session_id" != ''`),
    queryPostHog(`SELECT countIf(event='$pageview'), countIf(event='add_to_cart'), countIf(event='initiate_checkout'), countIf(event='order_completed') FROM events WHERE timestamp >= now() - INTERVAL 7 DAY`),
  ])
  const totalTrackedUsers = usersRows?.[0]?.[0] != null ? Number(usersRows[0][0]) : null
  const activeSessionsToday = sessionsRows?.[0]?.[0] != null ? Number(sessionsRows[0][0]) : null
  const f = funnelRows?.[0]
  const funnelPageviews = f?.[0] != null ? Number(f[0]) : null
  const funnelAddToCart = f?.[1] != null ? Number(f[1]) : null
  const funnelCheckout = f?.[2] != null ? Number(f[2]) : null
  const funnelOrders = f?.[3] != null ? Number(f[3]) : null
  const conversionRate = funnelPageviews && funnelOrders && funnelPageviews > 0
    ? Math.round((funnelOrders / funnelPageviews) * 1000) / 10 : null
  return { totalTrackedUsers, activeSessionsToday, funnelPageviews, funnelAddToCart, funnelCheckout, funnelOrders, conversionRate, phAvailable: !!(POSTHOG_PROJECT_ID && POSTHOG_API_KEY) }
}

// ─── 2. Supabase KPI Metrics ─────────────────────────────────
export interface RealMetrics {
  totalRevenue: number
  totalOrders: number
  aov: number
  totalRegisteredUsers: number
  newUsersThisWeek: number
  couponDiscountSpend: number
}

export async function fetchSupabaseMetrics(): Promise<RealMetrics> {
  const zero: RealMetrics = { totalRevenue: 0, totalOrders: 0, aov: 0, totalRegisteredUsers: 0, newUsersThisWeek: 0, couponDiscountSpend: 0 }
  try {
    const supabase = await createAdminClient()
    const { data: ordersData } = await supabase.from('orders').select('total, discount').in('status', ['delivered', 'completed', 'out_for_delivery', 'preparing', 'confirmed'])
    const totalRevenue = (ordersData || []).reduce((s, o) => s + Number(o.total || 0), 0)
    const totalOrders = (ordersData || []).length
    const couponDiscountSpend = (ordersData || []).reduce((s, o) => s + Number((o as any).discount || 0), 0)
    const aov = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0
    const { count: totalRegisteredUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'staff').neq('role', 'driver')
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { count: newUsersThisWeek } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo).neq('role', 'staff').neq('role', 'driver')
    return { totalRevenue: Math.round(totalRevenue), totalOrders, aov, totalRegisteredUsers: totalRegisteredUsers ?? 0, newUsersThisWeek: newUsersThisWeek ?? 0, couponDiscountSpend: Math.round(couponDiscountSpend) }
  } catch { return zero }
}

// ─── 3. Product Performance ──────────────────────────────────
export interface ProductStat {
  product_id: string
  product_name: string
  selling_price: number
  cost_price: number
  total_units_sold: number
  total_revenue: number
  total_estimated_profit: number
}

export async function fetchProductPerformance(): Promise<ProductStat[]> {
  try {
    const supabase = await createAdminClient()
    const { data } = await supabase.from('product_performance_summary').select('*').limit(15)
    if (!data || data.length === 0) return []
    return data.map((d: any) => ({
      product_id: d.product_id,
      product_name: d.product_name,
      selling_price: Number(d.selling_price || 0),
      cost_price: Number(d.cost_price || 0),
      total_units_sold: Number(d.total_units_sold || 0),
      total_revenue: Number(d.total_revenue || 0),
      total_estimated_profit: Number(d.total_estimated_profit || 0),
    }))
  } catch { return [] }
}

// ─── 4. Category Distribution ────────────────────────────────
export interface CategoryStat {
  name: string
  revenue: number
  units: number
  color: string
}

const CAT_COLORS = ['#16A34A', '#DC2626', '#D97706', '#2563EB', '#7C3AED', '#DB2777']

export async function fetchCategoryDistribution(): Promise<CategoryStat[]> {
  try {
    const supabase = await createAdminClient()
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, unit_price, product:products!inner(category:categories!inner(name))')
    if (!items || items.length === 0) return []
    const catMap: Record<string, { revenue: number; units: number }> = {}
    for (const item of items as any[]) {
      const catName = item.product?.category?.name || 'Other'
      if (!catMap[catName]) catMap[catName] = { revenue: 0, units: 0 }
      catMap[catName].revenue += Number(item.unit_price || 0) * Number(item.quantity || 0)
      catMap[catName].units += Number(item.quantity || 0)
    }
    return Object.entries(catMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([name, s], i) => ({ name, revenue: Math.round(s.revenue), units: s.units, color: CAT_COLORS[i % CAT_COLORS.length] }))
  } catch { return [] }
}

// ─── 5. Hourly Sales Heatmap ─────────────────────────────────
export interface HeatmapCell {
  day: number  // 0=Sun..6=Sat
  hour: number // 0-23
  orders: number
  revenue: number
}

export async function fetchHourlySalesHeatmap(days = 30): Promise<HeatmapCell[]> {
  try {
    const supabase = await createAdminClient()
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const { data } = await supabase.from('orders').select('created_at, total').neq('status', 'cancelled').gte('created_at', since)
    if (!data || data.length === 0) return []
    const cells: Record<string, HeatmapCell> = {}
    for (const ord of data) {
      const d = new Date(ord.created_at)
      const day = d.getDay(), hour = d.getHours(), key = `${day}-${hour}`
      if (!cells[key]) cells[key] = { day, hour, orders: 0, revenue: 0 }
      cells[key].orders++
      cells[key].revenue += Number(ord.total || 0)
    }
    return Object.values(cells)
  } catch { return [] }
}

// ─── 6. Customer Segments ─────────────────────────────────────
export interface CustomerSegments {
  vip: number
  regular: number
  oneTime: number
  dormant: number
  totalWithOrders: number
  repeatRate: number
  avgLTVVip: number
  avgLTVRegular: number
  churnRiskCount: number
}

export async function fetchCustomerSegments(): Promise<CustomerSegments> {
  const zero: CustomerSegments = { vip: 0, regular: 0, oneTime: 0, dormant: 0, totalWithOrders: 0, repeatRate: 0, avgLTVVip: 0, avgLTVRegular: 0, churnRiskCount: 0 }
  try {
    const supabase = await createAdminClient()
    const [{ data: profiles }, { data: orders }] = await Promise.all([
      supabase.from('profiles').select('id').neq('role', 'staff').neq('role', 'driver').neq('role', 'super_admin').neq('role', 'manager'),
      supabase.from('orders').select('user_id, total, created_at').neq('status', 'cancelled').not('user_id', 'is', null),
    ])
    if (!profiles || !orders) return zero
    const userMap: Record<string, { count: number; total: number; lastDate: number }> = {}
    for (const ord of orders as any[]) {
      if (!ord.user_id) continue
      if (!userMap[ord.user_id]) userMap[ord.user_id] = { count: 0, total: 0, lastDate: 0 }
      userMap[ord.user_id].count++
      userMap[ord.user_id].total += Number(ord.total || 0)
      const ts = new Date(ord.created_at).getTime()
      if (ts > userMap[ord.user_id].lastDate) userMap[ord.user_id].lastDate = ts
    }
    const thirtyDaysAgo = Date.now() - 30 * 86400000
    let vip = 0, regular = 0, oneTime = 0, dormant = 0, vipLTV = 0, regularLTV = 0, churnRisk = 0
    for (const prof of profiles as any[]) {
      const u = userMap[prof.id]
      if (!u) { dormant++; continue }
      if (u.count > 5) { vip++; vipLTV += u.total }
      else if (u.count >= 2) { regular++; regularLTV += u.total }
      else oneTime++
      if (u.lastDate < thirtyDaysAgo) churnRisk++
    }
    const totalWithOrders = vip + regular + oneTime
    return {
      vip, regular, oneTime, dormant, totalWithOrders,
      repeatRate: totalWithOrders > 0 ? Math.round(((vip + regular) / totalWithOrders) * 100) : 0,
      avgLTVVip: vip > 0 ? Math.round(vipLTV / vip) : 0,
      avgLTVRegular: regular > 0 ? Math.round(regularLTV / regular) : 0,
      churnRiskCount: churnRisk,
    }
  } catch { return zero }
}

// ─── 7. Order Status Breakdown ───────────────────────────────
export interface OrderStatusStat {
  status: string
  count: number
  revenue: number
}

export async function fetchOrderStatusBreakdown(): Promise<OrderStatusStat[]> {
  try {
    const supabase = await createAdminClient()
    const { data } = await supabase.from('orders').select('status, total')
    if (!data) return []
    const map: Record<string, { count: number; revenue: number }> = {}
    for (const ord of data as any[]) {
      if (!map[ord.status]) map[ord.status] = { count: 0, revenue: 0 }
      map[ord.status].count++
      map[ord.status].revenue += Number(ord.total || 0)
    }
    return Object.entries(map).map(([status, s]) => ({ status, count: s.count, revenue: Math.round(s.revenue) })).sort((a, b) => b.count - a.count)
  } catch { return [] }
}

// ─── 8. Payment Method Breakdown ─────────────────────────────
export interface PaymentMethodStat {
  gateway: string
  count: number
  total: number
  successCount: number
  failCount: number
}

export async function fetchPaymentMethodBreakdown(): Promise<PaymentMethodStat[]> {
  try {
    const supabase = await createAdminClient()
    const { data } = await supabase.from('payments').select('gateway, amount, status')
    if (!data) return []
    const map: Record<string, PaymentMethodStat> = {}
    for (const p of data as any[]) {
      if (!map[p.gateway]) map[p.gateway] = { gateway: p.gateway, count: 0, total: 0, successCount: 0, failCount: 0 }
      map[p.gateway].count++
      map[p.gateway].total += Number(p.amount || 0)
      if (p.status === 'paid') map[p.gateway].successCount++
      else if (p.status === 'failed') map[p.gateway].failCount++
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  } catch { return [] }
}

// ─── 9. Coupon ROI ───────────────────────────────────────────
export interface CouponStat {
  code: string
  type: string
  value: number
  redemptions: number
  totalDiscount: number
  avgOrderWithCoupon: number
}

export async function fetchCouponROI(): Promise<CouponStat[]> {
  try {
    const supabase = await createAdminClient()
    const { data: orders } = await supabase
      .from('orders')
      .select('discount, total, coupon:coupons(code, type, value)')
      .not('coupon_id', 'is', null)
    if (!orders) return []
    const map: Record<string, CouponStat & { _totalRev: number }> = {}
    for (const ord of orders as any[]) {
      const code = ord.coupon?.code || 'Unknown'
      if (!map[code]) map[code] = { code, type: ord.coupon?.type || 'unknown', value: Number(ord.coupon?.value || 0), redemptions: 0, totalDiscount: 0, avgOrderWithCoupon: 0, _totalRev: 0 }
      map[code].redemptions++
      map[code].totalDiscount += Number(ord.discount || 0)
      map[code]._totalRev += Number(ord.total || 0)
    }
    return Object.values(map).map(c => ({
      code: c.code, type: c.type, value: c.value, redemptions: c.redemptions,
      totalDiscount: Math.round(c.totalDiscount),
      avgOrderWithCoupon: c.redemptions > 0 ? Math.round(c._totalRev / c.redemptions) : 0,
    })).sort((a, b) => b.redemptions - a.redemptions)
  } catch { return [] }
}

// ─── 10. Review Sentiment ────────────────────────────────────
export interface ReviewSentiment {
  avgRating: number
  totalReviews: number
  totalApproved: number
  approvalRate: number
  ratingDistribution: { rating: number; count: number }[]
  topRatedProducts: { name: string; avgRating: number; reviewCount: number }[]
}

export async function fetchReviewSentiment(): Promise<ReviewSentiment | null> {
  try {
    const supabase = await createAdminClient()
    const { data: reviews } = await supabase.from('reviews').select('rating, is_approved, product:products(name)')
    if (!reviews || reviews.length === 0) return null
    const approved = reviews.filter((r: any) => r.is_approved)
    const avgRating = approved.length > 0 ? Math.round((approved.reduce((s: number, r: any) => s + r.rating, 0) / approved.length) * 10) / 10 : 0
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of reviews as any[]) dist[r.rating] = (dist[r.rating] || 0) + 1
    const prodMap: Record<string, { total: number; count: number }> = {}
    for (const r of approved as any[]) {
      const name = r.product?.name || 'Unknown'
      if (!prodMap[name]) prodMap[name] = { total: 0, count: 0 }
      prodMap[name].total += r.rating; prodMap[name].count++
    }
    return {
      avgRating,
      totalReviews: reviews.length,
      totalApproved: approved.length,
      approvalRate: Math.round((approved.length / reviews.length) * 100),
      ratingDistribution: [1, 2, 3, 4, 5].map(r => ({ rating: r, count: dist[r] || 0 })),
      topRatedProducts: Object.entries(prodMap)
        .map(([name, s]) => ({ name, avgRating: Math.round((s.total / s.count) * 10) / 10, reviewCount: s.count }))
        .filter(p => p.reviewCount >= 1)
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 5),
    }
  } catch { return null }
}

// ─── 11. Week-Over-Week Revenue ──────────────────────────────
export interface WeekOverWeekDay {
  label: string
  thisWeek: number
  lastWeek: number
  orders: number
}

export async function fetchWeekOverWeekRevenue(): Promise<WeekOverWeekDay[]> {
  try {
    const supabase = await createAdminClient()
    const since = new Date(Date.now() - 14 * 86400000).toISOString()
    const { data } = await supabase.from('orders').select('created_at, total').neq('status', 'cancelled').gte('created_at', since)
    if (!data) return []
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const thisW: Record<number, { rev: number; ord: number }> = {}
    const lastW: Record<number, { rev: number; ord: number }> = {}
    const sevenDaysAgo = Date.now() - 7 * 86400000
    for (const ord of data as any[]) {
      const d = new Date(ord.created_at), dow = d.getDay(), rev = Number(ord.total || 0)
      if (d.getTime() >= sevenDaysAgo) {
        if (!thisW[dow]) thisW[dow] = { rev: 0, ord: 0 }
        thisW[dow].rev += rev; thisW[dow].ord++
      } else {
        if (!lastW[dow]) lastW[dow] = { rev: 0, ord: 0 }
        lastW[dow].rev += rev; lastW[dow].ord++
      }
    }
    return days.map((label, i) => ({ label, thisWeek: Math.round(thisW[i]?.rev || 0), lastWeek: Math.round(lastW[i]?.rev || 0), orders: thisW[i]?.ord || 0 }))
  } catch { return [] }
}

// ─── 12. Revenue Series (daily_revenue_summary view) ─────────
export interface RevenueSeries {
  date: string
  revenue: number
  cost: number
  profit: number
  orders: number
}

export async function fetchRevenueSeries(days = 30): Promise<RevenueSeries[]> {
  try {
    const supabase = await createAdminClient()
    const { data } = await supabase.from('daily_revenue_summary').select('*').limit(days)
    if (!data || data.length === 0) return []
    return data.map((d: any) => ({
      date: d.date,
      revenue: Number(d.gross_revenue) || 0,
      cost: Math.round((Number(d.gross_revenue) || 0) * 0.4),
      profit: Math.round((Number(d.gross_revenue) || 0) * 0.6),
      orders: Number(d.total_orders) || 0,
    })).reverse()
  } catch { return [] }
}

// ─── 13. PostHog Device Breakdown ────────────────────────────
export interface DeviceStat {
  name: string
  count: number
  percentage: number
  color: string
}

const DEV_COLORS = ['#E11D48', '#2563EB', '#059669', '#D97706', '#7C3AED']

export async function fetchPostHogDevices(): Promise<DeviceStat[]> {
  const rows = await queryPostHog(`SELECT properties.$os, count(*) as cnt FROM events WHERE timestamp >= now() - INTERVAL 7 DAY AND properties.$os IS NOT NULL AND properties.$os != '' GROUP BY properties.$os ORDER BY cnt DESC LIMIT 6`)
  if (!rows || rows.length === 0) return []
  const total = rows.reduce((s, r) => s + Number(r[1] || 0), 0)
  return rows.map((r, i) => ({ name: r[0] || 'Unknown', count: Number(r[1] || 0), percentage: total > 0 ? Math.round((Number(r[1] || 0) / total) * 100) : 0, color: DEV_COLORS[i % DEV_COLORS.length] }))
}

// ─── 14. PostHog Top Pages ───────────────────────────────────
export interface TopPage {
  url: string
  views: number
}

export async function fetchPostHogTopPages(): Promise<TopPage[]> {
  const rows = await queryPostHog(`SELECT properties.$pathname, count(*) as views FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 7 DAY GROUP BY properties.$pathname ORDER BY views DESC LIMIT 10`)
  if (!rows) return []
  return rows.map(r => ({ url: r[0] || '/', views: Number(r[1] || 0) }))
}

// ─── 15. PostHog UTM Sources ─────────────────────────────────
export interface UTMSource {
  source: string
  conversions: number
  views: number
  conversionRate: number
}

export async function fetchPostHogUTMSources(): Promise<UTMSource[]> {
  const [convRows, viewRows] = await Promise.all([
    queryPostHog(`SELECT coalesce(properties.$initial_utm_source, 'direct') as src, count(*) as cnt FROM events WHERE event = 'order_completed' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY src ORDER BY cnt DESC LIMIT 8`),
    queryPostHog(`SELECT coalesce(properties.$initial_utm_source, 'direct') as src, count(*) as cnt FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY src ORDER BY cnt DESC LIMIT 8`),
  ])
  if (!convRows) return []
  const viewMap: Record<string, number> = {}
  for (const r of (viewRows || [])) viewMap[r[0]] = Number(r[1] || 0)
  return convRows.map(r => {
    const views = viewMap[r[0]] || 0
    const conversions = Number(r[1] || 0)
    return { source: r[0] || 'direct', conversions, views, conversionRate: views > 0 ? Math.round((conversions / views) * 1000) / 10 : 0 }
  })
}

// ─── 16. Anomaly Alerts ──────────────────────────────────────
export interface AnomalyAlert {
  type: 'error' | 'warning' | 'info'
  title: string
  detail: string
  icon: string
}

export async function fetchAnomalyAlerts(): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = []
  try {
    const supabase = await createAdminClient()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const [{ count: todayOrders }, { data: weekOrders }, { count: recentCancels }, { count: lastTwoHrs }, { data: lowStock }] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).neq('status', 'cancelled'),
      supabase.from('orders').select('created_at').gte('created_at', sevenDaysAgo).neq('status', 'cancelled'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', oneHourAgo).eq('status', 'cancelled'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7200000).toISOString()),
      supabase.from('ingredients').select('name, current_stock, reorder_threshold'),
    ])

    const avgDailyOrders = (weekOrders || []).length / 7
    if ((todayOrders ?? 0) === 0 && now.getHours() >= 12) {
      alerts.push({ type: 'error', icon: '🚨', title: 'Zero orders today', detail: 'No orders received today — check if the ordering system is working.' })
    } else if (avgDailyOrders > 0 && (todayOrders ?? 0) < avgDailyOrders * 0.3 && now.getHours() >= 14) {
      alerts.push({ type: 'warning', icon: '⚠️', title: 'Orders well below average', detail: `${todayOrders} orders today vs avg ${Math.round(avgDailyOrders)}/day` })
    }
    if ((recentCancels ?? 0) >= 3) {
      alerts.push({ type: 'error', icon: '❌', title: `${recentCancels} orders cancelled in last hour`, detail: 'High cancellation rate detected — review kitchen capacity or payment issues.' })
    }
    if ((lastTwoHrs ?? 0) === 0 && now.getHours() >= 11 && now.getHours() <= 22) {
      alerts.push({ type: 'warning', icon: '🔇', title: 'No orders in last 2 hours', detail: 'Unusually quiet during business hours. Test the checkout flow.' })
    }
    const lowStockItems = (lowStock || []).filter((i: any) => Number(i.current_stock) < Number(i.reorder_threshold))
    if (lowStockItems.length > 0) {
      alerts.push({ type: 'warning', icon: '📦', title: `${lowStockItems.length} ingredient(s) below reorder threshold`, detail: lowStockItems.slice(0, 3).map((i: any) => i.name).join(', ') + (lowStockItems.length > 3 ? '…' : '') })
    }
    if (alerts.length === 0) {
      alerts.push({ type: 'info', icon: '✅', title: 'All systems normal', detail: 'No anomalies detected. Revenue and order patterns look healthy.' })
    }
  } catch (err) { console.warn('[Anomaly]', err) }
  return alerts
}

// ─── 17. Rule-Based AI Insights ──────────────────────────────
export interface AIInsight {
  emoji: string
  title: string
  detail: string
  type: 'positive' | 'neutral' | 'action'
}

export async function fetchAIInsights(params: {
  metrics: { totalRevenue: number; totalOrders: number; aov: number }
  segments: CustomerSegments | null
  productStats: ProductStat[]
  weekOverWeek: WeekOverWeekDay[]
}): Promise<AIInsight[]> {
  const insights: AIInsight[] = []
  const { metrics, segments, productStats, weekOverWeek } = params

  // Best margin product
  if (productStats.length > 0) {
    const best = productStats.reduce((a, b) =>
      (b.total_revenue > 0 ? b.total_estimated_profit / b.total_revenue : 0) >
      (a.total_revenue > 0 ? a.total_estimated_profit / a.total_revenue : 0) ? b : a
    )
    const margin = best.total_revenue > 0 ? Math.round((best.total_estimated_profit / best.total_revenue) * 100) : 0
    if (margin > 0) insights.push({ emoji: '🏆', title: `${best.product_name} has the highest margin`, detail: `${margin}% gross margin — feature it prominently on the menu.`, type: 'positive' })
  }

  // Best selling day
  if (weekOverWeek.length > 0) {
    const bestDay = weekOverWeek.reduce((a, b) => b.thisWeek > a.thisWeek ? b : a)
    if (bestDay.thisWeek > 0) insights.push({ emoji: '📅', title: `${bestDay.label} is your strongest day this week`, detail: `₹${bestDay.thisWeek.toLocaleString('en-IN')} in sales. Run promotions on weaker days to smooth revenue.`, type: 'positive' })

    // WoW trend
    const thisTotal = weekOverWeek.reduce((s, d) => s + d.thisWeek, 0)
    const lastTotal = weekOverWeek.reduce((s, d) => s + d.lastWeek, 0)
    if (lastTotal > 0) {
      const pct = Math.round(((thisTotal - lastTotal) / lastTotal) * 100)
      if (Math.abs(pct) >= 5) insights.push({
        emoji: pct > 0 ? '📈' : '📉',
        title: pct > 0 ? `Revenue up ${pct}% vs last week` : `Revenue down ${Math.abs(pct)}% vs last week`,
        detail: pct > 0 ? 'Great growth momentum! Consider doubling down on what worked.' : 'Consider a flash sale or promo to recover momentum.',
        type: pct > 0 ? 'positive' : 'action'
      })
    }
  }

  // Churn risk
  if (segments && segments.churnRiskCount > 0) insights.push({ emoji: '💌', title: `${segments.churnRiskCount} customers at churn risk`, detail: "They ordered 30+ days ago and haven't returned. Send a WhatsApp campaign with a 15% comeback coupon.", type: 'action' })

  // Repeat rate
  if (segments && segments.repeatRate > 0) insights.push({
    emoji: segments.repeatRate >= 40 ? '🔁' : '⚠️',
    title: `${segments.repeatRate}% customer repeat rate`,
    detail: segments.repeatRate >= 40 ? 'Strong loyalty base! Focus on growing the VIP tier with exclusive perks.' : 'Below 40% — consider a loyalty punch card or "5th order free" campaign.',
    type: segments.repeatRate >= 40 ? 'positive' : 'action'
  })

  // AOV insight
  if (metrics.aov > 0) insights.push({
    emoji: '🛒',
    title: `Average order value is ₹${metrics.aov}`,
    detail: metrics.aov >= 400 ? 'AOV is healthy. Upsell desserts or garlic bread add-ons to push it higher.' : 'Try a "Add ₹99 more, get free delivery" banner to boost AOV above ₹400.',
    type: metrics.aov >= 400 ? 'positive' : 'action'
  })

  // VIP segment
  if (segments && segments.vip > 0) insights.push({ emoji: '👑', title: `${segments.vip} VIP customers (5+ orders)`, detail: `Avg LTV: ₹${segments.avgLTVVip.toLocaleString('en-IN')}. Reward them with early access to new items or a VIP-only coupon.`, type: 'positive' })

  return insights.slice(0, 6)
}

// ─── 18. Secure PostHog Engine Status ────────────────────────
export interface PostHogEngineStatus {
  hasPersonalKey: boolean
  hasProjectId: boolean
  projectId: string | null
  host: string
  publicKeyPreview: string | null
}

export async function fetchPostHogEngineStatus(): Promise<PostHogEngineStatus> {
  const pubKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  return {
    hasPersonalKey: Boolean(process.env.POSTHOG_PERSONAL_API_KEY),
    hasProjectId: Boolean(process.env.POSTHOG_PROJECT_ID),
    projectId: process.env.POSTHOG_PROJECT_ID || null,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    publicKeyPreview: pubKey ? `${pubKey.slice(0, 10)}…${pubKey.slice(-4)}` : null,
  }
}
