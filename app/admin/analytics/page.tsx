'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight,
  RefreshCw, Users, Activity, MousePointerClick, Award,
  Download, Search, Filter, Eye, ShieldCheck, CheckCircle2,
  AlertCircle, Sparkles, ExternalLink, Layers, Database,
  Smartphone, Globe, BarChart3, Zap, Star, Package,
  Clock, TrendingDown, Bell, X, ChevronRight, Send,
  Play, UserCheck, AlertTriangle, Info
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart,
  Pie, Cell, LineChart, Line
} from 'recharts'
import {
  POSTHOG_KEY, POSTHOG_HOST, trackPostHogEvent,
  getLocalTelemetryEvents, TelemetryEvent, posthog
} from '@/lib/posthog'
import { toast } from 'sonner'
import {
  fetchPostHogMetrics, fetchSupabaseMetrics,
  fetchProductPerformance, fetchCategoryDistribution,
  fetchHourlySalesHeatmap, fetchCustomerSegments,
  fetchOrderStatusBreakdown, fetchPaymentMethodBreakdown,
  fetchCouponROI, fetchReviewSentiment,
  fetchWeekOverWeekRevenue, fetchRevenueSeries,
  fetchPostHogDevices, fetchPostHogTopPages,
  fetchPostHogUTMSources, fetchAnomalyAlerts,
  fetchAIInsights, fetchPostHogEngineStatus,
  type PostHogMetrics, type RealMetrics, type ProductStat,
  type CategoryStat, type HeatmapCell, type CustomerSegments,
  type OrderStatusStat, type PaymentMethodStat, type CouponStat,
  type ReviewSentiment, type WeekOverWeekDay, type RevenueSeries,
  type DeviceStat, type TopPage, type UTMSource,
  type AnomalyAlert, type AIInsight, type PostHogEngineStatus
} from '@/app/actions/analytics'

// ─── Fallback mock series for revenue chart when DB view has no data ───
const MOCK_REVENUE_SERIES: RevenueSeries[] = [
  { date: 'Mon', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'Tue', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'Wed', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'Thu', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'Fri', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'Sat', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'Sun', revenue: 0, cost: 0, profit: 0, orders: 0 },
]

const DAYS_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS_LABEL = Array.from({ length: 24 }, (_, i) => `${i}:00`)

interface UserReport {
  id: string
  distinctId: string
  name: string
  email: string
  phone: string
  role: string
  totalOrders: number
  totalSpend: number
  lastSeen: string
  funnelStage: 'Active Buyer' | 'Checkout Dropped' | 'Cart Abandoned' | 'Browsing' | 'VIP Loyalist'
  activityTimeline: { event: string; timestamp: string; details: string; iconType: 'view' | 'cart' | 'order' | 'auth' }[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: 'Pending',          color: '#D97706', bg: '#FEF3C7' },
  confirmed:        { label: 'Confirmed',         color: '#2563EB', bg: '#DBEAFE' },
  preparing:        { label: 'Preparing',         color: '#7C3AED', bg: '#EDE9FE' },
  out_for_delivery: { label: 'Out for Delivery',  color: '#0891B2', bg: '#CFFAFE' },
  delivered:        { label: 'Delivered',         color: '#16A34A', bg: '#DCFCE7' },
  cancelled:        { label: 'Cancelled',         color: '#DC2626', bg: '#FEE2E2' },
  refunded:         { label: 'Refunded',          color: '#78716C', bg: '#F5F5F4' },
}

const GATEWAY_LABEL: Record<string, string> = { razorpay: 'Razorpay', cashfree: 'Cashfree', cod: 'Cash on Delivery' }

// ─── Heatmap Cell Component ───────────────────────────────────
function HeatmapGrid({ cells }: { cells: HeatmapCell[] }) {
  const maxOrders = Math.max(...cells.map(c => c.orders), 1)
  const cellMap: Record<string, HeatmapCell> = {}
  for (const c of cells) cellMap[`${c.day}-${c.hour}`] = c
  const [tooltip, setTooltip] = useState<{ day: number; hour: number } | null>(null)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 700 }}>
        {/* Hour labels */}
        <div className="flex mb-1 pl-12">
          {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
            <div key={h} style={{ width: `${100 / 8}%` }} className="text-[9px] text-[#A8A29E] text-center">{h}:00</div>
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 0].map(day => (
          <div key={day} className="flex items-center mb-0.5">
            <span className="w-12 text-[10px] text-[#78716C] font-medium shrink-0">{DAYS_LABEL[day]}</span>
            <div className="flex flex-1 gap-0.5">
              {Array.from({ length: 24 }, (_, h) => {
                const cell = cellMap[`${day}-${h}`]
                const intensity = cell ? cell.orders / maxOrders : 0
                const alpha = Math.round(intensity * 100)
                return (
                  <div
                    key={h}
                    className="relative flex-1 h-5 rounded-sm cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: cell ? `rgba(185, 28, 28, ${0.08 + intensity * 0.85})` : '#F5F2EC' }}
                    onMouseEnter={() => setTooltip({ day, hour: h })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })}
            </div>
          </div>
        ))}
        {tooltip && (() => {
          const c = cellMap[`${tooltip.day}-${tooltip.hour}`]
          return (
            <div className="mt-2 p-2 bg-[#1C1917] text-white text-xs rounded-lg inline-flex gap-3">
              <span className="font-bold">{DAYS_LABEL[tooltip.day]} {tooltip.hour}:00–{tooltip.hour + 1}:00</span>
              {c ? <><span>{c.orders} orders</span><span>₹{c.revenue.toLocaleString('en-IN')}</span></> : <span className="text-[#A8A29E]">No orders</span>}
            </div>
          )
        })()}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] text-[#A8A29E]">Low</span>
          <div className="flex gap-0.5">
            {[0.08, 0.28, 0.48, 0.68, 0.88].map(v => (
              <div key={v} className="w-5 h-3 rounded-sm" style={{ backgroundColor: `rgba(185,28,28,${v})` }} />
            ))}
          </div>
          <span className="text-[10px] text-[#A8A29E]">High</span>
        </div>
      </div>
    </div>
  )
}

// ─── Star Rating Display ──────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-[#D6D3D1]'} />
      ))}
    </div>
  )
}

// ─── Skeleton Loader ──────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[#F5F2EC] rounded animate-pulse ${className}`} />
}

