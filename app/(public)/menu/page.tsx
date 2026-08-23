'use client'

import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '@/components/menu/ProductCard'
import ProductQuickView from '@/components/menu/ProductQuickView'
import ZomatoBrowseMenuModal from '@/components/menu/ZomatoBrowseMenuModal'
import {
  Search, Sparkles, Flame,
  X, Mic, UtensilsCrossed, SlidersHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { cn } from '@/lib/utils'
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
    description: 'Classic Italian Margherita with fresh mozzarella, organic tomato passata, and fresh basil leaves on a 48h slow-fermented crust.',
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
    description: 'Tandoori-spiced paneer cubes, crisp bell peppers, red onions, and mozzarella on a smoky sauce base.',
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
      { id: 'o3', product_id: 'p2', name: 'Size', choices: [{ label: 'Regular (8")', price_delta: 0 }, { label: 'Medium (10")', price_delta: 80 }, { label: 'Large (12")', price_delta: 150 }] },
      { id: 'o4', product_id: 'p2', name: 'Crust', choices: [{ label: 'Classic Hand Tossed', price_delta: 0 }, { label: 'Cheese Burst', price_delta: 60 }] },
    ],
  },
  {
    id: 'p3',
    name: 'Farmhouse Veggie Pizza',
    slug: 'farmhouse-pizza',
    description: 'Loaded with crunchy capsicum, sweet corn, mushrooms, red onions, and 100% real mozzarella cheese.',
    price: 329,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '1',
    category: SEED_CATEGORIES[0],
    images: [{ id: 'img3', product_id: 'p3', image_url: FOOD_IMAGES['farmhouse-pizza'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p4',
    name: 'Chicken Supreme Pizza',
    slug: 'chicken-supreme-pizza',
    description: 'Loaded with juicy grilled chicken breast, button mushrooms, black olives, capsicum, and house garlic sauce.',
    price: 399,
    is_veg: false,
    is_spicy: false,
    is_available: true,
    category_id: '1',
    category: SEED_CATEGORIES[0],
    images: [{ id: 'img4', product_id: 'p4', image_url: FOOD_IMAGES['chicken-supreme-pizza'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 4,
    created_at: new Date().toISOString(),
    options: [
      { id: 'o5', product_id: 'p4', name: 'Size', choices: [{ label: 'Regular (8")', price_delta: 0 }, { label: 'Medium (10")', price_delta: 90 }, { label: 'Large (12")', price_delta: 170 }] },
    ],
  },
  {
    id: 'p5',
    name: 'Pepperoni Classic Pizza',
    slug: 'pepperoni-pizza',
    description: 'Generous layers of premium cured pepperoni slices, spicy marinara, and double melted mozzarella cheese.',
    price: 449,
    is_veg: false,
    is_spicy: true,
    is_available: true,
    category_id: '1',
    category: SEED_CATEGORIES[0],
    images: [{ id: 'img5', product_id: 'p5', image_url: FOOD_IMAGES['pepperoni-pizza'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },

  // Burgers
  {
    id: 'p6',
    name: 'Veg Crispy Burger',
    slug: 'veg-crispy-burger',
    description: 'Crisp golden veggie patty topped with fresh iceberg lettuce, tomato slice, creamy house mayo, and cheese.',
    price: 149,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '2',
    category: SEED_CATEGORIES[1],
    images: [{ id: 'img6', product_id: 'p6', image_url: FOOD_IMAGES['veg-crispy-burger'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p7',
    name: 'Crispy Chicken Zinger Burger',
    slug: 'chicken-zinger-burger',
    description: 'Ultra-crispy fried chicken thigh fillet, spicy chipotle mayo, melted cheese slice, and fresh shredded lettuce.',
    price: 199,
    is_veg: false,
    is_spicy: true,
    is_available: true,
    category_id: '2',
    category: SEED_CATEGORIES[1],
    images: [{ id: 'img7', product_id: 'p7', image_url: FOOD_IMAGES['chicken-zinger-burger'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p8',
    name: 'Double Cheese Paneer Burger',
    slug: 'paneer-burger',
    description: 'Thick marinated cottage cheese patty pan-seared with herb seasonings, double cheddar, and garlic mayo.',
    price: 189,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '2',
    category: SEED_CATEGORIES[1],
    images: [{ id: 'img8', product_id: 'p8', image_url: FOOD_IMAGES['paneer-burger'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },

  // Pasta
  {
    id: 'p10',
    name: 'Creamy White Sauce Alfredo Pasta',
    slug: 'white-sauce-pasta',
    description: 'Penne pasta tossed in rich parmesan cream sauce with sauteed garlic, bell peppers, and fresh herbs.',
    price: 229,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '3',
    category: SEED_CATEGORIES[2],
    images: [{ id: 'img10', product_id: 'p10', image_url: FOOD_IMAGES['white-sauce-pasta'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p11',
    name: 'Spicy Red Sauce Arrabbiata Pasta',
    slug: 'red-sauce-pasta',
    description: 'Classic penne in a fiery Italian tomato sauce with crushed chili flakes, garlic, black olives, and fresh basil.',
    price: 219,
    is_veg: true,
    is_spicy: true,
    is_available: true,
    category_id: '3',
    category: SEED_CATEGORIES[2],
    images: [{ id: 'img11', product_id: 'p11', image_url: FOOD_IMAGES['red-sauce-pasta'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },

  // Sides
  {
    id: 'p12',
    name: 'Stuffed Garlic Breadsticks',
    slug: 'stuffed-garlic-bread',
    description: 'Freshly baked buttery breadsticks filled with molten mozzarella, sweet corn, and jalapeno slices.',
    price: 159,
    is_veg: true,
    is_spicy: false,
    is_available: true,
    category_id: '4',
    category: SEED_CATEGORIES[3],
    images: [{ id: 'img12', product_id: 'p12', image_url: FOOD_IMAGES['stuffed-garlic-bread'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p13',
    name: 'Peri Peri Seasoned Fries',
    slug: 'peri-peri-fries',
    description: 'Golden crispy potato fries tossed in zesty African peri peri spice blend with house garlic mayonnaise dip.',
    price: 119,
    is_veg: true,
    is_spicy: true,
    is_available: true,
    category_id: '4',
    category: SEED_CATEGORIES[3],
    images: [{ id: 'img13', product_id: 'p13', image_url: FOOD_IMAGES['peri-peri-fries'], sort_order: 1, is_primary: true }],
    nutrition: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p14',
    name: 'Crispy Salted Fries',
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
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg' | 'spicy' | 'bestseller'>('all')
  const [sortBy, setSortBy] = useState<string>('popularity')
  const [isBrowseMenuOpen, setIsBrowseMenuOpen] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [isListening, setIsListening] = useState(false)

  // Read initial query params
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) setSelectedCategory(cat)
    if (searchParams.get('filter') === 'veg') setDietFilter('veg')
    if (searchParams.get('filter') === 'non-veg') setDietFilter('non-veg')
    if (searchParams.get('filter') === 'spicy') setDietFilter('spicy')
  }, [searchParams])

  const handleSelectCategory = (catSlug: string) => {
    setSelectedCategory(catSlug)
    if (catSlug === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const el = document.getElementById(`cat-section-${catSlug}`)
      if (el) {
        const yOffset = -130
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    }
  }

  const handleVoiceSearch = () => {
    if (typeof window === 'undefined') return
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) {
      toast.error('Voice search is not supported in this browser.')
      return
    }

    try {
      const recognition = new SpeechRec()
      recognition.lang = 'en-IN'
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      setIsListening(true)
      toast.info('🎙️ Listening... Speak dish name (e.g. Margherita, Burger)')

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setSearchQuery(transcript)
        setIsListening(false)
        toast.success(`Searching for: "${transcript}"`)
      }

      recognition.onerror = () => {
        setIsListening(false)
        toast.error('Could not catch voice input.')
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    } catch {
      setIsListening(false)
      toast.error('Could not start microphone')
    }
  }

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

      // Dietary Filters
      if (dietFilter === 'veg' && !prod.is_veg) return false
      if (dietFilter === 'non-veg' && prod.is_veg) return false
      if (dietFilter === 'spicy' && !prod.is_spicy) return false
      if (dietFilter === 'bestseller' && prod.sort_order !== 1) return false

      return true
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return a.sort_order - b.sort_order
    })
  }, [searchQuery, selectedCategory, dietFilter, sortBy])

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
    <div className="bg-[var(--bg-primary)] min-h-screen pb-24 text-[var(--text-primary)] transition-colors duration-200">
      
      {/* ─── 1. Minimal Header & Search Area ─── */}
      <section className="pt-8 pb-6 border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="container-custom max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#FF3B00] uppercase tracking-wider mb-2">
                <Sparkles size={13} />
                <span>ALLAPUR • PRAYAGRAJ</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-[var(--text-primary)]">
                Our Handcrafted Menu
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Authentic wood-fired pizzas, gourmet burgers, pasta & combos.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80 flex items-center">
              <Search size={16} className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="w-full pl-9 pr-16 py-2.5 rounded-full border border-[var(--border)] text-xs sm:text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/20 transition-all shadow-xs"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className={`p-1.5 rounded-full text-[var(--text-muted)] hover:text-[#FF3B00] transition-colors ${isListening ? 'text-[#FF3B00] animate-pulse' : ''}`}
                  title="Search with Voice"
                  aria-label="Search with Voice"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Dietary Filter Pills (Streamlined Single Row) ── */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDietFilter('all')}
                className={cn(
                  'pill-toggle text-xs px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer',
                  dietFilter === 'all'
                    ? 'pill-toggle-active'
                    : 'pill-toggle-default'
                )}
              >
                All
              </button>

              <button
                onClick={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
                className={cn(
                  'pill-toggle text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  dietFilter === 'veg'
                    ? 'bg-[#00C875] text-white shadow-xs'
                    : 'pill-toggle-default'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-[#00C875] border border-white/40" />
                <span>Veg</span>
              </button>

              <button
                onClick={() => setDietFilter(dietFilter === 'non-veg' ? 'all' : 'non-veg')}
                className={cn(
                  'pill-toggle text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  dietFilter === 'non-veg'
                    ? 'bg-[#E2445C] text-white shadow-xs'
                    : 'pill-toggle-default'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-[#E2445C] border border-white/40" />
                <span>Non-Veg</span>
              </button>

              <button
                onClick={() => setDietFilter(dietFilter === 'spicy' ? 'all' : 'spicy')}
                className={cn(
                  'pill-toggle text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  dietFilter === 'spicy'
                    ? 'bg-[#FF3B00] text-white shadow-xs'
                    : 'pill-toggle-default'
                )}
              >
                <Flame size={13} className="text-[#FFC01D]" />
                <span>Spicy</span>
              </button>

              <button
                onClick={() => setDietFilter(dietFilter === 'bestseller' ? 'all' : 'bestseller')}
                className={cn(
                  'pill-toggle text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  dietFilter === 'bestseller'
                    ? 'bg-[#FFCB00] text-black shadow-xs'
                    : 'pill-toggle-default'
                )}
              >
                <Sparkles size={13} />
                <span>Bestseller</span>
              </button>
            </div>

            {/* Clean Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal size={14} className="text-[var(--text-muted)] hidden sm:block" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-bold py-1.5 px-3 rounded-full border border-[var(--border)] focus:outline-none cursor-pointer hover:border-[#FF3B00]/40"
              >
                <option value="popularity">Sort: Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Single Clean Sticky Category Bar ─── */}
      <div className="sticky top-[68px] z-20 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-b border-[var(--border)] py-3 shadow-xs">
        <div className="container-custom max-w-5xl">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSelectCategory('all')}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer',
                selectedCategory === 'all'
                  ? 'bg-[#FF3B00] text-white shadow-sm'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              )}
            >
              All Items ({filteredProducts.length})
            </button>

            {SEED_CATEGORIES.map((cat) => {
              const icon = CATEGORY_ICONS[cat.slug] || '🍽️'
              const count = filteredProducts.filter((p) => p.category?.slug === cat.slug || p.category_id === cat.id).length
              const isSelected = selectedCategory === cat.slug

              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
                    isSelected
                      ? 'bg-[#FF3B00] text-white shadow-sm'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                  )}
                >
                  <span>{icon}</span>
                  <span>{cat.name}</span>
                  {count > 0 && <span className="opacity-70 text-[11px]">({count})</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── 3. Menu Grid (Minimalist & Clean) ─── */}
      <main className="container-custom max-w-5xl pt-8">
        {groupedCategories.length > 0 ? (
          <div className="space-y-12">
            {groupedCategories.map((cat) => {
              const icon = CATEGORY_ICONS[cat.slug] || '🍽️'

              return (
                <section
                  key={cat.id}
                  id={`cat-section-${cat.slug}`}
                  className="space-y-6 scroll-mt-36"
                >
                  {/* Category Title Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{icon}</span>
                      <h2 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-[var(--text-primary)]">
                        {cat.name}
                      </h2>
                      <span className="bg-[var(--bg-subtle)] text-[var(--text-muted)] text-xs font-bold px-2 py-0.5 rounded-full border border-[var(--border)]">
                        {cat.items.length}
                      </span>
                    </div>
                  </div>

                  {/* Dishes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cat.items.map((product) => (
                      <ProductCard
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
          <div className="bg-[var(--bg-surface)] rounded-3xl p-12 text-center border border-[var(--border)] shadow-xs max-w-md mx-auto my-12 space-y-4">
            <span className="text-5xl select-none block mb-2">🍕</span>
            <h3 className="font-heading font-bold text-xl text-[var(--text-primary)]">
              No matching dishes found
            </h3>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm">
              We couldn't find anything matching your search or filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setDietFilter('all')
              }}
              className="btn btn-primary px-6 py-2.5 rounded-full text-xs font-bold shadow-md cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* ─── 4. Quick Category Modal Drawer (Mobile Friendly) ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden">
        <button
          onClick={() => setIsBrowseMenuOpen(true)}
          className="bg-[#181B2E] text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold border border-white/20 active:scale-95 transition-transform"
          aria-label="Browse Menu Categories"
        >
          <UtensilsCrossed size={14} className="text-[#FF3B00]" />
          <span>Categories</span>
        </button>
      </div>

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
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-12 text-sm text-[var(--text-secondary)]">
          Loading Pizza Expert Menu...
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  )
}
