'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard, Search, Download, Filter, CheckCircle2,
  Clock, XCircle, RefreshCw, Banknote, Building2,
  Check, UserCheck, Phone, ArrowRight, ShieldCheck, Wallet
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  settleDriverCodCashAtStore,
  batchSettleDriverCodAtStore,
  fetchAvailableDrivers
} from '@/app/actions/deliveries'
import { playNotificationSound } from '@/lib/utils/notifications'
import { toast } from 'sonner'

export interface PaymentTransaction {
  id: string
  orderId: string
  amount: number
  status: 'captured' | 'failed' | 'refunded' | 'pending'
  method: string
  date: string
  customer: string
  codStatus?: 'pending_collection' | 'collected_by_driver' | 'settled_at_store'
  driverName?: string
  driverId?: string
}

export interface DriverCodSummary {
  driverId: string
  driverName: string
  driverPhone: string
  vehicle: string
  totalUnremittedCash: number
  orders: Array<{
    id: string
    total: number
    customer: string
    address: string
    collectedAt: string
    paymentMode: string
  }>
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'cod_remittance'>('transactions')
  const [payments, setPayments] = useState<PaymentTransaction[]>([])
  const [driverCodList, setDriverCodList] = useState<DriverCodSummary[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [settlingDriverId, setSettlingDriverId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const supabase = createClient()

  const fetchPaymentData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch orders from Supabase
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      // 2. Fetch available drivers for profile enrichment
      const { drivers } = await fetchAvailableDrivers()
      const driverMap = new Map<string, any>()
      if (drivers) {
        drivers.forEach((d: any) => driverMap.set(d.id, d))
      }

      if (!error && orders && orders.length > 0) {
        const mapped: PaymentTransaction[] = orders.map((o: any) => {
          const addr = o.address_json || {}
          const isCancelled = o.status === 'cancelled'
          const isCod = addr.paymentMethod === 'cod' || o.payment_method === 'cod'
          
          let pStatus: PaymentTransaction['status'] = 'captured'
          if (isCancelled) {
            pStatus = 'refunded'
          } else if (isCod && o.status !== 'delivered') {
            pStatus = 'pending'
          }

          const rawIdStr = String(o.id).replace(/[^a-zA-Z0-9]/g, '').slice(-10)
          
          return {
            id: `pay_${rawIdStr}`,
            orderId: o.id,
            amount: Number(o.total) || Number(o.subtotal) || 0,
            status: pStatus,
            method: isCod ? 'Cash on Delivery (COD)' : 'Razorpay / UPI Online',
            date: o.created_at || new Date().toISOString(),
            customer: addr.name || 'Customer',
            codStatus: addr.codStatus,
            driverName: addr.driverName,
            driverId: addr.codCollectedBy,
          }
        })
        setPayments(mapped)

        // 3. Build Driver COD Remittance Summaries
        const codDriversMap = new Map<string, DriverCodSummary>()

        orders.forEach((o: any) => {
          const addr = o.address_json || {}
          const isCod = addr.paymentMethod === 'cod'
          const isCollectedPendingStore =
            isCod &&
            o.status === 'delivered' &&
            addr.codStatus === 'collected_by_driver'

          if (isCollectedPendingStore) {
            const drvId = addr.codCollectedBy || 'unassigned_driver'
            const drvProfile = driverMap.get(drvId)
            const drvName = addr.driverName || drvProfile?.name || 'Assigned Driver'
            const drvPhone = addr.driverPhone || drvProfile?.phone || ''
            const drvVehicle = addr.driverVehicle || drvProfile?.vehicle_type || 'Bike'

            if (!codDriversMap.has(drvId)) {
              codDriversMap.set(drvId, {
                driverId: drvId,
                driverName: drvName,
                driverPhone: drvPhone,
                vehicle: drvVehicle,
                totalUnremittedCash: 0,
                orders: [],
              })
            }

            const entry = codDriversMap.get(drvId)!
            entry.totalUnremittedCash += Number(o.total) || 0
            entry.orders.push({
              id: o.id,
              total: Number(o.total) || 0,
              customer: addr.name || 'Customer',
              address: [addr.line1, addr.city].filter(Boolean).join(', ') || 'Prayagraj',
              collectedAt: addr.codCollectedAt || o.created_at,
              paymentMode: addr.codPaymentMode || 'cash',
            })
          }
        })

        setDriverCodList(Array.from(codDriversMap.values()))
      }
    } catch (err) {
      console.warn('Payment fetch note:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchPaymentData()

    const channel = supabase
      .channel('admin-payments-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchPaymentData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPaymentData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPaymentData, supabase])

  // Handle single order settlement
  const handleSettleSingleOrder = async (orderId: string, driverId: string) => {
    try {
      const res = await settleDriverCodCashAtStore({
        orderId,
        driverId,
        managerName: 'Store Manager',
      })
      if (res.success) {
        playNotificationSound('status_change')
        toast.success(res.message || 'COD cash settled at store counter!')
        await fetchPaymentData()
      } else {
        toast.error(res.error || 'Failed to settle COD cash')
      }
    } catch (err: any) {
      toast.error(err.message || 'Settlement error')
    }
  }

  // Handle batch driver settlement
  const handleBatchSettleDriver = async (driverId: string, driverName: string) => {
    setSettlingDriverId(driverId)
    try {
      const res = await batchSettleDriverCodAtStore({
        driverId,
        managerName: 'Store Manager',
      })
      if (res.success) {
        playNotificationSound('status_change')
        toast.success(`🎉 Accepted and settled ₹${res.totalSettledAmount} cash from ${driverName}!`)
        await fetchPaymentData()
      } else {
        toast.error(res.error || 'Failed to settle driver cash')
      }
    } catch (err: any) {
      toast.error(err.message || 'Settlement error')
    } finally {
      setSettlingDriverId(null)
    }
  }

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalCollected = payments
    .filter((p) => p.status === 'captured')
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingCodTotal = driverCodList.reduce((sum, d) => sum + d.totalUnremittedCash, 0)
  const pendingCount = payments.filter((p) => p.status === 'pending').length
  const refundedCount = payments.filter((p) => p.status === 'refunded').length

  const handleExportCSV = () => {
    const headers = 'Transaction ID,Order ID,Date,Customer,Amount (INR),Payment Method,Status\n'
    const rows = filteredPayments
      .map(
        (p) =>
          `"${p.id}","${p.orderId}","${new Date(p.date).toLocaleString()}","${p.customer}",${p.amount},"${p.method}","${p.status}"`
      )
      .join('\n')

    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Pizza_Expert_Payments_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('Exported payments CSV report')
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
            Sales Payments & Transactions
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            Financial reconciliation, online gateway payouts & driver COD counter remittances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPaymentData}
            className="btn btn-outline btn-sm flex items-center gap-1.5 text-xs"
            title="Refresh Transactions"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E7E0D8] pb-1">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'bg-white text-[#57534E] hover:bg-[#F3EFEA]'
          }`}
        >
          <CreditCard size={15} />
          <span>All Transactions ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cod_remittance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
            activeTab === 'cod_remittance'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'bg-white text-[#57534E] hover:bg-[#F3EFEA]'
          }`}
        >
          <Banknote size={15} className="text-amber-500" />
          <span>COD Driver Cash Remittance</span>
          {pendingCodTotal > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#B91C1C] text-white font-mono animate-pulse">
              ₹{pendingCodTotal}
            </span>
          )}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-1">
            <span>Total Captured Revenue</span>
            <CheckCircle2 size={16} className="text-[#15803D]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#1C1917]">
            ₹{totalCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#78716C]">Settled orders</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-1">
            <span>Unremitted COD Cash in Hand</span>
            <Banknote size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            ₹{pendingCodTotal.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-800">
            With riders • Pending counter deposit
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-1">
            <span>Pending Online Payments</span>
            <Clock size={16} className="text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#D97706]">
            {pendingCount}
          </div>
          <span className="text-[11px] text-[#78716C]">Awaiting checkout</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-1">
            <span>Refunded Orders</span>
            <XCircle size={16} className="text-[#DC2626]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#DC2626]">
            {refundedCount}
          </div>
          <span className="text-[11px] text-[#78716C]">Cancelled orders</span>
        </div>
      </div>

      {/* TAB 1: ALL TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-[#E7E0D8] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FBF9F5]">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
              <input
                type="text"
                placeholder="Search transaction ID, order ID, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E7E0D8] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={15} className="text-[#78716C]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-[#E7E0D8] text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
              >
                <option value="all">All Payment Statuses</option>
                <option value="captured">Captured (Paid)</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded / Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3EFEA] text-[#57534E] font-bold border-b border-[#E7E0D8]">
                <tr>
                  <th className="py-3 px-4">Transaction / Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[#78716C]">
                      No transactions found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FBF9F5] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1C1917]">
                        <div className="text-xs">{p.id}</div>
                        <div className="text-[10px] text-[#78716C] font-normal">Order #{p.orderId.slice(-6).toUpperCase()}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1C1917]">
                        {p.customer}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] px-2 py-1 bg-[#FBF9F5] rounded-md border border-[#E7E0D8]">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#1C1917]">
                        ₹{p.amount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                            p.status === 'captured'
                              ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                              : p.status === 'pending'
                              ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                              : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#78716C]">
                        {new Date(p.date).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COD DRIVER CASH REMITTANCE & COUNTER SETTLEMENT */}
      {activeTab === 'cod_remittance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-[#E7E0D8] shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="font-serif font-bold text-base text-[#1C1917]">
                  Store Counter Cash Remittance & Settlement
                </h2>
                <p className="text-xs text-[#78716C]">
                  Delivery partners submit collected doorstep COD cash to the Store Manager upon return to Allapur Hub.
                </p>
              </div>
            </div>

            <div className="px-4 py-2 bg-[#FBF9F5] border border-[#E7E0D8] rounded-2xl text-right">
              <span className="text-[10px] uppercase font-bold text-[#78716C] block">Total Unsettled COD Cash</span>
              <span className="font-mono font-bold text-lg text-amber-700">₹{pendingCodTotal.toLocaleString()}</span>
            </div>
          </div>

          {driverCodList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E7E0D8] shadow-xs space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-3xl">
                ✓
              </div>
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">All COD Cash Fully Settled</h3>
              <p className="text-xs text-[#78716C] max-w-md mx-auto">
                No delivery partners currently have outstanding unremitted COD cash in hand. All collected cash has been deposited and verified at the store counter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {driverCodList.map((driver) => (
                <div
                  key={driver.driverId}
                  className="bg-white rounded-3xl p-5 border border-[#E7E0D8] shadow-xs space-y-4"
                >
                  {/* Driver Header */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#E7E0D8]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-center text-xl">
                        🛵
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                          <span>{driver.driverName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            {driver.vehicle}
                          </span>
                        </div>
                        <div className="text-xs text-[#78716C] font-mono">
                          {driver.driverPhone || 'Delivery Partner'} • {driver.orders.length} {driver.orders.length === 1 ? 'order' : 'orders'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-[#78716C] block">Cash to Deposit</span>
                        <span className="font-mono font-black text-xl text-[#B91C1C]">
                          ₹{driver.totalUnremittedCash.toLocaleString()}
                        </span>
                      </div>

                      <button
                        disabled={settlingDriverId === driver.driverId}
                        onClick={() => handleBatchSettleDriver(driver.driverId, driver.driverName)}
                        className="px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                      >
                        <Check size={15} />
                        <span>Accept & Settle ₹{driver.totalUnremittedCash}</span>
                      </button>
                    </div>
                  </div>

                  {/* Orders Breakdown */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block">
                      Delivered COD Orders in this Batch:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {driver.orders.map((ord) => (
                        <div
                          key={ord.id}
                          className="bg-[#FBF9F5] rounded-2xl p-3 border border-[#E7E0D8] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-[#1C1917]">
                              #{ord.id.slice(-6).toUpperCase()}
                            </div>
                            <div className="text-[11px] text-[#57534E] font-medium truncate max-w-[140px]">
                              {ord.customer}
                            </div>
                            <div className="text-[10px] text-[#78716C] font-mono">
                              {ord.paymentMode === 'cash' ? '💵 Cash' : '📱 Driver UPI'}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-[#1C1917] block">
                              ₹{ord.total}
                            </span>
                            <button
                              onClick={() => handleSettleSingleOrder(ord.id, driver.driverId)}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline"
                            >
                              Settle Single
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
