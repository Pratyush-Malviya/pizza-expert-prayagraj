'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, TrendingUp, ShoppingBag, Percent,
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar,
  PieChart as PieIcon, Award, Download, Users, Activity,
  Smartphone, Monitor, Globe, Search, Filter, Eye,
  Clock, ShieldCheck, CheckCircle2, AlertCircle, Sparkles,
  ExternalLink, MousePointerClick, Layers, Zap, UserCheck,
  ChevronRight, X, Send, Play, BarChart3, Database
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts'
import {
  POSTHOG_KEY,
  POSTHOG_HOST,
  trackPostHogEvent,
  getLocalTelemetryEvents,
  TelemetryEvent,
  posthog
} from '@/lib/posthog'
import { toast } from 'sonner'

// Default seed data for Financials
const MOCK_REVENUE_SERIES = [
  { date: 'Mon', revenue: 12400, cost: 4960, profit: 7440, orders: 28 },
  { date: 'Tue', revenue: 15800, cost: 6320, profit: 9480, orders: 34 },
  { date: 'Wed', revenue: 14200, cost: 5680, profit: 8520, orders: 31 },
  { date: 'Thu', revenue: 18900, cost: 7560, profit: 11340, orders: 42 },
  { date: 'Fri', revenue: 24500, cost: 9800, profit: 14700, orders: 56 },
  { date: 'Sat', revenue: 31200, cost: 12480, profit: 18720, orders: 72 },
  { date: 'Sun', revenue: 28600, cost: 11440, profit: 17160, orders: 65 },
]

const MOCK_PRODUCT_PERFORMANCE = [
  { product_id: '1', product_name: 'Paneer Tikka Fusion', selling_price: 349, cost_price: 110, total_units_sold: 142, total_revenue: 49558, total_estimated_profit: 33938 },
  { product_id: '2', product_name: 'Farmhouse Special Pizza', selling_price: 399, cost_price: 125, total_units_sold: 118, total_revenue: 47082, total_estimated_profit: 32332 },
  { product_id: '3', product_name: 'Tandoori Chicken Delight', selling_price: 449, cost_price: 160, total_units_sold: 95, total_revenue: 42655, total_estimated_profit: 27455 },
  { product_id: '4', product_name: 'Cheese Burst Margherita', selling_price: 299, cost_price: 85, total_units_sold: 130, total_revenue: 38870, total_estimated_profit: 27820 },
  { product_id: '5', product_name: 'Garlic Breadsticks with Dip', selling_price: 149, cost_price: 35, total_units_sold: 210, total_revenue: 31290, total_estimated_profit: 23940 },
]

const CATEGORY_DISTRIBUTION = [
  { name: 'Gourmet Veg Pizzas', value: 45, color: '#16A34A' },
  { name: 'Non-Veg Pizzas', value: 30, color: '#DC2626' },
  { name: 'Sides & Garlic Breads', value: 15, color: '#D97706' },
  { name: 'Beverages & Desserts', value: 10, color: '#2563EB' },
]

// Conversion Funnel Data
const FUNNEL_STEPS = [
  { step: '1. Page View (Home)', count: 2840, dropPct: '0%' },
  { step: '2. Menu Browsing', count: 2150, dropPct: '-24%' },
  { step: '3. Add to Cart', count: 1120, dropPct: '-48%' },
  { step: '4. Initiate Checkout', count: 580, dropPct: '-48%' },
  { step: '5. Order Completed', count: 432, dropPct: '-25%' },
]

