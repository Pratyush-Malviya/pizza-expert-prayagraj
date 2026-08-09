'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
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
    <section className="section-py bg-[var(--bg-primary)]" aria-labelledby="menu-heading">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-xl">
            <h2 id="menu-heading" className="section-title">Explore the Menu</h2>
            <p className="section-subtitle">
              From classic wood-fired pizzas to gourmet burgers and creamy hand-tossed pasta.
            </p>
          </div>
          <Link href={`/menu?category=${activeSlug}`} className="btn btn-secondary shrink-0 self-start md:self-auto">
            View Full Menu
          </Link>
        </div>

        {/* Category Underline Tabs */}
        <div
          className="flex gap-8 overflow-x-auto pb-4 mb-10 scrollbar-none border-b border-[var(--border)]"
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
                className={`relative pb-4 font-sans font-semibold text-sm transition-colors whitespace-nowrap ${
                  isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat.name}
                {isActive && (
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)]"
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
                <div key={n} className="bg-white rounded-xl p-5 border border-[var(--border)] space-y-4">
                  <div className="bg-[var(--bg-subtle)] aspect-[4/3] rounded-lg animate-pulse" />
                  <div className="h-5 bg-[var(--bg-subtle)] rounded-md w-3/4 animate-pulse" />
                  <div className="h-4 bg-[var(--bg-subtle)] rounded-md w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
