'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp, ShoppingBag, CreditCard, Banknote, Smartphone,
  Monitor, Globe, QrCode, Truck, UtensilsCrossed, RefreshCw, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SalesSummary {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  bySource: Record<string, { revenue: number; orders: number }>
  byOrderType: Record<string, { revenue: number; orders: number }>
  byPaymentMethod: Record<string, { revenue: number; orders: number }>
  topProducts: Array<{ name: string; qty: number; revenue: number }>
  hourlyData: Array<{ hour: number; orders: number; revenue: number }>
}

const SOURCE_META: Record<string, { label: string; icon: any; color: string }> = {
  pos: { label: 'POS Counter', icon: Monitor, color: 'text-purple-600 bg-purple-50' },
  direct: { label: 'Online', icon: Globe, color: 'text-blue-600 bg-blue-50' },
  qr: { label: 'QR Dine-In', icon: QrCode, color: 'text-green-600 bg-green-50' },
}

const ORDER_TYPE_META: Record<string, { label: string; icon: any }> = {
  delivery: { label: 'Delivery', icon: Truck },
  dine_in: { label: 'Dine-In', icon: UtensilsCrossed },
  takeaway: { label: 'Takeaway', icon: ShoppingBag },
  pickup: { label: 'Pickup', icon: ShoppingBag },
}

