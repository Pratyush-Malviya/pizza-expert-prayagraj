'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Star, Clock, Truck, Flame, ShieldCheck } from 'lucide-react'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'

export default function HeroBanner() {
  return (
    <section
      className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center overflow-hidden bg-[#18181B] text-white py-16 lg:py-24"
      aria-label="Hero section"
    >
      {/* Subtle Hearth Background Image Overlay */}
      <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none">
        <img
          src={FOOD_IMAGES['store-ambiance']}
          alt="Artisanal Hearth"
          className="w-full h-full object-cover filter blur-xs"
        />
      </div>

      {/* Warm Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#B91C1C]/20 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-[400px] h-[400px] rounded-full bg-[#D97706]/15 blur-[120px] pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Content Column (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Top Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 bg-[#27272A] border border-[#3F3F46] px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-[#E7E0D8]"
            >
              <div className="flex items-center gap-1 text-[#D97706]">
                <Star size={14} fill="#D97706" />
                <span className="font-bold text-white">4.9★</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-[#A8A29E]" />
              <span>Prayagraj&apos;s Rated #1 Pizzeria</span>
              <span className="w-1 h-1 rounded-full bg-[#A8A29E]" />
              <span className="text-[#B91C1C] font-semibold">Allapur & Citywide</span>
            </motion.div>

            {/* Main Editorial Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-[1.08]"
            >
              Hand-Tossed Pizza. <br />
              <span className="italic text-[#D97706]">Wood-Fired</span> Perfection.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[#A8A29E] text-base sm:text-lg leading-relaxed max-w-xl font-sans"
            >
              Crafted daily with fermented dough, 100% real mozzarella, and vine-ripened Italian tomato passata. Delivered piping hot to your doorstep in 30 minutes.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <Link
                href="/menu"
                className="btn btn-primary btn-lg"
                id="hero-order-now-btn"
              >
                Order Online <ArrowRight size={18} />
              </Link>
              <Link
                href="/offers"
                className="btn btn-outline btn-lg text-white border-[#3F3F46] hover:bg-[#27272A]"
                id="hero-view-offers-btn"
              >
                View Offers
              </Link>
            </motion.div>

            {/* Key Value Props */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-3 gap-4 pt-6 border-t border-[#27272A] max-w-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#FEF2F2]/10 rounded-md flex items-center justify-center text-[#B91C1C] flex-shrink-0">
                  <Flame size={18} />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Fresh Baked</p>
                  <p className="text-[#A8A29E] text-xs">Made to Order</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#FFFBEB]/10 rounded-md flex items-center justify-center text-[#D97706] flex-shrink-0">
                  <Truck size={18} />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">30 Mins</p>
                  <p className="text-[#A8A29E] text-xs">Express Delivery</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F0FDF4]/10 rounded-md flex items-center justify-center text-[#15803D] flex-shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">100% Pure</p>
                  <p className="text-[#A8A29E] text-xs">Real Cheese</p>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Right Visual Column (5 cols) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative flex items-center justify-center"
          >
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border border-[#3F3F46] shadow-2xl bg-[#27272A]">
              <img
                src={FOOD_IMAGES['hero-pizza']}
                alt="Signature Wood Fired Pizza Expert Prayagraj"
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
              />

              {/* Floating Badge overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#18181B]/90 backdrop-blur-md p-4 rounded-xl border border-[#3F3F46] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#D97706] font-bold uppercase tracking-wider block">Chef&apos;s Special</span>
                  <p className="font-serif font-bold text-base text-white">Chicken Supreme Wood-Fired</p>
                </div>
                <span className="font-bold text-lg text-[#B91C1C] font-mono">₹399</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
