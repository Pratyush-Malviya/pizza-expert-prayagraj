'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ProductCard from '@/components/menu/ProductCard'
import type { Category, Product } from '@/types'

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
    <section className="section-py bg-[#FBF9F5]" aria-labelledby="categories-heading">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-widest text-[#B91C1C] uppercase block mb-2 font-mono">
            Crafted To Order
          </span>
          <h2 id="categories-heading" className="section-title">Explore Our Artisan Menu</h2>
          <div className="section-divider"><span /></div>
          <p className="section-subtitle">
            From classic wood-fired pizzas to gourmet burgers and creamy hand-tossed pasta.
          </p>
        </div>

        {/* Category Tabs */}
        <div
          className="flex gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none justify-start md:justify-center"
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
                className={`relative px-5 py-2.5 rounded-md font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-[#B91C1C] text-white shadow-xs'
                    : 'bg-white text-[#57534E] hover:text-[#1C1917] border border-[#E7E0D8]'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>

        {/* Product Grid */}
        <AnimatePresence mode="wait">
          {activeProducts.length > 0 ? (
            <motion.div
              key={activeSlug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            >
              {activeProducts.slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-xl p-5 border border-[#E7E0D8] space-y-4">
                  <div className="bg-[#F4EFEA] aspect-[4/3] rounded-lg animate-pulse" />
                  <div className="h-5 bg-[#F4EFEA] rounded-md w-3/4 animate-pulse" />
                  <div className="h-4 bg-[#F4EFEA] rounded-md w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href={`/menu?category=${activeSlug}`}
            className="btn btn-outline btn-lg font-semibold"
          >
            Browse Full {categories.find((c) => c.slug === activeSlug)?.name || 'Menu'}
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  )
}
