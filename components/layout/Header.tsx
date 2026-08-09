'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, User, Menu, X } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Home',    href: '/' },
  { label: 'Menu',    href: '/menu' },
  { label: 'Offers',  href: '/offers' },
  { label: 'About',   href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
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
      {/* Main Sticky Header */}
      <header
        className={cn(
          'sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-md transition-all border-b border-[var(--border)]',
          isScrolled ? 'shadow-sm py-4' : 'py-5'
        )}
      >
        <div className="container-custom flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group z-50 relative shrink-0">
            {mounted && logoDataUrl ? (
              <div className="relative w-32 h-10">
                <Image src={logoDataUrl} alt="Store Logo" fill className="object-contain object-left" />
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="font-serif font-bold text-2xl leading-none text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                  Pizza Expert
                </span>
                <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mt-1">
                  Prayagraj
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-[15px] transition-colors relative py-1 font-medium',
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--text-primary)] hover:text-[var(--primary)]'
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)]"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="p-2 text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-full transition-colors hidden sm:block"
              aria-label="Account"
            >
              <User size={20} strokeWidth={1.5} />
            </Link>

            {/* Cart Drawer Launcher - Dominant CTA */}
            <button
              onClick={toggleCart}
              className="btn btn-primary btn-sm rounded-full flex items-center gap-2 px-4 shadow-sm"
              aria-label="Cart"
            >
              <ShoppingCart size={18} strokeWidth={2} />
              <span className="hidden sm:inline font-bold">Cart</span>
              {mounted && itemCount > 0 && (
                <span className="bg-white text-[var(--primary)] font-bold text-xs w-[22px] h-[22px] rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-2 text-[var(--text-primary)] md:hidden hover:bg-[var(--bg-subtle)] rounded-full"
              aria-label="Menu"
            >
              {isMobileOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
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
            className="md:hidden bg-[var(--bg-primary)] border-b border-[var(--border)] overflow-hidden sticky top-[73px] z-30 shadow-md"
          >
            <div className="container-custom py-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'py-3 border-b border-[var(--border)] font-serif text-xl transition-colors',
                    pathname === link.href ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 flex gap-4">
                 <Link href="/login" onClick={() => setIsMobileOpen(false)} className="btn btn-secondary w-full">Sign In</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
