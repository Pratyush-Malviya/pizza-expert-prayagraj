'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, User, Menu, X, Sparkles } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import HeaderLocationPicker from '@/components/layout/HeaderLocationPicker'

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
  const [sessionInfo, setSessionInfo] = useState<{ loggedIn: boolean, role: string | null } | null>(null)

  const itemCount = useCartStore((s) => s.getItemCount())
  const toggleCart = useCartStore((s) => s.toggleCart)
  const logoDataUrl = useSettingsStore((state) => state.logoDataUrl)
  const businessName = useSettingsStore((state) => state.businessName)
  const brandBadge = useSettingsStore((state) => state.brandBadge)
  const locationTagline = useSettingsStore((state) => state.locationTagline)

  useEffect(() => {
    setMounted(true)
    const handler = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    
    // Fetch session
    const fetchSession = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
          setSessionInfo({ loggedIn: true, role: profile?.role || 'super_admin' })
        } else {
          setSessionInfo({ loggedIn: false, role: null })
        }
      } catch (e) {
        setSessionInfo({ loggedIn: false, role: null })
      }
    }
    fetchSession()
    
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const isAdminRole = ['super_admin', 'manager', 'staff', 'viewer'].includes(sessionInfo?.role || '')

  return (
    <>
      {/* Top Utility & Delivery Location Bar */}
      <div className="bg-[#09090D] border-b border-white/10 text-xs py-1.5 px-4 sm:px-8 text-zinc-300 flex items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-300 truncate">
          <Sparkles size={12} className="text-[#FFC01D] animate-spin shrink-0" />
          <span className="truncate">
            ⚡ <strong className="text-white">FREE Delivery</strong> on orders above ₹499 • Hot Wood-Fired Pizza in Prayagraj
          </span>
        </div>

        {/* Location Picker neatly docked in the top utility strip */}
        <HeaderLocationPicker className="hidden sm:flex" />
      </div>

      {/* Main Sticky Header */}
      <header
        className={cn(
          'sticky top-0 z-40 bg-[#0D0D11]/95 backdrop-blur-xl border-b border-white/10 transition-all duration-300',
          isScrolled ? 'py-3 shadow-[0_10px_30px_rgba(0,0,0,0.7)]' : 'py-4'
        )}
      >
        <div className="container-custom flex items-center justify-between">
          
          {/* Brand Logo & Location Subtitle */}
          <Link href="/" className="flex items-center gap-3 group z-50 relative shrink-0">
            {mounted && logoDataUrl ? (
              <div className="relative w-36 h-10">
                <Image src={logoDataUrl} alt="Store Logo" fill className="object-contain object-left" />
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-[#FF3B00] group-hover:text-white transition-colors">
                    {mounted && businessName ? businessName.toUpperCase() : 'PIZZA EXPERT'}
                  </span>
                  {(mounted ? (brandBadge || '') : 'PRO') && (
                    <span className="bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md hidden sm:inline-block">
                      {mounted ? brandBadge : 'PRO'}
                    </span>
                  )}
                </div>
                {(mounted ? (locationTagline !== undefined ? locationTagline : 'ALLAPUR • PRAYAGRAJ') : 'ALLAPUR • PRAYAGRAJ') && (
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="uppercase tracking-wider">
                      {mounted ? (locationTagline || 'ALLAPUR • PRAYAGRAJ') : 'ALLAPUR • PRAYAGRAJ'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Link>

          {/* Desktop Nav Links (Clean, Centered, Perfectly Balanced) */}
          <nav className="hidden md:flex items-center gap-8 bg-white/5 border border-white/10 px-7 py-2.5 rounded-full backdrop-blur-md">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-xs tracking-wider font-extrabold transition-colors relative py-1 uppercase',
                    isActive ? 'text-[#FF3B00]' : 'text-zinc-300 hover:text-white'
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#FF3B00] rounded-full"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {sessionInfo?.loggedIn ? (
              <Link
                href={isAdminRole ? '/admin' : '/account'}
                className="p-2.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-white/10"
                aria-label="Account"
              >
                <User size={16} className="text-[#FF3B00]" />
                <span>{isAdminRole ? 'ADMIN' : 'ACCOUNT'}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="p-2.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-white/10"
                aria-label="Account"
              >
                <User size={16} className="text-[#FF3B00]" />
                <span>SIGN IN</span>
              </Link>
            )}

            {/* Cart Button */}
            <button
              onClick={toggleCart}
              className="btn btn-primary rounded-full flex items-center gap-2 px-4 sm:px-5 py-2.5 font-extrabold text-xs tracking-wider shadow-lg shadow-[#FF3B00]/30"
              aria-label="Cart"
            >
              <ShoppingBag size={17} />
              <span className="hidden sm:inline uppercase">CART</span>
              {mounted && itemCount > 0 && (
                <span className="bg-[#FFC01D] text-black font-black text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-2.5 text-white md:hidden hover:bg-white/10 rounded-full border border-white/10"
              aria-label="Menu"
            >
              {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0D0D11] border-b border-white/10 overflow-hidden sticky top-[68px] z-30 shadow-2xl"
          >
            <div className="container-custom py-6 flex flex-col gap-4">
              {/* Mobile Location Quick Bar */}
              <div className="pb-2">
                <HeaderLocationPicker className="flex w-full max-w-none justify-between p-3 rounded-2xl bg-white/10" />
              </div>

              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'py-3 border-b border-white/10 font-heading text-xl font-bold tracking-tight transition-colors flex items-center justify-between',
                    pathname === link.href ? 'text-[#FF3B00]' : 'text-white'
                  )}
                >
                  <span>{link.label}</span>
                  {pathname === link.href && <span className="w-2 h-2 rounded-full bg-[#FF3B00]" />}
                </Link>
              ))}

              <div className="pt-2">
                {sessionInfo?.loggedIn ? (
                  <Link
                    href={isAdminRole ? '/admin' : '/account'}
                    onClick={() => setIsMobileOpen(false)}
                    className="btn btn-secondary w-full rounded-2xl justify-center text-xs font-bold uppercase tracking-wider py-3"
                  >
                    <User size={16} /> {isAdminRole ? 'Admin Portal' : 'My Account'}
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMobileOpen(false)}
                    className="btn btn-secondary w-full rounded-2xl justify-center text-xs font-bold uppercase tracking-wider py-3"
                  >
                    <User size={16} /> Sign In to Your Account
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
