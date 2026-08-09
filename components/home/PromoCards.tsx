'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'

const PROMOS = [
  {
    id: 'promo-1',
    image: FOOD_IMAGES['margherita-pizza'],
    title: 'Wood-Fired Margherita',
    subtitle: 'Fresh mozzarella & basil',
    price: '₹249',
    cta: 'Order Now',
    href: '/product/margherita-pizza',
  },
  {
    id: 'promo-2',
    image: FOOD_IMAGES['family-feast-combo'],
    title: 'Family Feast Pack',
    subtitle: '2 Pizzas + Sides + Drinks',
    price: '₹899',
    cta: 'Claim Deal',
    href: '/product/family-feast-combo',
  },
  {
    id: 'promo-3',
    image: FOOD_IMAGES['veg-crispy-burger'],
    title: '20% Off First Order',
    subtitle: 'Use code at checkout',
    price: 'WELCOME20',
    cta: 'Copy Code',
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
    toast.success(`Copied code ${code}!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <section className="section-py bg-white border-y border-[var(--border)]" aria-labelledby="promos-heading">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 id="promos-heading" className="section-title">Special Offers</h2>
          <p className="section-subtitle mx-auto">
            Handcrafted deals designed for family dinners and weekend feasts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PROMOS.map((promo, i) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[4/3] rounded-[16px] overflow-hidden mb-6 bg-[var(--bg-subtle)]">
                <img
                  src={promo.image}
                  alt={promo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {/* Gradient overlay for contrast if needed, keep subtle */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="p-4 bg-white rounded-b-[16px] shadow-sm -mt-2 relative z-10 border border-[var(--border)] border-t-0">
                <h3 className="font-serif font-bold text-2xl text-[var(--text-primary)] mb-2 group-hover:text-[var(--primary)] transition-colors">
                  {promo.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-6">
                  {promo.subtitle}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="font-sans font-semibold text-lg text-[var(--text-primary)] tracking-wide">
                    {promo.price}
                  </span>
                  
                  {promo.isCode ? (
                    <button
                      onClick={(e) => handleCopy(e, promo.price, promo.id)}
                      className="btn btn-tertiary text-[var(--primary)] font-bold text-sm"
                    >
                      {copiedId === promo.id ? (
                        <span className="flex items-center gap-1.5"><Check size={16} /> Copied</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Copy size={16} /> {promo.cta}</span>
                      )}
                    </button>
                  ) : (
                    <Link href={promo.href} className="btn btn-tertiary text-[var(--primary)] font-bold text-sm">
                      {promo.cta}
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
