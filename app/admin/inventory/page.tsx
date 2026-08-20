'use client'

import { useState, useEffect } from 'react'
import {
  Boxes, AlertTriangle, Plus, RefreshCw, Search, CheckCircle2,
  AlertCircle, ChevronRight, Edit3, Trash2, ArrowUpRight, Scale, BookOpen
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useStoreStore } from '@/lib/store/useStoreStore'
import { Ingredient, Product, RecipeItem } from '@/types'

// Mock seed ingredients for initial display if DB table is fresh
const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: '1', name: 'Fresh Mozzarella Cheese', unit: 'kg', current_stock: 4.5, reorder_threshold: 10.0, cost_per_unit: 450, expiry_date: '2026-08-18', supplier_id: null, created_at: '', updated_at: '' },
  { id: '2', name: 'Artisan Pizza Flour (00)', unit: 'kg', current_stock: 45.0, reorder_threshold: 15.0, cost_per_unit: 80, expiry_date: '2026-11-20', supplier_id: null, created_at: '', updated_at: '' },
  { id: '3', name: 'San Marzano Pizza Sauce', unit: 'kg', current_stock: 8.2, reorder_threshold: 5.0, cost_per_unit: 180, expiry_date: '2026-08-25', supplier_id: null, created_at: '', updated_at: '' },
  { id: '4', name: 'Fresh Cottage Cheese (Paneer)', unit: 'kg', current_stock: 2.1, reorder_threshold: 5.0, cost_per_unit: 320, expiry_date: '2026-08-14', supplier_id: null, created_at: '', updated_at: '' },
  { id: '5', name: 'Bell Peppers (Capsicum)', unit: 'kg', current_stock: 6.0, reorder_threshold: 4.0, cost_per_unit: 90, expiry_date: '2026-08-16', supplier_id: null, created_at: '', updated_at: '' },
  { id: '6', name: 'Cold-Pressed Extra Virgin Olive Oil', unit: 'l', current_stock: 1.2, reorder_threshold: 3.0, cost_per_unit: 850, expiry_date: '2027-01-10', supplier_id: null, created_at: '', updated_at: '' },
]