export default function SalesReportPage() {
  const [data, setData] = useState<SalesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d'>('today')

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()

    const now = new Date()
    let from: Date
    if (dateRange === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (dateRange === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total, subtotal, source, order_type, payment_status, created_at')
      .gte('created_at', from.toISOString())
      .in('payment_status', ['paid', 'unpaid'])
      .order('created_at', { ascending: true })

    const { data: payments } = await supabase
      .from('order_payments')
      .select('order_id, tender_type, amount')
      .gte('created_at', from.toISOString())
      .eq('status', 'completed')

    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, quantity, unit_price, products(name)')
      .in('order_id', (orders || []).map((o: any) => o.id))

    const paidOrders = (orders || []).filter((o: any) => o.payment_status === 'paid')
    const totalRevenue = paidOrders.reduce((s: number, o: any) => s + Number(o.total), 0)
    const totalOrders = paidOrders.length

    // By source
    const bySource: Record<string, { revenue: number; orders: number }> = {}
    for (const o of paidOrders) {
      const src = (o as any).source || 'direct'
      if (!bySource[src]) bySource[src] = { revenue: 0, orders: 0 }
      bySource[src].revenue += Number(o.total)
      bySource[src].orders += 1
    }

    // By order type
    const byOrderType: Record<string, { revenue: number; orders: number }> = {}
    for (const o of paidOrders) {
      const type = (o as any).order_type || 'delivery'
      if (!byOrderType[type]) byOrderType[type] = { revenue: 0, orders: 0 }
      byOrderType[type].revenue += Number(o.total)
      byOrderType[type].orders += 1
    }

    // By payment method (from order_payments table)
    const byPaymentMethod: Record<string, { revenue: number; orders: number }> = {}
    const orderPaymentMap: Record<string, string[]> = {}
    for (const p of (payments || [])) {
      const method = (p as any).tender_type || 'cash'
      if (!byPaymentMethod[method]) byPaymentMethod[method] = { revenue: 0, orders: 0 }
      byPaymentMethod[method].revenue += Number((p as any).amount)
      if (!orderPaymentMap[(p as any).order_id]) orderPaymentMap[(p as any).order_id] = []
      if (!orderPaymentMap[(p as any).order_id].includes(method)) {
        orderPaymentMap[(p as any).order_id].push(method)
        byPaymentMethod[method].orders += 1
      }
    }

    // Also count COD from address_json for online orders
    const { data: onlineOrders } = await supabase
      .from('orders')
      .select('id, address_json, total')
      .gte('created_at', from.toISOString())
      .neq('source', 'pos')
      .eq('payment_status', 'paid')
    for (const o of (onlineOrders || [])) {
      const method = (o as any).address_json?.paymentMethod || 'cod'
      if (!byPaymentMethod[method]) byPaymentMethod[method] = { revenue: 0, orders: 0 }
      byPaymentMethod[method].revenue += Number((o as any).total)
      byPaymentMethod[method].orders += 1
    }

    // Top products
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    for (const item of (items || [])) {
      const name = (item as any).products?.name || 'Unknown'
      if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 }
      productMap[name].qty += Number((item as any).quantity)
      productMap[name].revenue += Number((item as any).quantity) * Number((item as any).unit_price)
    }
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8)

    // Hourly data
    const hourlyMap: Record<number, { orders: number; revenue: number }> = {}
    for (const o of paidOrders) {
      const hr = new Date((o as any).created_at).getHours()
      if (!hourlyMap[hr]) hourlyMap[hr] = { orders: 0, revenue: 0 }
      hourlyMap[hr].orders += 1
      hourlyMap[hr].revenue += Number(o.total)
    }
    const hourlyData = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      orders: hourlyMap[h]?.orders || 0,
      revenue: hourlyMap[h]?.revenue || 0,
    }))

    setData({
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      bySource,
      byOrderType,
      byPaymentMethod,
      topProducts,
      hourlyData,
    })
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Sales Report</h1>
          <p className="text-sm text-[#78716C] mt-0.5">Revenue by channel, order type, and payment method</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-[#E7E0D8] rounded-xl overflow-hidden">
            {(['today', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  'px-4 py-2 text-xs font-semibold transition-all',
                  dateRange === r ? 'bg-[#B91C1C] text-white' : 'text-[#78716C] hover:bg-[#F4EFEA]'
                )}
              >
                {r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
          <button onClick={loadData} className="p-2 border border-[#E7E0D8] rounded-xl text-[#78716C] hover:bg-[#F4EFEA] transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#B91C1C]" size={24} /></div>
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: `₹${data.totalRevenue.toFixed(2)}`, sub: dateRange === 'today' ? 'Today' : `Last ${dateRange}`, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
              { label: 'Total Orders', value: data.totalOrders.toString(), sub: 'Paid orders', icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
              { label: 'Avg Order Value', value: `₹${data.avgOrderValue.toFixed(0)}`, sub: 'Per order', icon: CreditCard, color: 'bg-purple-50 text-purple-600' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-[#E7E0D8] p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#78716C]">{kpi.label}</p>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', kpi.color)}>
                    <kpi.icon size={18} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#1C1917]">{kpi.value}</p>
                <p className="text-xs text-[#A8A29E] mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* By Source */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5">
            <h2 className="font-bold text-[#1C1917] mb-4">Revenue by Channel</h2>
            <div className="space-y-3">
              {Object.entries(data.bySource)
                .sort(([, a], [, b]) => b.revenue - a.revenue)
                .map(([src, stats]) => {
                  const meta = SOURCE_META[src] || { label: src, icon: Globe, color: 'text-gray-600 bg-gray-50' }
                  const pct = data.totalRevenue > 0 ? (stats.revenue / data.totalRevenue) * 100 : 0
                  return (
                    <div key={src}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', meta.color)}>
                            <meta.icon size={14} />
                          </span>
                          <span className="text-sm font-semibold text-[#1C1917]">{meta.label}</span>
                          <span className="text-xs text-[#A8A29E]">{stats.orders} orders</span>
                        </div>
                        <span className="text-sm font-bold text-[#1C1917]">₹{stats.revenue.toFixed(0)}</span>
                      </div>
                      <div className="h-2 bg-[#F4EFEA] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B91C1C] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              {Object.keys(data.bySource).length === 0 && (
                <p className="text-sm text-[#A8A29E] text-center py-4">No paid orders in this period</p>
              )}
            </div>
          </div>

          {/* By Order Type + Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            {/* Order Type */}
            <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5">
              <h2 className="font-bold text-[#1C1917] mb-4">By Order Type</h2>
              <div className="space-y-2.5">
                {Object.entries(data.byOrderType)
                  .sort(([, a], [, b]) => b.revenue - a.revenue)
                  .map(([type, stats]) => {
                    const meta = ORDER_TYPE_META[type] || { label: type, icon: ShoppingBag }
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <meta.icon size={14} className="text-[#78716C]" />
                          <span className="text-sm text-[#1C1917]">{meta.label}</span>
                          <span className="text-xs text-[#A8A29E]">({stats.orders})</span>
                        </div>
                        <span className="text-sm font-bold text-[#1C1917]">₹{stats.revenue.toFixed(0)}</span>
                      </div>
                    )
                  })}
                {Object.keys(data.byOrderType).length === 0 && (
                  <p className="text-sm text-[#A8A29E] text-center py-2">No data</p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5">
              <h2 className="font-bold text-[#1C1917] mb-4">By Payment Method</h2>
              <div className="space-y-2.5">
                {Object.entries(data.byPaymentMethod)
                  .sort(([, a], [, b]) => b.revenue - a.revenue)
                  .map(([method, stats]) => {
                    const icons: Record<string, any> = { cash: Banknote, upi: Smartphone, card: CreditCard, razorpay: CreditCard, cod: Banknote }
                    const Icon = icons[method] || CreditCard
                    return (
                      <div key={method} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon size={14} className="text-[#78716C]" />
                          <span className="text-sm text-[#1C1917] capitalize">{method}</span>
                          <span className="text-xs text-[#A8A29E]">({stats.orders})</span>
                        </div>
                        <span className="text-sm font-bold text-[#1C1917]">₹{stats.revenue.toFixed(0)}</span>
                      </div>
                    )
                  })}
                {Object.keys(data.byPaymentMethod).length === 0 && (
                  <p className="text-sm text-[#A8A29E] text-center py-2">No data</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5">
            <h2 className="font-bold text-[#1C1917] mb-4">Top Selling Items</h2>
            <div className="space-y-2.5">
              {data.topProducts.map((p, i) => {
                const maxRev = data.topProducts[0]?.revenue || 1
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#A8A29E] w-5">{i + 1}</span>
                        <span className="text-sm font-semibold text-[#1C1917]">{p.name}</span>
                        <span className="text-xs text-[#A8A29E]">{p.qty} sold</span>
                      </div>
                      <span className="text-sm font-bold text-[#1C1917]">₹{p.revenue.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 bg-[#F4EFEA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#B91C1C]/70 rounded-full"
                        style={{ width: `${(p.revenue / maxRev) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {data.topProducts.length === 0 && (
                <p className="text-sm text-[#A8A29E] text-center py-4">No product data available</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
