'use client'

import { Plus, Sparkles, Zap } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { toast } from 'sonner'

const POPULAR_ADDONS = [
  { id: 'addon-garlic-bread', name: 'Cheesy Garlic Bread', price: 149, description: 'Freshly baked with garlic butter & mozzarella', category: 'sides' },
  { id: 'addon-coke', name: 'Coca-Cola (500ml)', price: 60, description: 'Chilled refreshing beverage', category: 'beverages' },
  { id: 'addon-dip', name: 'Creamy Jalapeno Dip', price: 40, description: 'Rich dip for pizza crusts', category: 'dips' },
  { id: 'addon-brownie', name: 'Choco Lava Cake', price: 99, description: 'Warm chocolate fudge filled cake', category: 'desserts' },
]

export default function CartUpsell() {
  const addItem = useCartStore((state) => state.addItem)
  const items = useCartStore((state) => state.items)

  const cartItemIds = new Set(items.map((i) => i.id))
  const availableUpsells = POPULAR_ADDONS.filter((addon) => !cartItemIds.has(addon.id))

  // Smart Combo detection: Cart has items but lacks garlic bread or beverage
  const hasGarlicBread = cartItemIds.has('addon-garlic-bread')
  const hasCoke = cartItemIds.has('addon-coke')
  const showComboDeal = items.length > 0 && (!hasGarlicBread || !hasCoke)

  const handleAdd = (addon: typeof POPULAR_ADDONS[0]) => {
    addItem({
      id: addon.id,
      name: addon.name,
      slug: addon.id,
      price: addon.price,
      imageUrl: '',
      isVeg: true,
      quantity: 1,
      selectedOptions: [],
    })
    toast.success(`Added ${addon.name} to your cart!`)
  }

  const handleAddComboMeal = () => {
    if (!hasGarlicBread) {
      addItem({
        id: 'addon-garlic-bread',
        name: 'Cheesy Garlic Bread (Combo)',
        slug: 'addon-garlic-bread',
        price: 69,
        imageUrl: '',
        isVeg: true,
        quantity: 1,
        selectedOptions: [],
      })
    }
    if (!hasCoke) {
      addItem({
        id: 'addon-coke',
        name: 'Coca-Cola 500ml (Combo)',
        slug: 'addon-coke',
        price: 30,
        imageUrl: '',
        isVeg: true,
        quantity: 1,
        selectedOptions: [],
      })
    }
    toast.success('🎉 Meal Combo (Garlic Bread + Coke) added for ₹99!')
  }

  if (availableUpsells.length === 0 && !showComboDeal) return null

  return (
    <div className="space-y-3 pt-2">
      {/* 1-Tap Smart Meal Saver Combo */}
      {showComboDeal && (
        <div className="p-3 bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7]/60 to-[#FEE2E2]/70 border border-[#FDE68A] rounded-xl flex items-center justify-between gap-3 shadow-xs">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#92400E]">
              <Zap size={14} className="text-[#D97706] fill-[#D97706] shrink-0" />
              <span>Complete Your Meal Combo</span>
            </div>
            <p className="text-[11px] text-[#78716C] mt-0.5">
              Garlic Bread + Chilled Coke for only <span className="font-bold text-[#B91C1C]">₹99</span>{' '}
              <span className="line-through text-[#A8A29E] text-[10px]">₹209</span>
            </p>
          </div>

          <button
            onClick={handleAddComboMeal}
            className="btn btn-primary py-1.5 px-3 text-xs font-bold shrink-0 shadow-xs"
          >
            Add Combo +
          </button>
        </div>
      )}

      {/* Frequently Bought Together Grid */}
      {availableUpsells.length > 0 && (
        <div className="bg-[#FBF9F5] rounded-xl p-3.5 border border-[#E7E0D8] space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500 fill-amber-500" />
            <h3 className="font-serif font-bold text-[#1C1917] text-xs">Frequently Bought Together</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableUpsells.slice(0, 2).map((addon) => (
              <div
                key={addon.id}
                className="bg-white p-2.5 rounded-lg border border-[#E7E0D8] flex items-center justify-between shadow-2xs hover:border-[#B91C1C]/40 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <h4 className="font-bold text-[11px] text-[#1C1917] truncate">{addon.name}</h4>
                  <span className="font-mono text-xs font-bold text-[#B91C1C]">{formatPrice(addon.price)}</span>
                </div>

                <button
                  onClick={() => handleAdd(addon)}
                  className="btn btn-secondary py-1 px-2 text-[11px] font-bold text-[#B91C1C] border-[#B91C1C]/30 hover:bg-[#FEF2F2] flex items-center gap-1 shrink-0"
                >
                  <Plus size={11} /> Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
