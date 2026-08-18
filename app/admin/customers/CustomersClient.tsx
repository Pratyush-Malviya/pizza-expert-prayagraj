'use client'

import { useState } from 'react'
import {
  blockCustomer, unblockCustomer, adjustLoyaltyPoints, getCustomerDetails,
  createCustomer, updateCustomer, deleteCustomer, getCustomerAuditLogs
} from '@/app/actions/customers'
import { toast } from 'sonner'
import {
  Users, Search, Download, ShieldAlert, Award, Phone,
  Calendar, ShoppingBag, Eye, Ban, CheckCircle2, X, MapPin,
  TrendingUp, ArrowUpRight, ArrowDownRight, Loader2,
  UserPlus, Edit, Trash2, Activity, History, Key, UserCheck, Mail
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CustomerRow {
  id: string
  name: string
  email?: string | null
  phone: string | null
  loyalty_points: number
  is_active: boolean
  created_at: string
  order_count: number
  total_spend: number
  last_order_at: string | null
  role?: string
}

export default function CustomersClient({ initialCustomers }: { initialCustomers: CustomerRow[] }) {
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all')
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Selected customer for detail modal & activity trace
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'activity'>('orders')
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false)
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([])
  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [customerAuditLogs, setCustomerAuditLogs] = useState<any[]>([])

  // Points adjustment modal state
  const [pointsModalCustomer, setPointsModalCustomer] = useState<CustomerRow | null>(null)
  const [deltaPoints, setDeltaPoints] = useState<number>(50)
  const [adjustReason, setAdjustReason] = useState<string>('Manual Admin Grant')
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false)

  // Filter logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm) ||
      c.id.includes(searchTerm)

    if (statusFilter === 'active') return matchesSearch && c.is_active !== false
    if (statusFilter === 'blocked') return matchesSearch && c.is_active === false
    return matchesSearch
  })

  // Open detail modal & fetch details + audit timeline
  async function handleOpenDetails(customer: CustomerRow) {
    setSelectedCustomer(customer)
    setActiveTab('orders')
    setCustomerDetailsLoading(true)

    const [detailsRes, auditRes] = await Promise.all([
      getCustomerDetails(customer.id),
      getCustomerAuditLogs(customer.id)
    ])

    setCustomerDetailsLoading(false)
    if (detailsRes.success) {
      setCustomerAddresses(detailsRes.addresses || [])
      setCustomerOrders(detailsRes.orders || [])
    }
    if (auditRes.success) {
      setCustomerAuditLogs(auditRes.logs || [])
    }
  }

  // Handle Add Customer Submit
  async function handleCreateUserSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsCreating(true)
    const formData = new FormData(e.currentTarget)
    const res = await createCustomer(formData)
    setIsCreating(false)

    if (res.success) {
      toast.success('User created successfully!')
      setShowAddModal(false)
      window.location.reload()
    } else {
      toast.error(res.error || 'Failed to create user')
    }
  }

  // Handle Edit Customer Submit
  async function handleEditUserSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingCustomer) return
    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)

    const res = await updateCustomer(editingCustomer.id, {
      name: formData.get('name') as string,
      phone: (formData.get('phone') as string) || null,
      role: formData.get('role') as string,
      loyalty_points: Number(formData.get('loyalty_points') || 0),
      is_active: formData.get('is_active') === 'true',
    })
    setIsUpdating(false)

    if (res.success) {
      toast.success('User details updated successfully')
      setCustomers(customers.map(c => c.id === editingCustomer.id ? {
        ...c,
        name: formData.get('name') as string,
        phone: (formData.get('phone') as string) || null,
        loyalty_points: Number(formData.get('loyalty_points') || 0),
        is_active: formData.get('is_active') === 'true',
      } : c))
      setEditingCustomer(null)
    } else {
      toast.error(res.error || 'Failed to update user')
    }
  }

  // Handle Delete Customer Submit
  async function handleDeleteUserConfirm() {
    if (!deletingCustomer) return
    setIsDeleting(true)
    const res = await deleteCustomer(deletingCustomer.id)
    setIsDeleting(false)

    if (res.success) {
      toast.success('User account deleted')
      setCustomers(customers.filter(c => c.id !== deletingCustomer.id))
      setDeletingCustomer(null)
      if (selectedCustomer?.id === deletingCustomer.id) {
        setSelectedCustomer(null)
      }
    } else {
      toast.error(res.error || 'Failed to delete user')
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
      setPointsModalCustomer(null)
    } else {
      toast.error(res.error || 'Failed to adjust points')
    }
  }

  // Export to CSV
  function handleExportCSV() {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Loyalty Points', 'Total Orders', 'Total Spend (INR)', 'Status', 'Last Order Date', 'Joined Date']
    const rows = filteredCustomers.map(c => [
      c.id,
      `"${c.name || 'Guest'}"`,
      `"${c.email || ''}"`,
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

        {/* Filters & Actions */}
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
            onClick={() => setShowAddModal(true)}
            className="bg-[#B91C1C] hover:bg-[#991B1B] text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs uppercase tracking-wider"
          >
            <UserPlus size={15} /> Add New User
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-[#18181B] hover:bg-[#27272A] text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Download size={14} /> Export CSV
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
                        <div className="space-y-0.5">
                          {customer.email ? (
                            <span className="flex items-center gap-1.5 text-xs text-[#1C1917] font-medium font-sans">
                              <Mail size={12} className="text-[#B91C1C] shrink-0" />
                              <span className="truncate max-w-[180px]">{customer.email}</span>
                            </span>
                          ) : null}
                          {customer.phone ? (
                            <span className="flex items-center gap-1.5 text-[11px] text-[#78716C]">
                              <Phone size={11} className="text-[#A8A29E] shrink-0" /> {customer.phone}
                            </span>
                          ) : !customer.email ? (
                            <span className="text-[#A8A29E] text-xs">No contact details</span>
                          ) : null}
                        </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(customer)}
                            className="p-1.5 rounded-lg border border-[#E7E0D8] text-[#57534E] hover:bg-[#F4EFEA] hover:text-[#1C1917] transition-colors"
                            title="View Detailed Customer Actions & History"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => setEditingCustomer(customer)}
                            className="p-1.5 rounded-lg border border-[#E7E0D8] text-[#57534E] hover:bg-[#F4EFEA] hover:text-[#B91C1C] transition-colors"
                            title="Edit User Profile"
                          >
                            <Edit size={15} />
                          </button>

                          <button
                            onClick={() => setDeletingCustomer(customer)}
                            className="p-1.5 rounded-lg border border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
                            title="Delete User Account"
                          >
                            <Trash2 size={15} />
                          </button>

                          <button
                            onClick={() => handleToggleBlock(customer)}
                            disabled={loadingActionId === customer.id}
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border",
                              isActive
                                ? "border-[#E7E0D8] text-[#78716C] hover:bg-[#F5F5F4]"
                                : "border-[#86EFAC] text-[#15803D] hover:bg-[#F0FDF4]"
                            )}
                            title={isActive ? "Block Account" : "Unblock Account"}
                          >
                            {loadingActionId === customer.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : isActive ? (
                              <Ban size={13} />
                            ) : (
                              <CheckCircle2 size={13} />
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

      {/* Customer Action & History Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E7E0D8] p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-[#E7E0D8] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#B91C1C] text-white flex items-center justify-center font-bold font-serif text-lg uppercase">
                  {(selectedCustomer.name || 'G').slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1C1917]">{selectedCustomer.name || 'Guest User'}</h2>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#78716C] mt-0.5">
                    {selectedCustomer.email && (
                      <span className="flex items-center gap-1 text-[#1C1917] font-medium">
                        <Mail size={12} className="text-[#B91C1C]" /> {selectedCustomer.email}
                      </span>
                    )}
                    {selectedCustomer.phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone size={12} className="text-[#A8A29E]" /> {selectedCustomer.phone}
                      </span>
                    )}
                    <span>• Joined: {new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
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

            {/* Navigation Tabs inside Customer Modal */}
            <div className="flex border-b border-[#E7E0D8] gap-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab('orders')}
                className={cn("pb-2.5 flex items-center gap-1.5 transition-colors border-b-2", activeTab === 'orders' ? "border-[#B91C1C] text-[#B91C1C]" : "border-transparent text-[#A8A29E] hover:text-[#1C1917]")}
              >
                <ShoppingBag size={15} /> Order History ({customerOrders.length})
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={cn("pb-2.5 flex items-center gap-1.5 transition-colors border-b-2", activeTab === 'addresses' ? "border-[#B91C1C] text-[#B91C1C]" : "border-transparent text-[#A8A29E] hover:text-[#1C1917]")}
              >
                <MapPin size={15} /> Saved Addresses ({customerAddresses.length})
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                className={cn("pb-2.5 flex items-center gap-1.5 transition-colors border-b-2", activeTab === 'activity' ? "border-[#B91C1C] text-[#B91C1C]" : "border-transparent text-[#A8A29E] hover:text-[#1C1917]")}
              >
                <History size={15} /> Detailed Action Trace ({customerAuditLogs.length})
              </button>
            </div>

            {customerDetailsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#A8A29E] gap-2">
                <Loader2 size={24} className="animate-spin text-[#B91C1C]" />
                <span className="text-xs">Loading customer detailed actions & history...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats Header Bar */}
                <div className="grid grid-cols-3 gap-3 bg-[#FBF9F5] p-3 rounded-xl border border-[#E7E0D8]">
                  <div className="text-center">
                    <span className="text-[10px] text-[#A8A29E] uppercase font-semibold">Lifetime Spend</span>
                    <p className="font-bold text-[#1C1917] text-base">₹{selectedCustomer.total_spend}</p>
                  </div>
                  <div className="text-center border-x border-[#E7E0D8]">
                    <span className="text-[10px] text-[#A8A29E] uppercase font-semibold">Total Orders</span>
                    <p className="font-bold text-[#1C1917] text-base">{selectedCustomer.order_count}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-[#A8A29E] uppercase font-semibold">Loyalty Ledger</span>
                    <p className="font-bold text-[#D97706] text-base">{selectedCustomer.loyalty_points} pts</p>
                  </div>
                </div>

                {/* Tab 1: Orders */}
                {activeTab === 'orders' && (
                  <div className="space-y-2">
                    {customerOrders.length === 0 ? (
                      <p className="text-xs text-[#A8A29E] italic py-4 text-center">No order history found for this customer.</p>
                    ) : (
                      customerOrders.map((ord) => (
                        <div key={ord.id} className="p-3 bg.white border border-[#E7E0D8] rounded-xl flex items-center justify-between text-xs hover:border-[#B91C1C]/30 transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#1C1917]">Order #{String(ord.id).slice(0, 8).toUpperCase()}</span>
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-[#DCFCE7] text-[#166534] capitalize">{ord.status}</span>
                            </div>
                            <span className="text-[#A8A29E] text-[11px] block mt-0.5">{new Date(ord.created_at).toLocaleString()}</span>
                            <div className="text-[11px] text-[#57534E] mt-1 font-medium">
                              {ord.order_items?.map((item: any) => `${item.quantity}x ${item.product_name}`).join(', ') || 'Items details'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-[#1C1917] text-sm">₹{ord.total}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 2: Addresses */}
                {activeTab === 'addresses' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customerAddresses.length === 0 ? (
                      <p className="text-xs text-[#A8A29E] italic py-4 col-span-2 text-center">No saved delivery addresses found.</p>
                    ) : (
                      customerAddresses.map((addr) => (
                        <div key={addr.id} className="p-3 bg-white border border-[#E7E0D8] rounded-xl text-xs space-y-1">
                          <div className="font-bold text-[#1C1917] flex items-center justify-between">
                            <span>{addr.label || 'Address'}</span>
                            {addr.is_default && (
                              <span className="text-[9px] bg-[#DCFCE7] text-[#166534] font-bold px-1.5 py-0.5 rounded">Default Address</span>
                            )}
                          </div>
                          <p className="text-[#57534E]">{addr.line1} {addr.line2}</p>
                          <p className="text-[#A8A29E]">{addr.city}, {addr.state} - {addr.pincode}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 3: Detailed Action Trace / Activity Log */}
                {activeTab === 'activity' && (
                  <div className="space-y-2">
                    {customerAuditLogs.length === 0 ? (
                      <p className="text-xs text-[#A8A29E] italic py-4 text-center">No detailed action log history recorded for this user.</p>
                    ) : (
                      customerAuditLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl text-xs flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FEF2F2] text-[#B91C1C] rounded font-mono uppercase">{log.action}</span>
                              <span className="text-[#A8A29E] text-[11px] font-mono">{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-[#57534E] font-mono text-[11px] mt-1">
                              Target Table: {log.target_table || 'N/A'} • IP: {log.ip_address || 'Internal'}
                            </p>
                            {log.after && (
                              <pre className="mt-1 p-2 bg-[#18181B] text-[#86EFAC] text-[10px] rounded font-mono overflow-x-auto max-h-24">
                                {JSON.stringify(log.after, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add New User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E7E0D8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-bold text-[#1C1917] flex items-center gap-2">
                <UserPlus size={18} className="text-[#B91C1C]" /> Add New Customer / Staff Account
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#A8A29E] hover:text-[#1C1917]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="ramesh@example.com"
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Account Role</label>
                <select
                  name="role"
                  defaultValue="customer"
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm bg-white focus:outline-none focus:border-[#B91C1C]"
                >
                  <option value="customer">Customer</option>
                  <option value="staff">Staff (Kitchen)</option>
                  <option value="manager">Manager</option>
                  <option value="driver">Delivery Driver</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Initial Loyalty Points</label>
                <input
                  type="number"
                  name="loyalty_points"
                  defaultValue={100}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#E7E0D8] font-bold text-[#57534E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold flex items-center gap-1.5 uppercase tracking-wider"
                >
                  {isCreating && <Loader2 size={14} className="animate-spin" />} Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E7E0D8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-bold text-[#1C1917] flex items-center gap-2">
                <Edit size={18} className="text-[#B91C1C]" /> Edit User Details
              </h3>
              <button onClick={() => setEditingCustomer(null)} className="text-[#A8A29E] hover:text-[#1C1917]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Full Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingCustomer.name}
                  required
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={editingCustomer.phone || ''}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Role</label>
                <select
                  name="role"
                  defaultValue={editingCustomer.role || 'customer'}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm bg-white focus:outline-none focus:border-[#B91C1C]"
                >
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="driver">Driver</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Loyalty Points</label>
                <input
                  type="number"
                  name="loyalty_points"
                  defaultValue={editingCustomer.loyalty_points}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8A29E] mb-1 uppercase">Account Status</label>
                <select
                  name="is_active"
                  defaultValue={editingCustomer.is_active !== false ? 'true' : 'false'}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm bg-white focus:outline-none focus:border-[#B91C1C]"
                >
                  <option value="true">Active Account</option>
                  <option value="false">Blocked / Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-lg border border-[#E7E0D8] font-bold text-[#57534E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg bg-[#B91C1C] text-white font-bold flex items-center gap-1.5 uppercase"
                >
                  {isUpdating && <Loader2 size={14} className="animate-spin" />} Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#FCA5A5] p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#B91C1C]">
              <div className="w-10 h-10 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1C1917]">Delete User Account</h3>
                <p className="text-xs text-[#A8A29E]">Permanent Account Removal</p>
              </div>
            </div>

            <p className="text-xs text-[#57534E]">
              Are you sure you want to delete <strong className="text-[#1C1917]">{deletingCustomer.name}</strong> ({deletingCustomer.phone || deletingCustomer.id})? This will remove their user profile and revoke authentication.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 rounded-lg border border-[#E7E0D8] text-xs font-bold text-[#57534E]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUserConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 size={14} className="animate-spin" />} Delete Account
              </button>
            </div>
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
