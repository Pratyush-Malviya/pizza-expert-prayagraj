'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Check } from 'lucide-react'
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
    <div 
      className="group flex flex-col cursor-pointer"
      onClick={() => onQuickView && onQuickView(product)}
    >
      {/* Image Container */}
      <div className="relative bg-[var(--bg-subtle)] aspect-square rounded-[16px] overflow-hidden mb-5">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />

        {/* Dietary Badge */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10 pointer-events-none">
          <span className={`badge ${product.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>
            {product.is_veg ? 'Veg' : 'Non-Veg'}
          </span>
          {product.is_spicy && <span className="badge badge-spicy">Spicy</span>}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 px-1">
        <Link
          href={`/product/${product.slug}`}
          className="font-serif font-bold text-[var(--text-primary)] text-xl leading-snug group-hover:text-[var(--primary)] transition-colors line-clamp-1 mb-2"
          onClick={(e) => e.stopPropagation()}
        >
          {product.name}
        </Link>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed line-clamp-2 mb-4">
          {product.description}
        </p>

        {/* Footer Row */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="font-sans font-semibold text-[var(--text-primary)] text-lg">
            {formatPrice(product.price)}
          </span>

          <button
            onClick={handleAddToCart}
            className={`btn btn-sm px-4 rounded-full font-semibold transition-all shadow-sm ${
              added
                ? 'bg-[#15803D] text-white border-[#15803D]'
                : 'bg-white text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {added ? (
              <span className="flex items-center gap-1"><Check size={16} /> Added</span>
            ) : (
              <span className="flex items-center gap-1"><Plus size={16} /> Add</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
