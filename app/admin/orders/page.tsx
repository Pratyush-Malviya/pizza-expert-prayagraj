'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { formatPrice } from '@/lib/utils'
import {
  Search, Printer, Trash2, Eye, X, User, Phone, MapPin,
  CreditCard, Clock, FileText, CheckCircle2, Bike, Compass,
  UserCheck, Zap, Sparkles, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useStoreStore } from '@/lib/store/useStoreStore'
import { handlePrintInvoice } from '@/lib/utils/printInvoice'
import { syncOrderStatus } from '@/lib/utils/orderSync'
import {
  autoAssignNearestAvailableDriver,
  assignOrderToDriver,
  fetchAvailableDrivers
} from '@/app/actions/deliveries'
import { STORE_LOCATION } from '@/lib/tracking/types'
import { playNotificationSound, requestNotificationPermission, triggerSystemNotification } from '@/lib/utils/notifications'

const LiveDeliveryMap = dynamic(() => import('@/components/tracking/LiveDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[220px] rounded-xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-center text-xs font-mono text-[#78716C]">
      Loading delivery GPS map...
    </div>
  ),
})

export interface OrderItemDetail {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  selected_options?: any
}

export interface AdminOrder {
  id: string
  customer: string
  phone: string
  email?: string
  address: string
  pincode?: string
  notes?: string
  items_summary: string
  items_detail?: OrderItemDetail[]
  subtotal: number
  tax: number
  delivery_fee: number
  discount: number
  total: number
  status: string
  payment_method: string
  time: string
  created_at: string
  driver_name?: string
  driver_phone?: string
  driver_vehicle?: string
}

