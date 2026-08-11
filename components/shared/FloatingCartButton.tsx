'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'

export default function FloatingCartButton() {
  const [mounted, setMounted] = useState(false)
  const { openCart, getItemCount, getSubtotal } = useCartStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const itemCount = getItemCount()
  const subtotal = getSubtotal()

  if (!mounted || itemCount === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="fixed bottom-6 right-6 z-40 hidden md:block"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openCart}
          className="flex items-center gap-3 bg-[#e10600] hover:bg-[#c40500] text-white px-5 py-3.5 rounded-[15px] shadow-2xl border border-white/20 transition-all font-bold uppercase tracking-wider text-xs"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingBag size={20} />
            <motion.span
              key={itemCount}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-2.5 -right-2.5 bg-white text-[#e10600] font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#260212]"
            >
              {itemCount}
            </motion.span>
          </div>

          <div className="flex flex-col text-left pr-1">
            <span className="text-[9px] uppercase font-bold text-[#ffc7c6] tracking-wider">
              {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
            </span>
            <span className="font-mono text-sm font-black leading-none">
              {formatPrice(subtotal)}
            </span>
          </div>

          <div className="w-7 h-7 rounded-[12px] bg-white/20 flex items-center justify-center">
            <ArrowRight size={14} />
          </div>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  )
}
