'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Star, Clock, Sparkles } from 'lucide-react'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { useSettingsStore } from '@/lib/store/useSettingsStore'

export default function HeroBanner() {
  const store = useSettingsStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const badgeText = mounted && store.heroBadge ? store.heroBadge : 'EST. 2018 • ALLAPUR, PRAYAGRAJ'
  const titleLine1 = mounted && store.heroTitleLine1 ? store.heroTitleLine1 : 'WOOD-FIRED'
  const titleSub = mounted && store.heroTitleSub ? store.heroTitleSub : 'Handcrafted in Prayagraj'
  const titleLine2 = mounted && store.heroTitleLine2 ? store.heroTitleLine2 : 'REAL PIZZA.'
  const description =
    mounted && store.heroDescription
      ? store.heroDescription
      : 'Authentic wood-fired pizza crafted daily in Allapur with slow-fermented 48-hour dough, 100% real mozzarella, and farm-fresh ingredients.'
  const primaryBtnText = mounted && store.heroPrimaryBtnText ? store.heroPrimaryBtnText : 'ORDER ONLINE'
  const primaryBtnLink = mounted && store.heroPrimaryBtnLink ? store.heroPrimaryBtnLink : '/menu'
  const secondaryBtnText = mounted && store.heroSecondaryBtnText ? store.heroSecondaryBtnText : 'VIEW OFFERS'
  const secondaryBtnLink = mounted && store.heroSecondaryBtnLink ? store.heroSecondaryBtnLink : '/offers'
  const heroImg = mounted && store.heroImageUrl ? store.heroImageUrl : FOOD_IMAGES['hero-pizza']

  return (
    <section className="relative min-h-[78vh] lg:min-h-[84vh] flex items-center overflow-hidden pt-10 pb-14 lg:pt-16 lg:pb-20 bg-[#0A0A0E]">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-[#FF3B00]/10 blur-[150px] pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Minimal Typography & Actions */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Minimal Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase text-zinc-300 backdrop-blur-md"
            >
              <Sparkles size={13} className="text-[#FFC01D]" />
              <span>{badgeText}</span>
            </motion.div>

            {/* Display Typography */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-1 drop-shadow-2xl"
            >
              <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-[80px] uppercase leading-[0.9] tracking-tight text-white">
                <span className="text-[#FF3B00] drop-shadow-[0_4px_24px_rgba(255,59,0,0.4)]">{titleLine1}</span>
                <span className="block text-2xl sm:text-4xl lg:text-[44px] font-serif italic font-normal text-[#FFC01D] my-1.5 tracking-normal lowercase first-letter:uppercase">
                  {titleSub}
                </span>
                <span className="text-white">{titleLine2}</span>
              </h1>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg leading-relaxed max-w-xl text-zinc-400 font-normal"
            >
              {description}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2"
            >
              <Link
                href={primaryBtnLink}
                className="btn btn-primary rounded-full px-8 py-3.5 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 group shadow-lg shadow-[#FF3B00]/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>{primaryBtnText}</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href={secondaryBtnLink}
                className="btn btn-secondary rounded-full px-7 py-3.5 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 transition-all text-zinc-200"
              >
                <span>{secondaryBtnText}</span>
              </Link>
            </motion.div>

            {/* Clean Minimal Trust Pill */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="flex flex-wrap items-center gap-6 text-xs text-zinc-400 pt-3"
            >
              <div className="flex items-center gap-2 font-medium">
                <div className="flex items-center text-[#FFC01D]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} fill="currentColor" />
                  ))}
                </div>
                <span className="font-bold text-white font-mono">4.9</span>
                <span className="text-zinc-500">(500+ Prayagraj reviews)</span>
              </div>

              <span className="hidden sm:inline text-zinc-700">•</span>

              <div className="flex items-center gap-1.5 font-medium">
                <Clock size={13} className="text-[#10B981]" />
                <span className="text-zinc-300">25–30 min average delivery</span>
              </div>
            </motion.div>

          </div>

          {/* Right Column: Clean Food Imagery */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 relative flex justify-center"
          >
            <div className="relative w-full max-w-[440px] aspect-square rounded-3xl overflow-hidden bg-[#121218] border border-white/10 shadow-2xl group">
              <img
                src={heroImg}
                alt="Pizza Expert Prayagraj Signature Pizza"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[800ms] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-xs text-white">
                <div>
                  <span className="block font-bold tracking-tight">Signature Wood-Fired Crust</span>
                  <span className="block text-[11px] text-[#FFC01D] font-medium">450°C Stone Oven • 48h Ferment</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#FF3B00] px-2.5 py-1 rounded-full uppercase tracking-wider">
                  HOT & FRESH
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
