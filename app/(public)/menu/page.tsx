'use client'

import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ZomatoProductCard from '@/components/menu/ZomatoProductCard'
import ZomatoBrowseMenuModal from '@/components/menu/ZomatoBrowseMenuModal'
import ProductQuickView from '@/components/menu/ProductQuickView'
import {
  Search, SlidersHorizontal, Star, Flame, Sparkles,
  ShoppingBag, ArrowRight, UtensilsCrossed, X, ChevronDown
} from 'lucide-react'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import type { Category, Product } from '@/types'

const SEED_CATEGORIES: Category[] = [
  { id: '1', name: 'Pizzas',     slug: 'pizzas',     image_url: null, sort_order: 1, is_active: true },
  { id: '2', name: 'Burgers',    slug: 'burgers',    image_url: null, sort_order: 2, is_active: true },
  { id: '3', name: 'Pasta',      slug: 'pasta',      image_url: null, sort_order: 3, is_active: true },
  { id: '4', name: 'Sides',      slug: 'sides',      image_url: null, sort_order: 4, is_active: true },
  { id: '5', name: 'Beverages',  slug: 'beverages',  image_url: null, sort_order: 5, is_active: true },
  { id: '6', name: 'Combos',     slug: 'combos',     image_url: null, sort_order: 6, is_active: true },
]

const CATEGORY_ICONS: Record<string, string> = {
  pizzas: '🍕',
  burgers: '🍔',
  pasta: '🍝',
  sides: '🍟',
  beverages: '🥤',
  combos: '🍱',
}

