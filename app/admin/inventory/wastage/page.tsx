'use client'

import { useState, useEffect, useCallback } from 'react'
import { getInventoryStockWithValuation, recordWastage, getWastageHistory } from '@/app/actions/inventoryLedger'
import {
  Trash2, AlertTriangle, TrendingDown, DollarSign, Plus,
  RefreshCw, Loader2, Calendar, User, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  expired: { label: 'Expired / Stale', color: 'bg-rose-100 text-rose-700' },
  burnt_damaged: { label: 'Burnt / Overcooked', color: 'bg-amber-100 text-amber-700' },
  spill_prep_loss: { label: 'Spillage / Prep Loss', color: 'bg-blue-100 text-blue-700' },
  quality_rejection: { label: 'Quality Rejection', color: 'bg-purple-100 text-purple-700' },
  customer_complaint: { label: 'Customer Remake', color: 'bg-orange-100 text-orange-700' },
  other: { label: 'Other', color: 'bg-stone-100 text-stone-700' },
}

export default function WastagePage() {
  const [ingredients, setIngredients] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState<any>('spill_prep_loss')
  const [notes, setNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    const [stockRes, histRes] = await Promise.all([
      getInventoryStockWithValuation(),
      getWastageHistory(50),
    ])

    if (stockRes.success) {
      setIngredients(stockRes.ingredients)
      if (stockRes.ingredients.length > 0 && !selectedIngredientId) {
        setSelectedIngredientId(stockRes.ingredients[0].id)
      }
    }
    if (histRes.success) {
      setHistory(histRes.records)
    }
    setLoading(false)
  }, [selectedIngredientId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId)
  const estimatedCost = (parseFloat(quantity) || 0) * Number(selectedIngredient?.cost_per_unit || 0)

  const handleSubmitWastage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIngredientId || !quantity || parseFloat(quantity) <= 0) {
      return toast.error('Enter valid quantity')
    }

    setSubmitting(true)
    const res = await recordWastage({
      ingredientId: selectedIngredientId,
      quantity: parseFloat(quantity),
      unit: selectedIngredient?.unit || 'kg',
      reason,
      notes,
    })
    setSubmitting(false)

    if (res.success) {
      toast.success(`Logged wastage of ₹${res.costImpact?.toFixed(2)}`)
      setQuantity('')
      setNotes('')
      loadData()
    } else {
      toast.error(res.error || 'Failed to record wastage')
    }
  }

  const totalWasteLoss = history.reduce((acc, h) => acc + Number(h.cost_impact || 0), 0)
  const filteredHistory = history.filter((h) =>
    (h.ingredient?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
            <Trash2 size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Wastage & Spillage Tracker
            </h1>
            <p className="text-xs text-[#78716C]">
              Log food preparation loss, expired ingredients & track financial impact
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/inventory"
            className="px-3.5 py-2 bg-white border border-[#E7E0D8] text-[#1C1917] hover:bg-[#F4EFEA] rounded-xl text-xs font-bold transition shadow-xs"
          >
            ← Inventory Stock
          </Link>
          <button
            onClick={loadData}
            className="p-2 border border-[#E7E0D8] rounded-xl text-[#78716C] hover:bg-[#F4EFEA] transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-rose-200/60 rounded-xl p-4 shadow-xs bg-rose-50/20">
          <p className="text-xs font-semibold text-rose-700">Total Recorded Loss</p>
          <p className="text-2xl font-bold text-rose-700 mt-0.5">₹{totalWasteLoss.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#78716C]">Total Waste Events</p>
          <p className="text-2xl font-bold text-[#1C1917] mt-0.5">{history.length}</p>
        </div>
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#78716C]">Tracked Ingredients</p>
          <p className="text-2xl font-bold text-[#1C1917] mt-0.5">{ingredients.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Log Wastage Form */}
        <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs h-fit space-y-4">
          <h2 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
            <Plus size={16} className="text-rose-600" /> Record Ingredient Waste
          </h2>

          <form onSubmit={handleSubmitWastage} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Ingredient</label>
              <select
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Stock: {Number(ing.current_stock).toFixed(1)} {ing.unit} @ ₹{Number(ing.cost_per_unit).toFixed(1)}/{ing.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1">Quantity Wasted</label>
                <div className="flex items-center bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.5"
                    className="w-full bg-transparent text-xs font-bold text-[#1C1917] focus:outline-none"
                    required
                  />
                  <span className="text-xs font-semibold text-[#78716C] ml-1">
                    {selectedIngredient?.unit || 'kg'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1">Cost Impact</label>
                <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold font-mono text-rose-600">
                  ₹{estimatedCost.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Wastage Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:outline-none"
              >
                {Object.entries(REASON_LABELS).map(([code, meta]) => (
                  <option key={code} value={code}>{meta.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Burnt in oven during lunch rush"
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !quantity}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Confirm & Deduct Stock
            </button>
          </form>
        </div>

        {/* Right: Wastage Audit History */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-bold text-sm text-[#1C1917]">Recent Wastage Events</h2>
            <div className="relative max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ingredient…"
                className="w-full pl-7 pr-2.5 py-1.5 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#B91C1C]" /></div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-[#A8A29E] text-xs">
              No wastage records logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#78716C] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ingredient</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-right">Cost Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EFEA]">
                  {filteredHistory.map((item) => {
                    const reasonMeta = REASON_LABELS[item.reason] || { label: item.reason, color: 'bg-gray-100 text-gray-700' }
                    return (
                      <tr key={item.id} className="hover:bg-[#FBF9F5] transition">
                        <td className="py-3 px-3 text-[#78716C] font-mono whitespace-nowrap">
                          {new Date(item.recorded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#1C1917]">
                          {item.ingredient?.name || 'Item'}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-[#1C1917]">
                          {Number(item.quantity).toFixed(2)} {item.unit}
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', reasonMeta.color)}>
                            {reasonMeta.label}
                          </span>
                          {item.notes && <p className="text-[10px] text-[#A8A29E] mt-0.5 truncate max-w-xs">{item.notes}</p>}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-600 text-right">
                          -₹{Number(item.cost_impact).toFixed(2)}
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
