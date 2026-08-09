'use client'

import { motion } from 'framer-motion'

const FEATURES = [
  {
    num: '01',
    title: '100% Real Mozzarella',
    desc: 'Crafted with authentic mozzarella cheese, organic tomato passata, and fresh basil.',
  },
  {
    num: '02',
    title: '24-Hour Fermented Dough',
    desc: 'Dough fermented slowly to achieve the perfect light, crispy, and airy crust.',
  },
  {
    num: '03',
    title: 'Wood-Fired Oven',
    desc: 'Baked at 400°C for that signature smoky flavor and perfect leopard spotting.',
  },
  {
    num: '04',
    title: 'Hygienic Kitchen',
    desc: '100% separate preparation areas and ovens for Vegetarian and Non-Vegetarian orders.',
  },
]

export default function FeatureIcons() {
  return (
    <section className="section-py bg-[var(--bg-subtle)]" aria-labelledby="brand-story-heading">
      <div className="container-custom">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left: Brand Story Headline */}
          <div className="lg:col-span-5 sticky top-32">
            <h2 id="brand-story-heading" className="section-title mb-6">
              The Secret to <br />Our Slices.
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed max-w-sm">
              We believe great pizza requires patience. From our 24-hour slow-fermented dough to our wood-fired hearth, every pizza is an authentic craft experience right here in Prayagraj.
            </p>
          </div>

          {/* Right: Numbered Principles */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-x-8 gap-y-12">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group"
              >
                <div className="font-sans font-bold text-sm text-[var(--primary)] mb-3 pb-3 border-b border-[var(--border)] tracking-widest">
                  {feature.num}
                </div>
                <h3 className="font-serif font-bold text-[var(--text-primary)] text-xl mb-3">
                  {feature.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
