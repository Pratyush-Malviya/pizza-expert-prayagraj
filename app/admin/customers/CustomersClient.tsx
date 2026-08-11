'use client'

import { useState } from 'react'
import { blockCustomer, unblockCustomer, adjustLoyaltyPoints, getCustomerDetails, seedDemoCustomers } from '@/app/actions/customers'
import { toast } from 'sonner'
import {
  Users, Search, Download, ShieldAlert, Award, Phone,
  Calendar, ShoppingBag, Eye, Ban, CheckCircle2, X, MapPin,
  TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CustomerRow {
  id: string
  name: string
  phone: string | null
  loyalty_points: number
  is_active: boolean
  created_at: string
  order_count: number
  total_spend: number
  last_order_at: string | null
}

export default function CustomersClient({ initialCustomers }: { initialCustomers: CustomerRow[] }) {
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all')
  const [isSeeding, setIsSeeding] = useState(false)

  async function handleSeedDemoData() {
    setIsSeeding(true)
    const res = await seedDemoCustomers()
    setIsSeeding(false)
    if (res.success) {
      toast.success('Sample CRM customers seeded successfully!')
      window.location.reload()
    } else {
      toast.error(res.error || 'Failed to seed sample data')
    }
  }

  // Selected customer for modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null)
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false)
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([])
  const [customerOrders, setCustomerOrders] = useState<any[]>([])

  // Points adjustment modal state
  const [pointsModalCustomer, setPointsModalCustomer] = useState<CustomerRow | null>(null)
  const [deltaPoints, setDeltaPoints] = useState<number>(50)
  const [adjustReason, setAdjustReason] = useState<string>('Manual Admin Grant')
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false)
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)

  // Filter logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm) ||
      c.id.includes(searchTerm)

    if (statusFilter === 'active') return matchesSearch && c.is_active !== false
    if (statusFilter === 'blocked') return matchesSearch && c.is_active === false
    return matchesSearch
  })

  // Open detail modal
  async function handleOpenDetails(customer: CustomerRow) {
    setSelectedCustomer(customer)
    setCustomerDetailsLoading(true)
    const res = await getCustomerDetails(customer.id)
    setCustomerDetailsLoading(false)
    if (res.success) {
      setCustomerAddresses(res.addresses || [])
      setCustomerOrders(res.orders || [])
    } else {
      toast.error('Could not fetch extra details')
    }
  }

  // Toggle active / blocked status
  async function handleToggleBlock(customer: CustomerRow) {
    setLoadingActionId(customer.id)
    const isCurrentlyActive = customer.is_active !== false
    const result = isCurrentlyActive
      ? await blockCustomer(customer.id)
      : await unblockCustomer(customer.id)
    setLoadingActionId(null)

    if (result.success) {
      toast.success(isCurrentlyActive ? 'Customer blocked' : 'Customer unblocked')
      setCustomers(customers.map(c => c.id === customer.id ? { ...c, is_active: !isCurrentlyActive } : c))
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, is_active: !isCurrentlyActive })
      }
    } else {
      toast.error(result.error || 'Action failed')
    }
  }

  // Handle Loyalty Points Submit
  async function handleAdjustPointsSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pointsModalCustomer) return
    setIsAdjustingPoints(true)
    const res = await adjustLoyaltyPoints(pointsModalCustomer.id, deltaPoints, adjustReason)
    setIsAdjustingPoints(false)

    if (res.success) {
      toast.success(`Loyalty points updated to ${res.newPoints}`)
      setCustomers(customers.map(c => c.id === pointsModalCustomer.id ? { ...c, loyalty_points: res.newPoints! } : c))
      if (selectedCustomer?.id === pointsModalCustomer.id) {
        setSelectedCustomer({ ...selectedCustomer, loyalty_points: res.newPoints! })
      }
      setPointsModalCustomer(null)
    } else {
      toast.error(res.error || 'Failed to adjust points')
    }
  }

  // Export to CSV
  function handleExportCSV() {
    const headers = ['ID', 'Name', 'Phone', 'Loyalty Points', 'Total Orders', 'Total Spend (INR)', 'Status', 'Last Order Date', 'Joined Date']
    const rows = filteredCustomers.map(c => [
      c.id,
      `"${c.name || 'Guest'}"`,
      `"${c.phone || ''}"`,
      c.loyalty_points,
      c.order_count,
      c.total_spend,
      c.is_active !== false ? 'Active' : 'Blocked',
      c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : 'Never',
      new Date(c.created_at).toLocaleDateString()
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `customers_crm_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV Export downloaded')
  }

  // Compute CRM Aggregates
  const totalCustomersCount = customers.length
  const activeCustomersCount = customers.filter(c => c.is_active !== false).length
  const totalLTV = customers.reduce((sum, c) => sum + Number(c.total_spend || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">Total Registered CRM</p>
            <h3 className="text-2xl font-black font-serif text-[#1C1917] mt-1">{totalCustomersCount}</h3>
            <p className="text-xs text-[#15803D] mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 size={12} /> {activeCustomersCount} Active accounts
            </p>
          </div>
          <div className="w-12 h-12 bg-[#FEF2F2] rounded-xl flex items-center justify-center text-[#B91C1C]">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">Customer LTV Volume</p>
            <h3 className="text-2xl font-black font-serif text-[#1C1917] mt-1">₹{totalLTV.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-[#A8A29E] mt-1">Across all order histories</p>
          </div>
          <div className="w-12 h-12 bg-[#F0FDF4] rounded-xl flex items-center justify-center text-[#15803D]">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">Total Loyalty Points</p>
            <h3 className="text-2xl font-black font-serif text-[#1C1917] mt-1">
              {customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0)} pts
            </h3>
            <p className="text-xs text-[#D97706] mt-1 font-medium flex items-center gap-1">
              <Award size={12} /> Rewards & Retention Ledger
            </p>
          </div>
          <div className="w-12 h-12 bg-[#FEF3C7] rounded-xl flex items-center justify-center text-[#D97706]">
            <Award size={22} />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E7E0D8] shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, phone, or user ID..."
            className="w-full pl-10 pr-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
          />
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="text-xs font-medium border border-[#E7E0D8] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="blocked">Blocked Only</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="bg-[#18181B] hover:bg-[#27272A] text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            onClick={handleSeedDemoData}
            disabled={isSeeding}
            className="bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs disabled:opacity-70"
          >
            {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Seed Sample Customers
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Orders & LTV</th>
                <th className="py-3 px-4">Loyalty Points</th>
                <th className="py-3 px-4">Last Order</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8] text-sm">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#A8A29E] text-sm">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const isActive = customer.is_active !== false
                  return (
                    <tr key={customer.id} className={cn("hover:bg-[#FBF9F5]/60 transition-colors", !isActive && "bg-[#F5F5F4]/60")}>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center font-bold font-serif uppercase shrink-0">
                            {(customer.name || 'G').slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-[#1C1917]">{customer.name || 'Guest User'}</div>
                            <div className="text-[11px] text-[#A8A29E] font-mono">ID: {customer.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-[#57534E]">
                        {customer.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone size={12} className="text-[#A8A29E]" /> {customer.phone}
                          </span>
                        ) : (
                          <span className="text-[#A8A29E]">No phone</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1C1917]">₹{Number(customer.total_spend || 0).toLocaleString('en-IN')}</div>
                        <div className="text-xs text-[#A8A29E]">{customer.order_count || 0} total orders</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                            <Award size={12} /> {customer.loyalty_points || 0} pts
                          </span>
                          <button
                            onClick={() => setPointsModalCustomer(customer)}
                            className="text-[11px] text-[#B91C1C] hover:underline font-semibold"
                          >
                            Adjust
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#78716C]">
                        {customer.last_order_at ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {new Date(customer.last_order_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[#A8A29E]">No orders yet</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]"
                        )}>
                          {isActive ? 'Active' : 'Blocked'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetails(customer)}
                            className="p-1.5 rounded-lg border border-[#E7E0D8] text-[#57534E] hover:bg-[#F4EFEA] hover:text-[#1C1917] transition-colors"
                            title="View Full Customer History"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => handleToggleBlock(customer)}
                            disabled={loadingActionId === customer.id}
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border",
                              isActive
                                ? "border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2]"
                                : "border-[#86EFAC] text-[#15803D] hover:bg-[#F0FDF4]"
                            )}
                          >
                            {loadingActionId === customer.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : isActive ? (
                              <><Ban size={13} /> Block</>
                            ) : (
                              <><CheckCircle2 size={13} /> Unblock</>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E7E0D8] p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-[#E7E0D8] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#B91C1C] text-white flex items-center justify-center font-bold font-serif text-lg uppercase">
                  {(selectedCustomer.name || 'G').slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1C1917]">{selectedCustomer.name || 'Guest User'}</h2>
                  <div className="flex items-center gap-3 text-xs text-[#A8A29E] mt-0.5">
                    <span>Phone: {selectedCustomer.phone || 'N/A'}</span>
                    <span>•</span>
                    <span>Joined: {new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-lg text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F4EFEA]"
              >
                <X size={20} />
              </button>
            </div>

            {customerDetailsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#A8A29E] gap-2">
                <Loader2 size={24} className="animate-spin text-[#B91C1C]" />
                <span className="text-xs">Loading customer addresses & order history...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats row inside modal */}
                <div className="grid grid-cols-3 gap-3 bg-[#FBF9F5] p-3 rounded-xl border border-[#E7E0D8]">
                  <div className="text-center">
                    <span className="text-[10px] text-[#A8A29E] uppercase font-semibold">Total Spend</span>
                    <p className="font-bold text-[#1C1917] text-base">₹{selectedCustomer.total_spend}</p>
                  </div>
                  <div className="text-center border-x border-[#E7E0D8]">
                    <span className="text-[10px] text-[#A8A29E] uppercase font-semibold">Orders</span>
                    <p className="font-bold text-[#1C1917] text-base">{selectedCustomer.order_count}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-[#A8A29E] uppercase font-semibold">Loyalty Points</span>
                    <p className="font-bold text-[#D97706] text-base">{selectedCustomer.loyalty_points} pts</p>
                  </div>
                </div>

                {/* Saved Addresses */}
                <div>
                  <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#B91C1C]" /> Saved Delivery Addresses ({customerAddresses.length})
                  </h3>
                  {customerAddresses.length === 0 ? (
                    <p className="text-xs text-[#A8A29E] italic">No saved addresses found.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customerAddresses.map((addr) => (
                        <div key={addr.id} className="p-3 bg-white border border-[#E7E0D8] rounded-lg text-xs space-y-1">
                          <div className="font-bold text-[#1C1917] flex items-center justify-between">
                            <span>{addr.label || 'Address'}</span>
                            {addr.is_default && (
                              <span className="text-[9px] bg-[#DCFCE7] text-[#166534] font-bold px-1.5 py-0.5 rounded">Default</span>
                            )}
                          </div>
                          <p className="text-[#57534E]">{addr.line1} {addr.line2}</p>
                          <p className="text-[#A8A29E]">{addr.city}, {addr.state} - {addr.pincode}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Orders */}
                <div>
                  <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-[#B91C1C]" /> Recent Orders ({customerOrders.length})
                  </h3>
                  {customerOrders.length === 0 ? (
                    <p className="text-xs text-[#A8A29E] italic">No recent order history found.</p>
                  ) : (
                    <div className="space-y-2">
                      {customerOrders.map((ord) => (
                        <div key={ord.id} className="p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-[#1C1917]">#{String(ord.id).slice(0, 8).toUpperCase()}</span>
                            <span className="text-[#A8A29E] ml-2">{new Date(ord.created_at).toLocaleDateString()}</span>
                            <div className="text-[11px] text-[#57534E] mt-0.5">
                              {ord.order_items?.map((item: any) => `${item.quantity}x ${item.product_name}`).join(', ') || 'Order Items'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#1C1917]">₹{ord.total}</span>
                            <span className="block text-[10px] capitalize font-medium text-[#15803D]">{ord.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {pointsModalCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E7E0D8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-bold text-[#1C1917] flex items-center gap-2">
                <Award size={18} className="text-[#D97706]" /> Adjust Loyalty Points
              </h3>
              <button onClick={() => setPointsModalCustomer(null)} className="text-[#A8A29E] hover:text-[#1C1917]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustPointsSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-[#57534E]">
                  Customer: <span className="font-bold text-[#1C1917]">{pointsModalCustomer.name}</span>
                </p>
                <p className="text-xs text-[#A8A29E]">Current Points: {pointsModalCustomer.loyalty_points || 0} pts</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Point Change (+ for grant, - for deduct)</label>
                <input
                  type="number"
                  value={deltaPoints}
                  onChange={(e) => setDeltaPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                  placeholder="e.g. 50 or -20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                  placeholder="e.g. Compensation for order delay"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPointsModalCustomer(null)}
                  className="px-4 py-2 rounded-lg border border-[#E7E0D8] text-xs font-bold text-[#57534E] hover:bg-[#F4EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingPoints}
                  className="px-4 py-2 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {isAdjustingPoints && <Loader2 size={14} className="animate-spin" />} Save Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
