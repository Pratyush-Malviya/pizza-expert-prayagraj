'use client'

import { formatPrice } from '@/lib/utils'
import { DollarSign, ShoppingBag, Pizza, Star, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const STATS = [
  { label: "Today's Revenue", value: '₹14,250', change: '+18%', icon: DollarSign, color: '#B91C1C', bg: '#FEF2F2' },
  { label: 'Total Orders', value: '48', change: '+12%', icon: ShoppingBag, color: '#15803D', bg: '#F0FDF4' },
  { label: 'Active Menu Items', value: '24', change: 'Stable', icon: Pizza, color: '#18181B', bg: '#F4EFEA' },
  { label: 'Avg Rating', value: '4.9★', change: '500+ reviews', icon: Star, color: '#D97706', bg: '#FFFBEB' },
]

const RECENT_ORDERS = [
  { id: 'ORD-982143', customer: 'Rahul Sharma', items: '2x Margherita, 1x Coke', total: 558, status: 'preparing', statusLabel: 'Preparing', time: '5 mins ago' },
  { id: 'ORD-982142', customer: 'Priya Singh', items: '1x Paneer Tikka Pizza', total: 349, status: 'out_for_delivery', statusLabel: 'Out for Delivery', time: '18 mins ago' },
  { id: 'ORD-982141', customer: 'Amit Verma', items: '1x Family Feast Combo', total: 899, status: 'delivered', statusLabel: 'Delivered', time: '42 mins ago' },
  { id: 'ORD-982140', customer: 'Sneha Gupta', items: '1x Zinger Burger, Fries', total: 298, status: 'delivered', statusLabel: 'Delivered', time: '1 hour ago' },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1C1917]">
          Dashboard Overview
        </h1>
        <p className="text-[#57534E] text-xs sm:text-sm">
          Welcome back! Real-time operations status for Pizza Expert Prayagraj.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: stat.bg }}>
                  <Icon size={20} style={{ color: stat.color }} />
                </div>
                <span className="text-xs font-semibold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded-md flex items-center gap-1">
                  <TrendingUp size={11} /> {stat.change}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider block">
                  {stat.label}
                </span>
                <span className="font-bold text-2xl text-[#1C1917] font-mono">
                  {stat.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Live Orders Table */}
      <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-4">
          <div>
            <h2 className="font-serif font-bold text-lg text-[#1C1917]">
              Recent Incoming Orders
            </h2>
            <p className="text-[#A8A29E] text-xs">Real-time order queue from website & WhatsApp</p>
          </div>
          <Link href="/admin/orders" className="btn btn-outline btn-sm text-xs">
            View All Orders →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-[10px] text-[#A8A29E] font-bold uppercase border-b border-[#E7E0D8]">
                <th className="pb-3 pl-2">Order ID</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Items</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8]/60">
              {RECENT_ORDERS.map((order) => (
                <tr key={order.id} className="hover:bg-[#FBF9F5] transition-colors">
                  <td className="py-3 pl-2 font-mono font-bold text-[#1C1917]">{order.id}</td>
                  <td className="py-3 text-[#1C1917] font-semibold">{order.customer}</td>
                  <td className="py-3 text-[#57534E] text-xs">{order.items}</td>
                  <td className="py-3 font-mono font-bold text-[#B91C1C]">{formatPrice(order.total)}</td>
                  <td className="py-3">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FBF9F5] text-[#1C1917] border border-[#E7E0D8]">
                      {order.statusLabel}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2 text-xs text-[#A8A29E]">{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