// ─── Main Component ───────────────────────────────────────────
export default function AdminAnalyticsPage() {
  type TabId = 'users' | 'funnel' | 'financials' | 'operations' | 'insights' | 'engine_hub'
  const [activeTab, setActiveTab] = useState<TabId>('users')

  const syncActiveTab = useCallback(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab') as TabId
      if (tab && ['users', 'funnel', 'financials', 'operations', 'insights', 'engine_hub'].includes(tab)) {
        setActiveTab(tab)
      } else {
        setActiveTab('users')
      }
    }
  }, [])

  useEffect(() => {
    syncActiveTab()
    const handleCustomTab = (e: any) => {
      const tab = e?.detail as TabId
      if (tab && ['users', 'funnel', 'financials', 'operations', 'insights', 'engine_hub'].includes(tab)) {
        setActiveTab(tab)
      }
    }
    window.addEventListener('popstate', syncActiveTab)
    window.addEventListener('analytics-tab-change', handleCustomTab)
    return () => {
      window.removeEventListener('popstate', syncActiveTab)
      window.removeEventListener('analytics-tab-change', handleCustomTab)
    }
  }, [syncActiveTab])

  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // ── KPI metrics ──
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalOrders: 0, aov: 0, couponDiscountSpend: 0, totalTrackedUsers: 0, activeSessionsToday: 0, conversionRate: 0 })
  const [newUsersThisWeek, setNewUsersThisWeek] = useState(0)
  const [phAvailable, setPhAvailable] = useState(false)
  const [phFunnel, setPhFunnel] = useState<{ pageviews: number | null; addToCart: number | null; checkout: number | null; orders: number | null } | null>(null)

  // ── Data states ──
  const [usersList, setUsersList] = useState<UserReport[]>([])
  const [selectedUser, setSelectedUser] = useState<UserReport | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('ALL')
  const [revenueData, setRevenueData] = useState<RevenueSeries[]>(MOCK_REVENUE_SERIES)
  const [productStats, setProductStats] = useState<ProductStat[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [heatmapCells, setHeatmapCells] = useState<HeatmapCell[]>([])
  const [segments, setSegments] = useState<CustomerSegments | null>(null)
  const [orderStatus, setOrderStatus] = useState<OrderStatusStat[]>([])
  const [paymentStats, setPaymentStats] = useState<PaymentMethodStat[]>([])
  const [couponStats, setCouponStats] = useState<CouponStat[]>([])
  const [reviewSentiment, setReviewSentiment] = useState<ReviewSentiment | null>(null)
  const [weekOverWeek, setWeekOverWeek] = useState<WeekOverWeekDay[]>([])
  const [deviceStats, setDeviceStats] = useState<DeviceStat[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [utmSources, setUtmSources] = useState<UTMSource[]>([])
  const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>([])
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([])
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([])
  const [isLiveStreaming, setIsLiveStreaming] = useState(true)
  const [newOrderCount, setNewOrderCount] = useState(0)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set())
  const [engineStatus, setEngineStatus] = useState<PostHogEngineStatus | null>(null)

  const daysDays = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90

  // ── Telemetry ──
  const refreshTelemetry = useCallback(() => setTelemetryEvents(getLocalTelemetryEvents()), [])

  useEffect(() => {
    refreshTelemetry()
    const iv = setInterval(() => { if (isLiveStreaming) refreshTelemetry() }, 4000)
    return () => clearInterval(iv)
  }, [isLiveStreaming, refreshTelemetry])

  // ── Supabase realtime new orders ──
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('analytics-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        setNewOrderCount(n => n + 1)
        toast.success('🍕 New order received!', { description: 'A customer just placed an order.' })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Main data fetch ──
  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    try {
      const supabase = createClient()

      // User list (client-side Supabase for speed)
      const [{ data: profiles }, { data: orders }] = await Promise.all([
        supabase.from('profiles').select('*').limit(50),
        supabase.from('orders').select('id, user_id, total, status, created_at').order('created_at', { ascending: false }).limit(200),
      ])

      if (profiles && profiles.length > 0) {
        const mapped: UserReport[] = profiles.map((prof: any) => {
          const userOrders = (orders || []).filter((o: any) => o.user_id === prof.id)
          const totalSpend = userOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
          const cnt = userOrders.length
          let stage: UserReport['funnelStage'] = 'Browsing'
          if (cnt > 5) stage = 'VIP Loyalist'
          else if (cnt > 0) stage = 'Active Buyer'
          return {
            id: prof.id,
            distinctId: `usr_${prof.id.slice(0, 8)}`,
            name: prof.full_name || prof.name || 'Registered Customer',
            email: prof.email || '—',
            phone: prof.phone || '—',
            role: prof.role || 'customer',
            totalOrders: cnt,
            totalSpend,
            lastSeen: 'Recently',
            funnelStage: stage,
            activityTimeline: [
              { event: '$pageview: /account', timestamp: 'Recent session', details: 'Authenticated profile loaded', iconType: 'auth' },
              ...userOrders.slice(0, 3).map((o: any) => ({
                event: `order_completed #${String(o.id).slice(0, 8).toUpperCase()}`,
                timestamp: new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                details: `Status: ${o.status.toUpperCase()} – ₹${o.total}`,
                iconType: 'order' as const,
              })),
            ],
          }
        })
        setUsersList(mapped)
      }

      // All server actions in parallel
      const [dbMetrics, phMetrics, prodPerf, catDist, heatmap, segs, ordStatus, payMethods, coupons, reviews, wowRev, revSeries, devices, pages, utm, anomalies, engine] = await Promise.all([
        fetchSupabaseMetrics(),
        fetchPostHogMetrics(),
        fetchProductPerformance(),
        fetchCategoryDistribution(),
        fetchHourlySalesHeatmap(daysDays),
        fetchCustomerSegments(),
        fetchOrderStatusBreakdown(),
        fetchPaymentMethodBreakdown(),
        fetchCouponROI(),
        fetchReviewSentiment(),
        fetchWeekOverWeekRevenue(),
        fetchRevenueSeries(daysDays),
        fetchPostHogDevices(),
        fetchPostHogTopPages(),
        fetchPostHogUTMSources(),
        fetchAnomalyAlerts(),
        fetchPostHogEngineStatus(),
      ])

      setEngineStatus(engine)

      // KPI
      setNewUsersThisWeek(dbMetrics.newUsersThisWeek)
      setPhAvailable(phMetrics.phAvailable)
      setMetrics({
        totalRevenue: dbMetrics.totalRevenue,
        totalOrders: dbMetrics.totalOrders,
        aov: dbMetrics.aov,
        couponDiscountSpend: dbMetrics.couponDiscountSpend,
        totalTrackedUsers: phMetrics.totalTrackedUsers ?? dbMetrics.totalRegisteredUsers,
        activeSessionsToday: phMetrics.activeSessionsToday ?? 0,
        conversionRate: phMetrics.conversionRate ?? 0,
      })
      if (phMetrics.funnelPageviews !== null) {
        setPhFunnel({ pageviews: phMetrics.funnelPageviews, addToCart: phMetrics.funnelAddToCart, checkout: phMetrics.funnelCheckout, orders: phMetrics.funnelOrders })
      }

      // Data
      setProductStats(prodPerf)
      setCategoryStats(catDist)
      setHeatmapCells(heatmap)
      setSegments(segs)
      setOrderStatus(ordStatus)
      setPaymentStats(payMethods)
      setCouponStats(coupons)
      setReviewSentiment(reviews)
      setWeekOverWeek(wowRev)
      if (revSeries.length > 0) setRevenueData(revSeries)
      setDeviceStats(devices)
      setTopPages(pages)
      setUtmSources(utm)
      setAnomalyAlerts(anomalies)

      // AI Insights (uses already-fetched data)
      const insights = await fetchAIInsights({ metrics: { totalRevenue: dbMetrics.totalRevenue, totalOrders: dbMetrics.totalOrders, aov: dbMetrics.aov }, segments: segs, productStats: prodPerf, weekOverWeek: wowRev })
      setAIInsights(insights)
    } catch (err) {
      console.warn('[Analytics] fetchAllData error:', err)
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [daysDays])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  const sendTestTelemetry = (eventName: string) => {
    trackPostHogEvent(eventName, { triggered_by: 'Admin Diagnostics', timestamp: new Date().toISOString(), sample_value: 499 })
    refreshTelemetry()
    toast.success(`⚡ '${eventName}' captured!`, { description: 'Check the live stream below.' })
  }

  const handleExportCSV = (type: string) => {
    let rows: string[] = []
    let filename = ''
    if (type === 'products') {
      rows = ['Product,Selling Price,Cost Price,Units Sold,Revenue,Profit,Margin%', ...productStats.map(p => `"${p.product_name}",${p.selling_price},${p.cost_price},${p.total_units_sold},${p.total_revenue},${p.total_estimated_profit},${p.total_revenue > 0 ? Math.round((p.total_estimated_profit / p.total_revenue) * 100) : 0}`)]
      filename = 'product_performance.csv'
    } else if (type === 'customers') {
      rows = ['Name,Email,Phone,Role,Orders,Total Spend,Stage', ...usersList.map(u => `"${u.name}","${u.email}","${u.phone}","${u.role}",${u.totalOrders},${u.totalSpend},"${u.funnelStage}"`)]
      filename = 'customers.csv'
    } else if (type === 'coupons') {
      rows = ['Code,Type,Value,Redemptions,Total Discount,Avg Order', ...couponStats.map(c => `"${c.code}","${c.type}",${c.value},${c.redemptions},${c.totalDiscount},${c.avgOrderWithCoupon}`)]
      filename = 'coupon_roi.csv'
    }
    if (rows.length === 0) { toast.error('No data to export'); return }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filename}`)
  }

  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase()
    return (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q) || u.distinctId.toLowerCase().includes(q)) &&
      (stageFilter === 'ALL' || u.funnelStage === stageFilter)
  })

  const totalOrderCount = orderStatus.reduce((s, o) => s + o.count, 0)
  const cancellationRate = totalOrderCount > 0 ? Math.round(((orderStatus.find(o => o.status === 'cancelled')?.count || 0) / totalOrderCount) * 100) : 0

  const TAB_HEADER: Record<TabId, { title: string; subtitle: string }> = {
    users: { title: 'Customer Segmentation & CRM', subtitle: 'Customer tiers, repeat rate, churn risks & customer profiles' },
    funnel: { title: 'Conversion Funnel & Telemetry', subtitle: 'Step-by-step visitor funnel, devices, UTM sources & live event stream' },
    financials: { title: 'Financials & Revenue BI', subtitle: 'Week-over-week trends, daily margins, product profitability & hourly heatmap' },
    operations: { title: 'Operations Intelligence', subtitle: 'Order status pipeline, peak kitchen hours, cancellation rate & review sentiment' },
    insights: { title: 'Business Insights & Anomaly Detection', subtitle: 'Automated AI recommendations, system anomalies & live order feed' },
    engine_hub: { title: 'Analytics Engine Configuration', subtitle: 'Telemetry pipeline settings, PostHog credentials & test event dispatch' },
  }
  const currentHeader = TAB_HEADER[activeTab] || TAB_HEADER.users

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />Live
                </span>
                {newOrderCount > 0 && (
                  <button onClick={() => setNewOrderCount(0)} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 hover:bg-emerald-200 transition-colors">
                    <Bell size={10} /> {newOrderCount} new order{newOrderCount > 1 ? 's' : ''}
                  </button>
                )}
              </div>
              <h1 className="text-xl font-serif font-bold text-[#1C1917] mt-1">{currentHeader.title}</h1>
              <p className="text-xs text-[#78716C]">{currentHeader.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(['7d', '30d', '90d'] as const).map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${timeframe === tf ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#44403C] border-[#E7E0D8] hover:bg-[#F5F2EC]'}`}>{tf}</button>
            ))}
            <button onClick={() => fetchAllData(true)} disabled={refreshing} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E7E0D8] bg-white text-[#44403C] hover:bg-[#F5F2EC] flex items-center gap-1.5 transition-all disabled:opacity-50">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Anomaly Alerts Banner ── */}
      {anomalyAlerts.filter((_,i) => !dismissedAlerts.has(i)).map((alert, i) => (
        <div key={i} className={`flex items-start justify-between p-3.5 rounded-xl border text-sm ${alert.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-base mt-0.5">{alert.icon}</span>
            <div>
              <p className="font-bold">{alert.title}</p>
              <p className="text-xs mt-0.5 opacity-80">{alert.detail}</p>
            </div>
          </div>
          <button onClick={() => setDismissedAlerts(prev => new Set([...prev, i]))} className="ml-3 shrink-0 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tracked Users', value: loading ? null : metrics.totalTrackedUsers.toLocaleString('en-IN'), sub: `+${newUsersThisWeek} this week`, subIcon: <ArrowUpRight size={12} />, subColor: 'text-emerald-600', source: phAvailable ? 'PostHog' : 'Supabase profiles', icon: <Users size={18} />, iconBg: 'bg-rose-50 text-[#B91C1C]' },
          { label: 'Active Sessions', value: loading ? null : phAvailable ? metrics.activeSessionsToday.toString() : '—', sub: phAvailable ? 'PostHog sessions · today' : 'PostHog key required', subIcon: <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />, subColor: 'text-blue-600', source: phAvailable ? 'PostHog HogQL' : '', icon: <Activity size={18} />, iconBg: 'bg-blue-50 text-blue-600' },
          { label: 'Conversion Rate', value: loading ? null : phAvailable ? `${metrics.conversionRate}%` : '—', sub: 'Pageview → order · 7d', subIcon: <ArrowUpRight size={12} />, subColor: 'text-emerald-600', source: phAvailable ? 'PostHog HogQL' : 'PostHog required', icon: <MousePointerClick size={18} />, iconBg: 'bg-emerald-50 text-emerald-600' },
          { label: 'Gross Sales', value: loading ? null : formatPrice(metrics.totalRevenue), sub: `${metrics.totalOrders} orders · avg ${formatPrice(metrics.aov)}`, subIcon: null, subColor: 'text-[#78716C]', source: 'Supabase orders', icon: <DollarSign size={18} />, iconBg: 'bg-amber-50 text-amber-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">{card.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>{card.icon}</div>
            </div>
            <div className="mt-3">
              {card.value === null ? <Skeleton className="h-8 w-20" /> : (
                <span className="text-2xl font-bold font-serif text-[#1C1917]">{card.value}</span>
              )}
              <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${card.subColor}`}>
                {card.subIcon}{card.sub}
              </div>
              <p className="text-[10px] text-[#A8A29E] mt-0.5">{card.source}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1 — CUSTOMERS & SEGMENTS
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Customer Segments */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'VIP Loyalists', value: segments?.vip ?? '—', sub: `Avg LTV ₹${(segments?.avgLTVVip || 0).toLocaleString('en-IN')}`, color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { label: 'Regular Buyers', value: segments?.regular ?? '—', sub: `Avg LTV ₹${(segments?.avgLTVRegular || 0).toLocaleString('en-IN')}`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { label: 'One-Time', value: segments?.oneTime ?? '—', sub: 'Need nurturing', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: 'Churn Risk', value: segments?.churnRiskCount ?? '—', sub: 'No order in 30d', color: 'bg-rose-50 text-rose-700 border-rose-200' },
            ].map((seg, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${seg.color}`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">{seg.label}</p>
                <p className="text-3xl font-bold font-serif mt-1">{loading ? <Skeleton className="h-8 w-12 inline-block" /> : seg.value}</p>
                <p className="text-xs mt-1 opacity-70">{seg.sub}</p>
              </div>
            ))}
          </div>

          {/* Segment Donut + Repeat Rate */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1">Customer Segments</h3>
              <p className="text-xs text-[#78716C] mb-4">Distribution by purchase behaviour</p>
              {segments && segments.totalWithOrders + segments.dormant > 0 ? (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{ name: 'VIP', value: segments.vip }, { name: 'Regular', value: segments.regular }, { name: 'One-time', value: segments.oneTime }, { name: 'Dormant', value: segments.dormant }]} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {['#7C3AED','#16A34A','#D97706','#DC2626'].map((c, i) => <Cell key={i} fill={c} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {[['VIP (5+ orders)','#7C3AED',segments.vip],['Regular (2–5)','#16A34A',segments.regular],['One-time','#D97706',segments.oneTime],['Dormant (0 orders)','#DC2626',segments.dormant]].map(([label, color, val]) => (
                      <div key={label as string} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color as string }} /><span className="text-[#57534E]">{label}</span></div>
                        <span className="font-bold text-[#1C1917]">{val}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <Skeleton className="h-48 w-full" />}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs flex flex-col justify-between">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-4">Repeat Customer Rate</h3>
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  {loading ? <Skeleton className="h-20 w-20 rounded-full mx-auto" /> : (
                    <>
                      <p className="text-5xl font-bold font-serif text-[#1C1917]">{segments?.repeatRate ?? 0}%</p>
                      <p className="text-xs text-[#78716C] mt-2">of buyers ordered more than once</p>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#E7E0D8] grid grid-cols-2 gap-3 text-center">
                <div><p className="text-lg font-bold font-serif text-[#1C1917]">{segments?.totalWithOrders ?? 0}</p><p className="text-[10px] text-[#78716C]">With orders</p></div>
                <div><p className="text-lg font-bold font-serif text-[#1C1917]">{segments?.dormant ?? 0}</p><p className="text-[10px] text-[#78716C]">Never ordered</p></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-serif font-bold text-[#1C1917]">Churn Risk Customers</h3>
                <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">{segments?.churnRiskCount ?? 0} at risk</span>
              </div>
              <p className="text-xs text-[#78716C] mb-4">Customers who ordered 30+ days ago with no return visit.</p>
              <div className="space-y-2">
                {[['Send WhatsApp Campaign', 'w/ 15% comeback coupon', '💌'], ['Create Re-engagement Email', 'via Resend integration', '📧'], ['Offer Loyalty Bonus', 'double points this week', '⭐']].map(([title, sub, emoji]) => (
                  <div key={title} className="flex items-center gap-3 p-2.5 bg-[#FBF9F5] rounded-xl border border-[#E7E0D8] text-xs">
                    <span className="text-base">{emoji}</span>
                    <div><p className="font-semibold text-[#1C1917]">{title}</p><p className="text-[#78716C]">{sub}</p></div>
                  </div>
                ))}
              </div>
              <button onClick={() => handleExportCSV('customers')} className="mt-4 w-full px-3 py-2 bg-[#1C1917] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors">
                <Download size={12} /> Export Customer List CSV
              </button>
            </div>
          </div>

          {/* User List */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E7E0D8] flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" size={15} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name, email, phone…" className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E7E0D8] bg-[#FBF9F5] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:border-[#B91C1C]" />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
                {['ALL', 'VIP Loyalist', 'Active Buyer', 'Browsing'].map(f => (
                  <button key={f} onClick={() => setStageFilter(f)} className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${stageFilter === f ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#44403C] border-[#E7E0D8] hover:bg-[#F5F2EC]'}`}>{f}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F2EC] text-[#78716C] font-semibold uppercase text-[10px] border-b border-[#E7E0D8]">
                  <tr>{['Customer', 'Session ID', 'Stage', 'Orders', 'Total Spend', 'Action'].map(h => <th key={h} className="py-3 px-4">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#E7E0D8]">
                  {loading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td className="py-3 px-4" colSpan={6}><Skeleton className="h-6 w-full" /></td></tr>
                  )) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-xs text-[#A8A29E]">No matching customers found.</td></tr>
                  ) : filteredUsers.map(user => (
                    <tr key={user.id} onClick={() => setSelectedUser(user)} className="hover:bg-[#FDFBF7] cursor-pointer transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rose-100 text-[#B91C1C] flex items-center justify-center font-bold text-xs">{user.name.slice(0, 2).toUpperCase()}</div>
                          <div><p className="font-bold text-[#1C1917] group-hover:text-[#B91C1C] transition-colors">{user.name}</p><p className="text-[10px] text-[#78716C]">{user.email}</p></div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4"><span className="bg-[#F5F2EC] px-2 py-0.5 rounded border border-[#E7E0D8] font-mono">{user.distinctId}</span></td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${user.funnelStage === 'VIP Loyalist' ? 'bg-purple-100 text-purple-800' : user.funnelStage === 'Active Buyer' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{user.funnelStage}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold">{user.totalOrders}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">{user.totalSpend > 0 ? formatPrice(user.totalSpend) : '—'}</td>
                      <td className="py-3.5 px-4"><button onClick={e => { e.stopPropagation(); setSelectedUser(user) }} className="px-3 py-1.5 rounded-lg border border-[#E7E0D8] text-xs font-semibold hover:bg-[#B91C1C] hover:text-white hover:border-[#B91C1C] transition-all flex items-center gap-1"><Eye size={11} />View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Detail Modal */}
          {selectedUser && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-rose-100 text-[#B91C1C] flex items-center justify-center font-bold text-base">{selectedUser.name.slice(0, 2).toUpperCase()}</div>
                    <div><h3 className="font-bold text-[#1C1917]">{selectedUser.name}</h3><p className="text-xs text-[#78716C]">{selectedUser.email}</p></div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-[#F5F2EC] rounded-xl"><X size={16} /></button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[['Orders', selectedUser.totalOrders], ['Spent', formatPrice(selectedUser.totalSpend)], ['Stage', selectedUser.funnelStage]].map(([l, v]) => (
                    <div key={l as string} className="text-center p-3 bg-[#FBF9F5] rounded-xl border border-[#E7E0D8]">
                      <p className="text-xs text-[#78716C]">{l}</p>
                      <p className="text-sm font-bold text-[#1C1917] mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
                <h4 className="text-xs font-bold uppercase text-[#78716C] mb-3">Activity Timeline</h4>
                <div className="space-y-2">
                  {selectedUser.activityTimeline.map((ev, i) => (
                    <div key={i} className="p-3 bg-[#FBF9F5] rounded-xl border border-[#E7E0D8] text-xs">
                      <p className="font-bold text-[#1C1917] font-mono">{ev.event}</p>
                      <p className="text-[#78716C] mt-0.5">{ev.details}</p>
                      <p className="text-[#A8A29E] mt-0.5">{ev.timestamp}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2 — FUNNEL & TRACKING
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'funnel' && (
        <div className="space-y-5">
          {/* PostHog Funnel */}
          <div className="bg-white p-6 rounded-2xl border border-[#E7E0D8] shadow-2xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2"><Layers className="text-[#B91C1C]" size={20} />Conversion Funnel</h2>
                <p className="text-xs text-[#78716C]">{phAvailable ? 'Live PostHog data · last 7 days' : 'PostHog key required for funnel data'}</p>
              </div>
              {metrics.conversionRate > 0 && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">{metrics.conversionRate}% conversion</span>}
            </div>
            {phFunnel ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[{ label: 'Page Views', value: phFunnel.pageviews, prev: null }, { label: 'Add to Cart', value: phFunnel.addToCart, prev: phFunnel.pageviews }, { label: 'Checkout', value: phFunnel.checkout, prev: phFunnel.addToCart }, { label: 'Order Completed', value: phFunnel.orders, prev: phFunnel.checkout }].map((step, idx) => {
                  const drop = step.prev && step.value != null && step.prev > 0 ? `-${Math.round((1 - step.value / step.prev) * 100)}%` : null
                  return (
                    <div key={step.label} className="bg-[#FBF9F5] p-4 rounded-xl border border-[#E7E0D8]">
                      <span className="text-[10px] font-bold uppercase text-[#A8A29E]">Step {idx + 1}</span>
                      <p className="text-xs font-bold text-[#1C1917] mt-1">{step.label}</p>
                      <div className="mt-3 pt-3 border-t border-[#E7E0D8]/60 flex items-baseline justify-between">
                        <span className="text-xl font-bold font-serif">{step.value?.toLocaleString('en-IN') ?? '—'}</span>
                        {drop && <span className="text-[11px] text-rose-600 font-semibold">{drop}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 bg-[#FBF9F5] rounded-xl border border-dashed border-[#E7E0D8] gap-3">
                <Database size={28} className="text-[#A8A29E]" />
                <p className="text-sm font-semibold text-[#44403C]">No PostHog funnel data yet</p>
                <p className="text-xs text-[#A8A29E]">Fire add_to_cart and order_completed events from the storefront to populate this.</p>
                <a href="https://us.posthog.com" target="_blank" rel="noopener noreferrer" className="text-xs font-bold px-4 py-2 bg-[#B91C1C] text-white rounded-lg hover:bg-rose-800">View in PostHog →</a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Device Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1">Device Breakdown</h3>
              <p className="text-xs text-[#78716C] mb-4">{phAvailable ? 'PostHog · OS distribution · 7d' : 'Requires PostHog API key'}</p>
              {deviceStats.length > 0 ? (
                <>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={deviceStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="count">{deviceStats.map((_, i) => <Cell key={i} fill={_.color} />)}</Pie><Tooltip formatter={(v: any) => [`${v} events`, 'Count']} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {deviceStats.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-[#57534E]">{d.name}</span></div>
                        <span className="font-bold text-[#1C1917]">{d.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center gap-2 text-center bg-[#FBF9F5] rounded-xl border border-dashed border-[#E7E0D8]">
                  <Smartphone size={24} className="text-[#A8A29E]" />
                  <p className="text-xs font-semibold text-[#44403C]">No device data yet</p>
                  <a href="https://us.posthog.com" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-1.5 border border-[#E7E0D8] rounded-lg text-[#44403C] hover:bg-[#F5F2EC] flex items-center gap-1"><ExternalLink size={10} />Open PostHog</a>
                </div>
              )}
            </div>

            {/* UTM Sources */}
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1">Traffic Source Attribution</h3>
              <p className="text-xs text-[#78716C] mb-4">UTM sources · orders & pageviews · 30d</p>
              {utmSources.length > 0 ? (
                <div className="space-y-2">
                  {utmSources.map(s => (
                    <div key={s.source} className="flex items-center justify-between p-2.5 bg-[#FBF9F5] rounded-xl border border-[#E7E0D8] text-xs">
                      <div className="flex items-center gap-2"><Globe size={12} className="text-[#A8A29E]" /><span className="font-semibold text-[#1C1917] capitalize">{s.source}</span></div>
                      <div className="flex items-center gap-4 text-[#78716C]">
                        <span>{s.views} views</span>
                        <span className="font-bold text-[#1C1917]">{s.conversions} orders</span>
                        {s.conversionRate > 0 && <span className="text-emerald-600 font-bold">{s.conversionRate}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center gap-2 bg-[#FBF9F5] rounded-xl border border-dashed border-[#E7E0D8]">
                  <Globe size={24} className="text-[#A8A29E]" />
                  <p className="text-xs text-[#A8A29E]">No UTM data yet. Add utm_source params to your Instagram/Google links.</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Pages + Live Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1">Top Pages</h3>
              <p className="text-xs text-[#78716C] mb-4">Most visited URLs · 7d</p>
              {topPages.length > 0 ? (
                <div className="space-y-2">
                  {topPages.map((p, i) => (
                    <div key={p.url} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold text-[#A8A29E] w-4">{i + 1}</span>
                        <span className="truncate text-[#44403C] font-medium">{p.url || '/'}</span>
                      </div>
                      <span className="font-bold text-[#1C1917] shrink-0 ml-2">{p.views}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[#A8A29E]">No pageview data from PostHog yet.</p>}
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1C1917] flex items-center gap-2"><Activity className="text-emerald-600" size={15} />Live Telemetry Stream</h3>
                  <p className="text-xs text-[#78716C]">Real-time events in this browser session</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsLiveStreaming(s => !s)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${isLiveStreaming ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-[#F5F2EC] text-[#78716C] border-[#E7E0D8]'}`}>
                    <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />{isLiveStreaming ? 'Live' : 'Paused'}
                  </button>
                  <button onClick={refreshTelemetry} className="p-1.5 rounded-lg border border-[#E7E0D8] hover:bg-[#F5F2EC]"><RefreshCw size={13} /></button>
                </div>
              </div>
              <div className="flex-1 space-y-2 max-h-64 overflow-y-auto text-xs">
                {telemetryEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-3 bg-[#FBF9F5] rounded-xl border border-dashed border-[#E7E0D8]">
                    <Sparkles size={22} className="text-[#A8A29E]" />
                    <p className="text-xs font-semibold text-[#44403C]">No events captured yet</p>
                    <button onClick={() => sendTestTelemetry('sample_page_browse')} className="px-3 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold">Trigger Test Event</button>
                  </div>
                ) : telemetryEvents.slice(0, 15).map(ev => (
                  <div key={ev.id} className="p-2.5 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#B91C1C] shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-[#1C1917] block truncate">{ev.event}</span>
                        <span className="text-[11px] text-[#78716C]">ID: {ev.distinctId || 'guest'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#A8A29E] font-mono shrink-0 ml-2">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3 — FINANCIALS
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'financials' && (
        <div className="space-y-5">
          {/* Week-over-Week Comparison */}
          <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1C1917]">Revenue: This Week vs Last Week</h2>
                <p className="text-xs text-[#78716C]">Day-by-day comparison · real Supabase data</p>
              </div>
              {weekOverWeek.length > 0 && (() => {
                const thisTotal = weekOverWeek.reduce((s, d) => s + d.thisWeek, 0)
                const lastTotal = weekOverWeek.reduce((s, d) => s + d.lastWeek, 0)
                const pct = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0
                return (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${pct >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {pct >= 0 ? '+' : ''}{pct}% WoW
                  </span>
                )
              })()}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekOverWeek.length > 0 ? weekOverWeek : []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E0D8" />
                  <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11, fill: '#78716C' }} />
                  <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#78716C' }} />
                  <Tooltip formatter={(v: any) => formatPrice(Number(v))} contentStyle={{ backgroundColor: '#1C1917', borderRadius: 8, color: '#FFF', border: 'none', fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="thisWeek" name="This Week" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lastWeek" name="Last Week" fill="#D1D5DB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {weekOverWeek.length === 0 && !loading && <p className="text-center text-xs text-[#A8A29E] mt-2">No orders found to compare weeks.</p>}
          </div>

          {/* Revenue Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h2 className="text-base font-serif font-bold text-[#1C1917] mb-1">Daily Revenue Trend</h2>
              <p className="text-xs text-[#78716C] mb-4">From daily_revenue_summary DB view</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} /><stop offset="95%" stopColor="#16A34A" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D97706" stopOpacity={0.3} /><stop offset="95%" stopColor="#D97706" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E0D8" />
                    <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#78716C' }} />
                    <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#78716C' }} />
                    <Tooltip formatter={(v: any) => formatPrice(Number(v))} contentStyle={{ backgroundColor: '#1C1917', borderRadius: 8, color: '#FFF', border: 'none', fontSize: 12 }} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#16A34A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#D97706" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h2 className="text-base font-serif font-bold text-[#1C1917] mb-1">Sales by Category</h2>
              <p className="text-xs text-[#78716C] mb-4">Real revenue share from order_items</p>
              {categoryStats.length > 0 ? (
                <>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={categoryStats.map(c => ({ ...c, value: c.revenue }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">{categoryStats.map((_, i) => <Cell key={i} fill={_.color} />)}</Pie><Tooltip formatter={(v: any) => formatPrice(Number(v))} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {categoryStats.map(c => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} /><span className="text-[#57534E] truncate">{c.name}</span></div>
                        <span className="font-bold text-[#1C1917] shrink-0">{formatPrice(c.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="h-44 flex items-center justify-center text-xs text-[#A8A29E]">No category data — place some orders first.</div>}
            </div>
          </div>

          {/* Hourly Heatmap */}
          <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
            <h2 className="text-base font-serif font-bold text-[#1C1917] mb-1">Order Volume Heatmap</h2>
            <p className="text-xs text-[#78716C] mb-5">When do customers order? Last {daysDays} days · darker = more orders</p>
            {heatmapCells.length > 0 ? <HeatmapGrid cells={heatmapCells} /> : <div className="py-10 text-center text-xs text-[#A8A29E]">No order data for heatmap yet.</div>}
          </div>

          {/* Product Performance */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-[#E7E0D8] flex items-center justify-between">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2"><Award className="text-[#D97706]" size={20} />Product Profitability</h2>
                <p className="text-xs text-[#78716C]">From product_performance_summary DB view · real order_items data</p>
              </div>
              <button onClick={() => handleExportCSV('products')} className="px-3 py-1.5 border border-[#E7E0D8] rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-[#F5F2EC]"><Download size={12} />Export CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F2EC] text-[#78716C] font-semibold uppercase text-[10px] border-b border-[#E7E0D8]">
                  <tr>{['Product', 'Price', 'Cost', 'Units', 'Revenue', 'Profit', 'Margin'].map(h => <th key={h} className="py-3 px-4">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#E7E0D8]">
                  {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="py-3 px-4"><Skeleton className="h-5 w-full" /></td></tr>) :
                    productStats.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-xs text-[#A8A29E]">No product data found. Ensure products have been sold and cost_price is set.</td></tr> :
                    productStats.map(prod => {
                      const margin = prod.total_revenue > 0 ? Math.round((prod.total_estimated_profit / prod.total_revenue) * 100) : 0
                      return (
                        <tr key={prod.product_id} className="hover:bg-[#FDFBF7] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#1C1917]"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#16A34A]" />{prod.product_name}</div></td>
                          <td className="py-3 px-4">{formatPrice(prod.selling_price)}</td>
                          <td className="py-3 px-4 text-[#78716C]">{formatPrice(prod.cost_price)}</td>
                          <td className="py-3 px-4 font-bold">{prod.total_units_sold}</td>
                          <td className="py-3 px-4 font-semibold text-[#16A34A]">{formatPrice(prod.total_revenue)}</td>
                          <td className="py-3 px-4 font-bold text-[#D97706]">{formatPrice(prod.total_estimated_profit)}</td>
                          <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${margin >= 65 ? 'bg-emerald-100 text-emerald-800' : margin >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{margin}%</span></td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Methods + Coupon ROI */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1">Payment Methods</h3>
              <p className="text-xs text-[#78716C] mb-4">From payments table · gateway breakdown</p>
              {paymentStats.length > 0 ? (
                <div className="space-y-3">
                  {paymentStats.map(p => {
                    const successRate = p.count > 0 ? Math.round((p.successCount / p.count) * 100) : 0
                    return (
                      <div key={p.gateway} className="p-3 bg-[#FBF9F5] rounded-xl border border-[#E7E0D8]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-[#1C1917]">{GATEWAY_LABEL[p.gateway] || p.gateway}</p>
                          <span className="text-xs text-[#78716C]">{p.count} payments</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-emerald-600 font-semibold">✓ {p.successCount} paid</span>
                          {p.failCount > 0 && <span className="text-rose-600 font-semibold">✗ {p.failCount} failed</span>}
                          <span className="ml-auto font-bold text-[#1C1917]">{formatPrice(p.total)}</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-[#E7E0D8] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${successRate}%` }} />
                        </div>
                        <p className="text-[10px] text-[#78716C] mt-1">{successRate}% success rate</p>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-xs text-[#A8A29E] py-8 text-center">No payment data found.</p>}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="text-sm font-serif font-bold text-[#1C1917]">Coupon ROI</h3><p className="text-xs text-[#78716C]">Discount spend vs order value driven</p></div>
                <button onClick={() => handleExportCSV('coupons')} className="px-2.5 py-1 border border-[#E7E0D8] rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-[#F5F2EC]"><Download size={10} />CSV</button>
              </div>
              {couponStats.length > 0 ? (
                <div className="space-y-2">
                  {couponStats.map(c => (
                    <div key={c.code} className="p-3 bg-[#FBF9F5] rounded-xl border border-[#E7E0D8]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#1C1917] text-xs">{c.code}</span>
                        <span className="text-[10px] bg-white border border-[#E7E0D8] px-1.5 py-0.5 rounded font-semibold">{c.type === 'percentage' ? `${c.value}%` : formatPrice(c.value)} off</span>
                      </div>
                      <div className="flex gap-4 mt-1.5 text-[10px] text-[#78716C]">
                        <span>{c.redemptions}x used</span>
                        <span>₹{c.totalDiscount.toLocaleString('en-IN')} discount given</span>
                        <span className="font-bold text-[#1C1917]">Avg order: {formatPrice(c.avgOrderWithCoupon)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[#A8A29E] py-8 text-center">No coupon usage found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 4 — OPERATIONS
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'operations' && (
        <div className="space-y-5">
          {/* Order Status + Cancellation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="text-sm font-serif font-bold text-[#1C1917]">Order Status Breakdown</h3><p className="text-xs text-[#78716C]">Current pipeline · all-time from orders table</p></div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cancellationRate > 10 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{cancellationRate}% cancellation rate</span>
              </div>
              {loading ? <Skeleton className="h-48 w-full" /> : (
                <div className="space-y-2">
                  {orderStatus.map(s => {
                    const cfg = STATUS_CONFIG[s.status] || { label: s.status, color: '#78716C', bg: '#F5F5F4' }
                    const pct = totalOrderCount > 0 ? Math.round((s.count / totalOrderCount) * 100) : 0
                    return (
                      <div key={s.status} className="flex items-center gap-3">
                        <span className="w-28 text-xs font-semibold shrink-0" style={{ color: cfg.color }}>{cfg.label}</span>
                        <div className="flex-1 h-6 bg-[#F5F2EC] rounded-lg overflow-hidden">
                          <div className="h-full rounded-lg flex items-center px-2 text-[10px] font-bold text-white transition-all" style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: cfg.color }}>
                            {pct > 8 ? `${s.count}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0 w-20">
                          <p className="text-xs font-bold text-[#1C1917]">{s.count} <span className="text-[#A8A29E] font-normal">({pct}%)</span></p>
                          <p className="text-[10px] text-[#78716C]">{formatPrice(s.revenue)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1">Order Pipeline</h3>
              <p className="text-xs text-[#78716C] mb-4">Status distribution donut</p>
              {orderStatus.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={orderStatus.map(s => ({ name: STATUS_CONFIG[s.status]?.label || s.status, value: s.count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="value">
                        {orderStatus.map((s, i) => <Cell key={i} fill={STATUS_CONFIG[s.status]?.color || '#78716C'} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <Skeleton className="h-52 w-full" />}
            </div>
          </div>

          {/* Peak Hours Bar + Review Sentiment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1">Peak Ordering Hours</h3>
              <p className="text-xs text-[#78716C] mb-4">Hourly order volume · last {daysDays} days</p>
              {heatmapCells.length > 0 ? (() => {
                const hourMap: Record<number, number> = {}
                for (const c of heatmapCells) { hourMap[c.hour] = (hourMap[c.hour] || 0) + c.orders }
                const chartData = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: hourMap[h] || 0 }))
                return (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E0D8" />
                        <XAxis dataKey="hour" tickLine={false} tick={{ fontSize: 9, fill: '#A8A29E' }} interval={3} />
                        <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#78716C' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1C1917', borderRadius: 6, color: '#FFF', border: 'none', fontSize: 11 }} />
                        <Bar dataKey="orders" name="Orders" fill="#B91C1C" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              })() : <p className="text-xs text-[#A8A29E] py-10 text-center">No order data yet.</p>}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1">Customer Review Sentiment</h3>
              <p className="text-xs text-[#78716C] mb-4">From reviews table · approved ratings</p>
              {reviewSentiment ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center"><p className="text-4xl font-bold font-serif text-[#1C1917]">{reviewSentiment.avgRating}</p><StarRating rating={reviewSentiment.avgRating} /></div>
                    <div className="text-xs text-[#78716C] space-y-0.5">
                      <p><span className="font-bold text-[#1C1917]">{reviewSentiment.totalApproved}</span> approved reviews</p>
                      <p><span className="font-bold text-[#1C1917]">{reviewSentiment.approvalRate}%</span> approval rate</p>
                      <p><span className="font-bold text-[#1C1917]">{reviewSentiment.totalReviews}</span> total submitted</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {reviewSentiment.ratingDistribution.slice().reverse().map(d => (
                      <div key={d.rating} className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 w-16 shrink-0">{Array.from({length:5},(_, i)=><Star key={i} size={9} className={i < d.rating ? 'text-amber-400 fill-amber-400' : 'text-[#D6D3D1]'} />)}</div>
                        <div className="flex-1 h-2 bg-[#F5F2EC] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: reviewSentiment.totalReviews > 0 ? `${(d.count / reviewSentiment.totalReviews) * 100}%` : '0%' }} />
                        </div>
                        <span className="text-[10px] text-[#78716C] w-4 shrink-0">{d.count}</span>
                      </div>
                    ))}
                  </div>
                  {reviewSentiment.topRatedProducts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#E7E0D8]">
                      <p className="text-[10px] font-bold uppercase text-[#78716C] mb-2">Top Rated Products</p>
                      {reviewSentiment.topRatedProducts.slice(0, 3).map(p => (
                        <div key={p.name} className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-[#44403C] truncate">{p.name}</span>
                          <div className="flex items-center gap-1 shrink-0"><StarRating rating={p.avgRating} /><span className="font-bold">{p.avgRating}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : <div className="py-10 text-center text-xs text-[#A8A29E]">No approved reviews yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 5 — AI INSIGHTS
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'insights' && (
        <div className="space-y-5">
          {/* AI Insight Cards */}
          <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
            <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2 mb-1"><Sparkles className="text-[#B91C1C]" size={20} />Business Intelligence Insights</h2>
            <p className="text-xs text-[#78716C] mb-5">Rule-based insights computed from your real Supabase data · refreshes every reload</p>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Array.from({length:4}).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : aiInsights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiInsights.map((ins, i) => (
                  <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 ${ins.type === 'positive' ? 'bg-emerald-50 border-emerald-200' : ins.type === 'action' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                    <span className="text-2xl leading-none mt-0.5">{ins.emoji}</span>
                    <div>
                      <p className={`text-sm font-bold ${ins.type === 'positive' ? 'text-emerald-800' : ins.type === 'action' ? 'text-amber-800' : 'text-blue-800'}`}>{ins.title}</p>
                      <p className={`text-xs mt-1 ${ins.type === 'positive' ? 'text-emerald-700' : ins.type === 'action' ? 'text-amber-700' : 'text-blue-700'}`}>{ins.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-[#A8A29E]">
                <Sparkles size={24} className="mx-auto mb-2 text-[#A8A29E]" />
                Not enough data yet to generate insights. Place a few orders first!
              </div>
            )}
          </div>

          {/* All Anomaly Alerts */}
          <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
            <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2 mb-1"><AlertTriangle className="text-amber-500" size={20} />Anomaly Detection</h2>
            <p className="text-xs text-[#78716C] mb-5">Rule-based alerts computed from real-time Supabase data</p>
            <div className="space-y-3">
              {anomalyAlerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${a.type === 'error' ? 'bg-rose-50 border-rose-200' : a.type === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <span className="text-xl">{a.icon}</span>
                  <div><p className={`text-sm font-bold ${a.type === 'error' ? 'text-rose-800' : a.type === 'warning' ? 'text-amber-800' : 'text-emerald-800'}`}>{a.title}</p><p className="text-xs mt-0.5 opacity-80">{a.detail}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Realtime Order Feed */}
          <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2"><Bell className="text-[#B91C1C]" size={20} />Real-time Order Feed</h2>
                <p className="text-xs text-[#78716C]">Supabase realtime subscription · new order alerts</p>
              </div>
              {newOrderCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">{newOrderCount} new since load</span>
                  <button onClick={() => setNewOrderCount(0)} className="text-xs text-[#78716C] hover:text-[#1C1917]"><X size={12} /></button>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center justify-center py-8 bg-[#FBF9F5] rounded-xl border border-dashed border-[#E7E0D8] gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Bell size={22} className="text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#44403C]">Order subscription active</p>
                <p className="text-xs text-[#A8A29E] mt-1">You'll get a toast notification here whenever a new order is placed — even while you're reviewing analytics.</p>
              </div>
              {newOrderCount === 0 && <span className="text-xs text-[#A8A29E]">No new orders since page load</span>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 6 — ENGINE HUB
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'engine_hub' && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-[#E7E0D8] shadow-2xs space-y-5">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#1C1917] flex items-center gap-2"><ShieldCheck className="text-[#B91C1C]" size={22} />Analytics Engine Configuration</h2>
              <p className="text-xs text-[#78716C] mt-1">Pipeline health, API keys, and live event testing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  label: 'PostHog Public Key',
                  value: engineStatus?.publicKeyPreview || (POSTHOG_KEY ? `${POSTHOG_KEY.slice(0, 10)}…${POSTHOG_KEY.slice(-4)}` : 'Not configured'),
                  active: Boolean(engineStatus?.publicKeyPreview || POSTHOG_KEY),
                },
                {
                  label: 'Ingestion Host',
                  value: engineStatus?.host || POSTHOG_HOST,
                  active: true,
                },
                {
                  label: 'Personal API Key (server)',
                  value: engineStatus?.hasPersonalKey ? 'Configured ✓ (Server-side Only)' : 'Missing in .env.local',
                  active: Boolean(engineStatus?.hasPersonalKey),
                },
                {
                  label: 'Project ID',
                  value: engineStatus?.projectId || (engineStatus?.hasProjectId ? 'Configured' : 'Not set'),
                  active: Boolean(engineStatus?.hasProjectId),
                },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-xl border border-[#E7E0D8] bg-[#FBF9F5] space-y-2">
                  <span className="text-[10px] font-bold uppercase text-[#78716C]">{item.label}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1C1917]">{item.value}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{item.active ? 'Active' : 'Missing'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-3">Test Event Dispatch</h3>
              <div className="flex flex-wrap gap-2">
                {['$pageview', 'add_to_cart', 'initiate_checkout', 'order_completed', 'coupon_applied'].map(ev => (
                  <button key={ev} onClick={() => sendTestTelemetry(ev)} className="px-3 py-2 rounded-lg bg-[#1C1917] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-800 transition-colors">
                    <Send size={11} />{ev}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Pipeline Verified</p>
                <p>Events dispatched above will appear in the Live Telemetry Stream (Funnel tab) within 4 seconds, and in your PostHog project dashboard within ~30 seconds.</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-3">PostHog Dashboard Links</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[['Insights', 'insights'], ['Funnels', 'funnels'], ['Session Replay', 'replay'], ['Persons', 'persons']].map(([label, path]) => (
                  <a key={label} href={`https://us.posthog.com`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-[#E7E0D8] bg-white text-xs font-semibold text-[#44403C] hover:bg-[#F5F2EC] transition-colors">
                    <ExternalLink size={11} />{label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

