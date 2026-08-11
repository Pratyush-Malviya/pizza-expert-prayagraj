'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Copy, Check, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'

const PROMOS = [
  {
    id: 'promo-1',
    image: FOOD_IMAGES['margherita-pizza'],
    title: 'WOOD-FIRED MARGHERITA',
    subtitle: 'Fresh mozzarella & basil on signature crust',
    price: '₹249',
    cta: 'ORDER NOW',
    href: '/product/margherita-pizza',
  },
  {
    id: 'promo-2',
    image: FOOD_IMAGES['family-feast-combo'],
    title: 'FAMILY FEAST PACK',
    subtitle: '2 Large Pizzas + Garlic Bread + 4 Drinks',
    price: '₹899',
    cta: 'CLAIM DEAL',
    href: '/product/family-feast-combo',
  },
  {
    id: 'promo-3',
    image: FOOD_IMAGES['veg-crispy-burger'],
    title: '20% OFF FIRST ORDER',
    subtitle: 'Apply promo code at checkout',
    price: 'WELCOME20',
    cta: 'COPY CODE',
    href: '/menu',
    isCode: true,
  },
]

export default function PromoCards() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (e: React.MouseEvent, code: string, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    toast.success(`Copied discount code ${code}!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <section className="section-py bg-[#260212] border-y border-black" aria-labelledby="promos-heading">
      <div className="container-custom">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-vibrant-green uppercase tracking-widest block mb-2 font-mono">
            ◂ SPECIAL DEALS & OFFERS ▸
          </span>
          <h2 id="promos-heading" className="section-title">HANDCRAFTED DEALS</h2>
          <p className="section-subtitle mx-auto max-w-lg">
            Delicious combos and exclusive discounts designed for family dinners and weekend feasts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PROMOS.map((promo, i) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="group cursor-pointer bg-[#4f0423] rounded-[12px] overflow-hidden border border-black shadow-xl hover:border-[#e10600]/60 transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#370318]">
                <img
                  src={promo.image}
                  alt={promo.title}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#260212]/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-serif font-bold text-xl uppercase tracking-wider text-[#ffc7c6] mb-2 group-hover:text-white transition-colors">
                  {promo.title}
                </h3>
                <p className="text-[#ffc7c6]/80 text-sm mb-6 leading-relaxed">
                  {promo.subtitle}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-black">
                  <span className="font-mono font-bold text-xl text-white">
                    {promo.price}
                  </span>
                  
                  {promo.isCode ? (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => handleCopy(e, promo.price, promo.id)}
                      className="btn btn-primary rounded-[15px] font-bold text-xs px-4"
                    >
                      {copiedId === promo.id ? (
                        <span className="flex items-center gap-1.5"><Check size={14} /> COPIED</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Copy size={14} /> {promo.cta}</span>
                      )}
                    </motion.button>
                  ) : (
                    <Link href={promo.href}>
                      <motion.span
                        whileTap={{ scale: 0.92 }}
                        className="btn btn-primary rounded-[15px] font-bold text-xs px-4 flex items-center gap-1.5"
                      >
                        {promo.cta} <ArrowRight size={14} />
                      </motion.span>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
