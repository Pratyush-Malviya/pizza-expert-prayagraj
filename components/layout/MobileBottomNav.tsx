'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, UtensilsCrossed, ShoppingBag, Tag, User } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { motion } from 'framer-motion'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const itemCount = useCartStore((s) => s.getItemCount())
  const toggleCart = useCartStore((s) => s.toggleCart)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hide on admin routes or driver routes
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/driver')) {
    return null
  }

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Menu', href: '/menu', icon: UtensilsCrossed },
    { label: 'Cart', isCart: true, icon: ShoppingBag },
    { label: 'Offers', href: '/offers', icon: Tag },
    { label: 'Account', href: '/account', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-xl border-t border-[var(--border)] py-2 px-3 md:hidden shadow-[var(--shadow-apple-md)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item, idx) => {
          const Icon = item.icon

          if (item.isCart) {
            return (
              <button
                key={idx}
                onClick={toggleCart}
                className="relative flex flex-col items-center gap-1 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                aria-label="Open Cart"
              >
                <div className="relative">
                  <Icon size={20} className="text-[#FF3B00]" />
                  {mounted && itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2 bg-[#FFC01D] text-black font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-md"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </div>
                <span className="text-[10px] font-bold tracking-tight text-[#FF3B00]">Cart</span>
              </button>
            )
          }

          const isActive = pathname === item.href

          return (
            <Link
              key={idx}
              href={item.href!}
              className={`flex flex-col items-center gap-1 p-1 transition-colors relative ${
                isActive ? 'text-[#FF3B00]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavDot"
                  className="absolute -bottom-1 w-1.5 h-1.5 bg-[#FF3B00] rounded-full"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