export default function AdminOrdersPage() {
  const { activeStoreId } = useStoreStore()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refunding, setRefunding] = useState(false)
  const [notificationsGranted, setNotificationsGranted] = useState(false)
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([])
  const [isAssigning, setIsAssigning] = useState(false)

  // Load available drivers on mount
  useEffect(() => {
    fetchAvailableDrivers().then((res) => {
      if (res.success && res.drivers) {
        setAvailableDrivers(res.drivers)
      }
    })
  }, [])

  const handleAutoAssign = async (orderId: string) => {
    setIsAssigning(true)
    const res = await autoAssignNearestAvailableDriver(orderId)
    setIsAssigning(false)

    if (res.success && res.driver) {
      playNotificationSound('status_change')
      toast.success(`⚡ ${res.message || `Assigned to ${res.driver.name}`}`)
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: 'out_for_delivery',
        driver_name: res.driver!.name,
        driver_phone: res.driver!.phone,
        driver_vehicle: `${res.driver!.vehicle_type} (${res.driver!.vehicle_number})`
      } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? {
          ...prev,
          status: 'out_for_delivery',
          driver_name: res.driver!.name,
          driver_phone: res.driver!.phone,
          driver_vehicle: `${res.driver!.vehicle_type} (${res.driver!.vehicle_number})`
        } : null)
      }
    } else {
      toast.error(res.error || 'Failed to auto-assign driver')
    }
  }

  const handleManualAssign = async (orderId: string, driverId: string) => {
    if (!driverId) return
    setIsAssigning(true)
    const res = await assignOrderToDriver(orderId, driverId)
    setIsAssigning(false)

    if (res.success && res.driver) {
      playNotificationSound('status_change')
      toast.success(`Assigned to ${res.driver.name}`)
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: 'out_for_delivery',
        driver_name: res.driver!.name,
        driver_phone: res.driver!.phone,
        driver_vehicle: `${res.driver!.vehicle_type} (${res.driver!.vehicle_number})`
      } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? {
          ...prev,
          status: 'out_for_delivery',
          driver_name: res.driver!.name,
          driver_phone: res.driver!.phone,
          driver_vehicle: `${res.driver!.vehicle_type} (${res.driver!.vehicle_number})`
        } : null)
      }
    } else {
      toast.error(res.error || 'Failed to assign driver')
    }
  }

  // Fetch real orders from Supabase & Subscribe to Realtime INSERT events
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsGranted(Notification.permission === 'granted')
    }

    const supabase = createClient()

    async function fetchOrders() {
      try {
        let query = supabase
          .from('orders')
          .select('*, order_items(*, products(name))')
          .order('created_at', { ascending: false })

        if (activeStoreId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeStoreId)) {
          query = query.eq('store_id', activeStoreId)
        }

        const { data, error } = await query

        if (!error && data && data.length > 0) {
          const mappedOrders: AdminOrder[] = data.map((o: any) => {
            const addr = o.address_json || {}
            const itemsList = o.order_items || []
            const summaryStr = itemsList
              .map((i: any) => `${i.quantity}x ${i.products?.name || 'Item'}`)
              .join(', ') || 'Custom Order'

            return {
              id: o.id,
              customer: addr.name || 'Guest Customer',
              phone: addr.phone || 'N/A',
              email: addr.email || '',
              address: [addr.line1, addr.line2, addr.city].filter(Boolean).join(', ') || 'Prayagraj',
              pincode: addr.pincode || '',
              notes: o.notes || '',
              items_summary: summaryStr,
              items_detail: itemsList.map((i: any) => ({
                id: i.id,
                product_name: i.products?.name || 'Item',
                quantity: i.quantity,
                unit_price: i.unit_price,
                selected_options: i.selected_options,
              })),
              subtotal: Number(o.subtotal) || 0,
              tax: Number(o.tax) || 0,
              delivery_fee: Number(o.delivery_fee) || 0,
              discount: Number(o.discount) || 0,
              total: Number(o.total) || 0,
              status: o.status,
              payment_method: addr.paymentMethod || 'razorpay',
              time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              created_at: o.created_at,
            }
          })
          setOrders(mappedOrders)
        }
      } catch {
        // keep mock fallback
      }
    }

    fetchOrders()

    // Realtime Postgres listener for new incoming orders
    const channel = supabase
      .channel('admin-orders-live-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as any
        const addr = newOrder.address_json || {}
        
        playNotificationSound('alert')

        toast.success(`🚨 NEW ORDER RECEIVED! #${newOrder.id.slice(0, 8)}`, {
          description: `Customer: ${addr.name || 'Customer'} • Total: ₹${newOrder.total}`,
          duration: 10000,
        })

        triggerSystemNotification('🚨 NEW ORDER RECEIVED! Pizza Expert', {
          body: `Order #${newOrder.id.slice(0, 8)} - ₹${newOrder.total} from ${addr.name || 'Customer'} (${addr.phone || ''})`,
        })

        fetchOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeStoreId])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )

    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null))
    }

    // Universal sync helper for Supabase + local storage + tracking events
    await syncOrderStatus(orderId, newStatus)

    toast.success(`Updated order ${orderId} status to ${newStatus}`)
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Are you sure you want to delete order ${orderId}? This cannot be undone.`)) {
      return
    }

    setDeletingId(orderId)
    setOrders((prev) => prev.filter((o) => o.id !== orderId))

    try {
      const supabase = createClient()
      const { error } = await supabase.from('orders').delete().eq('id', orderId)
      if (error) {
        console.warn('Supabase delete warning:', error.message)
      }
    } catch {
      // state updated
    } finally {
      setDeletingId(null)
      toast.success(`Order ${orderId} deleted successfully`)
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null)
      }
    }
  }

  const handleRefund = async (orderId: string) => {
    if (!confirm(`Are you sure you want to refund order ${orderId}? This cannot be undone.`)) return
    
    setRefunding(true)
    try {
      const res = await fetch('/api/refunds/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reason: 'Admin requested refund' })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refund failed')

      toast.success('Refund processed successfully!')
      handleStatusChange(orderId, 'refunded')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRefunding(false)
    }
  }

  // Postel's Law: Robust, forgiving search filtering
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim()
      // Strip common prefixes (#, ord, ord-) and punctuation
      const cleanQ = q.replace(/^[#]/, '').replace(/^ord[-_]?/i, '').replace(/[\s-_]/g, '')
      const cleanId = (o.id || '').toLowerCase().replace(/^[#]/, '').replace(/^ord[-_]?/i, '').replace(/[\s-_]/g, '')
      const cleanPhone = (o.phone || '').replace(/[\s-+()]/g, '')
      const cleanCustomer = (o.customer || '').toLowerCase()
      const cleanAddress = (o.address || '').toLowerCase()
      const cleanItems = (o.items_summary || '').toLowerCase()

      return (
        cleanId.includes(cleanQ) ||
        cleanPhone.includes(cleanQ) ||
        cleanCustomer.includes(q) ||
        cleanAddress.includes(q) ||
        cleanItems.includes(q) ||
        o.id.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1C1917]">
            Orders Management
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            View, track, inspect details, update status, and manage received orders.
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
            const granted = await requestNotificationPermission()
            setNotificationsGranted(granted)
            if (granted) {
              toast.success('🔔 Desktop & sound notifications enabled!')
              playNotificationSound('alert')
            } else {
              toast.info('Browser notification permission is blocked in site settings.')
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs border ${
            notificationsGranted
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-[#FF3B00] border-red-600 text-white hover:bg-red-700 animate-pulse'
          }`}
        >
          <span>{notificationsGranted ? '🔔 Sound & Desktop Alerts Active' : '🔔 Enable Sound & Desktop Alerts'}</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-4 border border-[#E7E0D8] shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, customer name or phone..."
            className="input-field pl-10 pr-3 py-2 text-xs sm:text-sm bg-[#FBF9F5]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field py-2 px-3 text-xs sm:text-sm bg-[#FBF9F5] w-auto font-semibold"
        >
          <option value="all">All Statuses ({orders.length})</option>
          <option value="cod_pending">⚠️ COD Pending ({orders.filter(o => o.status === 'cod_pending').length})</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-[10px] text-[#A8A29E] font-bold uppercase bg-[#FBF9F5] border-b border-[#E7E0D8]">
                <th className="py-3 pl-5">Order ID</th>
                <th className="py-3">Customer & Phone</th>
                <th className="py-3">Delivery Address</th>
                <th className="py-3">Items Purchased</th>
                <th className="py-3">Total</th>
                <th className="py-3">Update Status</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8]/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A8A29E] text-xs">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isUrgent = order.status === 'cod_pending' || order.status === 'pending'
                  return (
                  <tr
                    key={order.id}
                    className={`transition-colors ${
                      isUrgent
                        ? 'bg-[#FFFBEB]/70 hover:bg-[#FEF3C7]/80 border-l-4 border-l-[#D97706]'
                        : 'hover:bg-[#FBF9F5]'
                    }`}
                  >
                    <td className="py-3.5 pl-5 font-mono font-bold text-[#1C1917]">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-[#B91C1C] hover:underline flex items-center gap-1.5 text-left"
                      >
                        {isUrgent && <span className="w-2 h-2 rounded-full bg-[#D97706] animate-ping shrink-0" />}
                        <span>{order.id.length > 12 ? `${order.id.slice(0, 10)}...` : order.id}</span>
                      </button>
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-[#1C1917]">{order.customer}</p>
                      <p className="text-xs text-[#A8A29E]">{order.phone}</p>
                    </td>
                    <td className="py-3.5 text-xs text-[#57534E] max-w-xs truncate">{order.address}</td>
                    <td className="py-3.5 text-xs text-[#57534E] max-w-xs truncate">{order.items_summary}</td>
                    <td className="py-3.5 font-mono font-bold text-[#B91C1C]">{formatPrice(order.total)}</td>
                    <td className="py-3.5">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`text-xs font-semibold rounded-md px-2.5 py-1 border text-[#1C1917] ${
                          order.status === 'cod_pending'
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'bg-[#F4EFEA] border-[#E7E0D8]'
                        }`}
                      >
                        <option value="cod_pending">⚠️ COD Pending</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </td>
                    <td className="py-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-[#57534E] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors"
                          title="View Order Details & Customer Info"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handlePrintInvoice(order)}
                          className="p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-gray-100 rounded-md transition-colors"
                          title="Print Invoice"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          disabled={deletingId === order.id}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E7E0D8] shadow-2xl p-6 sm:p-8 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#A8A29E] font-bold">
                  Order Details Inspection
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] flex items-center gap-2">
                  <span>{selectedOrder.id}</span>
                  <span className="text-xs font-sans uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#57534E] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Customer Information Card */}
            <div className="bg-[#FBF9F5] rounded-xl p-5 border border-[#E7E0D8] space-y-3">
              <h3 className="font-serif font-bold text-[#1C1917] text-sm flex items-center gap-2 border-b border-[#E7E0D8] pb-2">
                <User size={16} className="text-[#B91C1C]" /> Customer Profile & Delivery Contact
              </h3>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#A8A29E] block text-[10px] uppercase font-bold">Customer Name</span>
                  <span className="font-semibold text-[#1C1917] text-sm">{selectedOrder.customer}</span>
                </div>

                <div>
                  <span className="text-[#A8A29E] block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="font-mono font-semibold text-[#1C1917] flex items-center gap-1">
                    <Phone size={12} className="text-emerald-600" /> {selectedOrder.phone}
                  </span>
                </div>

                {selectedOrder.email && (
                  <div className="sm:col-span-2">
                    <span className="text-[#A8A29E] block text-[10px] uppercase font-bold">Email Address</span>
                    <span className="font-semibold text-[#57534E]">{selectedOrder.email}</span>
                  </div>
                )}

                <div className="sm:col-span-2 pt-1">
                  <span className="text-[#A8A29E] block text-[10px] uppercase font-bold">Full Delivery Address</span>
                  <span className="font-semibold text-[#1C1917] flex items-start gap-1.5 mt-0.5">
                    <MapPin size={14} className="text-[#B91C1C] shrink-0 mt-0.5" />
                    <span>{selectedOrder.address} {selectedOrder.pincode ? `(Pincode: ${selectedOrder.pincode})` : ''}</span>
                  </span>
                </div>

                {selectedOrder.notes && (
                  <div className="sm:col-span-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900 mt-1">
                    <span className="font-bold block text-[10px] uppercase">Delivery Notes</span>
                    <span>{selectedOrder.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Partner Assignment & Live GPS Route */}
            <div className="bg-[#FBF9F5] rounded-xl p-5 border border-[#E7E0D8] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#E7E0D8] pb-3">
                <h3 className="font-serif font-bold text-[#1C1917] text-sm flex items-center gap-2">
                  <Bike size={16} className="text-[#B91C1C]" /> Delivery Partner Assignment
                </h3>

                <div className="flex items-center gap-2">
                  {selectedOrder.driver_name ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <UserCheck size={14} /> Assigned: {selectedOrder.driver_name}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <AlertCircle size={14} /> Rider Unassigned
                    </span>
                  )}
                </div>
              </div>

              {/* Assignment Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* 1-Click Auto Assign Nearest Driver */}
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={() => handleAutoAssign(selectedOrder.id)}
                  className="w-full bg-[#1C1917] hover:bg-black text-amber-400 p-3 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95 border border-amber-400/30"
                >
                  <Zap size={15} className="text-amber-400 fill-amber-400 animate-pulse" />
                  <span>{isAssigning ? 'Scanning Fleet...' : '⚡ Auto-Assign Best Available Rider'}</span>
                </button>

                {/* Manual Pick Dropdown */}
                <div className="flex gap-2">
                  <select
                    disabled={isAssigning}
                    defaultValue=""
                    onChange={(e) => handleManualAssign(selectedOrder.id, e.target.value)}
                    className="input-field py-2.5 px-3 text-xs bg-white flex-1"
                  >
                    <option value="" disabled>Or Pick Idle Rider Manually...</option>
                    {availableDrivers.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.vehicle_type || 'Bike'} • {d.vehicle_number || 'Idle'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Interactive Delivery Map */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-[#78716C] mb-2 font-mono">
                  <span>📍 GPS Delivery Route: Allapur Kitchen ➔ Customer</span>
                  <Link
                    href={`/track?orderId=${selectedOrder.id}`}
                    target="_blank"
                    className="text-[#B91C1C] font-bold flex items-center gap-1 hover:underline"
                  >
                    <Compass size={13} /> Fullscreen Tracking
                  </Link>
                </div>
                <div className="rounded-xl overflow-hidden shadow-xs border border-[#E7E0D8]">
                  <LiveDeliveryMap
                    driverLocation={selectedOrder.status === 'out_for_delivery' ? { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng, updatedAt: Date.now() } : null}
                    destinationLocation={undefined}
                    destinationAddress={selectedOrder.address}
                    driverName={selectedOrder.driver_name || 'Delivery Partner'}
                    status={selectedOrder.status}
                    etaMinutes={selectedOrder.status === 'out_for_delivery' ? 12 : 0}
                    distanceKm={selectedOrder.status === 'out_for_delivery' ? 2.4 : 0}
                  />
                </div>
              </div>
            </div>

            {/* Order Items Breakdown */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-[#1C1917] text-sm flex items-center gap-2">
                <FileText size={16} className="text-[#B91C1C]" /> Items Purchased ({selectedOrder.items_detail?.length || 1})
              </h3>

              <div className="border border-[#E7E0D8] rounded-xl overflow-hidden divide-y divide-[#E7E0D8]">
                {selectedOrder.items_detail && selectedOrder.items_detail.length > 0 ? (
                  selectedOrder.items_detail.map((item) => (
                    <div key={item.id} className="p-3.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-[#1C1917] text-sm">{item.quantity}x {item.product_name}</span>
                        {item.selected_options && Array.isArray(item.selected_options) && item.selected_options.length > 0 && (
                          <div className="text-[11px] text-[#A8A29E] mt-0.5 space-x-1">
                            {item.selected_options.map((o: any, idx: number) => (
                              <span key={idx} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                                {o.optionName || 'Choice'}: {o.choice || o}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#1C1917] text-sm">
                          {formatPrice(item.unit_price * item.quantity)}
                        </span>
                        <span className="block text-[10px] text-[#A8A29E]">
                          {formatPrice(item.unit_price)} each
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-xs text-[#57534E] font-medium">
                    {selectedOrder.items_summary}
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Financial Breakdown */}
            <div className="grid sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2 text-xs">
                <span className="text-[#A8A29E] block text-[10px] uppercase font-bold">Payment Method</span>
                <div className="flex items-center gap-2 bg-[#F4EFEA] px-3 py-2 rounded-lg font-bold text-[#1C1917] uppercase font-mono border border-[#E7E0D8]">
                  <CreditCard size={16} className="text-[#B91C1C]" />
                  <span>{selectedOrder.payment_method}</span>
                </div>
              </div>

              <div className="bg-[#FBF9F5] p-4 rounded-xl border border-[#E7E0D8] space-y-2 text-xs">
                <div className="flex justify-between text-[#57534E]">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold">{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#57534E]">
                  <span>GST Tax (5%)</span>
                  <span className="font-mono font-semibold">{formatPrice(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between text-[#57534E]">
                  <span>Delivery Fee</span>
                  <span className="font-mono font-semibold">{formatPrice(selectedOrder.delivery_fee)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount</span>
                    <span className="font-mono">-{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#E7E0D8] flex justify-between items-center text-sm font-bold">
                  <span className="text-[#1C1917]">Total Amount</span>
                  <span className="font-mono text-[#B91C1C] text-base">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="pt-4 border-t border-[#E7E0D8] flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-xs flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Delete
                </button>
                {selectedOrder.status === 'cancelled' && selectedOrder.payment_method !== 'cod' && (
                  <button
                    onClick={() => handleRefund(selectedOrder.id)}
                    disabled={refunding}
                    className="btn btn-secondary text-amber-700 border-amber-200 hover:bg-amber-50 text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {refunding ? 'Refunding...' : 'Initiate Refund'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePrintInvoice(selectedOrder)}
                  className="btn btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Printer size={14} /> Print Invoice
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="btn btn-primary text-xs px-5"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
