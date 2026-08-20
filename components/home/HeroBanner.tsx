'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Flame, ArrowRight, MapPin, Star, Truck, ShieldCheck, Zap } from 'lucide-react'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import HomeLocationWidget from '@/components/home/HomeLocationWidget'

export default function HeroBanner() {
  const store = useSettingsStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const badgeText = mounted && store.heroBadge ? store.heroBadge : 'EST. 2018 • ALLAPUR, PRAYAGRAJ'
  const titleLine1 = mounted && store.heroTitleLine1 ? store.heroTitleLine1 : 'WOOD-FIRED'
  const titleSub = mounted && store.heroTitleSub ? store.heroTitleSub : '(HANDCRAFTED IN PRAYAGRAJ)'
  const titleLine2 = mounted && store.heroTitleLine2 ? store.heroTitleLine2 : 'REAL PIZZA.'
  const description = mounted && store.heroDescription ? store.heroDescription : 'Authentic wood-fired pizza crafted daily in Allapur with slow-fermented 48-hour dough, 100% real mozzarella, and fresh basil leaves.'
  const primaryBtnText = mounted && store.heroPrimaryBtnText ? store.heroPrimaryBtnText : 'ORDER ONLINE'
  const primaryBtnLink = mounted && store.heroPrimaryBtnLink ? store.heroPrimaryBtnLink : '/menu'
  const secondaryBtnText = mounted && store.heroSecondaryBtnText ? store.heroSecondaryBtnText : 'VIEW OFFERS'
  const secondaryBtnLink = mounted && store.heroSecondaryBtnLink ? store.heroSecondaryBtnLink : '/offers'
  const heroImg = mounted && store.heroImageUrl ? store.heroImageUrl : FOOD_IMAGES['hero-pizza']

  return (
    <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 bg-[#0D0D11]">
      {/* Background Sizzle Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[#FF3B00]/15 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] rounded-full bg-[#FFC01D]/10 blur-[140px] pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Bold Headline & Actions */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            
            {/* Live Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 border border-[#FF3B00]/40 bg-[#FF3B00]/10 px-4 py-2 rounded-full text-xs font-extrabold tracking-wider uppercase text-white shadow-xs"
            >
              <Flame size={15} className="animate-bounce text-[#FF3B00]" />
              <span>{badgeText}</span>
            </motion.div>

            {/* Display Typography */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-heading font-extrabold text-5xl sm:text-7xl lg:text-[96px] uppercase leading-[0.82] tracking-tight text-white"
            >
              <span className="text-[#FF3B00]">{titleLine1}</span><br />
              <span className="text-[#FFC01D] font-medium italic text-3xl sm:text-5xl lg:text-[68px] leading-tight block my-2 font-sans tracking-normal">
                {titleSub}
              </span>
              <span className="text-white">{titleLine2}</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg leading-relaxed max-w-xl text-zinc-300 font-medium"
            >
              {description}
            </motion.p>

            {/* Live Location Selector Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <HomeLocationWidget />
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={primaryBtnLink}
                  className="btn btn-primary rounded-full px-8 py-4 text-sm font-extrabold tracking-wider flex items-center justify-center gap-2.5 group shadow-xl shadow-[#FF3B00]/30 w-full sm:w-auto"
                >
                  <span>{primaryBtnText}</span>
                  <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={secondaryBtnLink}
                  className="btn btn-secondary rounded-full px-8 py-4 text-sm font-extrabold tracking-wider flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Zap size={17} className="text-[#FFC01D]" />
                  <span>{secondaryBtnText}</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Social Proof Metrics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-zinc-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FFC01D]">
                  <Star size={18} fill="currentColor" />
                </div>
                <div>
                  <span className="block font-black text-white text-base font-mono">4.9 / 5.0 ★</span>
                  <span className="text-[11px] uppercase font-bold text-zinc-400">500+ Google Reviews</span>
                </div>
              </div>

              <div className="w-px h-8 bg-white/10 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#10B981]">
                  <Truck size={18} />
                </div>
                <div>
                  <span className="block font-black text-white text-base font-mono">25-30 MINS</span>
                  <span className="text-[11px] uppercase font-bold text-zinc-400">Fast Hot Delivery</span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Right Column: Hero Food Artwork */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-[32px] overflow-hidden bg-[#16161E] border border-white/10 shadow-2xl group">
              <motion.img
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                src={heroImg}
                alt="Signature Wood Fired Pizza Expert Prayagraj"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />

              {/* Floating Badge 1 - Top Right */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute top-6 right-6 bg-[#0D0D11]/90 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl flex items-center gap-3 shadow-2xl"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF3B00] flex items-center justify-center text-white font-black text-lg shadow-md">
                  🔥
                </div>
                <div>
                  <span className="block font-black text-white text-xs uppercase tracking-wider">WOOD-FIRED OVEN</span>
                  <span className="block text-[10px] text-zinc-400 font-mono">100% REAL MOZZARELLA</span>
                </div>
              </motion.div>

              {/* Floating Badge 2 - Bottom Left */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="absolute bottom-6 left-6 bg-[#0D0D11]/90 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl flex items-center gap-3 shadow-2xl"
              >
                <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center text-black font-black text-lg shadow-md">
                  🛵
                </div>
                <div>
                  <span className="block font-black text-white text-xs uppercase tracking-wider">FREE DELIVERY</span>
                  <span className="block text-[10px] text-[#10B981] font-mono font-bold">ON ORDERS ABOVE ₹{store.freeDeliveryAbove || 499}</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

