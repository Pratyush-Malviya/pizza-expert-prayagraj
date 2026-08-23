'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, ShoppingCart } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { toast } from 'sonner'
import type { Product, CartItemOption } from '@/types'

interface ProductQuickViewProps {
  product: Product | null
  onClose: () => void
}

function getInitialOptions(product: Product | null): Record<string, { choice: string; priceDelta: number }> {
  if (!product) return {}
  const initial: Record<string, { choice: string; priceDelta: number }> = {}
  product.options?.forEach((opt) => {
    if (opt.choices[0]) {
      initial[opt.name] = {
        choice: opt.choices[0].label,
        priceDelta: opt.choices[0].price_delta,
      }
    }
  })
  return initial
}

export default function ProductQuickView({ product, onClose }: ProductQuickViewProps) {
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState(() => getInitialOptions(product))
  const [prevProductId, setPrevProductId] = useState<string | null>(product?.id || null)

  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id)
    setQuantity(1)
    setSelectedOptions(getInitialOptions(product))
  }

  if (!product) return null

  const optionsDelta = Object.values(selectedOptions).reduce((sum, o) => sum + o.priceDelta, 0)
  const unitPrice = product.price + optionsDelta
  const totalPrice = unitPrice * quantity

  const handleAddToCart = () => {
    const formattedOptions: CartItemOption[] = Object.entries(selectedOptions).map(
      ([optionName, val]) => ({
        optionName,
        choice: val.choice,
        priceDelta: val.priceDelta,
      })
    )

    const imageUrl = FOOD_IMAGES[product.slug] || FOOD_IMAGES['margherita-pizza']

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl,
      isVeg: product.is_veg,
      quantity,
      selectedOptions: formattedOptions,
    })

    toast.success(`Added ${quantity}x ${product.name} to cart!`)
    onClose()
    openCart()
  }

  const imageUrl = FOOD_IMAGES[product.slug] || FOOD_IMAGES['margherita-pizza']

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[#E7E0D8] shadow-2xl relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-8 h-8 bg-[var(--bg-surface)]/90 backdrop-blur-xs text-[var(--text-primary)] rounded-full flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shadow-xs"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>

          <div className="grid sm:grid-cols-2">
            {/* Image */}
            <div className="relative h-52 sm:h-auto min-h-[200px] bg-[var(--bg-subtle)]">
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Product info & Options */}
            <div className="p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-[var(--bg-surface)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`badge ${product.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>
                    {product.is_veg ? 'Veg' : 'Non-Veg'}
                  </span>
                  {product.is_spicy && <span className="badge badge-spicy">Spicy</span>}
                </div>

                <h3 className="font-heading font-bold text-xl text-[var(--text-primary)] leading-snug">
                  {product.name}
                </h3>
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1.5 leading-relaxed font-normal break-words">
                  {product.description}
                </p>

                <div className="mt-3 text-xl font-black font-mono text-[#FF3B00]">
                  {formatPrice(unitPrice)}
                </div>
              </div>

              {/* Dynamic Options Picker */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                  {product.options.map((opt) => (
                    <div key={opt.name}>
                      <label className="block text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                        Select {opt.name}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {opt.choices.map((choice) => {
                          const isSelected = selectedOptions[opt.name]?.choice === choice.label
                          return (
                            <button
                              key={choice.label}
                              type="button"
                              onClick={() =>
                                setSelectedOptions({
                                  ...selectedOptions,
                                  [opt.name]: { choice: choice.label, priceDelta: choice.price_delta },
                                })
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#FF3B00] text-white border-[#FF3B00] shadow-xs'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[#FF3B00]'
                              }`}
                            >
                              {choice.label} {choice.price_delta > 0 && `(+₹${choice.price_delta})`}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity & Add button */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
                <div className="flex items-center border border-[var(--border)] rounded-xl bg-[var(--bg-subtle)] p-0.5">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-2 text-xs font-mono font-bold text-[var(--text-primary)] select-none">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="btn btn-primary flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg transition-all"
                >
                  <ShoppingCart size={14} /> Add {formatPrice(totalPrice)}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
