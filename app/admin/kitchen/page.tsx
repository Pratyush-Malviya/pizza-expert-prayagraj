'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types'
import {
  UtensilsCrossed, Clock, CheckCircle2, Flame,
  AlertCircle, ChefHat, RefreshCw, Volume2, Printer, MapPin, User, Phone,
  Bike, Zap, UserCheck, ArrowRight, Compass, ShieldCheck
} from 'lucide-react'
import { handlePrintInvoice } from '@/lib/utils/printInvoice'
import { syncOrderStatus } from '@/lib/utils/orderSync'
import { playNotificationSound } from '@/lib/utils/notifications'
import { autoAssignNearestAvailableDriver, fetchAvailableDrivers, reassignOrderDriver } from '@/app/actions/deliveries'
import { toast } from 'sonner'
import type { DeliveryPartner } from '@/lib/tracking/types'

const STAGE_COLUMNS: { label: string; status: OrderStatus; color: string; activeTabColor: string; icon: any }[] = [
  { label: 'New Orders', status: 'confirmed', color: 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]', activeTabColor: 'bg-[#D97706] text-white', icon: Clock },
  { label: 'In Oven (Preparing)', status: 'preparing', color: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]', activeTabColor: 'bg-[#2563EB] text-white', icon: ChefHat },
  { label: 'Out with Rider', status: 'out_for_delivery', color: 'bg-[#FAF5FF] border-[#E9D5FF] text-[#9333EA]', activeTabColor: 'bg-[#9333EA] text-white', icon: Flame },
  { label: 'Delivered / Completed', status: 'delivered', color: 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]', activeTabColor: 'bg-[#15803D] text-white', icon: CheckCircle2 },
]

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, any>>({})
  const [driversList, setDriversList] = useState<DeliveryPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMobileTab, setActiveMobileTab] = useState<OrderStatus>('confirmed')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [assignModalOrder, setAssignModalOrder] = useState<string | null>(null)
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const previousOrderCountRef = useRef<number>(0)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Fetch Orders from Database
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(*), products(*))')
        .order('created_at', { ascending: false })
        .limit(60)

      let combinedOrders: Order[] = []
      if (!error && data && data.length > 0) {
        combinedOrders = data as any
      }

      // Merge with local storage fallback orders
      try {
        const localOrders = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
        if (localOrders.length > 0) {
          const dbIds = new Set(combinedOrders.map((o) => o.id))
          const missingLocal = localOrders.filter((l: any) => !dbIds.has(l.id))
          combinedOrders = [...combinedOrders, ...missingLocal]
        }
      } catch {}

      setOrders(combinedOrders)

      // 2. Fetch Deliveries mapping (driver assignments & OTPs)
      const { data: delivData } = await supabase
        .from('deliveries')
        .select('*, driver:drivers(*)')

      const dMap: Record<string, any> = {}
      if (delivData) {
        delivData.forEach((d: any) => {
          dMap[d.order_id] = d
        })
      }
      setDeliveriesMap(dMap)

      // 3. Fetch online drivers list
      const { drivers } = await fetchAvailableDrivers()
      if (drivers) {
        setDriversList(drivers)
      }

      // Check if new incoming orders arrived
      const newConfirmedCount = combinedOrders.filter(
        (o) => o.status === 'confirmed' || o.status === 'pending'
      ).length
      if (previousOrderCountRef.current > 0 && newConfirmedCount > previousOrderCountRef.current) {
        playNotificationSound('alert')
        toast.info('🍕 New Kitchen Order Ticket Received!')
      }
      previousOrderCountRef.current = newConfirmedCount
    } catch (err) {
      console.warn('KDS fetch note:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProducts = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase.from('products').select('id, name, is_available').order('name')
      if (data) setProducts(data)
    } catch {}
  }

  const toggleProductAvailability = async (id: string, currentStatus: boolean) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_available: !currentStatus } : p))
    try {
      const supabase = createClient()
      await supabase.from('products').update({ is_available: !currentStatus }).eq('id', id)
      toast.success('Inventory stock availability updated!')
    } catch {}
  }

  useEffect(() => {
    fetchOrders()

    const supabase = createClient()
    const channel = supabase
      .channel('kitchen-kds-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        fetchOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
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
  }, [fetchOrders])

  const updateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: nextStatus } : ord))
    )

    await syncOrderStatus(orderId, nextStatus)

    // If starting preparation or food is ready, auto-assign rider if unassigned
    const delivery = deliveriesMap[orderId]
    if (!delivery?.driver_id && (nextStatus === 'preparing' || nextStatus === 'out_for_delivery')) {
      handleAutoDispatchRider(orderId, true)
    }
  }

  const handleAutoDispatchRider = async (orderId: string, silent = false) => {
    setDispatchingOrderId(orderId)
    try {
      const res = await autoAssignNearestAvailableDriver(orderId)
      if (res.success && res.driver) {
        if (!silent) {
          toast.success(`⚡ Auto-dispatched to ${res.driver.name}!`, {
            description: `${res.driver.vehicle_type} • ${res.driver.vehicle_number}`,
          })
        }
        playNotificationSound('status_change')
        await fetchOrders()
      } else if (!silent) {
        toast.error(res.error || 'Failed to auto-assign rider')
      }
    } catch (err: any) {
      if (!silent) toast.error(err.message || 'Auto-dispatch error')
    } finally {
      setDispatchingOrderId(null)
    }
  }

  const handleManualReassign = async (orderId: string, driverId: string) => {
    try {
      const res = await reassignOrderDriver(orderId, driverId)
      if (res.success) {
        toast.success(res.message || 'Driver assigned successfully!')
        setAssignModalOrder(null)
        await fetchOrders()
      } else {
        toast.error(res.error || 'Failed to assign driver')
      }
    } catch (err: any) {
      toast.error(err.message || 'Reassign error')
    }
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const handleBatchUpdate = async (nextStatus: OrderStatus) => {
    const ids = Array.from(selectedOrders)
    if (ids.length === 0) return

    setOrders((prev) => prev.map((ord) => ids.includes(ord.id) ? { ...ord, status: nextStatus } : ord))
    setSelectedOrders(new Set())

    for (const id of ids) {
      await syncOrderStatus(id, nextStatus)
    }
    toast.success(`Batch updated ${ids.length} orders to ${nextStatus}!`)
  }

  const getNextAction = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return { label: '🔥 Start Baking in Oven', next: 'preparing' as OrderStatus, color: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs' }
      case 'preparing':
        return { label: '🛵 Hand to Rider (Out for Delivery)', next: 'out_for_delivery' as OrderStatus, color: 'bg-[#9333EA] hover:bg-[#7E22CE] text-white shadow-xs' }
      case 'out_for_delivery':
        return { label: '✅ Mark Delivered', next: 'delivered' as OrderStatus, color: 'bg-[#15803D] hover:bg-[#166534] text-white shadow-xs' }
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#B91C1C] rounded-xl flex items-center justify-center text-white shadow-xs">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Kitchen Display System (KDS) & Dispatch
            </h1>
            <p className="text-xs text-[#78716C]">
              Live operational oven queues, baking timers & automatic rider handoff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
          <button
            onClick={() => { fetchProducts(); setStockModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-xl text-xs font-bold text-[#B91C1C] transition-all shadow-xs"
          >
            <UtensilsCrossed size={14} /> Stock Toggle
          </button>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F4EFEA] border border-[#E7E0D8] rounded-xl text-xs font-semibold text-[#1C1917] transition-all shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F0FDF4] border border-[#15803D]/20 text-[#15803D] rounded-xl text-xs font-bold font-mono">
            <Volume2 size={14} /> Live Sync Active
          </div>
        </div>
      </div>

      {/* Mobile Stage Toggle Bar */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E7E0D8]">
        {STAGE_COLUMNS.map((col) => {
          const count = orders.filter((o) =>
            col.status === 'confirmed'
              ? o.status === 'confirmed'
              : o.status === col.status
          ).length

          const isActive = activeMobileTab === col.status
          return (
            <button
              key={col.status}
              onClick={() => setActiveMobileTab(col.status)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? col.activeTabColor
                  : 'bg-white text-[#57534E] border border-[#E7E0D8]'
              }`}
            >
              <span>{col.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-black/20 text-white' : 'bg-[#FBF9F5] text-[#1C1917] border border-[#E7E0D8]'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {STAGE_COLUMNS.map((col) => {
          const ColumnIcon = col.icon
          const colOrders = orders.filter((o) =>
            col.status === 'confirmed'
              ? o.status === 'confirmed'
              : o.status === col.status
          )

          const isVisibleOnMobile = activeMobileTab === col.status

          return (
            <div
              key={col.status}
              className={`flex flex-col rounded-2xl bg-white border border-[#E7E0D8] overflow-hidden shadow-xs ${
                isVisibleOnMobile ? 'block' : 'hidden lg:flex'
              }`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b border-[#E7E0D8] flex items-center justify-between ${col.color}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ColumnIcon size={18} />
                  <span>{col.label}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#1C1917] border border-[#E7E0D8] font-mono shadow-2xs">
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-230px)] bg-[#FBF9F5]/40">
                {colOrders.length === 0 ? (
                  <div className="text-center py-12 text-[#A8A29E] text-xs font-medium">
                    No tickets in this stage
                  </div>
                ) : (
                  colOrders.map((ord) => {
                    const minutesAgo = Math.max(1, Math.floor((Date.now() - new Date(ord.created_at).getTime()) / 60000))
                    const action = getNextAction(ord.status)
                    const addr = (ord as any).address_json || {}
                    const itemsList = ord.items || (ord as any).order_items || []
                    const delivery = deliveriesMap[ord.id]
                    const driverName = addr.driverName || delivery?.driver?.name || (delivery?.driver_id ? 'Assigned Rider' : null)
                    const driverPhone = addr.driverPhone || delivery?.driver?.phone || ''
                    const driverVehicle = addr.driverVehicle || delivery?.driver?.vehicle_type || 'Bike'
                    const otpCode = addr.deliveryOtp || delivery?.otp_code || null
                    const isDispatching = dispatchingOrderId === ord.id

                    return (
                      <div
                        key={ord.id}
                        className={`p-4 rounded-2xl bg-white border transition-all space-y-3 shadow-xs ${
                          selectedOrders.has(ord.id)
                            ? 'border-[#B91C1C] ring-2 ring-[#B91C1C]/20'
                            : 'border-[#E7E0D8] hover:border-[#B91C1C]/40'
                        }`}
                      >
                        {/* Ticket Header */}
                        <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-2.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(ord.id)}
                              onChange={() => toggleOrderSelection(ord.id)}
                              className="w-4 h-4 rounded border-[#D6D3D1] text-[#B91C1C] focus:ring-[#B91C1C]"
                            />
                            <span className="font-mono font-bold text-sm text-[#B91C1C]">
                              #{String(ord.id).slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              minutesAgo > 25
                                ? 'bg-rose-100 text-rose-700 animate-pulse'
                                : minutesAgo > 15
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-[#F4EFEA] text-[#78716C]'
                            }`}>
                              <Clock size={11} /> {minutesAgo}m
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
                              className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F4EFEA] transition-colors"
                              title="Print Kitchen KOT Ticket"
                            >
                              <Printer size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="text-xs text-[#1C1917] space-y-1 pb-2 border-b border-[#E7E0D8]/60">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              <User size={13} className="text-[#A8A29E]" />
                              {addr.name || 'Customer'}
                            </span>
                            {addr.phone && (
                              <a
                                href={`tel:${addr.phone}`}
                                className="text-[11px] text-emerald-700 hover:underline font-mono flex items-center gap-1"
                              >
                                <Phone size={10} /> {addr.phone}
                              </a>
                            )}
                          </div>
                          {addr.line1 && (
                            <div className="text-[11px] text-[#78716C] flex items-center gap-1 line-clamp-1">
                              <MapPin size={11} className="flex-shrink-0 text-[#B91C1C]" />
                              <span>{[addr.line1, addr.city].filter(Boolean).join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Delivery Partner Linkage Bar */}
                        <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-2 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider flex items-center gap-1">
                              <Bike size={12} className="text-[#B91C1C]" /> Delivery Partner
                            </span>
                            {otpCode && (
                              <span className="text-[10px] font-mono font-bold text-[#B91C1C] bg-[#FEF2F2] px-1.5 py-0.5 rounded border border-[#FECACA]">
                                OTP: {otpCode}
                              </span>
                            )}
                          </div>

                          {driverName ? (
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <span className="font-bold text-[#1C1917] block text-[11px]">
                                  {driverName}
                                </span>
                                <span className="text-[10px] text-[#78716C] font-mono">
                                  {driverVehicle} {driverPhone ? `• ${driverPhone}` : ''}
                                </span>
                              </div>

                              <button
                                onClick={() => setAssignModalOrder(ord.id)}
                                className="text-[10px] font-bold text-[#2563EB] hover:underline whitespace-nowrap"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                                <AlertCircle size={12} /> Unassigned
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  disabled={isDispatching}
                                  onClick={() => handleAutoDispatchRider(ord.id)}
                                  className="px-2 py-1 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                >
                                  <Zap size={10} />
                                  <span>{isDispatching ? 'Assigning...' : 'Auto-Assign'}</span>
                                </button>
                                <button
                                  onClick={() => setAssignModalOrder(ord.id)}
                                  className="px-2 py-1 bg-white hover:bg-[#F4EFEA] border border-[#E7E0D8] text-[#1C1917] rounded-lg text-[10px] font-semibold"
                                >
                                  Manual
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Items List */}
                        <div className="space-y-1.5 pt-1">
                          {itemsList.map((item: any, idx: number) => {
                            const pName = item.product?.name || item.products?.name || item.name || 'Wood-Fired Item'
                            return (
                              <div key={item.id || idx} className="text-xs">
                                <div className="flex items-center justify-between font-bold text-[#1C1917]">
                                  <span>{item.quantity}x {pName}</span>
                                </div>
                                {item.selected_options && (
                                  <div className="text-[11px] text-[#78716C] pl-2 font-mono">
                                    {typeof item.selected_options === 'object'
                                      ? Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(', ')
                                      : String(item.selected_options)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Kitchen Notes */}
                        {ord.notes && (
                          <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] text-[11px] font-medium flex items-start gap-1">
                            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                            <span>{ord.notes}</span>
                          </div>
                        )}

                        {/* Stage Progress Action Button */}
                        {action && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, action.next)}
                            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${action.color}`}
                          >
                            <span>{action.label}</span>
                            <ArrowRight size={13} />
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

      {/* Sticky Batch Action Bar */}
      {selectedOrders.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1917] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 border border-[#3F3F46]">
          <div className="font-bold text-sm">
            {selectedOrders.size} {selectedOrders.size === 1 ? 'Ticket' : 'Tickets'} Selected
          </div>
          <div className="flex items-center gap-2 border-l border-[#3F3F46] pl-6">
            <button
              onClick={() => handleBatchUpdate('preparing')}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl text-xs font-bold transition-colors"
            >
              Batch Prepare
            </button>
            <button
              onClick={() => handleBatchUpdate('out_for_delivery')}
              className="px-4 py-2 bg-[#9333EA] hover:bg-[#7E22CE] rounded-xl text-xs font-bold transition-colors"
            >
              Batch Dispatch
            </button>
            <button
              onClick={() => handleBatchUpdate('delivered')}
              className="px-4 py-2 bg-[#15803D] hover:bg-[#166534] rounded-xl text-xs font-bold transition-colors"
            >
              Batch Deliver
            </button>
          </div>
        </div>
      )}

      {/* Manual Driver Assign Modal */}
      {assignModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1C1917]">Assign Delivery Partner</h3>
                <p className="text-xs text-[#78716C]">Order #{assignModalOrder.slice(-6).toUpperCase()}</p>
              </div>
              <button
                onClick={() => setAssignModalOrder(null)}
                className="text-[#A8A29E] hover:text-[#1C1917] font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {driversList.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#78716C]">
                  No registered drivers found in the system.
                </div>
              ) : (
                driversList.map((drv) => (
                  <div
                    key={drv.id}
                    className="p-3 rounded-2xl border border-[#E7E0D8] hover:border-[#B91C1C] flex items-center justify-between gap-3 transition-colors bg-[#FBF9F5]"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#1C1917] flex items-center gap-1.5">
                        <UserCheck size={13} className="text-[#B91C1C]" />
                        <span>{drv.name}</span>
                        {drv.is_busy && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-mono">
                            Busy
                          </span>
                        )}
                        {!drv.is_online && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded font-mono">
                            Offline
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#78716C] font-mono">
                        {drv.vehicle_type} • {drv.vehicle_number || drv.phone}
                      </div>
                    </div>

                    <button
                      onClick={() => handleManualReassign(assignModalOrder, drv.id)}
                      className="btn btn-primary text-xs px-3 py-1.5 rounded-xl shadow-xs"
                    >
                      Assign
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setAssignModalOrder(null)}
                className="btn btn-outline text-xs px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Toggle Modal */}
      {stockModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1C1917]">Kitchen In-Shift Stock Control</h3>
                <p className="text-xs text-[#78716C]">Disable sold-out pizzas/items instantly to stop menu orders</p>
              </div>
              <button onClick={() => setStockModalOpen(false)} className="text-[#A8A29E] hover:text-[#1C1917] font-bold text-sm">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#E7E0D8] pr-1">
              {products.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1C1917]">{p.name}</span>
                  <button
                    onClick={() => toggleProductAvailability(p.id, p.is_available)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      p.is_available
                        ? 'bg-[#F0FDF4] text-[#15803D] border border-[#15803D]/30'
                        : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]/30'
                    }`}
                  >
                    {p.is_available ? 'Available' : 'Sold Out'}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStockModalOpen(false)}
              className="btn btn-primary text-xs w-full py-2.5 mt-2 rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
