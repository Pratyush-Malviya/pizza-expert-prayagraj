'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Minus, Star, Sparkles, Flame, Check } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { toast } from 'sonner'
import type { Product } from '@/types'

interface ZomatoProductCardProps {
  product: Product
  onQuickView?: (product: Product) => void
}

export default function ZomatoProductCard({ product, onQuickView }: ZomatoProductCardProps) {
  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const getItemKey = useCartStore((s) => s.getItemKey)
  const openCart = useCartStore((s) => s.openCart)

  const imageUrl = product.images?.[0]?.image_url || FOOD_IMAGES[product.slug] || FOOD_IMAGES['margherita-pizza']
  const hasOptions = Boolean(product.options && product.options.length > 0)

  // Find total quantity of this product in cart
  const cartItemsForProduct = items.filter((i) => i.id === product.id)
  const totalQty = cartItemsForProduct.reduce((sum, i) => sum + i.quantity, 0)

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (hasOptions && onQuickView) {
      onQuickView(product)
      return
    }

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

    toast.success(`Added ${product.name} to cart`, {
      duration: 2500,
      action: {
        label: 'View Cart',
        onClick: () => openCart(),
      },
    })
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (hasOptions && onQuickView) {
      onQuickView(product)
      return
    }

    if (cartItemsForProduct.length > 0) {
      const firstItem = cartItemsForProduct[0]
      const key = getItemKey(firstItem.id, firstItem.selectedOptions)
      updateQuantity(key, firstItem.quantity + 1)
    } else {
      handleAdd(e)
    }
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (cartItemsForProduct.length > 0) {
      const firstItem = cartItemsForProduct[0]
      const key = getItemKey(firstItem.id, firstItem.selectedOptions)
      if (firstItem.quantity <= 1) {
        removeItem(key)
        toast.info(`Removed ${product.name} from cart`)
      } else {
        updateQuantity(key, firstItem.quantity - 1)
      }
    }
  }

  // Generate a realistic rating between 4.1 and 4.9 based on id
  const rating = (4.2 + ((product.id.charCodeAt(product.id.length - 1) || 0) % 8) * 0.1).toFixed(1)
  const reviewCount = 45 + ((product.id.charCodeAt(0) || 0) * 3) % 180

  return (
    <div
      onClick={() => onQuickView && onQuickView(product)}
      className="bg-[var(--bg-surface)] rounded-2xl p-4 sm:p-5 border border-[var(--border)] hover:border-[#FF3B00]/40 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-row items-start justify-between gap-4 relative group"
    >
      {/* ── Left Column: Dish Details ── */}
      <div className="flex-1 flex flex-col justify-between min-w-0 pr-2">
        <div>
          {/* Dietary Badge & Tags */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* Veg / Non-Veg Icon */}
            {product.is_veg ? (
              <span className="w-4 h-4 border border-emerald-600 rounded-sm flex items-center justify-center bg-white shrink-0" title="Pure Veg">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              </span>
            ) : (
              <span className="w-4 h-4 border border-rose-600 rounded-sm flex items-center justify-center bg-white shrink-0" title="Non-Veg">
                <span className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-rose-600" />
              </span>
            )}

            {/* Single Priority Tag (Bestseller OR Spicy) */}
            {product.sort_order === 1 ? (
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <Sparkles size={10} className="text-amber-500" /> Bestseller
              </span>
            ) : product.is_spicy ? (
              <span className="bg-rose-500/10 text-rose-500 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <Flame size={10} className="text-rose-500" /> Spicy
              </span>
            ) : null}
          </div>

          {/* Dish Name */}
          <Link
            href={`/product/${product.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="font-serif font-bold text-base sm:text-lg text-[var(--text-primary)] group-hover:text-[#FF3B00] transition-colors line-clamp-1 leading-snug block"
          >
            {product.name}
          </Link>

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono font-bold text-sm sm:text-base text-[var(--text-primary)]">
              {formatPrice(product.price)}
            </span>
          </div>

          {/* Star Rating */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="bg-emerald-700 text-white text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Star size={10} className="fill-white" /> {rating}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">({reviewCount})</span>
          </div>

          {/* Description */}
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm line-clamp-2 mt-2 leading-relaxed font-normal">
            {product.description}
          </p>
        </div>
      </div>

      {/* ── Right Column: Food Image & Overlay ADD Button ── */}
      <div className="relative shrink-0 flex flex-col items-center">
        {/* Food Image */}
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border)] relative shadow-xs">
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Floating Zomato ADD / Counter Button */}
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
          {totalQty === 0 ? (
            <button
              onClick={handleAdd}
              className="bg-[var(--bg-surface)] text-[#FF3B00] border-2 border-[#FF3B00] hover:bg-[#FF3B00]/10 px-6 py-1.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer min-w-[96px]"
              aria-label={`Add ${product.name} to cart`}
            >
              <span>ADD</span>
              <Plus size={14} strokeWidth={3} />
            </button>
          ) : (
            <div className="bg-[#FF3B00] text-white rounded-xl shadow-md flex items-center justify-between px-2 py-1 min-w-[96px] border border-[#FF3B00]">
              <button
                onClick={handleDecrement}
                className="w-6 h-6 flex items-center justify-center hover:bg-black/20 rounded font-bold cursor-pointer transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span className="font-mono font-bold text-xs sm:text-sm px-2 select-none">
                {totalQty}
              </span>
              <button
                onClick={handleIncrement}
                className="w-6 h-6 flex items-center justify-center hover:bg-black/20 rounded font-bold cursor-pointer transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          )}

          {/* Customisable hint */}
          {hasOptions && (
            <span className="text-[10px] font-semibold text-[#78716C] mt-0.5 lowercase select-none">
              customisable
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