export default function AdminInventoryPage() {
  const { activeStoreId } = useStoreStore()
  const [activeTab, setActiveTab] = useState<'stock' | 'recipe' | 'alerts'>('stock')
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Restock modal state
  const [restockModalOpen, setRestockModalOpen] = useState(false)
  const [targetIngredient, setTargetIngredient] = useState<Ingredient | null>(null)
  const [addQty, setAddQty] = useState<number>(5)

  // New Ingredient modal state
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newIng, setNewIng] = useState({
    name: '',
    unit: 'kg',
    current_stock: 10,
    reorder_threshold: 5,
    cost_per_unit: 100,
    expiry_date: '',
  })

  // Add Recipe Item modal state
  const [newRecipeIngId, setNewRecipeIngId] = useState('')
  const [newRecipeQty, setNewRecipeQty] = useState<number>(0.1)

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch Ingredients
      let ingQuery = supabase
        .from('ingredients')
        .select('*')
        .order('name')
        
      if (activeStoreId) {
        ingQuery = ingQuery.eq('store_id', activeStoreId)
      }

      const { data: ingData, error: ingErr } = await ingQuery

      if (!ingErr && ingData && ingData.length > 0) {
        setIngredients(ingData)
      }

      // Fetch Products
      let prodQuery = supabase
        .from('products')
        .select('*')
        .order('name')

      if (activeStoreId) {
        prodQuery = prodQuery.eq('store_id', activeStoreId)
      }

      const { data: prodData, error: prodErr } = await prodQuery

      if (!prodErr && prodData && prodData.length > 0) {
        setProducts(prodData)
        if (!selectedProductId) setSelectedProductId(prodData[0].id)
      }
    } catch (err) {
      console.warn('Inventory fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecipeForProduct = async (prodId: string) => {
    if (!prodId) return
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipe_items')
        .select('*, ingredient:ingredients(*)')
        .eq('product_id', prodId)

      if (!error && data) {
        setRecipeItems(data)
      } else {
        setRecipeItems([])
      }
    } catch (err) {
      console.warn('Recipe fetch note:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeStoreId])

  useEffect(() => {
    if (selectedProductId) {
      fetchRecipeForProduct(selectedProductId)
    }
  }, [selectedProductId])

  // Handle restock submit
  const handleRestock = async () => {
    if (!targetIngredient) return
    const updatedStock = Number(targetIngredient.current_stock) + Number(addQty)

    try {
      const supabase = createClient()
      await supabase
        .from('ingredients')
        .update({ current_stock: updatedStock, updated_at: new Date().toISOString() })
        .eq('id', targetIngredient.id)
    } catch (err) {
      console.warn('Restock DB note:', err)
    }

    setIngredients(prev =>
      prev.map(item =>
        item.id === targetIngredient.id ? { ...item, current_stock: updatedStock } : item
      )
    )
    setRestockModalOpen(false)
  }

  // Handle add new ingredient submit
  const handleCreateIngredient = async () => {
    if (!newIng.name) return
    const newId = String(Date.now())
    const createdItem: any = {
      id: newId,
      name: newIng.name,
      unit: newIng.unit,
      current_stock: Number(newIng.current_stock),
      reorder_threshold: Number(newIng.reorder_threshold),
      cost_per_unit: Number(newIng.cost_per_unit),
      expiry_date: newIng.expiry_date || null,
      supplier_id: null,
      store_id: activeStoreId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('ingredients').insert(createdItem).select()
      if (!error && data && data.length > 0) {
        setIngredients(prev => [...prev, data[0]])
      } else {
        setIngredients(prev => [...prev, createdItem])
      }
    } catch (err) {
      setIngredients(prev => [...prev, createdItem])
    }

    setNewModalOpen(false)
    setNewIng({ name: '', unit: 'kg', current_stock: 10, reorder_threshold: 5, cost_per_unit: 100, expiry_date: '' })
  }

  // Handle add recipe mapping
  const handleAddRecipeMapping = async () => {
    if (!selectedProductId || !newRecipeIngId) return

    const ingObj = ingredients.find(i => i.id === newRecipeIngId)
    const newRecipe: RecipeItem = {
      id: String(Date.now()),
      product_id: selectedProductId,
      ingredient_id: newRecipeIngId,
      quantity_required: Number(newRecipeQty),
      created_at: new Date().toISOString(),
      ingredient: ingObj,
    }

    try {
      const supabase = createClient()
      await supabase.from('recipe_items').insert({
        product_id: selectedProductId,
        ingredient_id: newRecipeIngId,
        quantity_required: Number(newRecipeQty),
      })
    } catch (err) {
      console.warn('Recipe mapping insert note:', err)
    }

    setRecipeItems(prev => [...prev, newRecipe])
    setNewRecipeIngId('')
  }

  // Filtered ingredients
  const filteredIngredients = ingredients.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockCount = ingredients.filter(i => i.current_stock <= i.reorder_threshold).length
  const totalValuation = ingredients.reduce((acc, i) => acc + (i.current_stock * i.cost_per_unit), 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] flex items-center gap-2">
            <Boxes className="text-[#B91C1C]" size={26} />
            Inventory & Recipe Control Engine
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Ingredient-level stock tracking, auto-deduction on orders, and recipe mapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus size={16} />
            Add Ingredient
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-[#E7E0D8] bg-white text-[#44403C] hover:bg-[#F5F2EC] transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">Total Ingredients</span>
            <div className="w-9 h-9 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center">
              <Boxes size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-[#1C1917]">{ingredients.length}</span>
            <span className="text-xs text-[#78716C] block mt-0.5">Active SKU items tracked</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">Low Stock Warnings</span>
            <div className="w-9 h-9 rounded-lg bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-serif text-[#DC2626]">{lowStockCount}</span>
              {lowStockCount > 0 && (
                <span className="text-xs font-bold bg-[#FEE2E2] text-[#DC2626] px-2 py-0.5 rounded-full animate-pulse">
                  Action Required
                </span>
              )}
            </div>
            <span className="text-xs text-[#78716C] block mt-0.5">Below safety threshold</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">Stock Valuation</span>
            <div className="w-9 h-9 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <Scale size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-[#16A34A]">{formatPrice(totalValuation)}</span>
            <span className="text-xs text-[#78716C] block mt-0.5">Total ingredient capital on hand</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#E7E0D8] pb-1">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'stock'
              ? 'bg-white border border-[#E7E0D8] border-b-transparent text-[#B91C1C] shadow-2xs -mb-px'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Boxes size={15} />
          Ingredient Stock Directory
        </button>
        <button
          onClick={() => setActiveTab('recipe')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'recipe'
              ? 'bg-white border border-[#E7E0D8] border-b-transparent text-[#B91C1C] shadow-2xs -mb-px'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <BookOpen size={15} />
          Product Recipe Engine & BOM
        </button>
      </div>

      {/* TAB 1: Ingredient Stock Table */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E7E0D8] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-2.5 text-[#A8A29E]" />
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E7E0D8] focus:outline-hidden focus:border-[#B91C1C]"
              />
            </div>
            <span className="text-xs text-[#78716C]">
              Showing {filteredIngredients.length} of {ingredients.length} items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F5F2EC] text-[#78716C] font-semibold uppercase text-[11px] border-b border-[#E7E0D8]">
                <tr>
                  <th className="py-3 px-4">Ingredient Name</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Reorder Threshold</th>
                  <th className="py-3 px-4 text-right">Cost per Unit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]">
                {filteredIngredients.map(ing => {
                  const isLow = ing.current_stock <= ing.reorder_threshold
                  const isOut = ing.current_stock <= 0

                  return (
                    <tr key={ing.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#1C1917]">
                        {ing.name}
                        {ing.expiry_date && (
                          <span className="block text-[11px] font-normal text-[#78716C]">
                            Expires: {ing.expiry_date}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1C1917]">
                        {ing.current_stock} <span className="text-xs text-[#78716C] font-normal">{ing.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-[#78716C]">
                        {ing.reorder_threshold} {ing.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatPrice(ing.cost_per_unit)} / {ing.unit}
                      </td>
                      <td className="py-3 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#DC2626]">
                            <AlertCircle size={12} /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#D97706]">
                            <AlertTriangle size={12} /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#16A34A]">
                            <CheckCircle2 size={12} /> Optimal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setTargetIngredient(ing)
                            setRestockModalOpen(true)
                          }}
                          className="px-3 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold rounded-md transition-colors"
                        >
                          + Restock
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Product Recipe Mapping Engine */}
      {activeTab === 'recipe' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-2xs">
            <h2 className="text-base font-serif font-bold text-[#1C1917] mb-2">Select Product Recipe to Configure</h2>
            <p className="text-xs text-[#78716C] mb-4">
              When an order for this pizza is placed, the ingredients specified here will be automatically deducted from kitchen stock.
            </p>

            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full sm:w-80 p-2.5 text-xs font-semibold rounded-lg border border-[#E7E0D8] bg-[#F5F2EC] text-[#1C1917] focus:outline-hidden focus:border-[#B91C1C]"
            >
              {products.length === 0 ? (
                <option value="">Loading catalog products...</option>
              ) : (
                products.map(p => (
                  <option key={p.id} value={p.id}>
                    🍕 {p.name} ({formatPrice(p.price)})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Recipe Items Table */}
          <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E7E0D8] flex items-center justify-between">
              <h3 className="text-sm font-bold font-serif text-[#1C1917]">
                Required Ingredients per 1 Unit of Product
              </h3>
            </div>

            <div className="p-4 bg-[#F5F2EC]/50 border-b border-[#E7E0D8] flex flex-col sm:flex-row items-center gap-3">
              <select
                value={newRecipeIngId}
                onChange={e => setNewRecipeIngId(e.target.value)}
                className="w-full sm:w-64 p-2 text-xs rounded-lg border border-[#E7E0D8] bg-white focus:outline-hidden"
              >
                <option value="">-- Choose Ingredient --</option>
                {ingredients.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Qty required"
                  value={newRecipeQty}
                  onChange={e => setNewRecipeQty(Number(e.target.value))}
                  className="w-28 p-2 text-xs rounded-lg border border-[#E7E0D8] bg-white focus:outline-hidden"
                />
                <button
                  onClick={handleAddRecipeMapping}
                  disabled={!newRecipeIngId}
                  className="px-4 py-2 bg-[#16A34A] disabled:opacity-50 text-white text-xs font-semibold rounded-lg hover:bg-[#15803D] transition-colors"
                >
                  Map Ingredient
                </button>
              </div>
            </div>

            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F5F2EC] text-[#78716C] font-semibold uppercase text-[11px] border-b border-[#E7E0D8]">
                <tr>
                  <th className="py-3 px-4">Mapped Ingredient</th>
                  <th className="py-3 px-4">Quantity Required / Unit</th>
                  <th className="py-3 px-4">Current Stock Available</th>
                  <th className="py-3 px-4 text-right">Estimated Cost Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]">
                {recipeItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-[#78716C]">
                      No ingredients mapped yet for this product. Use the dropdown above to add ingredients to the recipe.
                    </td>
                  </tr>
                ) : (
                  recipeItems.map(item => {
                    const ing = item.ingredient || ingredients.find(i => i.id === item.ingredient_id)
                    const costImpact = ing ? ing.cost_per_unit * item.quantity_required : 0

                    return (
                      <tr key={item.id} className="hover:bg-[#FDFBF7] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#1C1917]">
                          {ing?.name || 'Ingredient'}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#B91C1C]">
                          {item.quantity_required} {ing?.unit}
                        </td>
                        <td className="py-3 px-4 text-[#78716C]">
                          {ing?.current_stock} {ing?.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#16A34A]">
                          {formatPrice(costImpact)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockModalOpen && targetIngredient && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-[#E7E0D8]">
            <h3 className="text-base font-serif font-bold text-[#1C1917]">
              Restock Ingredient: {targetIngredient.name}
            </h3>
            <p className="text-xs text-[#78716C]">
              Current stock: <strong>{targetIngredient.current_stock} {targetIngredient.unit}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Add Stock Quantity ({targetIngredient.unit})
              </label>
              <input
                type="number"
                value={addQty}
                onChange={e => setAddQty(Number(e.target.value))}
                className="w-full p-2.5 text-sm rounded-lg border border-[#E7E0D8] focus:outline-hidden focus:border-[#16A34A]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRestockModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#78716C] hover:bg-[#F5F2EC] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestock}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Ingredient Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E7E0D8]">
            <h3 className="text-base font-serif font-bold text-[#1C1917]">Add New Ingredient SKU</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">Ingredient Name</label>
                <input
                  type="text"
                  placeholder="e.g. Italian Pepperoni"
                  value={newIng.name}
                  onChange={e => setNewIng({ ...newIng, name: e.target.value })}
                  className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">Unit</label>
                  <select
                    value={newIng.unit}
                    onChange={e => setNewIng({ ...newIng, unit: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8] bg-white focus:outline-hidden"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="g">g (Grams)</option>
                    <option value="l">l (Liters)</option>
                    <option value="ml">ml (Milliliters)</option>
                    <option value="pcs">pcs (Pieces)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newIng.current_stock}
                    onChange={e => setNewIng({ ...newIng, current_stock: Number(e.target.value) })}
                    className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">Reorder Threshold</label>
                  <input
                    type="number"
                    value={newIng.reorder_threshold}
                    onChange={e => setNewIng({ ...newIng, reorder_threshold: Number(e.target.value) })}
                    className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">Cost / Unit (₹)</label>
                  <input
                    type="number"
                    value={newIng.cost_per_unit}
                    onChange={e => setNewIng({ ...newIng, cost_per_unit: Number(e.target.value) })}
                    className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
              <button
                onClick={() => setNewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#78716C] hover:bg-[#F5F2EC] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIngredient}
                disabled={!newIng.name}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-50 rounded-lg transition-colors"
              >
                Save Ingredient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
