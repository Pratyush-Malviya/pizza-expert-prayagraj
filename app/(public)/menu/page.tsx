'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProductCard from '@/components/menu/ProductCard'
import ProductFilters from '@/components/menu/ProductFilters'
import ProductQuickView from '@/components/menu/ProductQuickView'
import { Search, SlidersHorizontal } from 'lucide-react'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import type { Category, Product } from '@/types'

const SEED_CATEGORIES: Category[] = [
  { id: '1', name: 'Pizzas',     slug: 'pizzas',     image_url: null, sort_order: 1, is_active: true },
  { id: '2', name: 'Burgers',    slug: 'burgers',    image_url: null, sort_order: 2, is_active: true },
  { id: '3', name: 'Pasta',      slug: 'pasta',      image_url: null, sort_order: 3, is_active: true },
  { id: '4', name: 'Sides',      slug: 'sides',      image_url: null, sort_order: 4, is_active: true },
  { id: '5', name: 'Beverages',  slug: 'beverages',  image_url: null, sort_order: 5, is_active: true },
  { id: '6', name: 'Combos',     slug: 'combos',     image_url: null, sort_order: 6, is_active: true },
]

const SEED_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Margherita Pizza',
    slug: 'margherita-pizza',
    description: 'Classic margherita with rich tomato sauce, fresh mozzarella, and aromatic basil leaves.',
    price: 249,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '1',
    category: SEED_CATEGORIES[0],
    images: [{ id: 'img1', product_id: 'p1', image_url: FOOD_IMAGES['margherita-pizza'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
    options: [
      { id: 'o1', product_id: 'p1', name: 'Size', choices: [{ label: 'Regular (8")', price_delta: 0 }, { label: 'Medium (10")', price_delta: 80 }, { label: 'Large (12")', price_delta: 150 }] },
      { id: 'o2', product_id: 'p1', name: 'Crust', choices: [{ label: 'Thin Crust', price_delta: 0 }, { label: 'Cheese Burst', price_delta: 60 }] },
    ],
  },
  {
    id: 'p2',
    name: 'Paneer Tikka Pizza',
    slug: 'paneer-tikka-pizza',
    description: 'Marinated paneer, capsicum, onion, and spicy tikka sauce on a cheesy base.',
    price: 349,
    is_veg: true,
    is_spicy: true,
    is_available: true,
    category_id: '1',
    category: SEED_CATEGORIES[0],
    images: [{ id: 'img2', product_id: 'p2', image_url: FOOD_IMAGES['paneer-tikka-pizza'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p3',
    name: 'Chicken Supreme Pizza',
    slug: 'chicken-supreme-pizza',
    description: 'Loaded with tender chicken, mushrooms, olives, capsicum, and house pizza sauce.',
    price: 399,
    is_veg: false,
    is_spicy: false,
    is_available: true,
    category_id: '1',
    category: SEED_CATEGORIES[0],
    images: [{ id: 'img3', product_id: 'p3', image_url: FOOD_IMAGES['chicken-supreme-pizza'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p4',
    name: 'Farm House Pizza',
    slug: 'farm-house-pizza',
    description: 'Fresh vegetables including capsicum, onion, tomato, and golden corn on a cheesy base.',
    price: 299,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '1',
    category: SEED_CATEGORIES[0],
    images: [{ id: 'img4', product_id: 'p4', image_url: FOOD_IMAGES['farm-house-pizza'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p5',
    name: 'Veg Crispy Burger',
    slug: 'veg-crispy-burger',
    description: 'Crispy breaded veggie patty with lettuce, tomato, cheese, and special burger sauce.',
    price: 149,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '2',
    category: SEED_CATEGORIES[1],
    images: [{ id: 'img5', product_id: 'p5', image_url: FOOD_IMAGES['veg-crispy-burger'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p6',
    name: 'Chicken Zinger Burger',
    slug: 'chicken-zinger-burger',
    description: 'Juicy fried chicken fillet with coleslaw, pickles, and spicy chipotle mayo in a toasted bun.',
    price: 199,
    is_veg: false,
    is_spicy: true,
    is_available: true,
    category_id: '2',
    category: SEED_CATEGORIES[1],
    images: [{ id: 'img6', product_id: 'p6', image_url: FOOD_IMAGES['chicken-zinger-burger'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p7',
    name: 'Penne Arrabiata',
    slug: 'penne-arrabiata',
    description: 'Classic Italian-style penne in a spicy tomato sauce with garlic, chili, and fresh herbs.',
    price: 199,
    is_veg: true,
    is_spicy: true,
    is_available: true,
    category_id: '3',
    category: SEED_CATEGORIES[2],
    images: [{ id: 'img7', product_id: 'p7', image_url: FOOD_IMAGES['penne-arrabiata'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p8',
    name: 'Peri Peri Fries',
    slug: 'peri-peri-fries',
    description: 'Crispy fries tossed in our spicy peri peri seasoning blend.',
    price: 119,
    is_veg: true,
    is_spicy: true,
    is_available: true,
    category_id: '4',
    category: SEED_CATEGORIES[3],
    images: [{ id: 'img8', product_id: 'p8', image_url: FOOD_IMAGES['peri-peri-fries'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p9',
    name: 'Family Feast Combo',
    slug: 'family-feast-combo',
    description: '2 Large Pizzas + Garlic Bread + 4 Coca-Colas. Perfect for family gatherings!',
    price: 899,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '6',
    category: SEED_CATEGORIES[5],
    images: [{ id: 'img9', product_id: 'p9', image_url: FOOD_IMAGES['family-feast-combo'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
]

function MenuContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'all',
    vegOnly: searchParams.get('filter') === 'veg',
    spicyOnly: searchParams.get('filter') === 'spicy',
    sortBy: searchParams.get('sort') || 'popularity',
    priceRange: parseInt(searchParams.get('max_price') || '1000', 10),
  })

  // Sync state to URL on change
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.category !== 'all') params.set('category', filters.category)
    if (filters.vegOnly) params.set('filter', 'veg')
    if (filters.spicyOnly) params.set('filter', 'spicy')
    if (filters.sortBy !== 'popularity') params.set('sort', filters.sortBy)
    if (filters.priceRange !== 1000) params.set('max_price', filters.priceRange.toString())
    
    // Use replace to avoid filling history
    router.replace(`/menu?${params.toString()}`, { scroll: false })
  }, [filters, router])

  const resetFilters = () => {
    setFilters({
      category: 'all',
      vegOnly: false,
      spicyOnly: false,
      sortBy: 'popularity',
      priceRange: 1000,
    })
    setSearchQuery('')
    router.replace('/menu', { scroll: false })
  }

  const filteredProducts = useMemo(() => {
    return SEED_PRODUCTS.filter((prod) => {
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        const matchesName = prod.name.toLowerCase().includes(query)
        const matchesDesc = prod.description.toLowerCase().includes(query)
        if (!matchesName && !matchesDesc) return false
      }

      if (filters.category !== 'all' && prod.category?.slug !== filters.category) {
        return false
      }

      if (filters.vegOnly && !prod.is_veg) {
        return false
      }

      if (filters.spicyOnly && !prod.is_spicy) {
        return false
      }

      if (prod.price > filters.priceRange) {
        return false
      }

      return true
    }).sort((a, b) => {
      if (filters.sortBy === 'price-asc') return a.price - b.price
      if (filters.sortBy === 'price-desc') return b.price - a.price
      if (filters.sortBy === 'name') return a.name.localeCompare(b.name)
      return a.sort_order - b.sort_order
    })
  }, [filters, searchQuery])

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-10">
      <div className="container-custom">
        {/* Page Header */}
        <div className="text-center mb-10">
          <span className="text-xs font-bold tracking-widest text-[#B91C1C] uppercase font-mono block mb-2">
            Freshly Baked & Prepared Daily
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#1C1917] mb-3">
            Our Full Menu
          </h1>
          <p className="text-[#57534E] text-sm max-w-lg mx-auto">
            Wood-fired pizzas, crispy burgers, pasta, sides & drinks delivered piping hot across Prayagraj.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-8 flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pizzas, burgers, pasta..."
              className="input-field pl-10 pr-4 py-3 rounded-lg text-sm bg-white shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A8A29E] hover:text-[#1C1917] bg-[#F4EFEA] rounded-md px-2 py-0.5"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden btn btn-outline px-4 rounded-lg flex items-center gap-2"
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Layout */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Desktop Filters */}
          <div className="hidden lg:block lg:col-span-1">
            <ProductFilters
              categories={SEED_CATEGORIES}
              filters={filters}
              onFilterChange={setFilters}
              onReset={resetFilters}
              totalCount={filteredProducts.length}
            />
          </div>

          {/* Mobile Filters */}
          {showMobileFilters && (
            <div className="lg:hidden mb-6">
              <ProductFilters
                categories={SEED_CATEGORIES}
                filters={filters}
                onFilterChange={setFilters}
                onReset={resetFilters}
                totalCount={filteredProducts.length}
              />
            </div>
          )}

          {/* Product Grid */}
          <div className="lg:col-span-3">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickView={(p) => setQuickViewProduct(p)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border border-[#E7E0D8] shadow-xs max-w-md mx-auto my-8 space-y-4">
                <span className="text-5xl select-none block">🔍</span>
                <h3 className="font-serif font-bold text-lg text-[#1C1917]">
                  No items match your search
                </h3>
                <p className="text-[#57534E] text-xs">
                  Try adjusting your search terms or resetting the filter options.
                </p>
                <button onClick={resetFilters} className="btn btn-primary btn-sm">
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <ProductQuickView
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="container-custom py-12 text-center text-xs text-[#A8A29E]">Loading menu...</div>}>
      <MenuContent />
    </Suspense>
  )
}
