'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { Search, Printer } from 'lucide-react'
import { toast } from 'sonner'

const INITIAL_ORDERS = [
  { id: 'ORD-982143', customer: 'Rahul Sharma', phone: '+91 98765 43210', address: 'Allapur, Prayagraj', items: '2x Margherita, 1x Coke', total: 558, status: 'preparing', time: '10 mins ago' },
  { id: 'ORD-982142', customer: 'Priya Singh', phone: '+91 98765 43211', address: 'Civil Lines, Prayagraj', items: '1x Paneer Tikka Pizza', total: 349, status: 'out_for_delivery', time: '22 mins ago' },
  { id: 'ORD-982141', customer: 'Amit Verma', phone: '+91 98765 43212', address: 'Katra, Prayagraj', items: '1x Family Feast Combo', total: 899, status: 'delivered', time: '45 mins ago' },
  { id: 'ORD-982140', customer: 'Sneha Gupta', phone: '+91 98765 43213', address: 'Tagoretown, Prayagraj', items: '1x Zinger Burger, Fries', total: 298, status: 'delivered', time: '1 hour ago' },
  { id: 'ORD-982139', customer: 'Vikas Pandey', phone: '+91 98765 43214', address: 'Ashok Nagar, Prayagraj', items: '1x Chicken Supreme Pizza', total: 399, status: 'pending', time: '2 mins ago' },
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )
    toast.success(`Updated order ${orderId} status to ${newStatus}`)
  }

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      return o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.phone.includes(q)
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
            View, track, and update real-time customer order statuses.
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
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
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
                <th className="py-3">Items</th>
                <th className="py-3">Total</th>
                <th className="py-3">Update Status</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8]/60">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[#FBF9F5] transition-colors">
                  <td className="py-3.5 pl-5 font-mono font-bold text-[#1C1917]">{order.id}</td>
                  <td className="py-3.5">
                    <p className="font-semibold text-[#1C1917]">{order.customer}</p>
                    <p className="text-xs text-[#A8A29E]">{order.phone}</p>
                  </td>
                  <td className="py-3.5 text-xs text-[#57534E] max-w-xs">{order.address}</td>
                  <td className="py-3.5 text-xs text-[#57534E]">{order.items}</td>
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
                    <button
                      onClick={() => toast.info(`Printing invoice for ${order.id}...`)}
                      className="p-1.5 text-[#57534E] hover:text-[#1C1917] transition-colors"
                      title="Print Invoice"
                    >
                      <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
