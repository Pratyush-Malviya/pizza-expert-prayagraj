'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Star, Truck, Flame, ArrowRight } from 'lucide-react'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'

export default function HeroBanner() {
  return (
    <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-[var(--bg-dark)] pt-24 pb-20 lg:pt-28 lg:pb-24">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#B91C1C]/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Content Column */}
          <div className="space-y-8 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 rounded-full text-xs font-sans font-bold tracking-widest text-amber-400 uppercase shadow-xs"
            >
              <Flame size={14} className="animate-bounce text-amber-400" />
              Est. 2018 • Allapur, Prayagraj
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif text-5xl md:text-6xl lg:text-[76px] font-bold tracking-tight text-white leading-[1.05]"
            >
              Hand-Tossed.<br />
              <span className="italic text-[var(--primary)] bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
                Wood-Fired.
              </span><br />
              Made Fresh.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[#A8A29E] text-base sm:text-lg leading-relaxed font-sans max-w-md"
            >
              Authentic wood-fired pizza crafted daily with slow-fermented 48-hour dough, fresh mozzarella, and aromatic basil leaves.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4"
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link href="/menu" className="btn btn-primary btn-lg w-full sm:w-auto px-8 flex items-center justify-center gap-2 group">
                  <span>Order Online Now</span>
                  <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link href="/offers" className="btn btn-secondary-inverse btn-lg w-full sm:w-auto px-8">
                  Explore Combos
                </Link>
              </motion.div>
            </motion.div>

            {/* Quick Metrics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="pt-6 border-t border-white/10 flex items-center gap-6 text-xs text-[#A8A29E]"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Star size={15} fill="currentColor" />
                </div>
                <div>
                  <span className="block font-bold text-white text-sm font-mono">4.9 / 5.0</span>
                  <span className="text-[10px]">500+ Google Reviews</span>
                </div>
              </div>

              <div className="w-px h-8 bg-white/10" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Truck size={15} />
                </div>
                <div>
                  <span className="block font-bold text-white text-sm font-mono">25-30 Mins</span>
                  <span className="text-[10px]">Fast Hot Delivery</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Visual Column with Gentle Floating Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-[28px] overflow-hidden group shadow-2xl border border-white/10"
          >
            {/* Main Hero Image */}
            <motion.img
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              src={FOOD_IMAGES['hero-pizza']}
              alt="Signature Wood Fired Pizza Expert Prayagraj"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />

            {/* Floating Highlight Badge 1 */}
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute top-6 right-6 bg-[#18181B]/80 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-center gap-3 shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-[#B91C1C] flex items-center justify-center text-white font-bold font-serif text-lg shadow-md">
                🔥
              </div>
              <div>
                <span className="block font-bold text-white text-xs">Fresh Out of Oven</span>
                <span className="block text-[10px] text-amber-400 font-mono">100% Real Cheese</span>
              </div>
            </motion.div>

            {/* Floating Highlight Badge 2 */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="absolute bottom-6 left-6 bg-[#18181B]/80 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl flex items-center gap-3 shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-md">
                🛵
              </div>
              <div>
                <span className="block font-bold text-white text-xs">Free Delivery</span>
                <span className="block text-[10px] text-emerald-400 font-mono">On orders over ₹499</span>
              </div>
            </motion.div>
          </motion.div>
          
        </div>
      </div>
    </section>
  )
}
