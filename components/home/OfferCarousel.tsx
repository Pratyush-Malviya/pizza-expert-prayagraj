'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Flame, ChevronLeft, ChevronRight, Copy, Check, ArrowRight, Clock, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'

import { useSettingsStore } from '@/lib/store/useSettingsStore'

export interface FlashOffer {
  id: string
  badge: string
  badgeColor?: 'orange' | 'yellow' | 'green' | 'purple'
  title: string
  subtitle: string
  code?: string
  discount: string
  expiryText: string
  imageUrl: string
  href: string
}

export default function OfferCarousel() {
  const store = useSettingsStore()
  const [mounted, setMounted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<number>(1)
  const [isPaused, setIsPaused] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Active offers list
  const activeOffers = (mounted && store.carouselOffers && store.carouselOffers.length > 0)
    ? store.carouselOffers.filter((o) => o.active !== false)
    : [
        {
          id: 'offer-1',
          badge: 'FLASH DEAL ⚡',
          badgeColor: 'orange' as const,
          title: '20% OFF YOUR FIRST ORDER',
          subtitle: 'Taste Prayagraj’s finest wood-fired pizza crafted with 48h fermented dough.',
          code: 'WELCOME20',
          discount: 'FLAT 20% OFF',
          expiryText: 'Valid for all new users',
          imageUrl: FOOD_IMAGES['margherita-pizza'],
          href: '/menu',
        },
      ]

  const OFFERS = activeOffers.length > 0 ? activeOffers : [
    {
      id: 'offer-fallback',
      badge: 'SPECIAL OFFER 🔥',
      badgeColor: 'orange' as const,
      title: 'HOT WOOD-FIRED PIZZAS IN ALLAPUR',
      subtitle: 'Order online now for 30-min fast delivery across Prayagraj!',
      code: 'PIZZA20',
      discount: '20% OFF',
      expiryText: 'Limited period',
      imageUrl: FOOD_IMAGES['margherita-pizza'],
      href: '/menu',
    }
  ]

  const intervalTime = 4000 // 4 seconds per slide

  // Auto-play logic with smooth progress bar reset
  useEffect(() => {
    if (isPaused || OFFERS.length <= 1) return

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext()
          return 0
        }
        return prev + 2.5
      })
    }, intervalTime / 40)

    return () => clearInterval(progressInterval)
  }, [currentIndex, isPaused, OFFERS.length])

  const handleNext = () => {
    setDirection(1)
    setProgress(0)
    setCurrentIndex((prev) => (prev + 1) % OFFERS.length)
  }

  const handlePrev = () => {
    setDirection(-1)
    setProgress(0)
    setCurrentIndex((prev) => (prev - 1 + OFFERS.length) % OFFERS.length)
  }

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Copied promo code ${code}! Apply at checkout for discount.`, {
      icon: '🎉',
    })
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const currentOffer = OFFERS[currentIndex]

  // Slide animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
      },
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.96,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    }),
  }

  return (
    <section className="relative bg-[#0D0D11] pt-6 pb-8 border-b border-white/10 overflow-hidden">
      {/* Background Neon Ambient Glows */}
      <div className="absolute top-1/2 left-10 -translate-y-1/2 w-80 h-80 bg-[#FF3B00]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 -translate-y-1/2 w-80 h-80 bg-[#FFC01D]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-custom relative z-10">
        
        {/* Header Ticker Strip */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3B00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF3B00]"></span>
            </span>
            <span className="font-heading font-extrabold text-xs sm:text-sm uppercase tracking-wider text-white flex items-center gap-1.5">
              <Flame size={15} className="text-[#FF3B00] animate-bounce" />
              <span>LIVE FLASH OFFERS</span>
            </span>
          </div>

          {/* Slide Indicator & Controls */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-zinc-400">
              0{currentIndex + 1} / 0{OFFERS.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90"
                aria-label="Previous offer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNext}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90"
                aria-label="Next offer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          className="relative min-h-[220px] sm:min-h-[200px] rounded-3xl bg-[#16161E] border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden group cursor-pointer"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Progress Bar Top Edge */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-20">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FF3B00] via-[#FFC01D] to-[#10B981]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>

          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentOffer.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid lg:grid-cols-12 gap-6 items-center"
            >
              {/* Left Column Text & Code */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#FF3B00] text-white shadow-md animate-pulse">
                    <Zap size={13} /> {currentOffer.badge}
                  </span>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold text-[#FFC01D] bg-[#FFC01D]/10 border border-[#FFC01D]/20">
                    <Clock size={12} /> {currentOffer.expiryText}
                  </span>
                </div>

                <h3 className="font-heading font-extrabold text-2xl sm:text-4xl text-white uppercase tracking-tight leading-tight">
                  {currentOffer.title}
                </h3>

                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed max-w-xl font-normal">
                  {currentOffer.subtitle}
                </p>

                {/* Offer Action Row */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  {currentOffer.code ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => handleCopyCode(e, currentOffer.code!)}
                      className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 group"
                    >
                      <span className="font-mono text-[#FFC01D] font-bold tracking-widest text-sm">
                        {currentOffer.code}
                      </span>
                      {copiedCode === currentOffer.code ? (
                        <Check size={16} className="text-[#10B981]" />
                      ) : (
                        <Copy size={15} className="text-zinc-400 group-hover:text-white transition-colors" />
                      )}
                    </motion.button>
                  ) : null}

                  <Link href={currentOffer.href}>
                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-primary rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#FF3B00]/30"
                    >
                      <span>CLAIM OFFER</span>
                      <ArrowRight size={15} />
                    </motion.span>
                  </Link>
                </div>
              </div>

              {/* Right Column Offer Artwork */}
              <div className="lg:col-span-4 hidden lg:flex items-center justify-end relative">
                <div className="relative w-44 h-44 rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-[#0D0D11] rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <img
                    src={currentOffer.imageUrl}
                    alt={currentOffer.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-[#0D0D11]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 text-[10px] font-black font-mono text-[#FFC01D]">
                    {currentOffer.discount}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Dot Pagination */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {OFFERS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1)
                  setProgress(0)
                  setCurrentIndex(idx)
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-8 bg-[#FF3B00]'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
