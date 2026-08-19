'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAllShifts, getShiftSummary } from '@/app/actions/cashierSessions'
import {
  Clock, TrendingUp, TrendingDown, Check, AlertTriangle,
  Loader2, ChevronDown, ChevronUp, Banknote, Smartphone, CreditCard
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShiftWithSummary {
  id: string
  opened_at: string
  closed_at: string | null
  status: string
  opening_cash: number
  closing_cash: number | null
  expected_cash: number | null
  cash_variance: number | null
  notes: string | null
  pos_terminals: { name: string } | null
  profiles: { name: string } | null
  summary?: {
    cashSales: number
    upiSales: number
    cardSales: number
    totalSales: number
    cashRefunds: number
    expectedCash: number
    totalOrders: number
  }
}

export default function CashierReportPage() {
  const [shifts, setShifts] = useState<ShiftWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryCache, setSummaryCache] = useState<Record<string, any>>({})
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d'>('today')

  useEffect(() => {
    loadShifts()
  }, [dateRange])

  const loadShifts = async () => {
    setLoading(true)
    const result = await getAllShifts(50)
    if (result.success) {
      const now = new Date()
      let cutoff: Date
      if (dateRange === 'today') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (dateRange === '7d') {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
      setShifts((result.data as ShiftWithSummary[]).filter((s) => new Date(s.opened_at) >= cutoff))
    }
    setLoading(false)
  }

  const handleExpand = async (shiftId: string) => {
    if (expandedId === shiftId) {
      setExpandedId(null)
      return
    }
    setExpandedId(shiftId)
    if (summaryCache[shiftId]) return

    setSummaryLoading(true)
    const result = await getShiftSummary(shiftId)
    if (result.success) {
      setSummaryCache((prev) => ({ ...prev, [shiftId]: result.summary }))
    }
    setSummaryLoading(false)
  }

  // Aggregate totals
  const closedShifts = shifts.filter((s) => s.status === 'closed')
  const totalCashVariance = closedShifts.reduce((s, sh) => s + Number(sh.cash_variance || 0), 0)
  const shortShifts = closedShifts.filter((s) => Number(s.cash_variance) < 0)
  const overShifts = closedShifts.filter((s) => Number(s.cash_variance) > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Cashier Report</h1>
          <p className="text-sm text-[#78716C] mt-0.5">Shift-by-shift cash reconciliation and variance</p>
        </div>
        <div className="flex bg-white border border-[#E7E0D8] rounded-xl overflow-hidden">
          {(['today', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={cn(
                'px-4 py-2 text-xs font-semibold transition-all',
                dateRange === r ? 'bg-[#B91C1C] text-white' : 'text-[#78716C] hover:bg-[#F4EFEA]'
              )}
            >
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      {closedShifts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-4">
            <p className="text-xs text-[#78716C] font-semibold mb-1">Total Shifts</p>
            <p className="text-2xl font-bold text-[#1C1917]">{shifts.length}</p>
            <p className="text-xs text-[#A8A29E]">{closedShifts.length} closed</p>
          </div>
          <div className={cn('rounded-2xl border p-4', totalCashVariance === 0 ? 'bg-green-50 border-green-100' : totalCashVariance > 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100')}>
            <p className={cn('text-xs font-semibold mb-1', totalCashVariance === 0 ? 'text-green-600' : totalCashVariance > 0 ? 'text-blue-600' : 'text-red-600')}>
              Net Cash Variance
            </p>
            <p className={cn('text-2xl font-bold', totalCashVariance === 0 ? 'text-green-700' : totalCashVariance > 0 ? 'text-blue-700' : 'text-red-700')}>
              {totalCashVariance > 0 ? '+' : ''}₹{totalCashVariance.toFixed(2)}
            </p>
            <p className="text-xs text-[#A8A29E]">{shortShifts.length} short, {overShifts.length} over</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-4">
            <p className="text-xs text-[#78716C] font-semibold mb-1">Open Shifts</p>
            <p className="text-2xl font-bold text-[#1C1917]">{shifts.filter((s) => s.status === 'open').length}</p>
            <p className="text-xs text-[#A8A29E]">Currently active</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#B91C1C]" size={24} /></div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] p-12 text-center">
          <Clock size={40} className="mx-auto mb-3 text-[#D6D3D1]" />
          <p className="text-[#78716C] font-semibold">No shifts found for this period</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => {
            const isExpanded = expandedId === shift.id
            const summary = summaryCache[shift.id]
            const variance = shift.cash_variance
            const isOpen = shift.status === 'open'
            const duration = shift.closed_at
              ? Math.round((new Date(shift.closed_at).getTime() - new Date(shift.opened_at).getTime()) / 60000)
              : Math.round((Date.now() - new Date(shift.opened_at).getTime()) / 60000)

            return (
              <div key={shift.id} className="bg-white rounded-2xl border border-[#E7E0D8] overflow-hidden">
                {/* Shift Row */}
                <button
                  onClick={() => handleExpand(shift.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#FBF9F5] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Dot */}
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                      isOpen ? 'bg-green-100 text-green-600' :
                      variance === null ? 'bg-[#F4EFEA] text-[#78716C]' :
                      Number(variance) === 0 ? 'bg-green-100 text-green-600' :
                      Number(variance) > 0 ? 'bg-blue-100 text-blue-600' :
                      'bg-red-100 text-red-600'
                    )}>
                      {isOpen ? <Clock size={16} /> :
                       variance === null ? <Clock size={16} /> :
                       Number(variance) === 0 ? <Check size={16} /> :
                       Number(variance) > 0 ? <TrendingUp size={16} /> :
                       <TrendingDown size={16} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#1C1917]">
                          {shift.profiles?.name || 'Cashier'}
                        </span>
                        <span className="text-xs text-[#A8A29E]">@{shift.pos_terminals?.name}</span>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', isOpen ? 'bg-green-100 text-green-700' : 'bg-[#F4EFEA] text-[#78716C]')}>
                          {isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>
                      <p className="text-xs text-[#A8A29E]">
                        {new Date(shift.opened_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{duration}m
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Cash variance */}
                    {!isOpen && variance !== null && (
                      <div className="text-right">
                        <p className="text-xs text-[#78716C]">Variance</p>
                        <p className={cn('text-sm font-bold', Number(variance) === 0 ? 'text-green-600' : Number(variance) > 0 ? 'text-blue-600' : 'text-red-600')}>
                          {Number(variance) > 0 ? '+' : ''}₹{Number(variance).toFixed(2)}
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-xs text-[#78716C]">Opening</p>
                      <p className="text-sm font-semibold text-[#1C1917]">₹{Number(shift.opening_cash).toFixed(0)}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-[#78716C]" /> : <ChevronDown size={16} className="text-[#78716C]" />}
                  </div>
                </button>

                {/* Expanded Summary */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#F4EFEA]">
                    {summaryLoading && !summary ? (
                      <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-[#B91C1C]" size={16} /></div>
                    ) : summary ? (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {[
                          { label: 'Cash Sales', value: `₹${summary.cashSales.toFixed(0)}`, icon: Banknote, color: 'text-[#15803D]' },
                          { label: 'UPI Sales', value: `₹${summary.upiSales.toFixed(0)}`, icon: Smartphone, color: 'text-blue-600' },
                          { label: 'Card Sales', value: `₹${summary.cardSales.toFixed(0)}`, icon: CreditCard, color: 'text-purple-600' },
                          { label: 'Total Orders', value: String(summary.totalOrders), icon: Clock, color: 'text-[#78716C]' },
                          { label: 'Expected Cash', value: `₹${summary.expectedCash.toFixed(0)}`, icon: Banknote, color: 'text-[#D97706]' },
                          { label: 'Actual Cash', value: shift.closing_cash !== null ? `₹${Number(shift.closing_cash).toFixed(0)}` : '—', icon: Banknote, color: 'text-[#1C1917]' },
                          { label: 'Refunds', value: `₹${summary.cashRefunds.toFixed(0)}`, icon: TrendingDown, color: 'text-red-600' },
                          { label: 'Total Sales', value: `₹${summary.totalSales.toFixed(0)}`, icon: TrendingUp, color: 'text-[#B91C1C]' },
                        ].map((item) => (
                          <div key={item.label} className="bg-[#FBF9F5] rounded-xl p-2.5">
                            <p className="text-[10px] text-[#A8A29E] mb-0.5">{item.label}</p>
                            <p className={cn('text-sm font-bold', item.color)}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {shift.notes && (
                      <p className="mt-2 text-xs text-[#78716C] bg-[#FEF3C7] px-3 py-1.5 rounded-lg">
                        📝 {shift.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
