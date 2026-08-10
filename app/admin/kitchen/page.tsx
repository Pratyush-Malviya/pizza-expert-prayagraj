'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types'
import {
  UtensilsCrossed, Clock, CheckCircle2, Flame,
  AlertCircle, ChefHat, RefreshCw, Volume2, Printer, MapPin, User, Phone
} from 'lucide-react'
import { handlePrintInvoice } from '@/lib/utils/printInvoice'
import { syncOrderStatus } from '@/lib/utils/orderSync'
import { playNotificationSound } from '@/lib/utils/notifications'

const STAGE_COLUMNS: { label: string; status: OrderStatus; color: string; activeTabColor: string; icon: any }[] = [
  { label: 'New Orders', status: 'confirmed', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400', activeTabColor: 'bg-amber-500 text-black', icon: Clock },
  { label: 'Preparing', status: 'preparing', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', activeTabColor: 'bg-blue-500 text-white', icon: ChefHat },
  { label: 'Out for Delivery', status: 'out_for_delivery', color: 'bg-purple-500/10 border-purple-500/30 text-purple-400', activeTabColor: 'bg-purple-500 text-white', icon: Flame },
  { label: 'Completed', status: 'delivered', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', activeTabColor: 'bg-emerald-500 text-white', icon: CheckCircle2 },
]

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMobileTab, setActiveMobileTab] = useState<OrderStatus>('confirmed')
  const previousOrderCountRef = useRef<number>(0)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(*), products(*))')
        .order('created_at', { ascending: false })
        .limit(50)

      let combinedOrders: Order[] = []

      if (!error && data && data.length > 0) {
        combinedOrders = data as any
      }

      // Merge with local storage fallback orders so test orders are always present
      try {
        const localOrders = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
        if (localOrders.length > 0) {
          const dbIds = new Set(combinedOrders.map((o) => o.id))
          const missingLocal = localOrders.filter((l: any) => !dbIds.has(l.id))
          combinedOrders = [...combinedOrders, ...missingLocal]
        }
      } catch {}

      // If empty, keep empty array
      setOrders(combinedOrders)
      
      // Check if new incoming orders arrived
      const newConfirmedCount = combinedOrders.filter((o) => o.status === 'confirmed' || o.status === 'pending').length
      if (previousOrderCountRef.current > 0 && newConfirmedCount > previousOrderCountRef.current) {
        playNotificationSound('alert')
      }
      previousOrderCountRef.current = newConfirmedCount

      setOrders(combinedOrders)
    } catch (err) {
      console.warn('KDS fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()

    const supabase = createClient()
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    const handleStorage = () => fetchOrders()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('orderStatusUpdated', handleStorage)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchOrders()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orderStatusUpdated', handleStorage)
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
    <div className="p-4 sm:p-6 bg-[#09090B] min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#27272A] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#B91C1C] rounded-lg flex items-center justify-center text-white">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif">Kitchen Display System (KDS)</h1>
            <p className="text-xs text-[#A8A29E]">Real-time live operational order management</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
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

      {/* Mobile Stage Toggle Bar (Visible on small screens) */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-4 mb-4 border-b border-[#27272A]">
        {STAGE_COLUMNS.map((col) => {
          const count = orders.filter((o) =>
            col.status === 'confirmed'
              ? o.status === 'confirmed' || o.status === 'pending'
              : o.status === col.status
          ).length

          const isActive = activeMobileTab === col.status
          return (
            <button
              key={col.status}
              onClick={() => setActiveMobileTab(col.status)}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? col.activeTabColor
                  : 'bg-[#18181B] text-[#A8A29E] border border-[#27272A]'
              }`}
            >
              <span>{col.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-black/20 text-current' : 'bg-[#27272A] text-white'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Columns Grid (All columns on lg screens; selected tab on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {STAGE_COLUMNS.map((col) => {
          const ColumnIcon = col.icon
          const colOrders = orders.filter((o) =>
            col.status === 'confirmed'
              ? o.status === 'confirmed' || o.status === 'pending'
              : o.status === col.status
          )

          const isVisibleOnMobile = activeMobileTab === col.status

          return (
            <div
              key={col.status}
              className={`flex flex-col rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden ${
                isVisibleOnMobile ? 'block' : 'hidden lg:flex'
              }`}
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-[#27272A] flex items-center justify-between ${col.color}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ColumnIcon size={18} />
                  <span>{col.label}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#09090B] text-white font-mono">
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
                    const minutesAgo = Math.max(1, Math.floor((Date.now() - new Date(ord.created_at).getTime()) / 60000))
                    const action = getNextAction(ord.status)
                    const addr = (ord as any).address_json || {}
                    const itemsList = ord.items || (ord as any).order_items || []

                    return (
                      <div key={ord.id} className="p-4 rounded-lg bg-[#27272A]/50 border border-[#3F3F46] hover:border-[#52525B] transition-all space-y-3">
                        {/* Ticket Header */}
                        <div className="flex items-center justify-between border-b border-[#3F3F46] pb-2">
                          <span className="font-mono font-bold text-sm text-[#F43F5E]">#{String(ord.id).slice(-6).toUpperCase()}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#A8A29E] flex items-center gap-1 font-semibold font-mono">
                              <Clock size={12} /> {minutesAgo}m ago
                            </span>
                            <button
                              onClick={() => {
                                handlePrintInvoice({
                                  id: ord.id,
                                  customer: addr.name || 'Customer',
                                  phone: addr.phone || '',
                                  address: [addr.line1, addr.city].filter(Boolean).join(', ') || 'Prayagraj',
                                  notes: ord.notes || undefined,
                                  items_detail: itemsList.map((i: any) => ({
                                    product_name: i.product?.name || i.products?.name || i.name || 'Wood-Fired Pizza',
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
                                  payment_method: addr.paymentMethod || 'cod',
                                  created_at: ord.created_at,
                                })
                              }}
                              className="p-1 text-[#A8A29E] hover:text-white transition-colors"
                              title="Print Kitchen Ticket"
                            >
                              <Printer size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="text-xs text-[#E4E4E7] space-y-0.5 pb-1 border-b border-[#3F3F46]/60">
                          <div className="flex items-center gap-1.5 font-semibold text-white">
                            <User size={13} className="text-[#A8A29E]" />
                            <span>{addr.name || 'Customer'}</span>
                            {addr.phone && (
                              <span className="text-[11px] text-[#A8A29E] font-mono ml-auto flex items-center gap-1">
                                <Phone size={10} /> {addr.phone}
                              </span>
                            )}
                          </div>
                          {addr.line1 && (
                            <div className="text-[11px] text-[#A8A29E] flex items-center gap-1 line-clamp-1">
                              <MapPin size={11} className="flex-shrink-0" />
                              <span>{[addr.line1, addr.city].filter(Boolean).join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Items List */}
                        <div className="space-y-2">
                          {itemsList.map((item: any, idx: number) => {
                            const pName = item.product?.name || item.products?.name || item.name || 'Wood-Fired Item'
                            return (
                              <div key={item.id || idx} className="text-xs">
                                <div className="flex items-center justify-between font-bold text-white">
                                  <span>{item.quantity}x {pName}</span>
                                </div>
                                {item.selected_options && (
                                  <div className="text-[11px] text-[#A8A29E] pl-2 font-mono">
                                    {typeof item.selected_options === 'object'
                                      ? Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(', ')
                                      : String(item.selected_options)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Kitchen Preparation Notes */}
                        {ord.notes && (
                          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-start gap-1">
                            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                            <span>{ord.notes}</span>
                          </div>
                        )}

                        {/* Stage Progress Action Button */}
                        {action && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, action.next)}
                            className={`w-full py-2.5 px-3 rounded-md font-bold text-xs text-white transition-all ${action.color}`}
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