const DEVICE_DISTRIBUTION = [
  { name: 'Mobile (Android/iOS)', value: 68, color: '#E11D48' },
  { name: 'Desktop (Chrome/Mac)', value: 26, color: '#2563EB' },
  { name: 'Tablet / iPad', value: 6, color: '#059669' },
]

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
  device: string
  browser: string
  location: string
  funnelStage: 'Active Buyer' | 'Checkout Dropped' | 'Cart Abandoned' | 'Browsing' | 'VIP Loyalist'
  activityTimeline: {
    event: string
    timestamp: string
    details: string
    iconType: 'view' | 'cart' | 'order' | 'auth' | 'coupon'
  }[]
}

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'funnel' | 'financials' | 'engine_hub'>('users')
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('7d')
  const [loading, setLoading] = useState<boolean>(true)
  
  // Real DB state
  const [revenueData, setRevenueData] = useState(MOCK_REVENUE_SERIES)
  const [productStats, setProductStats] = useState(MOCK_PRODUCT_PERFORMANCE)
  const [usersList, setUsersList] = useState<UserReport[]>([])
  const [selectedUser, setSelectedUser] = useState<UserReport | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('ALL')
  
  // Telemetry stream state
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([])
  const [isLiveStreaming, setIsLiveStreaming] = useState(true)

  const [metrics, setMetrics] = useState({
    totalRevenue: 145600,
    grossProfit: 87360,
    profitMargin: 60.0,
    totalOrders: 328,
    aov: 443.9,
    couponDiscountSpend: 6850,
    totalTrackedUsers: 512,
    activeSessionsToday: 84,
    conversionRate: 15.2,
  })

  // Load real telemetry events from localStorage & database
  const refreshTelemetry = () => {
    const local = getLocalTelemetryEvents()
    setTelemetryEvents(local)
  }

  useEffect(() => {
    refreshTelemetry()
    const interval = setInterval(() => {
      if (isLiveStreaming) {
        refreshTelemetry()
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [isLiveStreaming])

  // Fetch real users from Supabase and merge with behavioral data
  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch profiles
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .limit(50)

      // Fetch orders
      const { data: orders, error: orderErr } = await supabase
        .from('orders')
        .select('id, user_id, total, status, created_at, address_json')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!profileErr && profiles && profiles.length > 0) {
        const mappedUsers: UserReport[] = profiles.map((prof: any) => {
          const userOrders = (orders || []).filter((o: any) => o.user_id === prof.id)
          const totalSpend = userOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)
          const totalOrders = userOrders.length

          let stage: UserReport['funnelStage'] = 'Browsing'
          if (totalOrders > 5) stage = 'VIP Loyalist'
          else if (totalOrders > 0) stage = 'Active Buyer'
          else stage = 'Browsing'

          return {
            id: prof.id,
            distinctId: `usr_${prof.id.slice(0, 8)}`,
            name: prof.full_name || prof.name || 'Registered Customer',
            email: prof.email || 'customer@pizzaexpert.in',
            phone: prof.phone || 'Phone on file',
            role: prof.role || 'Customer',
            totalOrders,
            totalSpend,
            lastSeen: 'Recently',
            device: 'Mobile Web',
            browser: 'Chrome / Safari',
            location: prof.city || 'Prayagraj, UP',
            funnelStage: stage,
            activityTimeline: [
              {
                event: '$pageview: /account',
                timestamp: 'Recent session',
                details: 'User authenticated profile loaded',
                iconType: 'auth'
              },
              ...userOrders.slice(0, 3).map((o: any) => ({
                event: `order_completed #${String(o.id).slice(0, 8).toUpperCase()}`,
                timestamp: new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                details: `Status: ${o.status.toUpperCase()} – Value: ₹${o.total}`,
                iconType: 'order' as const
              }))
            ]
          }
        })

        setUsersList(mappedUsers)
      }

      // Fetch financial views if available
      const { data: dailyView } = await supabase.from('daily_revenue_summary').select('*').limit(30)
      if (dailyView && dailyView.length > 0) {
        const formatted = dailyView.map((d: any) => ({
          date: d.date,
          revenue: Number(d.gross_revenue) || 0,
          cost: Math.round((Number(d.gross_revenue) || 0) * 0.4),
          profit: Math.round((Number(d.gross_revenue) || 0) * 0.6),
          orders: Number(d.total_orders) || 0,
        }))
        setRevenueData(formatted)
      }
    } catch (err) {
      console.warn('Analytics fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeframe])

  // Filter users
  const filteredUsers = usersList.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery) ||
      user.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.distinctId.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStage = stageFilter === 'ALL' || user.funnelStage === stageFilter

    return matchesSearch && matchesStage
  })

  // Send a test telemetry event to verify live pipeline
  const sendTestTelemetry = (eventName: string) => {
    trackPostHogEvent(eventName, {
      triggered_by: 'Admin Panel Test Trigger',
      source: 'Admin Diagnostics',
      timestamp: new Date().toISOString(),
      sample_value: 499,
      screen_resolution: `${window.innerWidth}x${window.innerHeight}`,
    })
    refreshTelemetry()
    toast.success(`⚡ Event '${eventName}' captured & dispatched!`, {
      description: 'Check the live telemetry stream below to inspect properties.'
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Navigation Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 flex items-center gap-1">
                <Zap size={12} className="fill-current" /> Live Telemetry & BI
              </span>
              <span className="text-xs text-[#78716C]">
                {POSTHOG_KEY ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Analytics Engine Active
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <AlertCircle size={13} /> Ready (Setup in .env)
                  </span>
                )}
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
              User Behavioral Intelligence & Analytics
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C]">
              Detailed activity reports, conversion funnels, session telemetry, and user drill-downs.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalyticsData}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E7E0D8] bg-white text-xs font-semibold text-[#44403C] hover:bg-[#F5F2EC] transition-all shadow-2xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => sendTestTelemetry('admin_ping_test')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C1917] text-white text-xs font-semibold hover:bg-black transition-all shadow-2xs"
            >
              <Send size={13} />
              <span>Send Test Event</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-[#E7E0D8] pt-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'users'
                ? 'border-[#B91C1C] text-[#B91C1C]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Users size={16} />
            <span>👥 User Reports & Profiles ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('funnel')}
            className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'funnel'
                ? 'border-[#B91C1C] text-[#B91C1C]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Layers size={16} />
            <span>⚡ Conversion Funnels & Live Events</span>
          </button>

          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'financials'
                ? 'border-[#B91C1C] text-[#B91C1C]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <TrendingUp size={16} />
            <span>📊 Financial & Revenue BI</span>
          </button>

          <button
            onClick={() => setActiveTab('engine_hub')}
            className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'engine_hub'
                ? 'border-[#B91C1C] text-[#B91C1C]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <ShieldCheck size={16} />
            <span>⚙️ Analytics Engine Hub</span>
          </button>
        </div>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">Tracked Users</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#B91C1C] flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-[#1C1917]">{metrics.totalTrackedUsers}</span>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-semibold">
              <ArrowUpRight size={14} />
              <span>+28 new identified this week</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">Active Sessions</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-[#1C1917]">{metrics.activeSessionsToday}</span>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>Live visitor sessions today</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">E-Comm Conversion</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MousePointerClick size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-[#1C1917]">{metrics.conversionRate}%</span>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-semibold">
              <ArrowUpRight size={14} />
              <span>Menu View → Paid Order</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">Gross Sales</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-[#1C1917]">{formatPrice(metrics.totalRevenue)}</span>
            <div className="flex items-center gap-1 mt-1 text-xs text-[#78716C] font-medium">
              <span>{metrics.totalOrders} total completed orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: USERS & DETAILED BEHAVIORAL REPORTS */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" size={16} />
              <input
                type="text"
                placeholder="Search user by name, email, phone, session ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E7E0D8] bg-[#FBF9F5] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:border-[#B91C1C]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs font-semibold">
              <span className="text-[#78716C] flex items-center gap-1 shrink-0">
                <Filter size={13} /> Filter:
              </span>
              {['ALL', 'VIP Loyalist', 'Active Buyer', 'Cart Abandoned', 'Browsing'].map((stage) => (
                <button
                  key={stage}
                  onClick={() => setStageFilter(stage)}
                  className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                    stageFilter === stage
                      ? 'bg-[#1C1917] text-white border-[#1C1917]'
                      : 'bg-white text-[#78716C] border-[#E7E0D8] hover:bg-[#F5F2EC]'
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-[#E7E0D8] flex items-center justify-between">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                  <UserCheck className="text-[#B91C1C]" size={20} />
                  Individual User Profiles & Telemetry Dossiers
                </h2>
                <p className="text-xs text-[#78716C]">
                  Click on any user to open their complete timeline, conversion journey, and activity records.
                </p>
              </div>
              <span className="text-xs font-bold bg-[#F5F2EC] px-3 py-1 rounded-full text-[#44403C]">
                Showing {filteredUsers.length} Users
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F2EC] text-[#78716C] uppercase text-[11px] font-bold border-b border-[#E7E0D8]">
                  <tr>
                    <th className="py-3 px-4">User / Persona</th>
                    <th className="py-3 px-4">Session Tracking ID</th>
                    <th className="py-3 px-4 text-center">Status / Stage</th>
                    <th className="py-3 px-4 text-right">Orders</th>
                    <th className="py-3 px-4 text-right">LTV Spend</th>
                    <th className="py-3 px-4">Primary Device & OS</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E0D8] text-[#1C1917]">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="hover:bg-[#FDFBF7] cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-100 text-[#B91C1C] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {user.name.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-[#1C1917] block group-hover:text-[#B91C1C] transition-colors">
                              {user.name}
                            </span>
                            <span className="text-[11px] text-[#78716C] block">{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#57534E]">
                        <span className="bg-[#F5F2EC] px-2 py-0.5 rounded border border-[#E7E0D8]">
                          {user.distinctId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            user.funnelStage === 'VIP Loyalist'
                              ? 'bg-purple-100 text-purple-800'
                              : user.funnelStage === 'Active Buyer'
                              ? 'bg-emerald-100 text-emerald-800'
                              : user.funnelStage === 'Cart Abandoned'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {user.funnelStage}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold">{user.totalOrders}</td>

                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                        {formatPrice(user.totalSpend)}
                      </td>

                      <td className="py-3.5 px-4 text-[#78716C]">
                        <div className="flex items-center gap-1.5">
                          {user.device.toLowerCase().includes('iphone') || user.device.toLowerCase().includes('samsung') || user.device.toLowerCase().includes('oneplus') || user.device.toLowerCase().includes('mobile') ? (
                            <Smartphone size={13} className="text-[#A8A29E]" />
                          ) : (
                            <Monitor size={13} className="text-[#A8A29E]" />
                          )}
                          <span>{user.device}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#78716C]">
                        <div className="flex items-center gap-1">
                          <Globe size={13} className="text-[#A8A29E]" />
                          <span>{user.location}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedUser(user)
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#E7E0D8] bg-white text-xs font-semibold text-[#1C1917] hover:bg-[#B91C1C] hover:text-white hover:border-[#B91C1C] transition-all shadow-2xs flex items-center gap-1 ml-auto"
                        >
                          <Eye size={12} />
                          <span>View Report</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: CONVERSION FUNNELS & REALTIME EVENTS */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          {/* Funnel Steps Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-[#E7E0D8] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                  <Layers className="text-[#B91C1C]" size={20} />
                  Complete E-Commerce Conversion Funnel
                </h2>
                <p className="text-xs text-[#78716C]">
                  Step-by-step visitor progression from landing page to successful payment.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                15.2% Overall Conversion
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              {FUNNEL_STEPS.map((step, idx) => (
                <div
                  key={step.step}
                  className="bg-[#FBF9F5] p-4 rounded-xl border border-[#E7E0D8] relative flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#A8A29E] block mb-1">
                      Step {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#1C1917] block leading-tight">
                      {step.step.replace(/^\d+\.\s*/, '')}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E7E0D8]/60 flex items-baseline justify-between">
                    <span className="text-xl font-bold font-serif text-[#1C1917]">
                      {step.count.toLocaleString()}
                    </span>
                    {idx > 0 && (
                      <span className="text-[11px] font-semibold text-rose-600">
                        {step.dropPct}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Device distribution */}
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1">Traffic by Device Type</h3>
              <p className="text-xs text-[#78716C] mb-4">Breakdown of user hardware & screen sizes</p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DEVICE_DISTRIBUTION}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {DEVICE_DISTRIBUTION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value}% share`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-2">
                {DEVICE_DISTRIBUTION.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[#57534E] font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-[#1C1917]">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Telemetry Stream */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-serif font-bold text-[#1C1917] flex items-center gap-2">
                      <Activity className="text-emerald-600" size={16} />
                      Live Telemetry & Event Stream
                    </h3>
                    <p className="text-xs text-[#78716C]">Real-time events captured in this browser session</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                        isLiveStreaming
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-[#F5F2EC] text-[#78716C] border-[#E7E0D8]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                      {isLiveStreaming ? 'Live' : 'Paused'}
                    </button>

                    <button
                      onClick={refreshTelemetry}
                      className="p-1.5 rounded-lg border border-[#E7E0D8] hover:bg-[#F5F2EC]"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                  {telemetryEvents.length === 0 ? (
                    <div className="text-center py-10 text-[#A8A29E] bg-[#FBF9F5] rounded-xl border border-dashed border-[#E7E0D8]">
                      <Sparkles size={24} className="mx-auto mb-2 text-[#A8A29E]" />
                      <p className="font-semibold text-xs">No live telemetry events captured yet in this tab.</p>
                      <p className="text-[11px] mt-1">Click &quot;Send Test Event&quot; or browse the menu to generate real events!</p>
                      <button
                        onClick={() => sendTestTelemetry('sample_page_browse')}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold hover:bg-rose-700"
                      >
                        Trigger Sample Event
                      </button>
                    </div>
                  ) : (
                    telemetryEvents.slice(0, 15).map((evt) => (
                      <div
                        key={evt.id}
                        className="p-2.5 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-between hover:bg-[#F5F2EC] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
                          <div>
                            <span className="font-mono font-bold text-[#1C1917] block">
                              {evt.event}
                            </span>
                            <span className="text-[11px] text-[#78716C]">
                              Distinct ID: {evt.distinctId || 'guest'} • {JSON.stringify(evt.properties).slice(0, 50)}...
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#A8A29E] font-mono shrink-0">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: FINANCIAL & REVENUE BI (Original + Enhanced) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Main Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-serif font-bold text-[#1C1917]">Revenue vs. Estimated Margin Trend</h2>
                  <p className="text-xs text-[#78716C]">Daily breakdown of gross sales and net gross profit</p>
                </div>
                <span className="text-xs font-semibold bg-[#F5F2EC] px-2.5 py-1 rounded-md text-[#44403C] border border-[#E7E0D8]">
                  Daily Frequency
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E0D8" />
                    <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 12, fill: '#78716C' }} />
                    <YAxis tickLine={false} tick={{ fontSize: 12, fill: '#78716C' }} />
                    <Tooltip
                      formatter={(val: any) => formatPrice(Number(val) || 0)}
                      contentStyle={{ backgroundColor: '#1C1917', borderRadius: '8px', color: '#FFF', border: 'none' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#16A34A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="profit" name="Gross Profit (₹)" stroke="#D97706" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Share */}
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-2xs">
              <h2 className="text-base font-serif font-bold text-[#1C1917] mb-1">Sales by Category</h2>
              <p className="text-xs text-[#78716C] mb-4">Revenue share by menu category</p>
              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CATEGORY_DISTRIBUTION}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {CATEGORY_DISTRIBUTION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value}% Share`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-2">
                {CATEGORY_DISTRIBUTION.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-[#44403C]">{cat.name}</span>
                    </div>
                    <span className="font-bold text-[#1C1917]">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Performance Table */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-[#E7E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                  <Award className="text-[#D97706]" size={20} />
                  Product Profitability & Contribution Margin
                </h2>
                <p className="text-xs text-[#78716C]">
                  Compare selling price vs ingredient cost to pinpoint highest margin items.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F5F2EC] text-[#78716C] font-semibold uppercase text-[11px] border-b border-[#E7E0D8]">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Ingredient Cost</th>
                    <th className="py-3 px-4 text-right">Units Sold</th>
                    <th className="py-3 px-4 text-right">Gross Revenue</th>
                    <th className="py-3 px-4 text-right">Estimated Profit</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E0D8] text-[#1C1917]">
                  {productStats.map((prod) => {
                    const marginPercent = prod.total_revenue > 0
                      ? Math.round((prod.total_estimated_profit / prod.total_revenue) * 100)
                      : 0

                    return (
                      <tr key={prod.product_id} className="hover:bg-[#FDFBF7] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#1C1917] flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                          {prod.product_name}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{formatPrice(prod.selling_price)}</td>
                        <td className="py-3 px-4 text-right text-[#78716C]">{formatPrice(prod.cost_price)}</td>
                        <td className="py-3 px-4 text-right font-bold">{prod.total_units_sold}</td>
                        <td className="py-3 px-4 text-right font-semibold text-[#16A34A]">
                          {formatPrice(prod.total_revenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#D97706]">
                          {formatPrice(prod.total_estimated_profit)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            marginPercent >= 65
                              ? 'bg-[#DCFCE7] text-[#16A34A]'
                              : marginPercent >= 50
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : 'bg-[#FEE2E2] text-[#DC2626]'
                          }`}>
                            {marginPercent}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: TELEMETRY & ANALYTICS ENGINE HUB */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'engine_hub' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E7E0D8] shadow-2xs space-y-6">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#1C1917] flex items-center gap-2">
                <ShieldCheck className="text-[#B91C1C]" size={22} />
                Analytics Engine Configuration & Pipeline Health
              </h2>
              <p className="text-xs text-[#78716C] mt-1">
                Monitors live customer sessions, event ingestion streams, and conversion funnels.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#E7E0D8] bg-[#FBF9F5] space-y-2">
                <span className="text-[11px] font-bold uppercase text-[#78716C] block">
                  Public Ingestion Key
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#1C1917]">
                    {POSTHOG_KEY ? `${POSTHOG_KEY.slice(0, 10)}...${POSTHOG_KEY.slice(-4)}` : 'Not configured yet'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    POSTHOG_KEY ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {POSTHOG_KEY ? 'Active' : 'Missing in .env.local'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E7E0D8] bg-[#FBF9F5] space-y-2">
                <span className="text-[11px] font-bold uppercase text-[#78716C] block">
                  Ingestion Server Host
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#1C1917]">
                    {POSTHOG_HOST}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                    Cloud Ingestion Active
                  </span>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="pt-4 border-t border-[#E7E0D8] flex flex-wrap items-center gap-3">
              <a
                href="https://us.posthog.com/insights"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-[#1C1917] text-white text-xs font-bold hover:bg-black transition-all flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Open Cloud Insights Console</span>
              </a>

              <a
                href="https://us.posthog.com/replay"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl border border-[#E7E0D8] bg-white text-[#1C1917] text-xs font-bold hover:bg-[#F5F2EC] transition-all flex items-center gap-1.5"
              >
                <Play size={13} />
                <span>View User Session Replays</span>
              </a>

              <button
                onClick={() => sendTestTelemetry('admin_live_diagnostic_ping')}
                className="px-4 py-2 rounded-xl border border-[#B91C1C] text-[#B91C1C] bg-rose-50 text-xs font-bold hover:bg-rose-100 transition-all flex items-center gap-1.5 ml-auto"
              >
                <Zap size={13} />
                <span>Send Live Diagnostic Event</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* INDIVIDUAL USER REPORT MODAL / DRAWER */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl border-l border-[#E7E0D8] overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E7E0D8] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-[#B91C1C] flex items-center justify-center font-bold text-lg uppercase font-serif">
                  {selectedUser.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#1C1917] leading-tight">
                    {selectedUser.name}
                  </h3>
                  <span className="text-xs text-[#78716C] font-mono">{selectedUser.distinctId}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl text-[#78716C] hover:bg-[#F5F2EC] hover:text-[#1C1917] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* User KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#FBF9F5] p-3.5 rounded-xl border border-[#E7E0D8]">
                  <span className="text-[10px] font-bold text-[#A8A29E] uppercase block">Lifetime Value</span>
                  <span className="text-base font-bold font-serif text-[#1C1917] block mt-1">
                    {formatPrice(selectedUser.totalSpend)}
                  </span>
                </div>

                <div className="bg-[#FBF9F5] p-3.5 rounded-xl border border-[#E7E0D8]">
                  <span className="text-[10px] font-bold text-[#A8A29E] uppercase block">Total Orders</span>
                  <span className="text-base font-bold font-serif text-[#1C1917] block mt-1">
                    {selectedUser.totalOrders} Orders
                  </span>
                </div>

                <div className="bg-[#FBF9F5] p-3.5 rounded-xl border border-[#E7E0D8]">
                  <span className="text-[10px] font-bold text-[#A8A29E] uppercase block">Funnel Stage</span>
                  <span className="text-xs font-bold text-emerald-700 block mt-1.5">
                    {selectedUser.funnelStage}
                  </span>
                </div>

                <div className="bg-[#FBF9F5] p-3.5 rounded-xl border border-[#E7E0D8]">
                  <span className="text-[10px] font-bold text-[#A8A29E] uppercase block">Last Active</span>
                  <span className="text-xs font-bold text-[#1C1917] block mt-1.5">
                    {selectedUser.lastSeen}
                  </span>
                </div>
              </div>

              {/* User Info Details */}
              <div className="bg-white p-4 rounded-xl border border-[#E7E0D8] space-y-2 text-xs">
                <h4 className="font-bold text-[#1C1917] uppercase text-[11px] tracking-wider mb-2">
                  Identity & Session Context
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[#57534E]">
                  <div><span className="text-[#A8A29E]">Email:</span> {selectedUser.email}</div>
                  <div><span className="text-[#A8A29E]">Phone:</span> {selectedUser.phone}</div>
                  <div><span className="text-[#A8A29E]">Hardware:</span> {selectedUser.device}</div>
                  <div><span className="text-[#A8A29E]">Browser:</span> {selectedUser.browser}</div>
                  <div className="col-span-2"><span className="text-[#A8A29E]">Location:</span> {selectedUser.location}</div>
                </div>
              </div>

              {/* Chronological Event Journey Timeline */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#1C1917] flex items-center gap-2">
                  <Clock size={16} className="text-[#B91C1C]" />
                  User Activity & Journey Stream
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E7E0D8]">
                  {selectedUser.activityTimeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-[#B91C1C] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />
                      </span>

                      <div className="bg-[#FBF9F5] p-3.5 rounded-xl border border-[#E7E0D8]">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-[#1C1917]">
                            {item.event}
                          </span>
                          <span className="text-[10px] text-[#A8A29E] font-medium">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-[#57534E] mt-1">{item.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E7E0D8] flex items-center justify-between">
                <a
                  href={`https://us.posthog.com/person/${selectedUser.distinctId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#1C1917] text-white text-xs font-bold hover:bg-black transition-all flex items-center gap-2"
                >
                  <ExternalLink size={13} />
                  <span>View Extended Cloud Profile</span>
                </a>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E7E0D8] bg-white text-xs font-semibold text-[#57534E] hover:bg-[#F5F2EC]"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
