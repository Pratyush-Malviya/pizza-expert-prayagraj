'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Sparkles } from 'lucide-react'
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
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group flex flex-col cursor-pointer bg-white rounded-[20px] p-3.5 border border-[#E7E0D8] hover:border-[#B91C1C]/40 hover:shadow-xl transition-all duration-300"
      onClick={() => onQuickView && onQuickView(product)}
    >
      {/* Image Container */}
      <div className="relative bg-[var(--bg-subtle)] aspect-square rounded-[16px] overflow-hidden mb-4">
        <motion.img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
        />

        {/* Dietary & Highlight Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          <span className={`badge ${product.is_veg ? 'badge-veg' : 'badge-nonveg'} shadow-xs`}>
            {product.is_veg ? 'Veg' : 'Non-Veg'}
          </span>
          {product.is_spicy && <span className="badge badge-spicy shadow-xs">Spicy</span>}
        </div>

        {/* Bestseller Badge */}
        {product.sort_order === 1 && (
          <div className="absolute top-3 right-3 bg-amber-400 text-black px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md z-10">
            <Sparkles size={11} /> Bestseller
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 px-1">
        <Link
          href={`/product/${product.slug}`}
          className="font-serif font-bold text-[var(--text-primary)] text-lg sm:text-xl leading-snug group-hover:text-[var(--primary)] transition-colors line-clamp-1 mb-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {product.name}
        </Link>
        <p className="text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed line-clamp-2 mb-4">
          {product.description}
        </p>

        {/* Footer Row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#F4EFEA]">
          <span className="font-sans font-extrabold text-[var(--text-primary)] text-lg sm:text-xl font-mono">
            {formatPrice(product.price)}
          </span>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleAddToCart}
            className={`btn btn-sm rounded-full font-semibold px-4 py-1.5 text-xs transition-all shadow-xs ${
              added
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'btn-primary'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span
                  key="added"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex items-center gap-1"
                >
                  <Check size={14} /> Added
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
