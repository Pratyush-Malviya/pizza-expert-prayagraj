'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Flame, Tag, Gift, Truck, ArrowRight, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const PROMOS = [
  {
    id: 'promo-1',
    icon: Flame,
    badge: 'DAILY SPECIAL',
    title: 'Wood-Fired Margherita',
    subtitle: 'Fresh mozzarella & basil',
    price: '₹249',
    originalPrice: '₹299',
    cta: 'Order Now',
    href: '/product/margherita-pizza',
  },
  {
    id: 'promo-2',
    icon: Tag,
    badge: 'COMBO DEAL',
    title: 'Family Feast Pack',
    subtitle: '2 Large Pizzas + Sides + 4 Drinks',
    price: '₹899',
    originalPrice: '₹1,200',
    cta: 'Claim Deal',
    href: '/product/family-feast-combo',
  },
  {
    id: 'promo-3',
    icon: Gift,
    badge: 'WELCOME DISCOUNT',
    title: '20% Off First Order',
    subtitle: 'Use code at checkout',
    price: 'WELCOME20',
    originalPrice: '',
    cta: 'Copy Code',
    href: '/menu',
    isCode: true,
  },
  {
    id: 'promo-4',
    icon: Truck,
    badge: 'FREE DELIVERY',
    title: 'Orders Above ₹499',
    subtitle: 'Valid across Prayagraj & Allapur',
    price: '₹0 Fee',
    originalPrice: '₹30',
    cta: 'Explore Menu',
    href: '/menu',
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
    <section className="section-py bg-white border-y border-[#E7E0D8]" aria-labelledby="promos-heading">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-widest text-[#B91C1C] uppercase block mb-2 font-mono">
            Exclusive Offers
          </span>
          <h2 id="promos-heading" className="section-title">Special Deals & Promotions</h2>
          <div className="section-divider"><span /></div>
          <p className="section-subtitle">
            Handcrafted offers designed for family dinners, weekend feasts, and first-time guests.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROMOS.map((promo, i) => {
            const Icon = promo.icon
            return (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-6 flex flex-col justify-between h-full hover:border-[#B91C1C]/40 hover:shadow-md transition-all group">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold tracking-wider uppercase bg-[#FEF2F2] text-[#B91C1C] px-2.5 py-1 rounded-md border border-[#B91C1C]/20">
                        {promo.badge}
                      </span>
                      <div className="w-8 h-8 rounded-md bg-[#18181B] text-white flex items-center justify-center">
                        <Icon size={16} />
                      </div>
                    </div>

                    {/* Titles */}
                    <h3 className="font-serif font-bold text-lg text-[#1C1917] mb-1 group-hover:text-[#B91C1C] transition-colors">
                      {promo.title}
                    </h3>
                    <p className="text-[#57534E] text-xs leading-relaxed mb-6">
                      {promo.subtitle}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-end justify-between pt-4 border-t border-[#E7E0D8]">
                    <div>
                      <span className="font-bold text-lg text-[#1C1917] block font-mono">{promo.price}</span>
                      {promo.originalPrice && (
                        <span className="text-[#A8A29E] text-xs line-through block font-mono">{promo.originalPrice}</span>
                      )}
                    </div>

                    {promo.isCode ? (
                      <button
                        onClick={(e) => handleCopy(e, promo.price, promo.id)}
                        className="btn btn-outline btn-sm"
                      >
                        {copiedId === promo.id ? <Check size={14} className="text-[#15803D]" /> : <Copy size={14} />}
                        {copiedId === promo.id ? 'Copied' : promo.cta}
                      </button>
                    ) : (
                      <Link href={promo.href} className="btn btn-primary btn-sm">
                        {promo.cta} <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
