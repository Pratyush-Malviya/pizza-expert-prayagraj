'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Tag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import CartUpsell from './CartUpsell'

export default function CartDrawer() {
  const { isOpen, closeCart, items, updateQuantity, removeItem, getSubtotal, getItemKey } = useCartStore()
  const subtotal = getSubtotal()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[#FBF9F5] shadow-2xl flex flex-col border-l border-[#E7E0D8]"
            role="dialog"
            aria-label="Shopping Cart Drawer"
          >
            {/* Header */}
            <div className="p-6 bg-white border-b border-[#E7E0D8] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FEF2F2] rounded-lg flex items-center justify-center text-[#B91C1C]">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-xl text-[#1C1917]">Your Cart</h2>
                  <p className="text-xs text-[#57534E]">
                    {items.reduce((sum, i) => sum + i.quantity, 0)} {items.length === 1 ? 'item' : 'items'} selected
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="p-2 rounded-lg text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFEA] transition-colors"
                aria-label="Close cart"
              >
                <X size={20} />
              </button>
            </div>

            {/* Goal-Gradient Effect: Free Delivery Progress Meter */}
            {items.length > 0 && (
              <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-6 py-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#92400E] mb-1.5">
                  <span>
                    {subtotal >= 499 ? (
                      '🎉 You unlocked FREE Delivery!'
                    ) : (
                      <>Add <strong className="text-[#B91C1C] font-extrabold">{formatPrice(499 - subtotal)}</strong> more for FREE Delivery 🚚</>
                    )}
                  </span>
                  <span className="font-mono text-[11px]">{Math.min(100, Math.round((subtotal / 499) * 100))}%</span>
                </div>
                <div className="w-full bg-[#FEF3C7] h-2 rounded-full overflow-hidden border border-[#FCD34D]/60">
                  <div
                    className="bg-[#16A34A] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.round((subtotal / 499) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                  {/* Picture Superiority Effect: Expressive visual empty state */}
                  <div className="w-24 h-24 bg-[#FEF2F2] rounded-3xl flex items-center justify-center text-5xl shadow-inner border border-[#FEE2E2]">
                    🍕
                  </div>
                  <h3 className="font-serif font-bold text-xl text-[#1C1917]">Your Cart is Craving Pizza!</h3>
                  <p className="text-xs sm:text-sm text-[#57534E] max-w-xs leading-relaxed">
                    Explore our authentic wood-fired pizzas, cheesy garlic breads, and chilled beverages.
                  </p>
                  <Link
                    href="/menu"
                    onClick={closeCart}
                    className="btn btn-primary btn-md mt-2 shadow-lg shadow-[#FF3B00]/20 font-bold"
                  >
                    Browse Our Delicious Menu →
                  </Link>
                </div>
              ) : (
                items.map((item) => {
                  const key = getItemKey(item.id, item.selectedOptions)
                  return (
                    <div
                      key={key}
                      className="bg-white rounded-xl p-4 border border-[#E7E0D8] shadow-xs flex items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-[#F4EFEA] rounded-lg overflow-hidden flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-2xl select-none">🍕</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#1C1917] truncate">{item.name}</h4>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <p className="text-[11px] text-[#A8A29E] truncate">
                            {item.selectedOptions.map((o) => o.choice).join(', ')}
                          </p>
                        )}
                        <p className="font-bold text-sm text-[#B91C1C] mt-0.5">
                          {formatPrice(item.totalPrice)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeItem(key)}
                          className="text-[#A8A29E] hover:text-[#B91C1C] transition-colors p-1"
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                        <div className="flex items-center gap-2 bg-[#F4EFEA] rounded-md px-2 py-1">
                          <button
                            onClick={() => updateQuantity(key, item.quantity - 1)}
                            className="text-[#1C1917] hover:text-[#B91C1C] transition-colors"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="font-bold text-xs text-[#1C1917] w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(key, item.quantity + 1)}
                            className="text-[#1C1917] hover:text-[#B91C1C] transition-colors"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              {items.length > 0 && <CartUpsell />}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="p-6 bg-white border-t border-[#E7E0D8] space-y-4">
                {/* 1-Line Promo Coupon Accordion */}
                <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917]">
                      <Tag size={14} className="text-[#B91C1C]" />
                      <span>Have a Promo Coupon?</span>
                    </div>
                    <Link
                      href="/cart"
                      onClick={closeCart}
                      className="text-xs font-bold text-[#B91C1C] hover:underline"
                    >
                      Apply Code &gt;
                    </Link>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#57534E]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#1C1917]">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#A8A29E]">
                    <span>Taxes & delivery calculated at checkout</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  {/* Primary Target (Von Restorff Isolation & Information Scent): Dominant Full-Width Checkout */}
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="btn btn-primary w-full min-h-[52px] flex items-center justify-center gap-2 text-sm sm:text-base font-extrabold uppercase tracking-wider rounded-2xl shadow-xl shadow-[#FF3B00]/30 active:scale-[0.99] transition-transform"
                  >
                    <span>Proceed to Checkout ({formatPrice(subtotal)})</span>
                    <ArrowRight size={18} />
                  </Link>

                  {/* Secondary Option: De-emphasized to prevent choice paralysis */}
                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="text-center text-xs font-bold text-[#57534E] hover:text-[#1C1917] hover:underline py-1.5 transition-colors"
                  >
                    Review full order breakdown & coupons →
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
