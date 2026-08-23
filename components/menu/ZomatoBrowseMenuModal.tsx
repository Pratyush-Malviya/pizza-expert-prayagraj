'use client'

import { X, UtensilsCrossed } from 'lucide-react'
import type { Category, Product } from '@/types'

interface ZomatoBrowseMenuModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  products: Product[]
  activeCategory: string
  onSelectCategory: (categorySlug: string) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  pizzas: '🍕',
  burgers: '🍔',
  pasta: '🍝',
  sides: '🍟',
  beverages: '🥤',
  combos: '🍱',
  desserts: '🍰',
}

export default function ZomatoBrowseMenuModal({
  isOpen,
  onClose,
  categories,
  products,
  activeCategory,
  onSelectCategory,
}: ZomatoBrowseMenuModalProps) {
  if (!isOpen) return null

  // Calculate dish count per category
  const counts: Record<string, number> = {}
  for (const cat of categories) {
    counts[cat.slug] = products.filter((p) => p.category?.slug === cat.slug || p.category_id === cat.id).length
  }
  const totalCount = products.length

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl border border-[var(--border)] overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#FF3B00] text-white flex items-center justify-center font-bold text-sm">
              <UtensilsCrossed size={16} />
            </span>
            <div>
              <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">Categories</h3>
              <p className="text-[11px] text-[var(--text-muted)]">{categories.length} Categories • {totalCount} Dishes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Categories List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-1.5 flex-1">
          {/* All Items Option */}
          <button
            onClick={() => {
              onSelectCategory('all')
              onClose()
            }}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[#FF3B00] text-white font-bold shadow-xs'
                : 'hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span>
              <span className="text-sm font-semibold">All Menu Items</span>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Individual Categories */}
          {categories.map((cat) => {
            const icon = CATEGORY_ICONS[cat.slug] || '🍽️'
            const count = counts[cat.slug] || 0
            const isActive = activeCategory === cat.slug

            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.slug)
                  onClose()
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#FF3B00] text-white font-bold shadow-xs'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-semibold">{cat.name}</span>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
