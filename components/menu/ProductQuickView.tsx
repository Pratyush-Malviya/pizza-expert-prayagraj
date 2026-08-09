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

export default function ProductQuickView({ product, onClose }: ProductQuickViewProps) {
  if (!product) return null

  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, { choice: string; priceDelta: number }>>(() => {
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
  })

  const optionsDelta = Object.values(selectedOptions).reduce((sum, o) => sum + o.priceDelta, 0)
  const unitPrice = product.price + optionsDelta
  const totalPrice = unitPrice * quantity

  const imageUrl = product.images?.[0]?.image_url || FOOD_IMAGES[product.slug] || FOOD_IMAGES['margherita-pizza']

  const handleOptionSelect = (optionName: string, choiceLabel: string, priceDelta: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: { choice: choiceLabel, priceDelta },
    }))
  }

  const handleAddToCart = () => {
    const formattedOptions: CartItemOption[] = Object.entries(selectedOptions).map(([optionName, val]) => ({
      optionName,
      choice: val.choice,
      priceDelta: val.priceDelta,
    }))

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

    toast.success(`Added ${quantity}x ${product.name} to cart`, {
      action: {
        label: 'View Cart',
        onClick: () => openCart(),
      },
    })
    onClose()
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden relative my-8 border border-[#E7E0D8]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 bg-white/90 rounded-md flex items-center justify-center text-[#57534E] hover:text-[#1C1917] transition-colors shadow-xs"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="grid md:grid-cols-2">
            {/* Image Section */}
            <div className="bg-[#F4EFEA] relative min-h-[240px] md:min-h-full">
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-1 z-10">
                <span className={`badge ${product.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>
                  {product.is_veg ? 'Veg' : 'Non-Veg'}
                </span>
                {product.is_spicy && <span className="badge badge-spicy">Spicy</span>}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div>
                <h2 className="font-serif font-bold text-2xl text-[#1C1917] mb-2 leading-tight">
                  {product.name}
                </h2>
                <p className="text-[#57534E] text-xs leading-relaxed mb-4">
                  {product.description}
                </p>

                {/* Customization Options */}
                {product.options && product.options.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-[#E7E0D8]">
                    {product.options.map((opt) => (
                      <div key={opt.id}>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-2">
                          Select {opt.name}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {opt.choices.map((choice) => {
                            const isSelected = selectedOptions[opt.name]?.choice === choice.label
                            return (
                              <button
                                key={choice.label}
                                onClick={() => handleOptionSelect(opt.name, choice.label, choice.price_delta)}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                                  isSelected
                                    ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                                    : 'bg-[#FBF9F5] text-[#57534E] border-[#E7E0D8] hover:bg-[#F4EFEA]'
                                }`}
                              >
                                {choice.label}
                                {choice.price_delta > 0 && ` (+${formatPrice(choice.price_delta)})`}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity and Price */}
              <div className="pt-4 border-t border-[#E7E0D8] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-[#F4EFEA] rounded-md px-2 py-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-[#1C1917] hover:bg-[#E7E0D8] transition-colors font-bold text-xs"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="font-bold text-xs text-[#1C1917] w-5 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-[#1C1917] hover:bg-[#E7E0D8] transition-colors font-bold text-xs"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#A8A29E] font-bold uppercase block text-right">Total</span>
                    <span className="font-bold text-xl text-[#B91C1C]">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={17} /> Add to Cart — {formatPrice(totalPrice)}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
