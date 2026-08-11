'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ProductCard from '@/components/menu/ProductCard'
import type { Category, Product } from '@/types'
import { ArrowRight, Sparkles } from 'lucide-react'

const FALLBACK_CATEGORIES: Category[] = [
  { id: '1', name: 'Pizzas',     slug: 'pizzas',     image_url: null, sort_order: 1, is_active: true },
  { id: '2', name: 'Burgers',    slug: 'burgers',    image_url: null, sort_order: 2, is_active: true },
  { id: '3', name: 'Pasta',      slug: 'pasta',      image_url: null, sort_order: 3, is_active: true },
  { id: '4', name: 'Sides',      slug: 'sides',      image_url: null, sort_order: 4, is_active: true },
  { id: '5', name: 'Beverages',  slug: 'beverages',  image_url: null, sort_order: 5, is_active: true },
]

interface CategoryTabsProps {
  categories?: Category[]
  productsByCategory?: Record<string, Product[]>
}

export default function CategoryTabs({
  categories = FALLBACK_CATEGORIES,
  productsByCategory = {},
}: CategoryTabsProps) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug || 'pizzas')
  const activeProducts = productsByCategory[activeSlug] || []

  return (
    <section className="section-py bg-[#0D0D11]" aria-labelledby="menu-heading">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-black text-[#FFC01D] uppercase tracking-widest mb-3">
              <Sparkles size={14} />
              <span>CRAFTED DAILY IN ALLAPUR, PRAYAGRAJ</span>
            </div>
            <h2 id="menu-heading" className="section-title text-white">
              EXPLORE OUR MENU
            </h2>
            <p className="section-subtitle">
              From signature wood-fired pizzas to crispy gourmet burgers and creamy hand-tossed pasta.
            </p>
          </div>
          <Link
            href={`/menu?category=${activeSlug}`}
            className="btn btn-secondary rounded-full px-6 py-3 text-xs font-extrabold uppercase tracking-wider shrink-0 self-start md:self-auto flex items-center gap-2 border border-white/15 hover:border-white/30"
          >
            <span>FULL MENU</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Filter Pill Toggles */}
        <div
          className="flex gap-3 overflow-x-auto pb-4 mb-10 scrollbar-none border-b border-white/10"
          role="tablist"
        >
          {categories.map((cat) => {
            const isActive = activeSlug === cat.slug
            return (
              <button
                key={cat.id}
                id={`tab-${cat.slug}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSlug(cat.slug)}
                className={`pill-toggle relative whitespace-nowrap px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-[#FF3B00] text-white shadow-lg shadow-[#FF3B00]/30'
                    : 'bg-white/5 text-zinc-300 hover:text-white border border-white/10'
                }`}
              >
                {cat.name}
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 bg-[#FF3B00] rounded-full -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Product Grid */}
        <AnimatePresence mode="wait">
          {activeProducts.length > 0 ? (
            <motion.div
              key={activeSlug}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            >
              {activeProducts.slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-[#16161E] rounded-3xl p-5 border border-white/10 space-y-4">
                  <div className="bg-[#0D0D11] aspect-[4/3] rounded-2xl animate-pulse" />
                  <div className="h-5 bg-white/10 rounded-md w-3/4 animate-pulse" />
                  <div className="h-4 bg-white/5 rounded-md w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

