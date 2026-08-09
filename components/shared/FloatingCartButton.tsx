'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'

export default function FloatingCartButton() {
  const { items, openCart, getItemCount, getSubtotal } = useCartStore()
  const itemCount = getItemCount()
  const subtotal = getSubtotal()

  if (itemCount === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="fixed bottom-6 right-6 z-40"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openCart}
          className="flex items-center gap-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white px-5 py-3.5 rounded-full shadow-xl shadow-red-900/30 border border-red-500/30 transition-all font-semibold"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingBag size={20} />
            <motion.span
              key={itemCount}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 bg-amber-400 text-black font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#B91C1C]"
            >
              {itemCount}
            </motion.span>
          </div>

          <div className="flex flex-col text-left pr-1">
            <span className="text-[10px] uppercase font-bold text-red-200 tracking-wider">
              {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
            </span>
            <span className="font-mono text-sm font-bold leading-none">
              {formatPrice(subtotal)}
            </span>
          </div>

          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowRight size={14} />
          </div>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  )
}
