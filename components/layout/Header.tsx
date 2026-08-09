'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, User, Menu, X } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'HOME',    href: '/' },
  { label: 'MENU',    href: '/menu' },
  { label: 'OFFERS',  href: '/offers' },
  { label: 'ABOUT',   href: '/about' },
  { label: 'CONTACT', href: '/contact' },
]

export default function Header() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const itemCount = useCartStore((s) => s.getItemCount())
  const toggleCart = useCartStore((s) => s.toggleCart)
  const logoDataUrl = useSettingsStore((state) => state.logoDataUrl)

  useEffect(() => {
    setMounted(true)
    const handler = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
      {/* Main Sticky Butcher Black Header */}
      <header
        className={cn(
          'sticky top-0 z-40 bg-[#000000] border-b border-[#260212] transition-all',
          isScrolled ? 'py-3.5 shadow-xl' : 'py-4.5'
        )}
      >
        <div className="container-custom flex items-center justify-between">
          {/* Brand Logo - Impossible Red Wordmark */}
          <Link href="/" className="flex items-center gap-2 group z-50 relative shrink-0">
            {mounted && logoDataUrl ? (
              <div className="relative w-36 h-10">
                <Image src={logoDataUrl} alt="Store Logo" fill className="object-contain object-left" />
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="font-serif font-black text-2xl tracking-wider leading-none text-[#e10600] group-hover:text-white transition-colors uppercase">
                  PIZZA EXPERT
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#ffc7c6] mt-1 font-bold">
                  PRAYAGRAJ • ALLAPUR
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-xs tracking-wider font-bold transition-colors relative py-1.5 uppercase',
                    isActive ? 'text-[#e10600]' : 'text-[#ffffff] hover:text-[#ffc7c6]'
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#e10600]"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="p-2.5 text-[#ffffff] hover:text-[#ffc7c6] hover:bg-[#260212] rounded-[15px] transition-colors hidden sm:flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
              aria-label="Account"
            >
              <User size={18} />
              <span>SIGN IN</span>
            </Link>

            {/* Cart Button - Impossible Red Fill, 15px Radius */}
            <button
              onClick={toggleCart}
              className="btn btn-primary rounded-[15px] flex items-center gap-2 px-4 shadow-md font-bold text-xs uppercase tracking-wider"
              aria-label="Cart"
            >
              <ShoppingCart size={17} />
              <span className="hidden sm:inline">CART</span>
              {mounted && itemCount > 0 && (
                <span className="bg-[#ffffff] text-[#e10600] font-black text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-2 text-[#ffffff] md:hidden hover:bg-[#260212] rounded-[15px]"
              aria-label="Menu"
            >
              {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#000000] border-b border-[#260212] overflow-hidden sticky top-[68px] z-30 shadow-2xl"
          >
            <div className="container-custom py-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'py-3 border-b border-[#260212] font-serif text-lg font-bold tracking-wider uppercase transition-colors',
                    pathname === link.href ? 'text-[#e10600]' : 'text-[#ffffff]'
                  )}
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-2">
                <Link
                  href="/login"
                  onClick={() => setIsMobileOpen(false)}
                  className="btn btn-secondary w-full rounded-[15px] justify-center text-xs font-bold uppercase tracking-wider"
                >
                  <User size={16} /> Sign In to Your Account
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
