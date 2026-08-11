'use client'

import { Plus, Sparkles } from 'lucide-react'
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

  if (availableUpsells.length === 0) return null

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

  return (
    <div className="bg-[#FBF9F5] rounded-xl p-4 border border-[#E7E0D8] space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-amber-500 fill-amber-500" />
        <h3 className="font-serif font-bold text-[#1C1917] text-sm">Frequently Bought Together</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {availableUpsells.map((addon) => (
          <div
            key={addon.id}
            className="bg-white p-3 rounded-lg border border-[#E7E0D8] flex items-center justify-between shadow-2xs hover:border-[#B91C1C]/40 transition-colors"
          >
            <div>
              <h4 className="font-bold text-xs text-[#1C1917]">{addon.name}</h4>
              <p className="text-[10px] text-[#A8A29E] truncate max-w-[160px]">{addon.description}</p>
              <span className="font-mono text-xs font-bold text-[#B91C1C]">{formatPrice(addon.price)}</span>
            </div>

            <button
              onClick={() => handleAdd(addon)}
              className="btn btn-secondary py-1 px-2.5 text-xs font-bold text-[#B91C1C] border-[#B91C1C]/30 hover:bg-[#FEF2F2] flex items-center gap-1 shrink-0"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
