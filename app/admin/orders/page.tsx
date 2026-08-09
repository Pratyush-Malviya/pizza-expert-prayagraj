'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import { Search, Printer, Trash2, Eye, X, User, Phone, MapPin, CreditCard, Clock, FileText, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { handlePrintInvoice } from '@/lib/utils/printInvoice'

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
}

const MOCK_INITIAL_ORDERS: AdminOrder[] = [
  {
    id: 'ORD-982143',
    customer: 'Rahul Sharma',
    phone: '+91 98765 43210',
    email: 'rahul.sharma@example.com',
    address: 'Flat 302, Green Valley Apartments, Allapur, Prayagraj',
    pincode: '211006',
    notes: 'Please ring bell twice and call on arrival',
    items_summary: '2x Margherita Pizza, 1x Coke',
    items_detail: [
      { id: '1', product_name: 'Margherita Pizza', quantity: 2, unit_price: 249, selected_options: [{ optionName: 'Size', choice: 'Medium' }] },
      { id: '2', product_name: 'Coke 500ml', quantity: 1, unit_price: 60, selected_options: [] },
    ],
    subtotal: 558,
    tax: 28,
    delivery_fee: 0,
    discount: 0,
    total: 586,
    status: 'preparing',
    payment_method: 'razorpay',
    time: '10 mins ago',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'ORD-982142',
    customer: 'Priya Singh',
    phone: '+91 98765 43211',
    email: 'priya.s@example.com',
    address: '14/B Civil Lines, Near Subhash Chouraha, Prayagraj',
    pincode: '211001',
    notes: 'Leave at security gate',
    items_summary: '1x Paneer Tikka Pizza',
    items_detail: [
      { id: '3', product_name: 'Paneer Tikka Pizza', quantity: 1, unit_price: 349, selected_options: [{ optionName: 'Size', choice: 'Large' }] },
    ],
    subtotal: 349,
    tax: 17,
    delivery_fee: 30,
    discount: 0,
    total: 396,
    status: 'out_for_delivery',
    payment_method: 'cashfree',
    time: '22 mins ago',
    created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    id: 'ORD-982141',
    customer: 'Amit Verma',
    phone: '+91 98765 43212',
    email: 'amit.verma@example.com',
    address: '45 Katra Main Market, Opposite University Gate, Prayagraj',
    pincode: '211002',
    items_summary: '1x Family Feast Combo',
    items_detail: [
      { id: '4', product_name: 'Family Feast Combo', quantity: 1, unit_price: 899, selected_options: [] },
    ],
    subtotal: 899,
    tax: 45,
    delivery_fee: 0,
    discount: 100,
    total: 844,
    status: 'delivered',
    payment_method: 'cod',
    time: '45 mins ago',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>(MOCK_INITIAL_ORDERS)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch real orders from Supabase on mount
  useEffect(() => {
    async function fetchOrders() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, products(name))')
          .order('created_at', { ascending: false })

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
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )

    try {
      const supabase = createClient()
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    } catch {
      // Ignore if offline
    }

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

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      return (
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.phone.includes(q)
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
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
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
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#FBF9F5] transition-colors">
                    <td className="py-3.5 pl-5 font-mono font-bold text-[#1C1917]">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-[#B91C1C] hover:underline flex items-center gap-1 text-left"
                      >
                        {order.id.length > 12 ? `${order.id.slice(0, 10)}...` : order.id}
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
                        className="text-xs font-semibold rounded-md px-2.5 py-1 bg-[#F4EFEA] border border-[#E7E0D8] text-[#1C1917]"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
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
                ))
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
              <button
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-xs flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Delete Order
              </button>

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
