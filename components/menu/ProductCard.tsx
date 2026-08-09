'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Heart, Eye, Check } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { toast } from 'sonner'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  onQuickView?: (product: Product) => void
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  const imageUrl = product.images?.[0]?.image_url || FOOD_IMAGES[product.slug] || FOOD_IMAGES['margherita-pizza']

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const defaultOptions = product.options?.map((opt) => ({
      optionName: opt.name,
      choice: opt.choices[0]?.label || '',
      priceDelta: opt.choices[0]?.price_delta || 0,
    })) || []

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl,
      isVeg: product.is_veg,
      quantity: 1,
      selectedOptions: defaultOptions,
    })

    setAdded(true)
    toast.success(`Added ${product.name} to cart`, {
      action: {
        label: 'View Cart',
        onClick: () => openCart(),
      },
    })
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="bg-white rounded-xl border border-[#E7E0D8] overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col h-full">
      {/* Image Container */}
      <div className="relative bg-[#F4EFEA] aspect-[4/3] overflow-hidden">
        <Link href={`/product/${product.slug}`} className="w-full h-full block">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Dietary Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          <span className={`badge ${product.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>
            {product.is_veg ? 'Veg' : 'Non-Veg'}
          </span>
          {product.is_spicy && <span className="badge badge-spicy">Spicy</span>}
        </div>

        {/* Action Overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button
            className="w-8 h-8 bg-white/90 rounded-md flex items-center justify-center text-[#57534E] hover:text-[#B91C1C] hover:bg-white shadow-xs transition-colors"
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            aria-label={`Add ${product.name} to wishlist`}
          >
            <Heart size={15} />
          </button>
          {onQuickView && (
            <button
              className="w-8 h-8 bg-white/90 rounded-md flex items-center justify-center text-[#57534E] hover:text-[#B91C1C] hover:bg-white shadow-xs transition-colors"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onQuickView(product)
              }}
              aria-label={`Quick view ${product.name}`}
            >
              <Eye size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
        <div>
          <Link
            href={`/product/${product.slug}`}
            className="font-serif font-bold text-[#1C1917] text-lg leading-snug hover:text-[#B91C1C] transition-colors line-clamp-1 block mb-1.5"
          >
            {product.name}
          </Link>
          <p className="text-[#57534E] text-xs leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Footer Row */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E7E0D8]/60 mt-auto">
          <div>
            <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider block">Price</span>
            <span className="font-bold text-[#1C1917] text-lg">
              {formatPrice(product.price)}
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            className={`btn btn-sm font-semibold transition-all ${
              added
                ? 'bg-[#15803D] text-white border-[#15803D]'
                : 'btn-primary'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {added ? (
              <>
                <Check size={15} /> Added
              </>
            ) : (
              <>
                <Plus size={15} /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
