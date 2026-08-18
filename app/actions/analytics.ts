'use server'

import { createAdminClient } from '@/lib/supabase/server'

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY

async function queryPostHog(sql: string): Promise<any[] | null> {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_API_KEY) return null
  try {
    const res = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
        next: { revalidate: 300 }, // 5-min cache
      }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json?.results ?? null
  } catch {
    return null
  }
}

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
    queryPostHog(
      `SELECT count(DISTINCT person_id) AS cnt FROM events
       WHERE timestamp >= now() - INTERVAL 7 DAY AND person_id != ''`
    ),
    queryPostHog(
      `SELECT count(DISTINCT "$session_id") AS cnt FROM events
       WHERE toDate(timestamp) = today() AND "$session_id" != ''`
    ),
    queryPostHog(
      `SELECT
         countIf(event = '$pageview') AS pageviews,
         countIf(event = 'add_to_cart') AS add_to_cart,
         countIf(event = 'initiate_checkout') AS checkout,
         countIf(event = 'order_completed') AS orders
       FROM events
       WHERE timestamp >= now() - INTERVAL 7 DAY`
    ),
  ])

  const totalTrackedUsers = usersRows?.[0]?.[0] != null ? Number(usersRows[0][0]) : null
  const activeSessionsToday = sessionsRows?.[0]?.[0] != null ? Number(sessionsRows[0][0]) : null

  const funnelRow = funnelRows?.[0]
  const funnelPageviews = funnelRow?.[0] != null ? Number(funnelRow[0]) : null
  const funnelAddToCart = funnelRow?.[1] != null ? Number(funnelRow[1]) : null
  const funnelCheckout = funnelRow?.[2] != null ? Number(funnelRow[2]) : null
  const funnelOrders = funnelRow?.[3] != null ? Number(funnelRow[3]) : null

  const conversionRate =
    funnelPageviews && funnelOrders && funnelPageviews > 0
      ? Math.round((funnelOrders / funnelPageviews) * 1000) / 10
      : null

  const phAvailable = !!(POSTHOG_PROJECT_ID && POSTHOG_API_KEY)

  return {
    totalTrackedUsers,
    activeSessionsToday,
    funnelPageviews,
    funnelAddToCart,
    funnelCheckout,
    funnelOrders,
    conversionRate,
    phAvailable,
  }
}

export interface RealMetrics {
  totalRevenue: number
  totalOrders: number
  aov: number
  totalRegisteredUsers: number
  newUsersThisWeek: number
  couponDiscountSpend: number
}

export async function fetchSupabaseMetrics(): Promise<RealMetrics> {
  const zero: RealMetrics = {
    totalRevenue: 0,
    totalOrders: 0,
    aov: 0,
    totalRegisteredUsers: 0,
    newUsersThisWeek: 0,
    couponDiscountSpend: 0,
  }

  try {
    const supabase = await createAdminClient()

    // Completed orders aggregate
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total, coupon_discount')
      .in('status', ['delivered', 'completed', 'out_for_delivery', 'preparing', 'confirmed'])

    const totalRevenue = (ordersData || []).reduce(
      (sum, o) => sum + Number(o.total || 0),
      0
    )
    const totalOrders = (ordersData || []).length
    const aov = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0
    const couponDiscountSpend = (ordersData || []).reduce(
      (sum, o) => sum + Number(o.coupon_discount || 0),
      0
    )

    // Registered user counts
    const { count: totalRegisteredUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'staff')
      .neq('role', 'driver')

    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { count: newUsersThisWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo)
      .neq('role', 'staff')
      .neq('role', 'driver')

    return {
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      aov,
      totalRegisteredUsers: totalRegisteredUsers ?? 0,
      newUsersThisWeek: newUsersThisWeek ?? 0,
      couponDiscountSpend: Math.round(couponDiscountSpend),
    }
  } catch (err) {
    console.warn('[Analytics] fetchSupabaseMetrics error:', err)
    return zero
  }
}
