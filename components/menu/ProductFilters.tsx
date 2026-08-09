'use client'

import { Filter, RotateCcw } from 'lucide-react'
import type { Category } from '@/types'

interface FilterState {
  category: string
  vegOnly: boolean
  spicyOnly: boolean
  sortBy: string
  priceRange: number
}

interface ProductFiltersProps {
  categories: Category[]
  filters: FilterState
  onFilterChange: (newFilters: FilterState) => void
  onReset: () => void
  totalCount: number
}

export default function ProductFilters({
  categories,
  filters,
  onFilterChange,
  onReset,
  totalCount,
}: ProductFiltersProps) {
  return (
    <aside className="bg-white rounded-xl border border-[#E7E0D8] p-5 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[#B91C1C]" />
          <h3 className="font-serif font-bold text-[#1C1917] text-base">Filters</h3>
          <span className="bg-[#FEF2F2] text-[#B91C1C] text-xs font-bold px-2 py-0.5 rounded-md">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-[#57534E] hover:text-[#B91C1C] flex items-center gap-1 transition-colors"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* Category List */}
      <div>
        <h4 className="font-serif font-bold text-[#1C1917] text-sm mb-3">Categories</h4>
        <div className="space-y-1">
          <button
            onClick={() => onFilterChange({ ...filters, category: 'all' })}
            className={`w-full text-left px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
              filters.category === 'all'
                ? 'bg-[#FEF2F2] text-[#B91C1C]'
                : 'text-[#57534E] hover:bg-[#F4EFEA] hover:text-[#1C1917]'
            }`}
          >
            <span>All Menu Items</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onFilterChange({ ...filters, category: cat.slug })}
              className={`w-full text-left px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
                filters.category === cat.slug
                  ? 'bg-[#FEF2F2] text-[#B91C1C]'
                  : 'text-[#57534E] hover:bg-[#F4EFEA] hover:text-[#1C1917]'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dietary Checkboxes */}
      <div className="pt-4 border-t border-[#E7E0D8] space-y-3">
        <h4 className="font-serif font-bold text-[#1C1917] text-sm">Dietary</h4>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-[#57534E] select-none">
          <input
            type="checkbox"
            checked={filters.vegOnly}
            onChange={(e) => onFilterChange({ ...filters, vegOnly: e.target.checked })}
            className="w-4 h-4 rounded text-[#B91C1C] focus:ring-[#B91C1C] border-[#E7E0D8]"
          />
          <span>Pure Veg Only</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-[#57534E] select-none">
          <input
            type="checkbox"
            checked={filters.spicyOnly}
            onChange={(e) => onFilterChange({ ...filters, spicyOnly: e.target.checked })}
            className="w-4 h-4 rounded text-[#B91C1C] focus:ring-[#B91C1C] border-[#E7E0D8]"
          />
          <span>Spicy Options Only</span>
        </label>
      </div>

      {/* Price Filter */}
      <div className="pt-4 border-t border-[#E7E0D8]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-serif font-bold text-[#1C1917] text-sm">Max Price</h4>
          <span className="text-xs font-bold text-[#B91C1C] font-mono">
            ₹{filters.priceRange}
          </span>
        </div>
        <input
          type="range"
          min={50}
          max={1000}
          step={50}
          value={filters.priceRange}
          onChange={(e) => onFilterChange({ ...filters, priceRange: Number(e.target.value) })}
          className="w-full accent-[#B91C1C]"
        />
        <div className="flex justify-between text-[10px] text-[#A8A29E] mt-1 font-mono">
          <span>₹50</span>
          <span>₹1,000</span>
        </div>
      </div>

      {/* Sorting */}
      <div className="pt-4 border-t border-[#E7E0D8]">
        <h4 className="font-serif font-bold text-[#1C1917] text-sm mb-2">Sort By</h4>
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value })}
          className="input-field py-2 text-xs sm:text-sm bg-[#FBF9F5]"
        >
          <option value="popularity">Popularity</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>
    </aside>
  )
}
