'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, User, Search, Menu, X, Phone,
  Pizza, MapPin, Flame
} from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Home',    href: '/' },
  { label: 'Menu',    href: '/menu' },
  { label: 'Offers',  href: '/offers' },
  { label: 'About',   href: '/about' },
  { label: 'Blog',    href: '/blog' },
  { label: 'Contact', href: '/contact' },
]

export default function Header() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const itemCount = useCartStore((s) => s.getItemCount())
  const toggleCart = useCartStore((s) => s.toggleCart)

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => { setIsMobileOpen(false) }, [pathname])

  return (
    <>
      {/* Top Notification & Location Bar */}
      <div className="bg-[#18181B] text-[#A8A29E] text-xs py-2 px-4 hidden md:block border-b border-[#27272A]">
        <div className="container-custom flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="tel:+919999999999" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone size={13} className="text-[#B91C1C]" />
              <span className="font-medium">+91-9999999999</span>
            </a>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-[#B91C1C]" />
              <span>Allapur, Prayagraj, UP 211006</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#FEF2F2] text-[#B91C1C] px-2 py-0.5 rounded-xs font-semibold text-[10px] uppercase tracking-wider">
              Free Delivery
            </span>
            <span className="text-[#E7E0D8]">on orders above ₹499</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={cn(
          'sticky top-0 z-40 transition-all duration-300',
          isScrolled
            ? 'bg-[#FBF9F5]/95 backdrop-blur-md shadow-xs border-b border-[#E7E0D8] py-3'
            : 'bg-[#FBF9F5] py-4 border-b border-[#E7E0D8]/60'
        )}
        role="banner"
      >
        <div className="container-custom">
          <div className="flex items-center justify-between">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0" aria-label="Pizza Expert Prayagraj Home">
              <div className="w-10 h-10 bg-[#B91C1C] rounded-lg flex items-center justify-center text-white shadow-xs group-hover:bg-[#991B1B] transition-colors">
                <Pizza size={22} strokeWidth={2} />
              </div>
              <div>
                <span className="block font-serif font-black text-xl leading-none text-[#1C1917] tracking-tight group-hover:text-[#B91C1C] transition-colors">
                  Pizza Expert
                </span>
                <span className="block text-[9px] text-[#B91C1C] font-bold tracking-widest uppercase leading-tight mt-0.5">
                  Prayagraj • Est. 2018
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
                      isActive
                        ? 'text-[#B91C1C] font-bold bg-[#FEF2F2]'
                        : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFEA]'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <button
                id="header-search-btn"
                onClick={() => setIsSearchOpen(true)}
                className="p-2.5 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFEA] transition-colors"
                aria-label="Search menu"
              >
                <Search size={19} />
              </button>

              {/* Account */}
              <Link
                href="/login"
                id="header-account-btn"
                className="p-2.5 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFEA] transition-colors hidden sm:flex"
                aria-label="My account"
              >
                <User size={19} />
              </Link>

              {/* Cart Button */}
              <button
                id="header-cart-btn"
                onClick={toggleCart}
                className="relative flex items-center gap-2 bg-[#B91C1C] text-white px-4 py-2.5 rounded-md font-semibold text-sm hover:bg-[#991B1B] transition-all shadow-xs"
                aria-label={`Shopping cart with ${itemCount} items`}
              >
                <ShoppingCart size={18} />
                <span className="hidden sm:inline">Cart</span>
                {itemCount > 0 && (
                  <span className="bg-white text-[#B91C1C] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                id="mobile-menu-btn"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="lg:hidden p-2.5 rounded-md text-[#1C1917] hover:bg-[#F4EFEA] transition-colors ml-1"
                aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              >
                {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden border-t border-[#E7E0D8] bg-[#FBF9F5]"
            >
              <nav className="container-custom py-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'px-4 py-3 rounded-md text-sm font-semibold transition-colors',
                      pathname === link.href
                        ? 'bg-[#FEF2F2] text-[#B91C1C]'
                        : 'text-[#57534E] hover:bg-[#F4EFEA] hover:text-[#1C1917]'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Search Overlay Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-24 px-4"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -10 }}
              className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-5 border border-[#E7E0D8]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 bg-[#FBF9F5] rounded-lg px-4 py-3 border border-[#E7E0D8]">
                <Search size={18} className="text-[#A8A29E]" />
                <input
                  type="search"
                  placeholder="Search wood-fired pizzas, burgers, pasta..."
                  className="flex-1 bg-transparent outline-none text-base text-[#1C1917] placeholder:text-[#A8A29E]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsSearchOpen(false)
                    if (e.key === 'Enter') {
                      const q = (e.target as HTMLInputElement).value
                      if (q) window.location.href = `/menu?search=${encodeURIComponent(q)}`
                    }
                  }}
                />
                <button onClick={() => setIsSearchOpen(false)} className="p-1 rounded-md hover:bg-[#E7E0D8] text-[#57534E]">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-[#A8A29E] mt-3 px-1">Press Enter to search menu or Esc to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
