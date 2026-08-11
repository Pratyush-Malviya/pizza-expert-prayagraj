'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ProductCard from '@/components/menu/ProductCard'
import type { Category, Product } from '@/types'

const FALLBACK_CATEGORIES: Category[] = [
  { id: '1', name: 'PIZZAS',     slug: 'pizzas',     image_url: null, sort_order: 1, is_active: true },
  { id: '2', name: 'BURGERS',    slug: 'burgers',    image_url: null, sort_order: 2, is_active: true },
  { id: '3', name: 'PASTA',      slug: 'pasta',      image_url: null, sort_order: 3, is_active: true },
  { id: '4', name: 'SIDES',      slug: 'sides',      image_url: null, sort_order: 4, is_active: true },
  { id: '5', name: 'BEVERAGES',  slug: 'beverages',  image_url: null, sort_order: 5, is_active: true },
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
    <section className="section-py bg-[#260212]" aria-labelledby="menu-heading">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <span className="text-xs font-bold text-vibrant-yellow uppercase tracking-widest block mb-2 font-mono">
              ◂ CRAFTED DAILY IN ALLAPUR ▸
            </span>
            <h2 id="menu-heading" className="section-title">EXPLORE THE MENU</h2>
            <p className="section-subtitle">
              From classic wood-fired pizzas to gourmet burgers and creamy hand-tossed pasta.
            </p>
          </div>
          <Link href={`/menu?category=${activeSlug}`} className="btn btn-secondary shrink-0 rounded-[15px] self-start md:self-auto">
            VIEW FULL MENU →
          </Link>
        </div>

        {/* Filter Pill Toggles (15px radius, #e10600 active) */}
        <div
          className="flex gap-3 overflow-x-auto pb-4 mb-10 scrollbar-none border-b border-black"
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
                className={`pill-toggle relative whitespace-nowrap ${
                  isActive ? 'pill-toggle-active shadow-md' : 'pill-toggle-default'
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
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
                <div key={n} className="bg-[#4f0423] rounded-[12px] p-5 border border-black space-y-4">
                  <div className="bg-[#370318] aspect-[4/3] rounded-[10px] animate-pulse" />
                  <div className="h-5 bg-[#370318] rounded-md w-3/4 animate-pulse" />
                  <div className="h-4 bg-[#370318] rounded-md w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
