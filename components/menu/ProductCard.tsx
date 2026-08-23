'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Sparkles, Flame } from 'lucide-react'
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
      className="group flex flex-col cursor-pointer bg-[#16161E] rounded-3xl p-4 border border-white/10 hover:border-[#FF3B00]/50 shadow-xl hover:shadow-[0_15px_40px_rgba(255,59,0,0.25)] transition-all duration-300 relative overflow-hidden"
      onClick={() => onQuickView && onQuickView(product)}
    >
      {/* Food Image Container */}
      <div className="relative bg-[#0D0D11] aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden mb-4 border border-white/5">
        <motion.img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[800ms] ease-out"
        />

        {/* Dietary FSSAI Indicators & Spicy Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <div className={product.is_veg ? 'food-dot-veg bg-black/70 backdrop-blur-md p-0.5' : 'food-dot-nonveg bg-black/70 backdrop-blur-md p-0.5'} />
          {product.is_spicy && (
            <span className="badge badge-spicy backdrop-blur-md shadow-xs flex items-center gap-1">
              <Flame size={11} /> Spicy
            </span>
          )}
        </div>

        {/* Bestseller Badge */}
        {product.sort_order === 1 && (
          <div className="absolute top-3 right-3 bg-[#FFC01D] text-black px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md z-10">
            <Sparkles size={11} /> Bestseller
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 px-1">
        <Link
          href={`/product/${product.slug}`}
          className="font-heading font-extrabold text-white text-lg sm:text-xl leading-snug group-hover:text-[#FF3B00] transition-colors line-clamp-1 mb-1.5 tracking-tight"
          onClick={(e) => e.stopPropagation()}
        >
          {product.name}
        </Link>
        
        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-4 font-normal">
          {product.description}
        </p>

        {/* Price & Action Row (Fitts's Law Optimized Target) */}
        <div className="flex items-center justify-between mt-auto pt-3.5 border-t border-white/10 gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">PRICE</span>
            <span className="font-mono font-black text-white text-xl sm:text-2xl tracking-tight">
              {formatPrice(product.price)}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleAddToCart}
            className={`btn rounded-full font-black min-h-[44px] px-6 sm:px-7 py-2.5 text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center justify-center shrink-0 ${
              added
                ? 'bg-[#10B981] text-black border-[#10B981] shadow-[#10B981]/25'
                : 'btn-primary shadow-[#FF3B00]/30 hover:shadow-[#FF3B00]/50'
            }`}
            aria-label={`Add ${product.name} to cart for ${formatPrice(product.price)}`}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span
                  key="added"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Check size={16} className="stroke-[3]" /> Added
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Plus size={16} className="stroke-[3]" /> ADD
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

