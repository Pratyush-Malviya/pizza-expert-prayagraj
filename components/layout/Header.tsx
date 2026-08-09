'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, User, Search, Menu, X, Phone,
  Pizza, MapPin
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
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const itemCount = useCartStore((s) => s.getItemCount())
  const toggleCart = useCartStore((s) => s.toggleCart)

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      router.push(`/menu?search=${encodeURIComponent(searchQuery.trim())}`)
      setIsSearchOpen(false)
      setSearchQuery('')
    }
  }

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
              <span>Allapur, Prayagraj</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-[#B91C1C]/20 text-[#B91C1C] px-2 py-0.5 rounded text-[11px] font-semibold border border-[#B91C1C]/30">
              FREE Delivery above ₹499
            </span>
            <span>Open Today: 11:00 AM – 11:00 PM</span>
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header
        className={cn(
          'sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md transition-all border-b border-[#E7E0D8]',
          isScrolled ? 'shadow-xs py-3' : 'py-4'
        )}
      >
        <div className="container-custom flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-[#B91C1C] rounded-lg flex items-center justify-center text-white shadow-xs group-hover:bg-[#991B1B] transition-colors">
              <Pizza size={22} />
            </div>
            <div>
              <span className="block font-serif font-bold text-xl leading-tight text-[#1C1917]">
                Pizza Expert
              </span>
              <span className="block text-[9px] text-[#B91C1C] font-bold tracking-widest uppercase font-mono">
                Prayagraj • Est. 2018
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-semibold transition-colors hover:text-[#B91C1C] relative py-1',
                    isActive ? 'text-[#B91C1C]' : 'text-[#1C1917]'
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B91C1C] rounded-full"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-[#1C1917] hover:bg-[#F4EFEA] rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            <Link
              href="/login"
              className="p-2 text-[#1C1917] hover:bg-[#F4EFEA] rounded-lg transition-colors hidden sm:block"
              aria-label="Account"
            >
              <User size={20} />
            </Link>

            {/* Cart Drawer Launcher */}
            <button
              onClick={toggleCart}
              className="btn btn-primary btn-sm flex items-center gap-2 relative"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline font-bold">Cart</span>
              {itemCount > 0 && (
                <span className="bg-white text-[#B91C1C] font-mono font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-2 text-[#1C1917] md:hidden rounded-lg hover:bg-[#F4EFEA]"
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
            className="md:hidden bg-[#FBF9F5] border-b border-[#E7E0D8] overflow-hidden sticky top-16 z-30 shadow-md"
          >
            <div className="container-custom py-4 flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'py-2 px-3 rounded-md font-semibold text-sm transition-colors',
                    pathname === link.href ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'text-[#1C1917] hover:bg-[#F4EFEA]'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Search Overlay Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white rounded-xl max-w-xl w-full p-4 border border-[#E7E0D8] shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-[#E7E0D8] pb-3">
                <Search size={20} className="text-[#A8A29E]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search wood-fired pizzas, burgers, pasta..."
                  className="flex-1 bg-transparent outline-none text-base text-[#1C1917] placeholder:text-[#A8A29E]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsSearchOpen(false)
                    if (e.key === 'Enter') handleSearchSubmit()
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
