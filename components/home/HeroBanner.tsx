'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Flame, ArrowRight, MapPin, Star, Truck } from 'lucide-react'
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
  const titleSub = mounted && store.heroTitleSub ? store.heroTitleSub : '(FROM ALLAPUR)'
  const titleLine2 = mounted && store.heroTitleLine2 ? store.heroTitleLine2 : 'REAL PIZZA.'
  const description = mounted && store.heroDescription ? store.heroDescription : 'Authentic wood-fired pizza crafted daily in Allapur with slow-fermented 48-hour dough, real mozzarella, and aromatic basil leaves.'
  const primaryBtnText = mounted && store.heroPrimaryBtnText ? store.heroPrimaryBtnText : 'ORDER ONLINE'
  const primaryBtnLink = mounted && store.heroPrimaryBtnLink ? store.heroPrimaryBtnLink : '/menu'
  const secondaryBtnText = mounted && store.heroSecondaryBtnText ? store.heroSecondaryBtnText : 'FIND STORE & DEALS'
  const secondaryBtnLink = mounted && store.heroSecondaryBtnLink ? store.heroSecondaryBtnLink : '/offers'
  const heroImg = mounted && store.heroImageUrl ? store.heroImageUrl : FOOD_IMAGES['hero-pizza']

  const bgCol = mounted && store.themeBackgroundColor ? store.themeBackgroundColor : '#260212'
  const primaryCol = mounted && store.themePrimaryColor ? store.themePrimaryColor : '#e10600'
  const textCol = mounted && store.themeTextColor ? store.themeTextColor : '#ffc7c6'
  const fontFam = mounted && store.themeFontFamily ? store.themeFontFamily : undefined

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden pt-20 pb-20 lg:pt-24 lg:pb-28 transition-colors duration-300"
      style={{ backgroundColor: bgCol, fontFamily: fontFam }}
    >
      {/* Background Subtle Wash */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[150px] pointer-events-none opacity-20"
        style={{ backgroundColor: primaryCol }}
      />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Main Hero Display Column */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 border border-[#e10600]/40 bg-[#4f0423] px-4 py-1.5 rounded-[15px] text-xs font-bold tracking-widest uppercase"
              style={{ color: textCol }}
            >
              <Flame size={14} className="animate-bounce text-[#e10600]" />
              {badgeText}
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-serif font-black text-5xl sm:text-7xl lg:text-[103px] uppercase leading-[0.78] tracking-[0.04em] break-words"
              style={{ color: primaryCol }}
            >
              {titleLine1}<br />
              <span className="text-white font-normal italic text-4xl sm:text-6xl lg:text-[80px] leading-tight block my-2 font-sans tracking-normal">
                {titleSub}
              </span>
              {titleLine2}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg leading-relaxed max-w-lg font-medium"
              style={{ color: textCol }}
            >
              {description}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={primaryBtnLink}
                  className="btn rounded-[15px] px-8 py-3.5 text-sm font-extrabold tracking-wider flex items-center justify-center gap-2 group shadow-xl"
                  style={{ backgroundColor: primaryCol, color: '#ffffff' }}
                >
                  <span>{primaryBtnText}</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={secondaryBtnLink}
                  className="btn btn-secondary rounded-[15px] px-8 py-3.5 text-sm font-extrabold tracking-wider flex items-center justify-center gap-2"
                >
                  <MapPin size={16} />
                  <span>{secondaryBtnText}</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Quick Proof Metrics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="pt-6 border-t border-[#000000] flex items-center gap-6 text-xs"
              style={{ color: textCol }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[15px] bg-[#4f0423] border border-[#e10600]/30 flex items-center justify-center text-vibrant-yellow">
                  <Star size={15} fill="currentColor" />
                </div>
                <div>
                  <span className="block font-bold text-white text-sm font-mono">4.9 / 5.0</span>
                  <span className="text-[10px] uppercase font-bold" style={{ color: textCol }}>500+ Google Reviews</span>
                </div>
              </div>

              <div className="w-px h-8 bg-black/40" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[15px] bg-[#4f0423] border border-[#e10600]/30 flex items-center justify-center text-vibrant-green">
                  <Truck size={15} />
                </div>
                <div>
                  <span className="block font-bold text-white text-sm font-mono">25-30 MINS</span>
                  <span className="text-[10px] uppercase font-bold" style={{ color: textCol }}>Fast Hot Delivery</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-[38px] overflow-hidden bg-[#4f0423] border border-black shadow-2xl group">
              <motion.img
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                src={heroImg}
                alt="Signature Wood Fired Pizza Expert Prayagraj"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />

              {/* Floating Badge 1 */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute top-6 right-6 bg-[#000000]/90 backdrop-blur-md border border-[#e10600]/40 p-3.5 rounded-[15px] flex items-center gap-3 shadow-2xl"
              >
                <div className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white font-black text-base shadow-md" style={{ backgroundColor: primaryCol }}>
                  🔥
                </div>
                <div>
                  <span className="block font-bold text-white text-xs uppercase tracking-wider">FRESH OUT OF OVEN</span>
                  <span className="block text-[10px] font-mono" style={{ color: textCol }}>100% REAL MOZZARELLA</span>
                </div>
              </motion.div>

              {/* Floating Badge 2 */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="absolute bottom-6 left-6 bg-[#000000]/90 backdrop-blur-md border border-[#e10600]/40 p-3.5 rounded-[15px] flex items-center gap-3 shadow-2xl"
              >
                <div className="w-9 h-9 rounded-[12px] bg-vibrant-green flex items-center justify-center text-[#260212] font-bold text-base shadow-md">
                  🛵
                </div>
                <div>
                  <span className="block font-bold text-white text-xs uppercase tracking-wider">FREE DELIVERY</span>
                  <span className="block text-[10px] text-vibrant-green font-mono">ON ORDERS ABOVE ₹{store.freeDeliveryAbove || 499}</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
