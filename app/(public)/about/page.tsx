'use client'

import { useState, useEffect } from 'react'
import { Heart, ShieldCheck } from 'lucide-react'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { useSettingsStore } from '@/lib/store/useSettingsStore'

export default function AboutPage() {
  const [mounted, setMounted] = useState(false)
  const store = useSettingsStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const storeName = mounted && store.businessName ? store.businessName : 'Pizza Expert Prayagraj'
  const aboutHeading = mounted && store.aboutHeading ? store.aboutHeading : 'Crafted With Passion. Baked With Love.'
  const aboutParagraph = mounted && store.aboutParagraph ? store.aboutParagraph : `At ${storeName}, our mission is simple: to bring authentic pizza culture to Prayagraj. Every crust is hand-tossed every morning, sauces are simmered with organic tomatoes, and every topping is freshly prepared to ensure flavor in every single bite.`

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom">

        {/* Hero Image Banner */}
        <div className="relative rounded-xl overflow-hidden shadow-md mb-12 min-h-[300px] sm:min-h-[380px] flex items-center justify-center text-center p-6 sm:p-12 border border-[#E7E0D8]">
          <img
            src={FOOD_IMAGES['store-ambiance']}
            alt={`${storeName} Ambiance & Kitchen`}
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.35]"
          />
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-block text-xs font-bold tracking-widest text-[#D97706] uppercase font-mono bg-black/40 px-3 py-1 rounded border border-[#D97706]/40 backdrop-blur-xs">
              Handcrafted in Prayagraj Since 2018
            </span>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
              {aboutHeading}
            </h1>
            <p className="text-[#E7E0D8] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Serving Allapur and Prayagraj with authentic wood-fired style pizzas, 100% real mozzarella, and locally sourced ingredients.
            </p>
          </div>
        </div>

        {/* Mission & Hygiene Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-xl p-8 border border-[#E7E0D8] shadow-xs space-y-3">
            <div className="w-12 h-12 bg-[#FEF2F2] text-[#B91C1C] rounded-lg flex items-center justify-center font-bold">
              <Heart size={24} />
            </div>
            <h2 className="font-serif font-bold text-2xl text-[#1C1917]">
              Our Passion & Heritage
            </h2>
            <p className="text-[#57534E] text-xs sm:text-sm leading-relaxed">
              {aboutParagraph}
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-[#E7E0D8] shadow-xs space-y-3">
            <div className="w-12 h-12 bg-[#F0FDF4] text-[#15803D] rounded-lg flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <h2 className="font-serif font-bold text-2xl text-[#1C1917]">
              Hygiene & Safety Commitment
            </h2>
            <p className="text-[#57534E] text-xs sm:text-sm leading-relaxed">
              We strictly maintain 5-star kitchen hygiene standards. Vegetarian and Non-Vegetarian preparation areas, utensils, and oven spaces are 100% separate, so you can enjoy pure vegetarian delights with absolute peace of mind.
            </p>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="bg-white rounded-xl p-8 border border-[#E7E0D8] shadow-xs grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-3">
            <span className="font-serif font-bold text-3xl text-[#B91C1C] block mb-1">4.9★</span>
            <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider">Google Rating</span>
          </div>
          <div className="p-3">
            <span className="font-serif font-bold text-3xl text-[#1C1917] block mb-1">50,000+</span>
            <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider">Pizzas Delivered</span>
          </div>
          <div className="p-3">
            <span className="font-serif font-bold text-3xl text-[#15803D] block mb-1">30 Mins</span>
            <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider">Avg Delivery Time</span>
          </div>
          <div className="p-3">
            <span className="font-serif font-bold text-3xl text-[#D97706] block mb-1">100%</span>
            <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider">Fresh Mozzarella</span>
          </div>
        </div>

      </div>
    </div>
  )
}
