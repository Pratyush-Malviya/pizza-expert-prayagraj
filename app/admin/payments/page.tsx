'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Search, Download, Filter, CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface PaymentTransaction {
  id: string
  orderId: string
  amount: number
  status: 'captured' | 'failed' | 'refunded' | 'pending'
  method: string
  date: string
  customer: string
}

const INITIAL_FALLBACK_PAYMENTS: PaymentTransaction[] = []

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchPaymentData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && orders && orders.length > 0) {
        const mapped: PaymentTransaction[] = orders.map((o: any) => {
          const addr = o.address_json || {}
          const isCancelled = o.status === 'cancelled'
          const isCod = addr.paymentMethod === 'cod' || o.payment_method === 'cod'
          
          let pStatus: PaymentTransaction['status'] = 'captured'
          if (isCancelled) {
            pStatus = 'refunded'
          } else if (isCod && (o.status === 'pending' || o.status === 'confirmed')) {
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
          }
        })
        setPayments(mapped)
      } else {
        // Localstorage fallback check
        try {
          const localOrders = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
          if (localOrders.length > 0) {
            const mappedLocal = localOrders.map((o: any) => ({
              id: `pay_${String(o.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '').slice(-10)}`,
              orderId: o.id || 'ORD-LOCAL',
              amount: Number(o.total || 0),
              status: (o.status === 'cancelled' ? 'refunded' : 'captured') as PaymentTransaction['status'],
              method: o.address_json?.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay / UPI Online',
              date: o.created_at || new Date().toISOString(),
              customer: o.address_json?.name || 'Local Customer',
            }))
            setPayments([...mappedLocal, ...INITIAL_FALLBACK_PAYMENTS])
          }
        } catch {}
      }
    } catch (err) {
      console.warn('Payment fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentData()

    // Sync on tab focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchPaymentData()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

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
            Live transaction history synchronized with real store sales orders.
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

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center gap-2.5 text-[#15803D] mb-2">
            <div className="p-2 bg-[#F0FDF4] rounded-lg">
              <CreditCard size={18} />
            </div>
            <span className="font-semibold text-xs sm:text-sm uppercase tracking-wider text-[#57534E]">
              Total Revenue Captured
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#1C1917] font-mono">
            ₹{totalCollected.toLocaleString()}
          </p>
          <span className="text-[11px] text-[#15803D] font-medium">From {payments.filter(p => p.status === 'captured').length} completed sales</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center gap-2.5 text-[#D97706] mb-2">
            <div className="p-2 bg-[#FFFBEB] rounded-lg">
              <Clock size={18} />
            </div>
            <span className="font-semibold text-xs sm:text-sm uppercase tracking-wider text-[#57534E]">
              Pending / COD
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#1C1917] font-mono">
            {pendingCount}
          </p>
          <span className="text-[11px] text-[#D97706] font-medium">Cash on Delivery on-the-way</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center gap-2.5 text-[#B91C1C] mb-2">
            <div className="p-2 bg-[#FEF2F2] rounded-lg">
              <XCircle size={18} />
            </div>
            <span className="font-semibold text-xs sm:text-sm uppercase tracking-wider text-[#57534E]">
              Refunded / Cancelled
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#1C1917] font-mono">
            {refundedCount}
          </p>
          <span className="text-[11px] text-[#B91C1C] font-medium">Cancelled order refunds</span>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-white border border-[#E7E0D8] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E7E0D8] flex flex-col sm:flex-row gap-3 justify-between bg-[#FBF9F5]">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" size={16} />
            <input
              type="text"
              placeholder="Search by Order ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-[#E7E0D8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Filter size={15} className="text-[#A8A29E]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm border border-[#E7E0D8] rounded-lg bg-white text-[#1C1917] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="captured">Captured (Paid)</option>
              <option value="pending">Pending (COD)</option>
              <option value="refunded">Refunded / Cancelled</option>
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#57534E]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Transaction ID</th>
                <th className="px-5 py-3.5 font-semibold">Date & Time</th>
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Payment Method</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8]">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-[#FBF9F5] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-mono text-xs text-[#1C1917] font-bold">{payment.id}</div>
                    <div className="text-[11px] text-[#A8A29E] mt-0.5 font-mono">{payment.orderId}</div>
                  </td>
                  <td className="px-5 py-3.5 text-[#57534E] text-xs">
                    {new Date(payment.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#1C1917]">{payment.customer}</td>
                  <td className="px-5 py-3.5 font-bold font-mono text-[#B91C1C]">₹{payment.amount}</td>
                  <td className="px-5 py-3.5 text-[#57534E] text-xs">{payment.method}</td>
                  <td className="px-5 py-3.5">
                    {payment.status === 'captured' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
                        <CheckCircle2 size={12} /> Captured
                      </span>
                    )}
                    {payment.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]">
                        <Clock size={12} /> Pending COD
                      </span>
                    )}
                    {payment.status === 'refunded' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF2F2] text-[#B91C1C] border border-[#FEE2E2]">
                        <XCircle size={12} /> Refunded
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#A8A29E]">
                    No payments found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch Cards View (sm:hidden) */}
        <div className="sm:hidden divide-y divide-[#E7E0D8]">
          {filteredPayments.map((payment) => (
            <div key={payment.id} className="p-4 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-[#1C1917] block">{payment.id}</span>
                  <span className="text-[11px] text-[#A8A29E] font-mono">{payment.orderId}</span>
                </div>
                <span className="font-mono font-bold text-base text-[#B91C1C]">₹{payment.amount}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-semibold text-[#1C1917]">{payment.customer}</span>
                <span className="text-[#57534E] text-[11px]">{payment.method}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E7E0D8]/60">
                <span className="text-[#A8A29E]">
                  {new Date(payment.date).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
                <div>
                  {payment.status === 'captured' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDF4] text-[#15803D]">
                      Captured
                    </span>
                  )}
                  {payment.status === 'pending' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFFBEB] text-[#D97706]">
                      Pending COD
                    </span>
                  )}
                  {payment.status === 'refunded' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF2F2] text-[#B91C1C]">
                      Refunded
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredPayments.length === 0 && (
            <div className="p-8 text-center text-xs text-[#A8A29E]">
              No transactions match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
