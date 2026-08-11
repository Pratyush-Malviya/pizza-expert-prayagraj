'use client'

import { motion } from 'framer-motion'
import { Sparkles, Flame, Clock, ShieldCheck, Truck } from 'lucide-react'

const FEATURES = [
  {
    num: '01',
    icon: Sparkles,
    title: '100% Real Mozzarella',
    desc: 'Crafted with authentic mozzarella cheese, organic tomato passata, and fresh basil leaves.',
  },
  {
    num: '02',
    icon: Clock,
    title: '24-Hour Fermented Dough',
    desc: 'Dough fermented slowly for 24 hours to achieve the perfect light, crispy, and airy crust.',
  },
  {
    num: '03',
    icon: Flame,
    title: 'Wood-Fired Oven',
    desc: 'Baked at 400°C for that signature smoky flavor and authentic leopard-spotted crust.',
  },
  {
    num: '04',
    icon: ShieldCheck,
    title: 'Hygienic 100% Kitchen',
    desc: 'Strictly separate preparation areas and ovens for Vegetarian and Non-Vegetarian orders.',
  },
]

export default function FeatureIcons() {
  return (
    <section className="section-py bg-[#0D0D11] border-b border-white/10" aria-labelledby="brand-story-heading">
      <div className="container-custom">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left: Brand Story Headline */}
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <div className="inline-flex items-center gap-2 text-xs font-black text-[#FF3B00] uppercase tracking-widest mb-3">
              <Flame size={15} />
              <span>THE PIZZA EXPERT DIFFERENCE</span>
            </div>
            <h2 id="brand-story-heading" className="section-title text-white mb-6">
              THE SECRET TO <br />OUR SLICES.
            </h2>
            <p className="text-zinc-300 leading-relaxed text-base font-normal">
              We believe great pizza requires patience. From our 24-hour slow-fermented dough to our wood-fired hearth, every pizza is an authentic craft experience right here in Prayagraj.
            </p>
          </div>

          {/* Right: Numbered Principles */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="bg-[#16161E] rounded-3xl p-6 border border-white/10 hover:border-[#FF3B00]/40 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <span className="font-mono font-black text-xs text-[#FFC01D] tracking-widest">
                      {feature.num}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-[#FF3B00] group-hover:bg-[#FF3B00] group-hover:text-white transition-colors">
                      <Icon size={18} />
                    </div>
                  </div>
                  <h3 className="font-heading font-extrabold text-white text-lg mb-2 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed font-normal">
                    {feature.desc}
                  </p>
                </motion.div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}

