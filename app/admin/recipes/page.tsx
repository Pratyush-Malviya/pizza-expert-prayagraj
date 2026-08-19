'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProductsWithCosting, getProductRecipeBOM, saveRecipeBOM, type RecipeItemInput } from '@/app/actions/recipes'
import {
  ChefHat, DollarSign, TrendingUp, Percent, Plus, Trash2,
  CheckCircle2, AlertTriangle, RefreshCw, Loader2, Search, X, Edit3, ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function RecipesPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [bomLoading, setBomLoading] = useState(false)
  const [bomData, setBomData] = useState<any | null>(null)
  const [recipeLines, setRecipeLines] = useState<Array<{ ingredientId: string; quantity: number }>>([])
  const [saving, setSaving] = useState(false)

  const loadProducts = useCallback(async () => {
    const res = await getProductsWithCosting()
    if (res.success) setProducts(res.products)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleSelectProduct = async (prod: any) => {
    setSelectedProduct(prod)
    setBomLoading(true)
    const res = await getProductRecipeBOM(prod.id)
    if (res.success) {
      setBomData(res)
      setRecipeLines(
        (res.recipeItems || []).map((r: any) => ({
          ingredientId: r.ingredient_id,
          quantity: Number(r.quantity),
        }))
      )
    }
    setBomLoading(false)
  }

  const addRecipeLine = () => {
    if (!bomData?.allIngredients || bomData.allIngredients.length === 0) {
      return toast.error('No ingredients available in inventory. Add ingredients first.')
    }
    setRecipeLines((prev) => [
      ...prev,
      { ingredientId: bomData.allIngredients[0].id, quantity: 1 },
    ])
  }

  const removeRecipeLine = (idx: number) => {
    setRecipeLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateLine = (idx: number, field: 'ingredientId' | 'quantity', val: any) => {
    setRecipeLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, [field]: val } : line))
    )
  }

  const handleSaveRecipe = async () => {
    if (!selectedProduct) return
    setSaving(true)
    const res = await saveRecipeBOM(selectedProduct.id, recipeLines)
    setSaving(false)
    if (res.success) {
      toast.success(`Recipe BOM saved for ${selectedProduct.name}`)
      setSelectedProduct(null)
      loadProducts()
    } else {
      toast.error(res.error || 'Failed to save recipe')
    }
  }

  // Calculate live dynamic food cost from edited lines
  const calculatedCost = recipeLines.reduce((acc, line) => {
    const ing = bomData?.allIngredients?.find((i: any) => i.id === line.ingredientId)
    return acc + (Number(line.quantity || 0) * Number(ing?.cost_per_unit || 0))
  }, 0)

  const sellingPrice = Number(selectedProduct?.price || 0)
  const dynamicFoodCostPct = sellingPrice > 0 ? (calculatedCost / sellingPrice) * 100 : 0
  const dynamicMargin = Math.max(0, sellingPrice - calculatedCost)

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const avgFoodCost = products.length > 0
    ? Math.round((products.reduce((acc, p) => acc + p.foodCostPercentage, 0) / products.length) * 10) / 10
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B91C1C] text-white flex items-center justify-center shadow-xs">
            <ChefHat size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Recipe BOM & Food Costing
            </h1>
            <p className="text-xs text-[#78716C]">
              Ingredient Bill of Materials, recipe costing formulas & gross profit margins
            </p>
          </div>
        </div>

        <button
          onClick={loadProducts}
          className="p-2 border border-[#E7E0D8] rounded-xl text-[#78716C] hover:bg-[#F4EFEA] self-end sm:self-auto transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#78716C]">Total Menu Items</p>
          <p className="text-2xl font-bold text-[#1C1917] mt-0.5">{products.length}</p>
        </div>
        <div className="bg-white border border-emerald-200/60 rounded-xl p-4 shadow-xs bg-emerald-50/20">
          <p className="text-xs font-semibold text-emerald-700">Recipes Configured</p>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">
            {products.filter((p) => p.hasRecipe).length}
          </p>
        </div>
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#78716C]">Average Food Cost %</p>
          <p className="text-2xl font-bold text-[#B91C1C] mt-0.5">{avgFoodCost}%</p>
        </div>
        <div className="bg-white border border-amber-200/60 rounded-xl p-4 shadow-xs bg-amber-50/20">
          <p className="text-xs font-semibold text-amber-700">High Cost (&gt;35%)</p>
          <p className="text-2xl font-bold text-amber-700 mt-0.5">
            {products.filter((p) => p.foodCostPercentage > 35).length}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search menu product…"
          className="w-full pl-8 pr-3 py-2 bg-white border border-[#E7E0D8] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/40 shadow-xs"
        />
      </div>

      {/* Product List Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-[#B91C1C]" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#78716C] font-semibold">
                <tr>
                  <th className="py-3 px-4">Menu Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">Ingredient Cost</th>
                  <th className="py-3 px-4">Food Cost %</th>
                  <th className="py-3 px-4">Gross Margin</th>
                  <th className="py-3 px-4 text-right">Recipe BOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EFEA]">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#FBF9F5] transition">
                    <td className="py-3.5 px-4 font-bold text-[#1C1917] flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', prod.is_veg ? 'bg-green-500' : 'bg-red-500')} />
                      {prod.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#78716C]">{prod.category?.name || 'Pizza'}</td>
                    <td className="py-3.5 px-4 font-bold font-mono text-[#1C1917]">₹{prod.price}</td>
                    <td className="py-3.5 px-4 font-mono text-[#78716C]">
                      {prod.hasRecipe ? `₹${prod.ingredientCost.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {prod.hasRecipe ? (
                        <span className={cn(
                          'px-2 py-0.5 rounded-full font-bold text-[10px] font-mono',
                          prod.foodCostPercentage <= 28 ? 'bg-emerald-100 text-emerald-700' :
                          prod.foodCostPercentage <= 35 ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        )}>
                          {prod.foodCostPercentage}%
                        </span>
                      ) : (
                        <span className="text-[#A8A29E]">No BOM</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#15803D]">
                      {prod.hasRecipe ? `₹${prod.grossMargin.toFixed(2)} (${prod.grossMarginPercentage}%)` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleSelectProduct(prod)}
                        className="px-3 py-1.5 bg-[#F4EFEA] hover:bg-[#B91C1C] hover:text-white text-[#1C1917] rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ml-auto shadow-xs"
                      >
                        <Edit3 size={12} /> {prod.hasRecipe ? 'Edit BOM' : '+ Add Recipe'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recipe BOM Builder Modal ── */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D8]">
              <div>
                <h3 className="text-lg font-bold font-serif text-[#1C1917]">
                  Recipe BOM: {selectedProduct.name}
                </h3>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Selling Price: <span className="font-bold text-[#1C1917] font-mono">₹{selectedProduct.price}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-full hover:bg-[#F4EFEA] text-[#78716C]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Cost Summary Card */}
            <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] font-bold text-[#78716C] uppercase block">Total Cost</span>
                <span className="text-base font-bold text-[#B91C1C] font-mono">₹{calculatedCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#78716C] uppercase block">Food Cost %</span>
                <span className={cn(
                  'text-base font-bold font-mono',
                  dynamicFoodCostPct <= 30 ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {dynamicFoodCostPct.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#78716C] uppercase block">Gross Margin</span>
                <span className="text-base font-bold text-emerald-600 font-mono">₹{dynamicMargin.toFixed(2)}</span>
              </div>
            </div>

            {/* Ingredient Lines */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[160px]">
              {bomLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#B91C1C]" /></div>
              ) : recipeLines.length === 0 ? (
                <div className="text-center py-8 text-[#A8A29E] text-xs">
                  No ingredients added to this recipe formula yet.
                </div>
              ) : (
                recipeLines.map((line, idx) => {
                  const ing = bomData?.allIngredients?.find((i: any) => i.id === line.ingredientId)
                  const lineCost = (Number(line.quantity || 0) * Number(ing?.cost_per_unit || 0))

                  return (
                    <div key={idx} className="flex items-center gap-2 bg-[#FBF9F5] p-2.5 rounded-xl border border-[#E7E0D8]">
                      {/* Ingredient selector */}
                      <select
                        value={line.ingredientId}
                        onChange={(e) => updateLine(idx, 'ingredientId', e.target.value)}
                        className="flex-1 bg-white border border-[#E7E0D8] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1917] focus:outline-none"
                      >
                        {(bomData?.allIngredients || []).map((i: any) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (₹{Number(i.cost_per_unit).toFixed(2)}/{i.unit})
                          </option>
                        ))}
                      </select>

                      {/* Quantity input */}
                      <div className="w-24 flex items-center bg-white border border-[#E7E0D8] rounded-lg px-2 py-1.5">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-bold text-[#1C1917] focus:outline-none"
                        />
                        <span className="text-[10px] text-[#A8A29E] ml-1">{ing?.unit || 'u'}</span>
                      </div>

                      {/* Cost output */}
                      <span className="w-16 text-right font-mono font-bold text-xs text-[#1C1917]">
                        ₹{lineCost.toFixed(1)}
                      </span>

                      {/* Remove line */}
                      <button
                        onClick={() => removeRecipeLine(idx)}
                        className="p-1 text-[#A8A29E] hover:text-rose-600 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-[#E7E0D8] flex items-center justify-between gap-3">
              <button
                onClick={addRecipeLine}
                className="px-3 py-2 bg-white border border-[#E7E0D8] hover:bg-[#F4EFEA] text-[#1C1917] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus size={13} /> Add Ingredient
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#78716C] hover:bg-[#F4EFEA]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecipe}
                  disabled={saving}
                  className="px-5 py-2 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Save Recipe BOM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
