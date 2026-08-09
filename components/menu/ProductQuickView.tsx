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
      ([name, val]) => ({
        name,
        choice: val.choice,
        price_delta: val.priceDelta,
      })
    )

    addItem(product, quantity, formattedOptions)
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
          className="bg-white rounded-xl max-w-xl w-full overflow-hidden border border-[#E7E0D8] shadow-2xl relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/80 backdrop-blur-xs text-[#1C1917] rounded-full flex items-center justify-center border border-[#E7E0D8] hover:bg-white"
          >
            <X size={18} />
          </button>

          <div className="grid sm:grid-cols-2">
            {/* Image */}
            <div className="relative h-48 sm:h-auto bg-[#F4EFEA]">
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Product info & Options */}
            <div className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`badge ${product.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>
                    {product.is_veg ? 'Veg' : 'Non-Veg'}
                  </span>
                  {product.is_spicy && <span className="badge badge-spicy">Spicy</span>}
                </div>

                <h3 className="font-serif font-bold text-xl text-[#1C1917]">
                  {product.name}
                </h3>
                <p className="text-[#57534E] text-xs mt-1 leading-relaxed line-clamp-2">
                  {product.description}
                </p>

                <div className="mt-3 text-lg font-bold font-mono text-[#B91C1C]">
                  {formatPrice(unitPrice)}
                </div>
              </div>

              {/* Dynamic Options Picker */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[#E7E0D8]">
                  {product.options.map((opt) => (
                    <div key={opt.name}>
                      <label className="block text-[11px] font-bold text-[#1C1917] uppercase tracking-wider mb-1">
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
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                                isSelected
                                  ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                                  : 'bg-[#FBF9F5] text-[#57534E] border-[#E7E0D8] hover:border-[#B91C1C]'
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
              <div className="pt-3 border-t border-[#E7E0D8] flex items-center justify-between gap-3">
                <div className="flex items-center border border-[#E7E0D8] rounded-md bg-[#FBF9F5]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1.5 text-[#57534E] hover:text-[#1C1917]"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-3 text-xs font-mono font-bold text-[#1C1917]">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1.5 text-[#57534E] hover:text-[#1C1917]"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="btn btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
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
