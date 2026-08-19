'use client'

import { useState, useEffect, useCallback } from 'react'
import { getLoyaltyRewards, getLoyaltyLedgerHistory } from '@/app/actions/loyaltyLedger'
import { createClient } from '@/lib/supabase/client'
import {
  Gift, Award, Star, Users, ArrowUpRight, ArrowDownRight,
  RefreshCw, Loader2, Search, Plus, Sparkles, Tag
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoyaltyPage() {
  const [rewards, setRewards] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const [rewRes, txnRes, { data: custs }] = await Promise.all([
      getLoyaltyRewards(),
      getLoyaltyLedgerHistory(undefined, 50),
      supabase.from('profiles').select('id, name, email, phone, loyalty_points').order('loyalty_points', { ascending: false }).limit(20),
    ])

    if (rewRes.success) setRewards(rewRes.rewards)
    if (txnRes.success) setTransactions(txnRes.transactions)
    setCustomers(custs || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalPointsIssued = transactions.filter((t) => t.type === 'earn').reduce((s, t) => s + Number(t.points), 0)
  const totalPointsRedeemed = Math.abs(transactions.filter((t) => t.type === 'redeem').reduce((s, t) => s + Number(t.points), 0))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Gift size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Customer Loyalty & Rewards Ledger
            </h1>
            <p className="text-xs text-[#78716C]">
              Earn rate: 1 pt per ₹10 spent · Voucher rewards & transaction ledger
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="p-2 border border-[#E7E0D8] rounded-xl text-[#78716C] hover:bg-[#F4EFEA] self-end sm:self-auto transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#78716C]">Active Rewards</p>
          <p className="text-2xl font-bold text-[#1C1917] mt-0.5">{rewards.length}</p>
        </div>
        <div className="bg-white border border-emerald-200/60 rounded-xl p-4 shadow-xs bg-emerald-50/20">
          <p className="text-xs font-semibold text-emerald-700">Total Points Issued</p>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">+{totalPointsIssued}</p>
        </div>
        <div className="bg-white border border-amber-200/60 rounded-xl p-4 shadow-xs bg-amber-50/20">
          <p className="text-xs font-semibold text-amber-700">Points Redeemed</p>
          <p className="text-2xl font-bold text-amber-700 mt-0.5">-{totalPointsRedeemed}</p>
        </div>
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#78716C]">Top Loyalty Members</p>
          <p className="text-2xl font-bold text-[#1C1917] mt-0.5">{customers.length}</p>
        </div>
      </div>

      {/* Rewards Catalog */}
      <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs space-y-4">
        <h2 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
          <Award size={16} className="text-amber-500" /> Active Loyalty Rewards & Vouchers
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {rewards.map((r) => (
            <div key={r.id} className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#1C1917]">{r.name}</span>
                <span className="text-xs font-bold font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {r.points_required} pts
                </span>
              </div>
              <p className="text-xs text-[#78716C]">{r.description}</p>
              <div className="pt-2 border-t border-[#E7E0D8] flex items-center justify-between text-[11px] text-[#A8A29E]">
                <span>Min Order: ₹{r.min_order_amount}</span>
                <span className="text-emerald-700 font-bold">
                  {r.reward_type === 'percentage_discount' ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ledger History & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Top Loyalty Customers */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs space-y-3">
          <h2 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
            <Users size={16} className="text-[#B91C1C]" /> Top Point Holders
          </h2>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8]">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1C1917] truncate">{c.name || 'Member'}</p>
                  <p className="text-[10px] text-[#78716C] truncate">{c.phone || c.email || '—'}</p>
                </div>
                <span className="text-xs font-bold font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                  {c.loyalty_points || 0} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Ledger History */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-[#1C1917]">Immutable Loyalty Points Ledger</h2>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#B91C1C]" /></div>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-[#A8A29E] text-center py-12">No points transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#78716C] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Points</th>
                    <th className="py-2.5 px-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EFEA]">
                  {transactions.map((t) => {
                    const isEarn = t.type === 'earn'
                    return (
                      <tr key={t.id} className="hover:bg-[#FBF9F5] transition">
                        <td className="py-3 px-3 text-[#78716C] font-mono whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#1C1917]">
                          {t.customer?.name || 'Customer'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            isEarn ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          )}>
                            {t.type}
                          </span>
                          {t.note && <p className="text-[10px] text-[#A8A29E] mt-0.5 truncate max-w-xs">{t.note}</p>}
                        </td>
                        <td className={cn('py-3 px-3 font-mono font-bold', isEarn ? 'text-emerald-600' : 'text-amber-600')}>
                          {isEarn ? `+${t.points}` : t.points}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#1C1917] text-right">
                          {t.balance_after} pts
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
