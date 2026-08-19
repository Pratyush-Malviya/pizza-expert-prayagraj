'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { voidPOSOrder, getPOSOrders } from '@/app/actions/posPayments'
import { processPOSPayment } from '@/app/actions/posPayments'
import { getActiveShift } from '@/app/actions/cashierSessions'
import {
  Clock, Check, X, CreditCard, Banknote, RefreshCw,
  ShoppingBag, AlertTriangle, Loader2, Search, Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-blue-100 text-blue-700',
  refunded: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
}

const FULFILLMENT_COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-600',
  confirmed: 'bg-indigo-50 text-indigo-600',
  preparing: 'bg-orange-50 text-orange-600',
  ready: 'bg-green-50 text-green-600',
  completed: 'bg-[#F4EFEA] text-[#78716C]',
  cancelled: 'bg-red-50 text-red-600',
}

export default function ActivePOSOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [shiftId, setShiftId] = useState<string>('')
  const [cashierId, setCashierId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [voidReason, setVoidReason] = useState('')
  const [voidingId, setVoidingId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    const result = await getPOSOrders(100)
    if (result.success) setOrders(result.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCashierId(user.id)
        const shiftResult = await getActiveShift(user.id)
        if (shiftResult.success && shiftResult.data) {
          setShiftId(shiftResult.data.id)
        }
      }
      loadOrders()
    }
    init()

    // Realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel('pos-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'source=eq.pos' }, () => {
        loadOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadOrders])

  const filteredOrders = orders.filter((o) => {
    const matchSearch = !searchQuery ||
      (o.address_json?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.kot_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = filterStatus === 'all' || o.payment_status === filterStatus
    return matchSearch && matchStatus
  })

  const handleVoid = async (orderId: string) => {
    if (!voidReason.trim()) return toast.error('Enter a void reason')
    const result = await voidPOSOrder(orderId, voidReason, cashierId)
    if (result.success) {
      toast.success('Order voided')
      setVoidingId(null)
      setVoidReason('')
      loadOrders()
    } else toast.error(result.error)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">POS Orders</h1>
          <p className="text-sm text-[#78716C] mt-0.5">All counter orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadOrders} className="p-2 rounded-lg border border-[#E7E0D8] text-[#78716C] hover:bg-[#F4EFEA] transition">
            <RefreshCw size={14} />
          </button>
          <Link href="/admin/pos" className="flex items-center gap-2 px-4 py-2 bg-[#B91C1C] text-white rounded-xl text-sm font-semibold hover:bg-[#991B1B] transition">
            <ShoppingBag size={14} /> New Order
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or KOT…"
            className="w-full pl-8 pr-3 py-2 border border-[#E7E0D8] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/30"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-[#E7E0D8] rounded-xl px-3 py-2 text-sm focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#B91C1C]" /></div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] p-12 text-center">
          <ShoppingBag size={40} className="mx-auto mb-3 text-[#D6D3D1]" />
          <p className="text-[#78716C] font-semibold">No POS orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const addr = order.address_json || {}
            const itemCount = (order.order_items || []).reduce((s: number, i: any) => s + i.quantity, 0)
            const timeAgo = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-[#E7E0D8] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-sm text-[#1C1917]">
                        {addr.name || 'Walk-in'}
                      </span>
                      {order.kot_number && (
                        <span className="text-xs bg-[#F4EFEA] text-[#57534E] px-2 py-0.5 rounded font-mono">
                          {order.kot_number}
                        </span>
                      )}
                      <span className="text-xs text-[#A8A29E]">
                        {timeAgo < 1 ? 'Just now' : `${timeAgo}m ago`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_COLORS[order.payment_status] || 'bg-[#F4EFEA] text-[#78716C]')}>
                        {order.payment_status?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', FULFILLMENT_COLORS[order.fulfillment_status] || 'bg-[#F4EFEA] text-[#78716C]')}>
                        {order.fulfillment_status?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#A8A29E] capitalize">
                        {order.order_type?.replace('_', '-')}
                      </span>
                    </div>

                    <p className="text-xs text-[#78716C] truncate">
                      {(order.order_items || []).slice(0, 3).map((i: any) =>
                        `${i.quantity}× ${i.products?.name || 'Item'}`
                      ).join(', ')}
                      {order.order_items?.length > 3 && ` +${order.order_items.length - 3} more`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#1C1917]">₹{Number(order.total).toFixed(2)}</p>
                    <p className="text-xs text-[#A8A29E]">{itemCount} items</p>

                    {/* Void Button (only for unpaid) */}
                    {order.payment_status === 'unpaid' && order.fulfillment_status !== 'cancelled' && (
                      <button
                        onClick={() => setVoidingId(voidingId === order.id ? null : order.id)}
                        className="mt-1.5 text-xs text-[#B91C1C] hover:underline"
                      >
                        Void
                      </button>
                    )}
                  </div>
                </div>

                {/* Void Reason Inline */}
                {voidingId === order.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="Void reason (required)"
                      className="flex-1 border border-[#E7E0D8] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400/50"
                      autoFocus
                    />
                    <button
                      onClick={() => handleVoid(order.id)}
                      className="px-3 py-1.5 bg-[#B91C1C] text-white rounded-lg text-xs font-semibold hover:bg-[#991B1B] transition"
                    >
                      Confirm Void
                    </button>
                    <button
                      onClick={() => setVoidingId(null)}
                      className="px-2 py-1.5 border border-[#E7E0D8] rounded-lg text-xs text-[#78716C] hover:bg-[#F4EFEA] transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
