'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types'
import {
  UtensilsCrossed, Clock, CheckCircle2, Flame,
  AlertCircle, ChefHat, RefreshCw, Volume2, Printer
} from 'lucide-react'
import { handlePrintInvoice } from '@/lib/utils/printInvoice'
import { syncOrderStatus } from '@/lib/utils/orderSync'

const STAGE_COLUMNS: { label: string; status: OrderStatus; color: string; icon: any }[] = [
  { label: 'New Orders', status: 'confirmed', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400', icon: Clock },
  { label: 'Preparing', status: 'preparing', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', icon: ChefHat },
  { label: 'Out for Delivery', status: 'out_for_delivery', color: 'bg-purple-500/10 border-purple-500/30 text-purple-400', icon: Flame },
  { label: 'Ready / Completed', status: 'delivered', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', icon: CheckCircle2 },
]

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(*))')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setOrders(data as any)
    } else {
      // Fallback mock orders if database connection is pending local setup
      setOrders([
        {
          id: 'ord-101',
          user_id: 'usr-1',
          status: 'confirmed',
          subtotal: 448,
          tax: 22,
          delivery_fee: 30,
          discount: 0,
          total: 500,
          coupon_id: null,
          address_json: { line1: 'Flat 402, Civil Lines', city: 'Prayagraj' } as any,
          notes: 'Extra crispy crust please',
          created_at: new Date(Date.now() - 5 * 60000).toISOString(),
          items: [
            { id: 'i1', order_id: 'ord-101', product_id: 'p1', quantity: 1, unit_price: 249, selected_options: { Size: 'Large', Crust: 'Cheese Burst' }, product: { name: 'Margherita Pizza' } as any },
            { id: 'i2', order_id: 'ord-101', product_id: 'p2', quantity: 2, unit_price: 99, selected_options: null, product: { name: 'Garlic Bread' } as any },
          ],
        },
        {
          id: 'ord-102',
          user_id: 'usr-2',
          status: 'preparing',
          subtotal: 349,
          tax: 17,
          delivery_fee: 30,
          discount: 0,
          total: 396,
          coupon_id: null,
          address_json: { line1: 'House 12, Katra', city: 'Prayagraj' } as any,
          notes: 'No onions in toppings',
          created_at: new Date(Date.now() - 15 * 60000).toISOString(),
          items: [
            { id: 'i3', order_id: 'ord-102', product_id: 'p3', quantity: 1, unit_price: 349, selected_options: { Size: 'Medium' }, product: { name: 'Paneer Tikka Pizza' } as any },
          ],
        },
      ])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    // Realtime subscription
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    // Refresh data automatically when switching back to this browser tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const updateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: nextStatus } : ord))
    )

    // Universal sync helper for Supabase + local storage + tracking events
    await syncOrderStatus(orderId, nextStatus)
  }

  const getNextAction = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return { label: 'Start Preparing', next: 'preparing' as OrderStatus, color: 'bg-blue-600 hover:bg-blue-700' }
      case 'preparing':
        return { label: 'Out for Delivery', next: 'out_for_delivery' as OrderStatus, color: 'bg-purple-600 hover:bg-purple-700' }
      case 'out_for_delivery':
        return { label: 'Mark Delivered', next: 'delivered' as OrderStatus, color: 'bg-emerald-600 hover:bg-emerald-700' }
      default:
        return null
    }
  }

  return (
    <div className="p-6 bg-[#09090B] min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#27272A] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#B91C1C] rounded-lg flex items-center justify-center text-white">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif">Kitchen Display System (KDS)</h1>
            <p className="text-xs text-[#A8A29E]">Real-time live operational order management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-md text-xs font-semibold text-white transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md text-xs font-semibold">
            <Volume2 size={14} /> Live Sync Active
          </div>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {STAGE_COLUMNS.map((col) => {
          const ColumnIcon = col.icon
          const colOrders = orders.filter((o) =>
            col.status === 'confirmed'
              ? o.status === 'confirmed' || o.status === 'pending'
              : o.status === col.status
          )

          return (
            <div key={col.status} className="flex flex-col rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden">
              {/* Column Header */}
              <div className={`p-4 border-b border-[#27272A] flex items-center justify-between ${col.color}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ColumnIcon size={18} />
                  <span>{col.label}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#09090B] text-white">
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
                {colOrders.length === 0 ? (
                  <div className="text-center py-12 text-[#71717A] text-xs font-medium">
                    No orders in this stage
                  </div>
                ) : (
                  colOrders.map((ord) => {
                    const minutesAgo = Math.floor((Date.now() - new Date(ord.created_at).getTime()) / 60000)
                    const action = getNextAction(ord.status)

                    return (
                      <div key={ord.id} className="p-4 rounded-lg bg-[#27272A]/50 border border-[#3F3F46] hover:border-[#52525B] transition-all space-y-3">
                        <div className="flex items-center justify-between border-b border-[#3F3F46] pb-2">
                          <span className="font-mono font-bold text-sm text-[#F43F5E]">#{ord.id.slice(-6).toUpperCase()}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#A8A29E] flex items-center gap-1 font-semibold">
                              <Clock size={12} /> {minutesAgo}m ago
                            </span>
                            <button
                              onClick={() => {
                                const addr = (ord as any).address_json || {}
                                handlePrintInvoice({
                                  id: ord.id,
                                  customer: addr.name || 'Customer',
                                  phone: addr.phone || '',
                                  address: [addr.line1, addr.city].filter(Boolean).join(', ') || 'Prayagraj',
                                  notes: ord.notes || undefined,
                                  items_detail: ord.items?.map((i) => ({
                                    product_name: i.product?.name || 'Pizza Item',
                                    quantity: i.quantity,
                                    unit_price: i.unit_price,
                                    selected_options: i.selected_options,
                                  })),
                                  subtotal: Number(ord.subtotal) || 0,
                                  tax: Number(ord.tax) || 0,
                                  delivery_fee: Number(ord.delivery_fee) || 0,
                                  discount: Number(ord.discount) || 0,
                                  total: Number(ord.total) || 0,
                                  status: ord.status,
                                  payment_method: addr.paymentMethod || 'razorpay',
                                  created_at: ord.created_at,
                                })
                              }}
                              className="p-1 text-[#A8A29E] hover:text-white transition-colors"
                              title="Print Kitchen Ticket"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Items list */}
                        <div className="space-y-2">
                          {ord.items?.map((item) => (
                            <div key={item.id} className="text-xs">
                              <div className="flex items-center justify-between font-bold text-white">
                                <span>{item.quantity}x {item.product?.name || 'Pizza Item'}</span>
                              </div>
                              {item.selected_options && (
                                <div className="text-[11px] text-[#A8A29E] pl-2 font-mono">
                                  {Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {ord.notes && (
                          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-start gap-1">
                            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                            <span>{ord.notes}</span>
                          </div>
                        )}

                        {/* Action Button */}
                        {action && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, action.next)}
                            className={`w-full py-2 px-3 rounded-md font-bold text-xs text-white transition-all ${action.color}`}
                          >
                            {action.label}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
