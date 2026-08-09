'use client'

import { motion } from 'framer-motion'
import { Award, Clock, ChefHat, ShieldCheck } from 'lucide-react'

const FEATURES = [
  {
    icon: Award,
    title: '100% Real Mozzarella',
    desc: 'Crafted with authentic mozzarella cheese, organic tomato passata, and fresh basil.',
  },
  {
    icon: Clock,
    title: '30-Min Express Delivery',
    desc: 'Piping hot pizza delivered from oven to your door in Prayagraj & Allapur.',
  },
  {
    icon: ChefHat,
    title: 'Artisanal Hand-Tossed',
    desc: 'Dough fermented slowly for 24 hours to achieve the perfect light, crispy crust.',
  },
  {
    icon: ShieldCheck,
    title: '5-Star Hygiene Kitchen',
    desc: '100% separate preparation areas & ovens for Vegetarian and Non-Vegetarian orders.',
  },
]

export default function FeatureIcons() {
  return (
    <section className="section-py bg-[#FBF9F5]" aria-labelledby="features-heading">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-widest text-[#B91C1C] uppercase block mb-2 font-mono">
            Craft Commitment
          </span>
          <h2 id="features-heading" className="section-title">The Secret to Our Slices</h2>
          <div className="section-divider"><span /></div>
          <p className="section-subtitle">
            Uncompromising quality standards from our Allapur kitchen to your table.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white rounded-xl p-6 border border-[#E7E0D8] text-center hover:border-[#B91C1C]/30 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center mx-auto mb-4">
                  <Icon size={24} />
                </div>
                <h3 className="font-serif font-bold text-[#1C1917] text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-[#57534E] text-xs leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
