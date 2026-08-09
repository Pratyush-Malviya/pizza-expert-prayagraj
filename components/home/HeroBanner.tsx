'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'

export default function HeroBanner() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[var(--bg-dark)] pt-24 pb-20 lg:pt-32 lg:pb-28">
      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Content Column */}
          <div className="space-y-8 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block border border-white/20 px-4 py-1.5 rounded-full text-xs font-sans tracking-widest text-white/80 uppercase"
            >
              Est. 2018 • Prayagraj
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif text-5xl md:text-6xl lg:text-[76px] font-bold tracking-tight text-white leading-[1.05]"
            >
              Hand-Tossed.<br />
              <span className="italic text-[var(--primary)]">Wood-Fired.</span><br />
              Made Fresh.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[#A8A29E] text-base sm:text-lg leading-relaxed font-sans max-w-md"
            >
              Authentic wood-fired pizza crafted daily in Allapur with slow-fermented dough, real mozzarella, and fresh ingredients.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4"
            >
              <Link href="/menu" className="btn btn-primary btn-lg w-full sm:w-auto px-8">
                Order Online
              </Link>
              <Link href="/offers" className="btn btn-secondary-inverse btn-lg w-full sm:w-auto px-8">
                Explore Menu
              </Link>
            </motion.div>
          </div>

          {/* Right Visual Column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-[24px] overflow-hidden"
          >
            <img
              src={FOOD_IMAGES['hero-pizza']}
              alt="Signature Wood Fired Pizza Expert Prayagraj"
              className="w-full h-full object-cover"
            />
          </motion.div>
          
        </div>
      </div>
    </section>
  )
}