const SEED_PRODUCTS: Product[] = [
  // Pizzas
  {
    id: 'p1',
    name: 'Margherita Pizza',
    slug: 'margherita-pizza',
    description: 'Classic margherita with rich tomato sauce, fresh mozzarella, and aromatic basil leaves on a wood-fired crust.',
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
    description: 'Tandoori-spiced paneer cubes, crunchy capsicum, red onion, and creamy tikka sauce on mozzarella.',
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
    options: [
      { id: 'o1', product_id: 'p2', name: 'Size', choices: [{ label: 'Regular (8")', price_delta: 0 }, { label: 'Medium (10")', price_delta: 90 }, { label: 'Large (12")', price_delta: 160 }] },
    ],
  },
  {
    id: 'p3',
    name: 'Chicken Supreme Pizza',
    slug: 'chicken-supreme-pizza',
    description: 'Loaded with smoky BBQ chicken breast, sliced mushrooms, black olives, capsicum, and house secret sauce.',
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
    options: [
      { id: 'o1', product_id: 'p3', name: 'Size', choices: [{ label: 'Regular (8")', price_delta: 0 }, { label: 'Medium (10")', price_delta: 100 }, { label: 'Large (12")', price_delta: 180 }] },
    ],
  },
  {
    id: 'p4',
    name: 'Farm House Pizza',
    slug: 'farm-house-pizza',
    description: 'Fresh farm bell peppers, red onions, diced tomatoes, and golden sweet corn smothered in melted cheese.',
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
    id: 'p10',
    name: 'Peri Peri Chicken Pizza',
    slug: 'peri-peri-chicken-pizza',
    description: 'Fiery grilled chicken tossed in African peri-peri sauce, jalapeños, and extra melted mozzarella.',
    price: 389,
    is_veg: false,
    is_spicy: true,
    is_available: true,
    category_id: '1',
    category: SEED_CATEGORIES[0],
    images: [{ id: 'img10', product_id: 'p10', image_url: FOOD_IMAGES['peri-peri-chicken-pizza'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },

  // Burgers
  {
    id: 'p5',
    name: 'Veg Crispy Burger',
    slug: 'veg-crispy-burger',
    description: 'Golden crispy vegetable patty with fresh lettuce, sliced tomatoes, melted cheddar, and spiced mayo.',
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
    description: 'Crispy fried chicken breast fillet with crunchy slaw, dill pickles, and chipotle mayo in a toasted brioche bun.',
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
    id: 'p11',
    name: 'Double Chicken Patty Burger',
    slug: 'double-chicken-patty-burger',
    description: 'Twin grilled chicken patties layered with double cheese, caramelised onions, and tangy BBQ sauce.',
    price: 249,
    is_veg: false,
    is_spicy: false,
    is_available: true,
    category_id: '2',
    category: SEED_CATEGORIES[1],
    images: [{ id: 'img11', product_id: 'p11', image_url: FOOD_IMAGES['double-chicken-patty-burger'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },

  // Pasta
  {
    id: 'p7',
    name: 'Penne Arrabiata',
    slug: 'penne-arrabiata',
    description: 'Authentic Italian penne pasta tossed in spicy garlic tomato marinara, fresh basil, and shaved parmesan.',
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
    id: 'p12',
    name: 'Chicken Alfredo Pasta',
    slug: 'chicken-alfredo-pasta',
    description: 'Rich and creamy parmesan Alfredo sauce with grilled herb chicken strips and fettuccine pasta.',
    price: 249,
    is_veg: false,
    is_spicy: false,
    is_available: true,
    category_id: '3',
    category: SEED_CATEGORIES[2],
    images: [{ id: 'img12', product_id: 'p12', image_url: FOOD_IMAGES['chicken-alfredo-pasta'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },

  // Sides
  {
    id: 'p8',
    name: 'Peri Peri Fries',
    slug: 'peri-peri-fries',
    description: 'Crispy golden potato fries generously dusted with our secret zesty peri peri seasoning blend.',
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
    id: 'p13',
    name: 'Cheesy Garlic Bread',
    slug: 'garlic-bread',
    description: 'Freshly baked artisan baguette infused with roasted garlic butter and loaded with mozzarella.',
    price: 139,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '4',
    category: SEED_CATEGORIES[3],
    images: [{ id: 'img13', product_id: 'p13', image_url: FOOD_IMAGES['garlic-bread'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p14',
    name: 'Classic French Fries',
    slug: 'french-fries',
    description: 'Crispy salted golden french fries served with spicy ketchup and garlic dip.',
    price: 99,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '4',
    category: SEED_CATEGORIES[3],
    images: [{ id: 'img14', product_id: 'p14', image_url: FOOD_IMAGES['french-fries'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },

  // Beverages
  {
    id: 'p15',
    name: 'Coca-Cola (330ml Can)',
    slug: 'coca-cola-330ml',
    description: 'Chilled refreshing Coca-Cola can to accompany your favourite hot pizza.',
    price: 49,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '5',
    category: SEED_CATEGORIES[4],
    images: [{ id: 'img15', product_id: 'p15', image_url: FOOD_IMAGES['coca-cola-330ml'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p16',
    name: 'Mango Lassi Shake',
    slug: 'mango-lassi',
    description: 'Thick, creamy traditional yogurt shake blended with sweet Alphonso mango pulp.',
    price: 89,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '5',
    category: SEED_CATEGORIES[4],
    images: [{ id: 'img16', product_id: 'p16', image_url: FOOD_IMAGES['mango-lassi'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },

  // Combos
  {
    id: 'p9',
    name: 'Family Feast Combo',
    slug: 'family-feast-combo',
    description: '2 Large Pizzas + Cheesy Garlic Bread + 4 Coca-Cola Cans. Great value feast for 4–5 people!',
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
  {
    id: 'p17',
    name: 'Burger & Fries Meal Combo',
    slug: 'burger-meal-combo',
    description: '1 Zinger Burger + 1 Peri Peri Fries + 1 Chilled Coca-Cola. The ultimate solo power meal!',
    price: 299,
    is_veg: false,
    is_spicy: true,
    is_available: true,
    category_id: '6',
    category: SEED_CATEGORIES[5],
    images: [{ id: 'img17', product_id: 'p17', image_url: FOOD_IMAGES['burger-meal-combo'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
]

function MenuContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [vegOnly, setVegOnly] = useState<boolean>(false)
  const [nonVegOnly, setNonVegOnly] = useState<boolean>(false)
  const [spicyOnly, setSpicyOnly] = useState<boolean>(false)
  const [bestsellerOnly, setBestsellerOnly] = useState<boolean>(false)
  const [under299Only, setUnder299Only] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<string>('popularity')
  const [isBrowseMenuOpen, setIsBrowseMenuOpen] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)

  // Cart store for floating bottom summary
  const cartItems = useCartStore((s) => s.items)
  const totalCartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const cartSubtotal = cartItems.reduce((sum, i) => sum + (i.totalPrice || i.price * i.quantity), 0)
  const openCart = useCartStore((s) => s.openCart)

  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // Read initial query params
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) setSelectedCategory(cat)
    if (searchParams.get('filter') === 'veg') setVegOnly(true)
    if (searchParams.get('filter') === 'non-veg') setNonVegOnly(true)
    if (searchParams.get('filter') === 'spicy') setSpicyOnly(true)
  }, [searchParams])

  const handleSelectCategory = (catSlug: string) => {
    setSelectedCategory(catSlug)
    if (catSlug === 'all') {
      window.scrollTo({ top: 120, behavior: 'smooth' })
    } else {
      const el = document.getElementById(`cat-section-${catSlug}`)
      if (el) {
        const yOffset = -140
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    }
  }

  const resetAllFilters = () => {
    setSelectedCategory('all')
    setVegOnly(false)
    setNonVegOnly(false)
    setSpicyOnly(false)
    setBestsellerOnly(false)
    setUnder299Only(false)
    setSortBy('popularity')
    setSearchQuery('')
  }

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    vegOnly ||
    nonVegOnly ||
    spicyOnly ||
    bestsellerOnly ||
    under299Only ||
    sortBy !== 'popularity' ||
    searchQuery.trim() !== ''

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return SEED_PRODUCTS.filter((prod) => {
      // Search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        const matchName = prod.name.toLowerCase().includes(query)
        const matchDesc = prod.description.toLowerCase().includes(query)
        if (!matchName && !matchDesc) return false
      }

      // Category filter (if not viewing all)
      if (selectedCategory !== 'all' && prod.category?.slug !== selectedCategory) {
        return false
      }

      // Veg filter
      if (vegOnly && !prod.is_veg) return false

      // Non-Veg filter
      if (nonVegOnly && prod.is_veg) return false

      // Spicy filter
      if (spicyOnly && !prod.is_spicy) return false

      // Bestseller filter
      if (bestsellerOnly && prod.sort_order !== 1) return false

      // Under 299 filter
      if (under299Only && prod.price > 299) return false

      return true
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return a.sort_order - b.sort_order
    })
  }, [searchQuery, selectedCategory, vegOnly, nonVegOnly, spicyOnly, bestsellerOnly, under299Only, sortBy])

  // Group filtered products by Category
  const groupedCategories = useMemo(() => {
    return SEED_CATEGORIES.map((cat) => {
      const items = filteredProducts.filter((p) => p.category?.slug === cat.slug || p.category_id === cat.id)
      return {
        ...cat,
        items,
      }
    }).filter((cat) => cat.items.length > 0)
  }, [filteredProducts])

  return (
    <div className="bg-[#FBF9F5] min-h-screen pb-28 text-[#1C1917]">
      {/* ─── 1. Zomato Top Restaurant & Delivery Header ─── */}
      <div className="bg-white border-b border-[#E7E0D8] pt-6 pb-4">
        <div className="container-custom max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#FEF2F2] text-[#B91C1C] text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-[#FECACA] tracking-wider">
                  🔥 Best Pizzeria in Prayagraj
                </span>
                <span className="text-xs text-[#78716C] font-semibold flex items-center gap-1">
                  ⚡ 30-35 mins delivery
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#1C1917]">
                Pizza Expert Menu
              </h1>
              <p className="text-xs sm:text-sm text-[#57534E] mt-0.5">
                Wood-fired pizzas, gourmet burgers, pasta, crispy sides & drinks
              </p>
            </div>

            {/* Rating badge */}
            <div className="flex items-center gap-3">
              <div className="bg-[#15803D] text-white px-3 py-2 rounded-xl text-center shadow-xs flex items-center gap-1.5">
                <Star size={16} className="fill-white" />
                <span className="font-bold text-base">4.8</span>
                <span className="text-[10px] opacity-80 block border-l border-white/30 pl-1.5">
                  500+ reviews
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Search & Zomato Quick Filter Chips Ribbon ─── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E7E0D8] shadow-2xs py-3">
        <div className="container-custom max-w-5xl space-y-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B91C1C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, burgers, pizzas..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E7E0D8] text-xs sm:text-sm bg-[#FBF9F5] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:border-[#B91C1C] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#78716C] hover:text-[#1C1917] rounded-full"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Filter Chips (Zomato Style) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {/* Pure Veg Toggle */}
            <button
              onClick={() => {
                setVegOnly(!vegOnly)
                if (!vegOnly) setNonVegOnly(false)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                vegOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-[#1C1917] border-[#E7E0D8] hover:bg-[#F5F2EC]'
              }`}
            >
              <span className={`w-3 h-3 border rounded-xs flex items-center justify-center ${vegOnly ? 'border-white bg-emerald-600' : 'border-emerald-600 bg-white'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${vegOnly ? 'bg-white' : 'bg-emerald-600'}`} />
              </span>
              <span>Pure Veg</span>
            </button>

            {/* Non-Veg Toggle */}
            <button
              onClick={() => {
                setNonVegOnly(!nonVegOnly)
                if (!nonVegOnly) setVegOnly(false)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                nonVegOnly
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-[#1C1917] border-[#E7E0D8] hover:bg-[#F5F2EC]'
              }`}
            >
              <span className={`w-3 h-3 border rounded-xs flex items-center justify-center ${nonVegOnly ? 'border-white bg-rose-600' : 'border-rose-600 bg-white'}`}>
                <span className={`w-0 h-0 border-l-[2.5px] border-l-transparent border-r-[2.5px] border-r-transparent border-b-[4px] ${nonVegOnly ? 'border-b-white' : 'border-b-rose-600'}`} />
              </span>
              <span>Non-Veg</span>
            </button>

            {/* Bestseller Filter */}
            <button
              onClick={() => setBestsellerOnly(!bestsellerOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                bestsellerOnly
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-white text-[#1C1917] border-[#E7E0D8] hover:bg-[#F5F2EC]'
              }`}
            >
              <Sparkles size={13} className={bestsellerOnly ? 'text-white' : 'text-amber-500'} />
              <span>Bestseller</span>
            </button>

            {/* Spicy Filter */}
            <button
              onClick={() => setSpicyOnly(!spicyOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                spicyOnly
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-[#1C1917] border-[#E7E0D8] hover:bg-[#F5F2EC]'
              }`}
            >
              <Flame size={13} className={spicyOnly ? 'text-white' : 'text-rose-600'} />
              <span>Spicy</span>
            </button>

            {/* Under ₹299 */}
            <button
              onClick={() => setUnder299Only(!under299Only)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                under299Only
                  ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                  : 'bg-white text-[#1C1917] border-[#E7E0D8] hover:bg-[#F5F2EC]'
              }`}
            >
              <span>Under ₹299</span>
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-white text-[#1C1917] border border-[#E7E0D8] cursor-pointer hover:bg-[#F5F2EC] focus:outline-none"
            >
              <option value="popularity">Sort: Popularity</option>
              <option value="price-asc">Sort: Price (Low → High)</option>
              <option value="price-desc">Sort: Price (High → Low)</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>

            {/* Reset All Filters Chip */}
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] hover:bg-rose-100 transition-colors whitespace-nowrap cursor-pointer"
              >
                Clear All ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. Horizontal Category Carousel (Sticky Tab Scroll) ─── */}
      <div className="bg-white border-b border-[#E7E0D8] sticky top-[104px] z-20 shadow-2xs">
        <div className="container-custom max-w-5xl">
          <div ref={categoryScrollRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5">
            {/* All Menu Items */}
            <button
              onClick={() => handleSelectCategory('all')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#B91C1C] text-white shadow-xs'
                  : 'bg-[#F5F2EC] text-[#57534E] hover:bg-[#E7E0D8] hover:text-[#1C1917]'
              }`}
            >
              <span>✨</span>
              <span>All Items</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-white/20' : 'bg-white/60'}`}>
                {filteredProducts.length}
              </span>
            </button>

            {/* Individual Categories */}
            {SEED_CATEGORIES.map((cat) => {
              const icon = CATEGORY_ICONS[cat.slug] || '🍽️'
              const count = filteredProducts.filter((p) => p.category?.slug === cat.slug || p.category_id === cat.id).length
              const isSelected = selectedCategory === cat.slug

              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#B91C1C] text-white shadow-xs'
                      : 'bg-[#F5F2EC] text-[#57534E] hover:bg-[#E7E0D8] hover:text-[#1C1917]'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{cat.name}</span>
                  {count > 0 && (
                    <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20' : 'bg-white/60'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── 4. Main Dishes Feed (Categorized Sections) ─── */}
      <div className="container-custom max-w-5xl pt-6">
        {groupedCategories.length > 0 ? (
          <div className="space-y-10">
            {groupedCategories.map((cat) => {
              const icon = CATEGORY_ICONS[cat.slug] || '🍽️'

              return (
                <section
                  key={cat.id}
                  id={`cat-section-${cat.slug}`}
                  className="space-y-4 scroll-mt-36"
                >
                  {/* Category Title Banner */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D8]">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{icon}</span>
                      <h2 className="text-xl sm:text-2xl font-serif font-black text-[#1C1917]">
                        {cat.name}
                      </h2>
                      <span className="bg-[#E7E0D8] text-[#57534E] text-xs font-bold px-2 py-0.5 rounded-full">
                        {cat.items.length}
                      </span>
                    </div>
                  </div>

                  {/* Dishes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cat.items.map((product) => (
                      <ZomatoProductCard
                        key={product.id}
                        product={product}
                        onQuickView={(p) => setQuickViewProduct(p)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          /* Empty Search State */
          <div className="bg-white rounded-3xl p-12 text-center border border-[#E7E0D8] shadow-xs max-w-md mx-auto my-12 space-y-4">
            <span className="text-6xl select-none block">🔍</span>
            <h3 className="font-serif font-bold text-xl text-[#1C1917]">
              No dishes found
            </h3>
            <p className="text-[#57534E] text-xs sm:text-sm">
              We couldn’t find anything matching your filters or search term.
            </p>
            <button
              onClick={resetAllFilters}
              className="px-5 py-2.5 rounded-xl bg-[#B91C1C] text-white text-xs font-bold shadow-md hover:bg-[#991B1B] transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* ─── 5. Floating "🍴 Menu" FAB (Zomato Category Selector) ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setIsBrowseMenuOpen(true)}
          className="bg-[#1C1917] hover:bg-black text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
          aria-label="Browse Menu Categories"
        >
          <UtensilsCrossed size={16} className="text-[#B91C1C]" />
          <span>MENU</span>
          <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-mono">
            {SEED_CATEGORIES.length}
          </span>
        </button>
      </div>

      {/* ─── 6. Zomato Floating Bottom Cart Summary Bar ─── */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-8 z-40 animate-in slide-in-from-bottom duration-300">
          <button
            onClick={openCart}
            className="bg-[#15803D] hover:bg-[#166534] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 text-xs sm:text-sm font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer border border-emerald-400/40"
          >
            <div className="flex items-center gap-2 text-left">
              <ShoppingBag size={18} />
              <div>
                <p className="leading-tight font-extrabold">{totalCartCount} item{totalCartCount > 1 ? 's' : ''}</p>
                <p className="text-[11px] text-emerald-100 font-mono font-normal">
                  Total: {formatPrice(cartSubtotal)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider">
              <span>View Cart</span>
              <ArrowRight size={14} />
            </div>
          </button>
        </div>
      )}

      {/* ─── 7. Modals (Browse Menu Drawer & Quick View) ─── */}
      <ZomatoBrowseMenuModal
        isOpen={isBrowseMenuOpen}
        onClose={() => setIsBrowseMenuOpen(false)}
        categories={SEED_CATEGORIES}
        products={SEED_PRODUCTS}
        activeCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      <ProductQuickView
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-12 text-sm text-[#78716C]">
          Loading Pizza Expert Menu...
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  )
}
