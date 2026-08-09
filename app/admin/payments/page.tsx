'use client'

import { useState } from 'react'
import { CreditCard, Search, Download, Filter, CheckCircle2, Clock, XCircle } from 'lucide-react'

// Mock Data
const MOCK_PAYMENTS = [
  { id: 'pay_NmKq9r5Z3V6wX1', orderId: 'ORD-2024-1052', amount: 849, status: 'captured', method: 'UPI', date: '2024-03-15T14:30:00Z', customer: 'Rahul Sharma' },
  { id: 'pay_NmKq9r5Z3V6wX2', orderId: 'ORD-2024-1053', amount: 1299, status: 'captured', method: 'Card', date: '2024-03-15T15:45:00Z', customer: 'Priya Singh' },
  { id: 'pay_NmKq9r5Z3V6wX3', orderId: 'ORD-2024-1054', amount: 450, status: 'failed', method: 'UPI', date: '2024-03-15T16:10:00Z', customer: 'Amit Verma' },
  { id: 'pay_NmKq9r5Z3V6wX4', orderId: 'ORD-2024-1055', amount: 2150, status: 'captured', method: 'Netbanking', date: '2024-03-16T10:20:00Z', customer: 'Neha Gupta' },
  { id: 'pay_NmKq9r5Z3V6wX5', orderId: 'ORD-2024-1056', amount: 599, status: 'refunded', method: 'Card', date: '2024-03-16T11:05:00Z', customer: 'Vikas Kumar' },
  { id: 'pay_NmKq9r5Z3V6wX6', orderId: 'ORD-2024-1057', amount: 349, status: 'captured', method: 'UPI', date: '2024-03-16T12:30:00Z', customer: 'Sneha Reddy' },
]

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPayments = MOCK_PAYMENTS.filter(p => 
    p.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalCollected = MOCK_PAYMENTS.filter(p => p.status === 'captured').reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1C1917]">Payments</h1>
          <p className="text-[#57534E] text-xs sm:text-sm">Manage Razorpay transactions and refunds.</p>
        </div>
        <button className="btn btn-outline btn-sm flex items-center gap-2 self-start sm:self-auto">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center gap-3 text-[#15803D] mb-2">
            <div className="p-2 bg-[#F0FDF4] rounded-lg"><CreditCard size={20} /></div>
            <span className="font-semibold text-sm">Total Captured</span>
          </div>
          <p className="text-3xl font-bold text-[#1C1917]">₹{totalCollected.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center gap-3 text-[#B91C1C] mb-2">
            <div className="p-2 bg-[#FEF2F2] rounded-lg"><XCircle size={20} /></div>
            <span className="font-semibold text-sm">Failed Payments</span>
          </div>
          <p className="text-3xl font-bold text-[#1C1917]">
            {MOCK_PAYMENTS.filter(p => p.status === 'failed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs">
          <div className="flex items-center gap-3 text-[#D97706] mb-2">
            <div className="p-2 bg-[#FFFBEB] rounded-lg"><Clock size={20} /></div>
            <span className="font-semibold text-sm">Refunds</span>
          </div>
          <p className="text-3xl font-bold text-[#1C1917]">
            {MOCK_PAYMENTS.filter(p => p.status === 'refunded').length}
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-[#E7E0D8] rounded-xl shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E7E0D8] flex flex-col sm:flex-row gap-4 justify-between bg-[#FBF9F5]">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" size={16} />
            <input 
              type="text" 
              placeholder="Search by Order ID or Name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#E7E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
            />
          </div>
          <button className="btn btn-outline btn-sm flex items-center gap-2">
            <Filter size={15} /> Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#57534E]">
              <tr>
                <th className="px-6 py-4 font-semibold">Transaction ID</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8]">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-[#FBF9F5] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs text-[#1C1917] font-medium">{payment.id}</div>
                    <div className="text-[11px] text-[#A8A29E] mt-0.5">{payment.orderId}</div>
                  </td>
                  <td className="px-6 py-4 text-[#57534E]">
                    {new Date(payment.date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 font-medium text-[#1C1917]">{payment.customer}</td>
                  <td className="px-6 py-4 font-semibold text-[#1C1917]">₹{payment.amount}</td>
                  <td className="px-6 py-4 text-[#57534E]">{payment.method}</td>
                  <td className="px-6 py-4">
                    {payment.status === 'captured' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
                        <CheckCircle2 size={12} /> Captured
                      </span>
                    )}
                    {payment.status === 'failed' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#B91C1C] border border-[#FEE2E2]">
                        <XCircle size={12} /> Failed
                      </span>
                    )}
                    {payment.status === 'refunded' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]">
                        <Clock size={12} /> Refunded
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#A8A29E]">
                    No payments found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
