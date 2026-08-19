'use client'

import { useState, useEffect, useCallback } from 'react'
import { getInventoryStockWithValuation, recordStockAdjustment, getInventoryMovementHistory } from '@/app/actions/inventoryLedger'
import {
  SlidersHorizontal, CheckCircle2, AlertTriangle, RefreshCw,
  Loader2, Plus, ArrowUpDown, DollarSign, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AdjustmentsPage() {
  const [ingredients, setIngredients] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [countedStock, setCountedStock] = useState('')
  const [reason, setReason] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    const [stockRes, movRes] = await Promise.all([
      getInventoryStockWithValuation(),
      getInventoryMovementHistory(undefined, 50),
    ])

    if (stockRes.success) {
      setIngredients(stockRes.ingredients)
      if (stockRes.ingredients.length > 0 && !selectedIngredientId) {
        setSelectedIngredientId(stockRes.ingredients[0].id)
      }
    }
    if (movRes.success) {
      setMovements(movRes.movements)
    }
    setLoading(false)
  }, [selectedIngredientId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId)
  const systemStock = Number(selectedIngredient?.current_stock || 0)
  const physicalNum = parseFloat(countedStock) || 0
  const variance = countedStock ? physicalNum - systemStock : 0
  const costVariance = variance * Number(selectedIngredient?.cost_per_unit || 0)

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIngredientId || countedStock === '') {
      return toast.error('Enter counted physical stock')
    }
    if (!reason.trim()) {
      return toast.error('Enter reason for reconciliation')
    }

    setSubmitting(true)
    const res = await recordStockAdjustment({
      ingredientId: selectedIngredientId,
      countedStock: physicalNum,
      reason,
    })
    setSubmitting(false)

    if (res.success && res.variance !== undefined) {
      toast.success(`Adjusted stock. Variance: ${res.variance > 0 ? '+' : ''}${res.variance} ${selectedIngredient?.unit || ''}`)
      setCountedStock('')
      setReason('')
      loadData()
    } else {
      toast.error(res.error || 'Failed to adjust stock')
    }
  }

  const filteredMovements = movements.filter((m) =>
    (m.ingredient?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1C1917] text-white flex items-center justify-center shadow-xs">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Stock Reconciliation & Adjustments
            </h1>
            <p className="text-xs text-[#78716C]">
              Reconcile physical stock counts with digital inventory & review ledger audit
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Adjustment Form */}
        <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs h-fit space-y-4">
          <h2 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[#B91C1C]" /> Physical Count Entry
          </h2>

          <form onSubmit={handleAdjust} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Select Ingredient</label>
              <select
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Current: {Number(ing.current_stock).toFixed(2)} {ing.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1">System Stock</label>
                <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold font-mono text-[#1C1917]">
                  {systemStock.toFixed(2)} {selectedIngredient?.unit || 'kg'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1">Physical Counted</label>
                <div className="flex items-center bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={countedStock}
                    onChange={(e) => setCountedStock(e.target.value)}
                    placeholder="e.g. 14.5"
                    className="w-full bg-transparent text-xs font-bold text-[#1C1917] focus:outline-none"
                    required
                  />
                  <span className="text-xs font-semibold text-[#78716C] ml-1">
                    {selectedIngredient?.unit || 'kg'}
                  </span>
                </div>
              </div>
            </div>

            {/* Variance indicator */}
            {countedStock !== '' && (
              <div className={cn(
                'p-3 rounded-xl border text-xs font-bold flex items-center justify-between',
                variance === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                variance > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' :
                'bg-rose-50 border-rose-200 text-rose-700'
              )}>
                <span>
                  {variance === 0 ? '✓ Physical matches System' :
                   variance > 0 ? `+ Overstock Variance: +${variance.toFixed(2)} ${selectedIngredient?.unit}` :
                   `− Shortage Variance: ${variance.toFixed(2)} ${selectedIngredient?.unit}`}
                </span>
                <span className="font-mono font-bold">
                  {costVariance >= 0 ? '+' : ''}₹{costVariance.toFixed(2)}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Adjustment Reason</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Weekly physical audit discrepancy"
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting || countedStock === ''}
              className="w-full py-2.5 bg-[#1C1917] hover:bg-[#292524] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Apply Stock Adjustment
            </button>
          </form>
        </div>

        {/* Right: Movement Ledger Audit Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-bold text-sm text-[#1C1917]">Immutable Movement Ledger Audit</h2>
            <div className="relative max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by ingredient…"
                className="w-full pl-7 pr-2.5 py-1.5 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#B91C1C]" /></div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-12 text-[#A8A29E] text-xs">
              No inventory movements recorded in ledger yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#78716C] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ingredient</th>
                    <th className="py-2.5 px-3">Movement Type</th>
                    <th className="py-2.5 px-3">Change Qty</th>
                    <th className="py-2.5 px-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EFEA]">
                  {filteredMovements.map((mov) => {
                    const isPositive = Number(mov.quantity) > 0
                    return (
                      <tr key={mov.id} className="hover:bg-[#FBF9F5] transition">
                        <td className="py-3 px-3 text-[#78716C] font-mono whitespace-nowrap">
                          {new Date(mov.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#1C1917]">
                          {mov.ingredient?.name || 'Ingredient'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            mov.movement_type === 'sale' ? 'bg-blue-100 text-blue-700' :
                            mov.movement_type === 'purchase_receipt' ? 'bg-emerald-100 text-emerald-700' :
                            mov.movement_type === 'wastage' ? 'bg-rose-100 text-rose-700' :
                            'bg-purple-100 text-purple-700'
                          )}>
                            {mov.movement_type.replace('_', ' ')}
                          </span>
                          {mov.note && <p className="text-[10px] text-[#A8A29E] mt-0.5 truncate max-w-xs">{mov.note}</p>}
                        </td>
                        <td className={cn('py-3 px-3 font-mono font-bold', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                          {isPositive ? '+' : ''}{Number(mov.quantity).toFixed(2)} {mov.ingredient?.unit || ''}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-[#1C1917] text-right">
                          {Number(mov.balance_after).toFixed(2)} {mov.ingredient?.unit || ''}
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
