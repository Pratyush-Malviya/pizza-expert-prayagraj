'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  openCashierShift, closeCashierShift, getActiveShift,
  getShiftSummary, getAllShifts, recordCashPaidOut
} from '@/app/actions/cashierSessions'
import {
  Clock, DollarSign, TrendingUp, TrendingDown, Check, AlertTriangle,
  Loader2, LogIn, LogOut, Banknote, Plus, Minus, RefreshCw, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ShiftsPage() {
  const [cashierId, setCashierId] = useState<string>('')
  const [cashierName, setCashierName] = useState<string>('')
  const [activeShift, setActiveShift] = useState<any>(null)
  const [shiftSummary, setShiftSummary] = useState<any>(null)
  const [allShifts, setAllShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openingCash, setOpeningCash] = useState<string>('500')
  const [closingCash, setClosingCash] = useState<string>('')
  const [closingNotes, setClosingNotes] = useState<string>('')
  const [paidOutAmount, setPaidOutAmount] = useState<string>('')
  const [paidOutNote, setPaidOutNote] = useState<string>('')
  const [terminals, setTerminals] = useState<any[]>([])
  const [selectedTerminal, setSelectedTerminal] = useState<string>('')
  const [placing, setPlacing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      setCashierId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()
      setCashierName(profile?.name || user.email || 'Cashier')

      // Load terminals
      const { data: terms } = await supabase
        .from('pos_terminals')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      setTerminals(terms || [])
      if (terms && terms.length > 0) setSelectedTerminal(terms[0].id)

      // Check active shift
      const shiftResult = await getActiveShift(user.id)
      if (shiftResult.success && shiftResult.data) {
        setActiveShift(shiftResult.data)
        const summary = await getShiftSummary(shiftResult.data.id)
        if (summary.success) setShiftSummary(summary.summary)
      }

      // Load history
      const history = await getAllShifts(20)
      if (history.success) setAllShifts(history.data)

      setLoading(false)
    }
    init()
  }, [])

  const handleOpenShift = async () => {
    if (!selectedTerminal) return toast.error('Select a terminal')
    setPlacing(true)
    const result = await openCashierShift(cashierId, selectedTerminal, parseFloat(openingCash) || 0)
    setPlacing(false)
    if (result.success) {
      setActiveShift(result.shift)
      toast.success('Shift opened!')
      window.location.reload()
    } else {
      toast.error(result.error)
    }
  }

  const handleCloseShift = async () => {
    if (!activeShift) return
    if (!closingCash) return toast.error('Enter actual cash in drawer')
    setPlacing(true)
    const result = await closeCashierShift(activeShift.id, parseFloat(closingCash), closingNotes)
    setPlacing(false)
    if (result.success) {
      const varianceStr = result.variance && result.variance !== 0
        ? ` (${result.isShort ? 'SHORT' : 'OVER'}: ₹${Math.abs(result.variance!).toFixed(2)})`
        : ' (balanced!)'
      toast.success(`Shift closed${varianceStr}`)
      setActiveShift(null)
      setShiftSummary(null)
      window.location.reload()
    } else {
      toast.error(result.error)
    }
  }

  const handlePaidOut = async () => {
    if (!activeShift || !paidOutAmount || !paidOutNote) return toast.error('Enter amount and note')
    const result = await recordCashPaidOut(activeShift.id, parseFloat(paidOutAmount), paidOutNote)
    if (result.success) {
      toast.success('Cash paid-out recorded')
      setPaidOutAmount('')
      setPaidOutNote('')
    } else toast.error(result.error)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#B91C1C]" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Cashier Shift</h1>
          <p className="text-sm text-[#78716C] mt-0.5">Manage your daily shift and cash drawer</p>
        </div>
        <Link
          href="/admin/pos"
          className="flex items-center gap-2 px-4 py-2 bg-[#B91C1C] text-white rounded-xl text-sm font-semibold hover:bg-[#991B1B] transition"
        >
          Open POS
        </Link>
      </div>

      {/* ── No Active Shift ── */}
      {!activeShift && (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="font-bold text-[#1C1917]">No Open Shift</h2>
              <p className="text-sm text-[#78716C]">Open a shift to start billing</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">Terminal</label>
              <select
                value={selectedTerminal}
                onChange={(e) => setSelectedTerminal(e.target.value)}
                className="w-full border border-[#E7E0D8] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30"
              >
                {terminals.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">Opening Cash (₹)</label>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full border border-[#E7E0D8] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30"
                placeholder="500"
              />
            </div>
          </div>

          <button
            onClick={handleOpenShift}
            disabled={placing}
            className="w-full py-3 bg-[#B91C1C] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#991B1B] transition disabled:opacity-50"
          >
            {placing ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            Open Shift with ₹{openingCash || '0'}
          </button>
        </div>
      )}

      {/* ── Active Shift ── */}
      {activeShift && shiftSummary && (
        <>
          {/* Shift Info */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center">
                  <Check size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-[#1C1917]">Shift Open</h2>
                  <p className="text-sm text-[#78716C]">
                    {activeShift.pos_terminals?.name} — since {new Date(activeShift.opened_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Opening Float', value: `₹${shiftSummary.openingFloat.toFixed(2)}`, color: 'text-[#1C1917]' },
                { label: 'Cash Sales', value: `₹${shiftSummary.cashSales.toFixed(2)}`, color: 'text-[#15803D]' },
                { label: 'UPI Sales', value: `₹${shiftSummary.upiSales.toFixed(2)}`, color: 'text-[#1D4ED8]' },
                { label: 'Card Sales', value: `₹${shiftSummary.cardSales.toFixed(2)}`, color: 'text-[#7C3AED]' },
                { label: 'Refunds', value: `₹${shiftSummary.cashRefunds.toFixed(2)}`, color: 'text-[#B91C1C]' },
                { label: 'Total Sales', value: `₹${shiftSummary.totalSales.toFixed(2)}`, color: 'text-[#1C1917] font-bold' },
              ].map((item) => (
                <div key={item.label} className="bg-[#FBF9F5] rounded-xl p-3">
                  <p className="text-xs text-[#78716C] mb-1">{item.label}</p>
                  <p className={cn('text-sm font-bold', item.color)}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 p-3 bg-[#FEF3C7] rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-[#92400E] font-semibold">Expected Cash in Drawer</p>
                <p className="text-lg font-bold text-[#92400E]">₹{shiftSummary.expectedCash.toFixed(2)}</p>
              </div>
              <p className="text-xs text-[#78716C]">{shiftSummary.totalOrders} orders this shift</p>
            </div>
          </div>

          {/* Paid-Out */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5">
            <h3 className="font-bold text-sm text-[#1C1917] mb-3">Cash Paid-Out</h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={paidOutAmount}
                onChange={(e) => setPaidOutAmount(e.target.value)}
                placeholder="Amount ₹"
                className="w-28 border border-[#E7E0D8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/30"
              />
              <input
                value={paidOutNote}
                onChange={(e) => setPaidOutNote(e.target.value)}
                placeholder="Reason (petty cash, expense…)"
                className="flex-1 border border-[#E7E0D8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/30"
              />
              <button
                onClick={handlePaidOut}
                className="px-3 py-2 bg-[#1C1917] text-white rounded-lg text-sm font-semibold hover:bg-[#292524] transition"
              >
                Record
              </button>
            </div>
          </div>

          {/* Close Shift */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5 space-y-3">
            <h3 className="font-bold text-sm text-[#1C1917]">Close Shift</h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-[#57534E] mb-1">Actual Cash Counted (₹)</label>
                <input
                  type="number"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder={`Expected: ₹${shiftSummary.expectedCash.toFixed(2)}`}
                  className="w-full border border-[#E7E0D8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30"
                />
              </div>
            </div>

            {closingCash && (
              <div className={cn(
                'p-3 rounded-xl text-sm font-semibold flex items-center justify-between',
                parseFloat(closingCash) === shiftSummary.expectedCash ? 'bg-[#F0FDF4] text-[#15803D]' :
                parseFloat(closingCash) > shiftSummary.expectedCash ? 'bg-[#EFF6FF] text-[#1D4ED8]' :
                'bg-[#FEF2F2] text-[#B91C1C]'
              )}>
                <span>
                  {parseFloat(closingCash) === shiftSummary.expectedCash ? '✓ Balanced' :
                   parseFloat(closingCash) > shiftSummary.expectedCash ? `OVER by ₹${(parseFloat(closingCash) - shiftSummary.expectedCash).toFixed(2)}` :
                   `SHORT by ₹${(shiftSummary.expectedCash - parseFloat(closingCash)).toFixed(2)}`}
                </span>
              </div>
            )}

            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full border border-[#E7E0D8] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/30"
            />

            <button
              onClick={handleCloseShift}
              disabled={placing || !closingCash}
              className="w-full py-3 bg-[#1C1917] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#292524] transition disabled:opacity-50"
            >
              {placing ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              Close Shift
            </button>
          </div>
        </>
      )}

      {/* Shift History */}
      <div className="bg-white rounded-2xl border border-[#E7E0D8] overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <h3 className="font-bold text-sm text-[#1C1917]">Recent Shifts</h3>
          <ChevronDown size={16} className={cn('text-[#78716C] transition', showHistory ? 'rotate-180' : '')} />
        </button>
        {showHistory && (
          <div className="divide-y divide-[#F4EFEA]">
            {allShifts.slice(0, 10).map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-[#1C1917] text-xs">{s.profiles?.name || 'Staff'} — {s.pos_terminals?.name}</p>
                  <p className="text-xs text-[#78716C]">{new Date(s.opened_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', s.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-[#F4EFEA] text-[#78716C]')}>
                    {s.status}
                  </span>
                  {s.cash_variance !== null && (
                    <p className={cn('text-xs mt-0.5', Number(s.cash_variance) > 0 ? 'text-blue-600' : Number(s.cash_variance) < 0 ? 'text-red-600' : 'text-green-600')}>
                      {Number(s.cash_variance) === 0 ? '✓ Balanced' : Number(s.cash_variance) > 0 ? `+₹${Math.abs(s.cash_variance).toFixed(2)}` : `-₹${Math.abs(s.cash_variance).toFixed(2)}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {allShifts.length === 0 && (
              <p className="text-sm text-[#78716C] text-center py-6">No shift history yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
