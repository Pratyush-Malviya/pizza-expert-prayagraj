'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createPOSOrder,
  calculatePOSTotal,
  holdOrder,
  resumeHeldOrder,
  toggleProduct86,
  fetchActiveTableOrder,
  type POSCartItem,
  type CreatePOSOrderPayload
} from '@/app/actions/posOrders'
import { processPOSPayment, type POSPaymentTender } from '@/app/actions/posPayments'
import { createRazorpayOrder, verifyRazorpayPayment } from '@/app/actions/razorpay'
import { getActiveShift } from '@/app/actions/cashierSessions'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import {
  Search, Plus, Minus, Trash2, Send, CreditCard, Banknote, Smartphone,
  Users, ChevronRight, Hash, FileText, Pause, RotateCcw, X, Check,
  ShoppingBag, Clock, AlertTriangle, Loader2, UtensilsCrossed, Layers,
  Tag, LogOut, Printer, Sparkles, SlidersHorizontal, ArrowRight,
  HelpCircle, Eye, RefreshCw, ChefHat, Bike, Receipt, CheckCircle2,
  Percent, ShieldAlert, Coffee, QrCode, Globe, MessageSquare, Copy,
  ExternalLink, Share2, Flame, Gift, GripVertical
} from 'lucide-react'
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from '@/lib/constants/defaultMenu'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { triggerPrintPOSReceipt, triggerPrintKOT } from '@/lib/utils/posReceipt'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  slug?: string
  price: number
  category_id: string
  is_available: boolean
  is_veg: boolean
  image_url?: string
}

export const resolveProductImage = (prod?: { id?: string; name?: string; slug?: string; image_url?: string } | null): string => {
  if (!prod) return FOOD_IMAGES['hero-pizza']
  if (prod.image_url) return prod.image_url
  if (prod.slug && FOOD_IMAGES[prod.slug]) return FOOD_IMAGES[prod.slug]
  
  const fallback = FALLBACK_PRODUCTS.find(
    (fp) => fp.id === prod.id || fp.slug === prod.slug || fp.name.toLowerCase() === prod.name?.toLowerCase()
  )
  if (fallback?.imageUrl) return fallback.imageUrl

  const n = (prod.name || '').toLowerCase()
  if (n.includes('margherita')) return FOOD_IMAGES['margherita-pizza']
  if (n.includes('paneer') || n.includes('tikka')) return FOOD_IMAGES['paneer-tikka-pizza']
  if (n.includes('farm') || n.includes('house') || n.includes('veggie')) return FOOD_IMAGES['farm-house-pizza']
  if (n.includes('supreme') || (n.includes('chicken') && n.includes('pizza'))) return FOOD_IMAGES['chicken-supreme-pizza']
  if (n.includes('peri') && n.includes('chicken')) return FOOD_IMAGES['peri-peri-chicken-pizza']
  if (n.includes('pepperoni')) return FOOD_IMAGES['hero-pizza']
  if (n.includes('zinger')) return FOOD_IMAGES['chicken-zinger-burger']
  if (n.includes('burger') || n.includes('crispy')) return FOOD_IMAGES['veg-crispy-burger']
  if (n.includes('arrabiata') || n.includes('pasta')) return FOOD_IMAGES['penne-arrabiata']
  if (n.includes('alfredo')) return FOOD_IMAGES['chicken-alfredo-pasta']
  if (n.includes('garlic') || n.includes('bread')) return FOOD_IMAGES['garlic-bread']
  if (n.includes('peri') && n.includes('fries')) return FOOD_IMAGES['peri-peri-fries']
  if (n.includes('fries')) return FOOD_IMAGES['french-fries']
  if (n.includes('coke') || n.includes('cola') || n.includes('drink') || n.includes('pepsi')) return FOOD_IMAGES['coca-cola-330ml']
  if (n.includes('lassi') || n.includes('shake') || n.includes('mango')) return FOOD_IMAGES['mango-lassi']
  if (n.includes('combo') || n.includes('feast') || n.includes('meal')) return FOOD_IMAGES['family-feast-combo']

  return FOOD_IMAGES['hero-pizza'] || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
}

export interface Category {
  id: string
  name: string
  slug: string
}

export const matchProductToCategory = (p: Product, c: Category): boolean => {
  if (p.category_id === c.id) return true
  if (p.category_id === c.slug) return true
  if (p.category_id === `cat-${c.slug}`) return true

  const cSlug = (c.slug || c.name || '').toLowerCase()
  const pCat = (p.category_id || '').toLowerCase()
  const pName = (p.name || '').toLowerCase()
  const pSlug = (p.slug || '').toLowerCase()

  if (cSlug.includes('pizza')) {
    return pCat.includes('pizza') || pCat === '1' || pCat === 'cat-pizzas' || pName.includes('pizza') || pName.includes('margherita') || pSlug.includes('pizza')
  }
  if (cSlug.includes('burger')) {
    return pCat.includes('burger') || pCat === '2' || pCat === 'cat-burgers' || pName.includes('burger') || pName.includes('zinger') || pSlug.includes('burger')
  }
  if (cSlug.includes('pasta')) {
    return pCat.includes('pasta') || pCat === '3' || pCat === 'cat-pasta' || pName.includes('pasta') || pName.includes('arrabiata') || pName.includes('alfredo') || pName.includes('penne')
  }
  if (cSlug.includes('sandwich')) {
    return pCat.includes('sandwich') || pName.includes('sandwich') || pName.includes('club') || pName.includes('toast')
  }
  if (cSlug.includes('side')) {
    return pCat.includes('side') || pCat === '4' || pCat === 'cat-sides' || pName.includes('bread') || pName.includes('fries') || pName.includes('balls') || pName.includes('dip') || pName.includes('wings') || pName.includes('rings')
  }
  if (cSlug.includes('beverage') || cSlug.includes('drink')) {
    return pCat.includes('beverage') || pCat.includes('drink') || pCat === '5' || pCat === 'cat-beverages' || pName.includes('coke') || pName.includes('cola') || pName.includes('lassi') || pName.includes('coffee') || pName.includes('tea') || pName.includes('pepsi') || pName.includes('shake') || pName.includes('juice') || pName.includes('thums')
  }
  if (cSlug.includes('combo') || cSlug.includes('deal') || cSlug.includes('feast')) {
    return pCat.includes('combo') || pCat.includes('deal') || pCat === '6' || pCat === 'cat-combos' || pName.includes('combo') || pName.includes('meal') || pName.includes('feast') || pName.includes('party')
  }
  if (cSlug.includes('dessert') || cSlug.includes('sweet')) {
    return pCat.includes('dessert') || pName.includes('cake') || pName.includes('lava') || pName.includes('brownie') || pName.includes('pastry') || pName.includes('sweet') || pName.includes('ice cream')
  }

  return false
}

interface CartModifier {
  id: string
  name: string
  price: number
}

interface CartLine {
  lineId: string
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  variantSize?: string
  crust?: string
  modifiers: CartModifier[]
  notes: string
  course: 'Starters' | 'Mains' | 'Beverages' | 'Dessert'
  isHeld?: boolean
}

type OrderType = 'dine_in' | 'takeaway' | 'pickup' | 'delivery'
type PaymentStep = 'idle' | 'payment' | 'success'
type MenuCatalogView = 'all' | 'combos' | 'bestsellers' | 'beverages' | 'dine_in_special'

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: 'Dine-In',
  takeaway: 'Takeaway',
  pickup: 'Counter Pickup',
  delivery: 'Delivery',
}

const ORDER_TYPE_ICONS: Record<OrderType, any> = {
  dine_in: UtensilsCrossed,
  takeaway: ShoppingBag,
  pickup: Hash,
  delivery: Bike,
}

const MENU_VIEW_OPTIONS: Array<{ id: MenuCatalogView; label: string; icon: any }> = [
  { id: 'all', label: 'All Day Menu', icon: UtensilsCrossed },
  { id: 'bestsellers', label: 'Bestsellers & Specials', icon: Flame },
  { id: 'combos', label: 'Combos & Meal Deals', icon: Gift },
  { id: 'beverages', label: 'Beverages & Sides', icon: Coffee },
  { id: 'dine_in_special', label: 'Dine-In Exclusives', icon: Sparkles },
]

// Preset customizer data for gourmet pizza and appetizers
const SIZES = [
  { id: 'regular', name: 'Regular (7")', priceDelta: 0 },
  { id: 'medium', name: 'Medium (10")', priceDelta: 120 },
  { id: 'large', name: 'Large (13")', priceDelta: 220 },
]

const CRUSTS = [
  { id: 'classic', name: 'Classic Hand-Tossed', priceDelta: 0 },
  { id: 'cheese_burst', name: 'Cheese Burst', priceDelta: 60 },
  { id: 'thin_crust', name: 'Thin & Crispy', priceDelta: 30 },
  { id: 'garlic_stuffed', name: 'Garlic Stuffed Crust', priceDelta: 50 },
]

const TOPPINGS = [
  { id: 'extra_cheese', name: 'Extra Fior di Latte', price: 40 },
  { id: 'jalapenos', name: 'Pickled Jalapeños', price: 25 },
  { id: 'black_olives', name: 'Sliced Black Olives', price: 25 },
  { id: 'mushrooms', name: 'Grilled Mushrooms', price: 30 },
  { id: 'peri_paneer', name: 'Peri-Peri Paneer', price: 45 },
  { id: 'red_paprika', name: 'Red Paprika', price: 20 },
  { id: 'sweet_corn', name: 'Golden Sweet Corn', price: 20 },
]

const INSTRUCTION_TAGS = [
  'No Onion',
  'No Garlic',
  'Extra Spicy',
  'Less Spicy',
  'Crispy Base',
  'Cut in 8 Slices',
  'Pack Separately',
  'Well Done',
]

const CASH_PRESETS = [100, 200, 500, 1000, 2000]

// ─── Main POS Screen Component ────────────────────────────────────────────────

export default function POSScreen() {
  // ── Settings Store ──
  const settings = useSettingsStore()

  // ── State: Catalog & Menu Views ──
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeMenuView, setActiveMenuView] = useState<MenuCatalogView>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false)
  const [loadingCatalog, setLoadingCatalog] = useState(true)

  // ── State: Cart ──
  const [cart, setCart] = useState<CartLine[]>([])
  const [orderType, setOrderType] = useState<OrderType>('takeaway')
  const [tableId, setTableId] = useState<string>('')
  const [guestCount, setGuestCount] = useState(1)
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryLandmark, setDeliveryLandmark] = useState('')
  const [prepTimeEstimate, setPrepTimeEstimate] = useState<number>(15) // minutes
  const [packagingCharge, setPackagingCharge] = useState<boolean>(false)
  const [discountValue, setDiscountValue] = useState(0)
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat')
  const [orderNotes, setOrderNotes] = useState('')

  // ── State: Session & Shift ──
  const [cashierId, setCashierId] = useState<string>('')
  const [shiftId, setShiftId] = useState<string>('')
  const [terminalId, setTerminalId] = useState<string>('')
  const [shiftOpen, setShiftOpen] = useState(false)

  // ── State: Totals ──
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, tax: 0, total: 0 })

  // ── State: Payment ──
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle')
  const [cashTendered, setCashTendered] = useState('')
  const [paymentMode, setPaymentMode] = useState<POSPaymentTender['tenderType'] | 'gateway_qr'>('cash')
  const [cardReference, setCardReference] = useState('')
  const [upiReference, setUpiReference] = useState('')
  const [gatewayStatus, setGatewayStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle')
  const [gatewayOrderId, setGatewayOrderId] = useState<string>('')
  const [placing, setPlacing] = useState(false)
  const [lastOrderId, setLastOrderId] = useState<string>('')
  const [lastKotNumber, setLastKotNumber] = useState<string>('')

  // ── State: Modals & Drawers ──
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null)
  const [customSize, setCustomSize] = useState(SIZES[0])
  const [customCrust, setCustomCrust] = useState(CRUSTS[0])
  const [customToppings, setCustomToppings] = useState<CartModifier[]>([])
  const [customCourse, setCustomCourse] = useState<'Starters' | 'Mains' | 'Beverages' | 'Dessert'>('Mains')
  const [customNotes, setCustomNotes] = useState('')
  const [showHotkeysModal, setShowHotkeysModal] = useState(false)
  const [showCustomerMenuModal, setShowCustomerMenuModal] = useState(false)
  const [activeTableRunningOrder, setActiveTableRunningOrder] = useState<any | null>(null)

  // ── State: Tables & Staff ──
  const [tables, setTables] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  // ── State: Resizable Splitter (Cart Panel Width %) ──
  const [cartPanelWidth, setCartPanelWidth] = useState<number>(40) // Default 40% cart width
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load saved panel width from localStorage
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('pos_cart_panel_width')
      if (savedWidth) {
        const val = parseFloat(savedWidth)
        if (val >= 22 && val <= 65) setCartPanelWidth(val)
      }
    } catch {
      // ignore
    }
  }, [])

  // Dragging logic for desktop mouse and mobile/tablet touch
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingSplitter(true)
  }, [])

  const handleSplitterTouchStart = useCallback(() => {
    setIsDraggingSplitter(true)
  }, [])

  useEffect(() => {
    if (!isDraggingSplitter) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const totalWidth = rect.width
      if (totalWidth <= 0) return
      const leftRatio = mouseX / totalWidth
      // Clamp between 22% (slim cart) and 65% (wide cart)
      const newCartPercent = Math.min(65, Math.max(22, (1 - leftRatio) * 100))
      setCartPanelWidth(newCartPercent)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || !e.touches[0]) return
      const rect = containerRef.current.getBoundingClientRect()
      const touchX = e.touches[0].clientX - rect.left
      const totalWidth = rect.width
      if (totalWidth <= 0) return
      const leftRatio = touchX / totalWidth
      const newCartPercent = Math.min(65, Math.max(22, (1 - leftRatio) * 100))
      setCartPanelWidth(newCartPercent)
    }

    const handleMouseUp = () => {
      setIsDraggingSplitter(false)
      try {
        localStorage.setItem('pos_cart_panel_width', cartPanelWidth.toString())
      } catch {}
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDraggingSplitter, cartPanelWidth])

  // ── Load Razorpay Checkout Script on Mount ────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('razorpay-checkout-js')) {
      const script = document.createElement('script')
      script.id = 'razorpay-checkout-js'
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  // ── Load Catalog ──────────────────────────────────────────────────────────
  const loadCatalog = useCallback(async () => {
    try {
      const supabase = createClient()
      const [{ data: cats }, { data: prods }, { data: prodImgs }] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('products').select('id, name, slug, price, category_id, is_available, is_veg').order('sort_order'),
        supabase.from('product_images').select('product_id, image_url, sort_order').order('sort_order', { ascending: true }),
      ])

      // 1. Read local storage in case products/categories were modified via admin
      let localProducts: any[] = []
      let localCategories: any[] = []
      try {
        const rawLocalProds = typeof window !== 'undefined' ? localStorage.getItem('pizza_products') : null
        if (rawLocalProds) localProducts = JSON.parse(rawLocalProds)
        const rawLocalCats = typeof window !== 'undefined' ? localStorage.getItem('pizza_categories') : null
        if (rawLocalCats) localCategories = JSON.parse(rawLocalCats)
      } catch (_) {}

      // 2. Build complete Category list (DB + localStorage + Fallbacks)
      const catMap = new Map<string, Category>()
      FALLBACK_CATEGORIES.forEach((c) => catMap.set(c.slug, { id: c.id, name: c.name, slug: c.slug }))
      if (Array.isArray(localCategories)) {
        localCategories.forEach((c) => {
          if (c.slug || c.id) catMap.set(c.slug || c.id, { id: c.id, name: c.name, slug: c.slug })
        })
      }
      if (Array.isArray(cats)) {
        cats.forEach((c) => {
          if (c.slug || c.id) catMap.set(c.slug || c.id, { id: c.id, name: c.name, slug: c.slug })
        })
      }
      const validCats = Array.from(catMap.values())

      // 3. Build complete Product list (Fallback + localStorage + DB products merged)
      const prodMap = new Map<string, Product>()

      // A. Seed all fallback products
      FALLBACK_PRODUCTS.forEach((p) => {
        prodMap.set(p.slug || p.id, {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          category_id: p.categoryId,
          is_available: true,
          is_veg: p.isVeg,
          image_url: p.imageUrl || resolveProductImage(p),
        })
      })

      // B. Merge local storage products
      if (Array.isArray(localProducts)) {
        localProducts.forEach((p) => {
          const key = p.slug || p.id
          if (key) {
            prodMap.set(key, {
              id: p.id || key,
              name: p.name,
              slug: p.slug || key,
              price: Number(p.price) || 0,
              category_id: p.category_id || p.categoryId || 'cat-pizzas',
              is_available: p.is_available !== false,
              is_veg: p.is_veg ?? true,
              image_url: p.image_url || p.imageUrl || resolveProductImage(p),
            })
          }
        })
      }

      // C. Merge Supabase DB products (highest priority for real-time live data)
      if (Array.isArray(prods) && prods.length > 0) {
        prods.forEach((p) => {
          const dbImg = prodImgs?.find((img) => img.product_id === p.id)?.image_url
          const key = p.slug || p.id
          prodMap.set(key, {
            id: p.id,
            name: p.name,
            slug: p.slug || key,
            price: Number(p.price) || 0,
            category_id: p.category_id || 'cat-pizzas',
            is_available: p.is_available !== false,
            is_veg: p.is_veg ?? true,
            image_url: dbImg || resolveProductImage(p),
          })
        })
      }

      const validProds = Array.from(prodMap.values())

      setCategories(validCats)
      setProducts(validProds)
    } catch (err) {
      console.warn('Catalog DB fallback to default menu:', err)
      setCategories(FALLBACK_CATEGORIES.map((c) => ({ id: c.id, name: c.name, slug: c.slug })))
      setProducts(
        FALLBACK_PRODUCTS.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          category_id: p.categoryId,
          is_available: true,
          is_veg: p.isVeg,
          image_url: p.imageUrl || resolveProductImage(p),
        }))
      )
    } finally {
      setLoadingCatalog(false)
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  // ── Load Tables & Staff ───────────────────────────────────────────────────
  const loadTables = useCallback(async () => {
    const supabase = createClient()
    const [{ data: tData }, { data: sData }] = await Promise.all([
      supabase.from('tables').select('id, table_number, capacity, status, area_id').eq('is_active', true).order('table_number'),
      supabase.from('profiles').select('id, name, role').in('role', ['waiter', 'staff', 'manager', 'cashier', 'super_admin']),
    ])
    setTables(tData || [])
    setStaffList(sData || [])
  }, [])

  useEffect(() => {
    loadTables()

    // Realtime listener for table status updates
    const supabase = createClient()
    const channel = supabase
      .channel('pos-screen-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
        loadTables()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadTables])

  // ── Read Query Params (tableId, guests) ───────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const qTableId = params.get('tableId')
      const qGuests = params.get('guests')
      if (qTableId) {
        setTableId(qTableId)
        setOrderType('dine_in')
        if (qGuests) setGuestCount(Number(qGuests) || 1)
      }
    }
  }, [])

  // ── Check Table Running Order when Table changes ──────────────────────────
  useEffect(() => {
    if (tableId && orderType === 'dine_in') {
      fetchActiveTableOrder(tableId).then((res) => {
        if (res.success && res.order) {
          setActiveTableRunningOrder(res.order)
          if (res.order.address_json?.name && !customerName) {
            setCustomerName(res.order.address_json.name)
          }
          if (res.order.address_json?.phone && !customerPhone) {
            setCustomerPhone(res.order.address_json.phone)
          }
        } else {
          setActiveTableRunningOrder(null)
        }
      })
    } else {
      setActiveTableRunningOrder(null)
    }
  }, [tableId, orderType, customerName, customerPhone])

  // ── Load Cashier Session ──────────────────────────────────────────────────
  useEffect(() => {
    const loadSession = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCashierId(user.id)
        const result = await getActiveShift(user.id)
        if (result.success && result.data) {
          setShiftId(result.data.id)
          setTerminalId(result.data.terminal_id)
          setShiftOpen(true)
        }
      }
    }
    loadSession()
  }, [])

  // ── Auto-Draft Local Persistence ──────────────────────────────────────────
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('pos_active_cart_draft')
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft)
        if (parsed.cart && parsed.cart.length > 0) {
          setCart(parsed.cart)
          if (parsed.orderType) setOrderType(parsed.orderType)
          if (parsed.customerName) setCustomerName(parsed.customerName)
          if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone)
        }
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (cart.length > 0) {
      try {
        localStorage.setItem('pos_active_cart_draft', JSON.stringify({
          cart,
          orderType,
          customerName,
          customerPhone
        }))
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem('pos_active_cart_draft')
      } catch (_) {}
    }
  }, [cart, orderType, customerName, customerPhone])

  // ── Calculate Totals via Client + Server Action ─────────────────────────────
  useEffect(() => {
    if (cart.length === 0) {
      setTotals({ subtotal: 0, discount: 0, tax: 0, total: 0 })
      return
    }

    // 1. Instant client calculation
    const clientSubtotal = cart.reduce((acc, l) => {
      const modTotal = l.modifiers.reduce((s, m) => s + Number(m.price || 0), 0)
      return acc + (Number(l.unitPrice || 0) + modTotal) * l.quantity
    }, 0)
    const clientDiscount = discountValue > 0
      ? (discountType === 'percentage' ? Math.round(clientSubtotal * (discountValue / 100) * 100) / 100 : Math.min(discountValue, clientSubtotal))
      : 0
    const clientTaxable = Math.max(0, clientSubtotal - clientDiscount)
    const clientTax = Math.round(clientTaxable * 0.05 * 100) / 100
    const packagingExtra = packagingCharge && (orderType === 'takeaway' || orderType === 'pickup') ? 15 : 0
    const clientTotal = Math.round((clientTaxable + clientTax + packagingExtra) * 100) / 100

    setTotals({
      subtotal: clientSubtotal,
      discount: clientDiscount,
      tax: clientTax,
      total: clientTotal,
    })

    // 2. Server-authoritative sync
    const items: POSCartItem[] = cart.map((l) => ({
      productId: l.productId,
      productName: `${l.productName}${l.variantSize ? ` (${l.variantSize})` : ''}${l.crust ? ` - ${l.crust}` : ''}`,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      modifiers: l.modifiers,
    }))

    calculatePOSTotal(items, discountValue, discountType)
      .then((res) => {
        if (res && typeof res.total === 'number') {
          setTotals({
            ...res,
            total: Math.round((res.total + packagingExtra) * 100) / 100,
          })
        }
      })
      .catch(() => {
        // Silently preserve instant client totals
      })
  }, [cart, discountValue, discountType, packagingCharge, orderType])

  // ── Keyboard Shortcuts (Section 4.1 of Guide) ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'

      if (e.key === '/' && !isInput) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape') {
        if (customizingProduct) setCustomizingProduct(null)
        if (showHotkeysModal) setShowHotkeysModal(false)
        if (showCustomerMenuModal) setShowCustomerMenuModal(false)
        if (searchQuery) setSearchQuery('')
      } else if (e.key === 'F1') {
        e.preventDefault()
        setOrderType('dine_in')
      } else if (e.key === 'F2') {
        e.preventDefault()
        setOrderType('takeaway')
      } else if (e.key === 'F3') {
        e.preventDefault()
        setOrderType('delivery')
      } else if (e.key === 'F4') {
        e.preventDefault()
        holdCurrentOrder()
      } else if (e.key === 'F8') {
        e.preventDefault()
        if (cart.length > 0 && paymentStep !== 'success') {
          processPayment()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [customizingProduct, showHotkeysModal, showCustomerMenuModal, searchQuery, cart, paymentStep])

  // ── Filtered Products based on Menu View, Category, and Search ───────────
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Menu view filter
      let matchesMenuView = true
      if (activeMenuView === 'combos') {
        matchesMenuView =
          p.name.toLowerCase().includes('combo') ||
          p.name.toLowerCase().includes('meal') ||
          p.name.toLowerCase().includes('deal') ||
          p.name.toLowerCase().includes('feast') ||
          p.name.toLowerCase().includes('party') ||
          p.category_id.toLowerCase().includes('combo')
      } else if (activeMenuView === 'bestsellers') {
        matchesMenuView =
          Number(p.price) >= 240 ||
          p.name.toLowerCase().includes('margherita') ||
          p.name.toLowerCase().includes('farmhouse') ||
          p.name.toLowerCase().includes('zinger') ||
          p.name.toLowerCase().includes('supreme') ||
          p.name.toLowerCase().includes('tikka') ||
          p.name.toLowerCase().includes('crispy')
      } else if (activeMenuView === 'beverages') {
        matchesMenuView =
          p.name.toLowerCase().includes('coke') ||
          p.name.toLowerCase().includes('pepsi') ||
          p.name.toLowerCase().includes('lassi') ||
          p.name.toLowerCase().includes('bread') ||
          p.name.toLowerCase().includes('fries') ||
          p.name.toLowerCase().includes('dessert') ||
          p.name.toLowerCase().includes('shake') ||
          p.name.toLowerCase().includes('coffee') ||
          p.category_id.toLowerCase().includes('beverage') ||
          p.category_id.toLowerCase().includes('side')
      } else if (activeMenuView === 'dine_in_special') {
        matchesMenuView =
          Number(p.price) >= 200 ||
          p.name.toLowerCase().includes('pizza') ||
          p.name.toLowerCase().includes('pasta') ||
          p.name.toLowerCase().includes('combo')
      }

      // 2. Category tab filter
      let matchesCategory = true
      if (activeCategory !== 'all') {
        const currentSelectedCat = categories.find((c) => c.id === activeCategory || c.slug === activeCategory)
        if (currentSelectedCat) {
          matchesCategory = matchProductToCategory(p, currentSelectedCat)
        } else {
          matchesCategory = p.category_id === activeCategory
        }
      }

      // 3. Search & Veg filter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.slug ? p.slug.toLowerCase().includes(q) : false) ||
        p.price.toString().includes(q)

      const matchesVeg = !vegOnlyFilter || p.is_veg

      return matchesMenuView && matchesCategory && matchesSearch && matchesVeg
    })
  }, [products, activeMenuView, activeCategory, categories, searchQuery, vegOnlyFilter])

  // ── Fast Add to Cart ──────────────────────────────────────────────────────
  const fastAddToCart = useCallback((product: Product) => {
    if (!product.is_available) {
      toast.error(`${product.name} is 86'd (out of stock)`)
      return
    }
    setCart((prev) => {
      const existing = prev.find(
        (l) => l.productId === product.id && l.modifiers.length === 0 && !l.variantSize && !l.crust
      )
      if (existing) {
        return prev.map((l) =>
          l.lineId === existing.lineId ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
          modifiers: [],
          notes: '',
          course: 'Mains',
          lineId: crypto.randomUUID(),
        },
      ]
    })
  }, [])

  // ── Open Customization Modal ──────────────────────────────────────────────
  const openCustomizer = (product: Product) => {
    if (!product.is_available) {
      toast.error(`${product.name} is currently out of stock`)
      return
    }
    setCustomizingProduct(product)
    setCustomSize(SIZES[0])
    setCustomCrust(CRUSTS[0])
    setCustomToppings([])
    setCustomCourse('Mains')
    setCustomNotes('')
  }

  // ── Confirm Customized Item Add ───────────────────────────────────────────
  const addCustomizedItem = () => {
    if (!customizingProduct) return

    const basePrice = customizingProduct.price + customSize.priceDelta + customCrust.priceDelta
    const toppingsTotal = customToppings.reduce((s, t) => s + t.price, 0)
    const finalUnitPrice = basePrice + toppingsTotal

    const newCartLine: CartLine = {
      lineId: crypto.randomUUID(),
      productId: customizingProduct.id,
      productName: customizingProduct.name,
      unitPrice: finalUnitPrice,
      quantity: 1,
      variantSize: customSize.name,
      crust: customCrust.name,
      modifiers: customToppings,
      notes: customNotes,
      course: customCourse,
    }

    setCart((prev) => [...prev, newCartLine])
    setCustomizingProduct(null)
    toast.success(`Added ${customizingProduct.name} (${customSize.name})`)
  }

  // ── 86'd Quick Toggle ─────────────────────────────────────────────────────
  const handleToggle86 = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextState = !product.is_available
    const res = await toggleProduct86(product.id, nextState)
    if (res.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_available: nextState } : p))
      )
      toast.success(`${product.name} marked ${nextState ? 'Available' : "86'd (Out of Stock)"}`)
    } else {
      toast.error('Failed to update product stock')
    }
  }

  // ── Cart Controls ─────────────────────────────────────────────────────────
  const updateQty = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l))
    )
  }

  const removeLine = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId))
  }

  const toggleHoldCourse = (lineId: string) => {
    setCart((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, isHeld: !l.isHeld } : l))
    )
  }

  const clearCart = () => {
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    setDeliveryAddress('')
    setDeliveryLandmark('')
    setDiscountValue(0)
    setOrderNotes('')
    setTableId('')
    setGuestCount(1)
    setPaymentStep('idle')
    setActiveTableRunningOrder(null)
    setGatewayStatus('idle')
    setGatewayOrderId('')
    localStorage.removeItem('pos_active_cart_draft')
  }

  // ── Helper: Build Canonical POS Order Payload ────────────────────────────
  const getOrderPayload = (): CreatePOSOrderPayload => ({
    orderType,
    items: cart.map((l) => ({
      productId: l.productId,
      productName: `${l.productName}${l.variantSize ? ` (${l.variantSize})` : ''}${l.crust ? ` [${l.crust}]` : ''}`,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      modifiers: l.modifiers,
      notes: `${l.course ? `[${l.course}] ` : ''}${l.isHeld ? '⛔ [HOLD ON KOT] ' : ''}${l.notes || ''}`.trim(),
    })),
    tableId: tableId || undefined,
    guestCount,
    waiterId: selectedWaiterId || undefined,
    customerName: customerName || (orderType === 'dine_in' ? `Table ${tables.find((t) => t.id === tableId)?.table_number || ''}` : 'Walk-in Customer'),
    customerPhone: customerPhone || undefined,
    discountValue: discountValue || undefined,
    discountType: discountType || undefined,
    notes: `${prepTimeEstimate ? `⏱ Est. Prep: ${prepTimeEstimate}m | ` : ''}${deliveryAddress ? `📍 Address: ${deliveryAddress} (${deliveryLandmark}) | ` : ''}${orderNotes || ''}`.trim(),
    shiftId,
    terminalId,
    cashierId,
  })

  // ── Trigger Razorpay Checkout Modal directly on POS Screen ─────────────────
  const launchRazorpayModal = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    if (!shiftOpen) return toast.error('Please open a cashier shift first')
    if (orderType === 'dine_in' && !tableId) {
      return toast.error('Please select a Table for Dine-In orders')
    }

    setGatewayStatus('loading')
    try {
      const storeSettings = useSettingsStore.getState()
      const tempRef = `POS_${Date.now().toString().slice(-6)}`
      const rzpRes = await createRazorpayOrder({
        amount: totals.total,
        orderId: tempRef,
        customKeyId: storeSettings.enableRazorpay ? storeSettings.razorpayKeyId : undefined,
        customKeySecret: storeSettings.enableRazorpay ? storeSettings.razorpayKeySecret : undefined,
      })

      if (!rzpRes.success || !rzpRes.razorpayOrderId) {
        toast.error(rzpRes.error || 'Razorpay initialization failed. You can use Dynamic UPI QR or Manual Cash.')
        setGatewayStatus('failed')
        return
      }

      setGatewayOrderId(rzpRes.razorpayOrderId)

      const windowWithRzp = window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { on: (event: string, cb: (res: { error?: { description?: string } }) => void) => void; open: () => void } }
      if (!windowWithRzp.Razorpay) {
        toast.error('Razorpay SDK is loading. Please click again.')
        setGatewayStatus('idle')
        return
      }

      const options = {
        key: rzpRes.keyId,
        amount: rzpRes.amount,
        currency: rzpRes.currency || 'INR',
        name: settings.businessName || 'Pizza Expert Prayagraj',
        description: `POS Counter Order (₹${totals.total.toFixed(2)})`,
        image: '/favicon.ico',
        order_id: rzpRes.razorpayOrderId,
        prefill: {
          name: customerName || 'Counter Customer',
          contact: customerPhone || '',
        },
        theme: {
          color: '#B91C1C',
        },
        handler: async function (response: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string }) {
          toast.info('Verifying payment gateway capture...')
          const verifyRes = await verifyRazorpayPayment({
            orderId: tempRef,
            razorpayPaymentId: response.razorpay_payment_id || `pay_pos_${Date.now()}`,
            razorpayOrderId: response.razorpay_order_id || rzpRes.razorpayOrderId!,
            razorpaySignature: response.razorpay_signature || 'mock_sig',
            isTestMode: rzpRes.isTestMode,
          })

          if (verifyRes.success) {
            // Place Order in DB & fire KOT ONLY after payment capture is verified
            const orderPayload = getOrderPayload()
            const orderRes = await createPOSOrder(orderPayload)
            if (!orderRes.success || !orderRes.orderId) {
              toast.error(orderRes.error || 'Payment succeeded but order creation failed.')
              setGatewayStatus('failed')
              return
            }

            // Record POS payment tender in DB
            await processPOSPayment({
              orderId: orderRes.orderId,
              shiftId,
              tenders: [{ tenderType: 'razorpay', amount: totals.total, reference: response.razorpay_payment_id }],
              orderTotal: totals.total,
            })

            setLastOrderId(orderRes.orderId)
            setLastKotNumber(orderRes.kotNumber!)
            toast.success(`🎉 Online Payment Verified & Order Placed! #${orderRes.kotNumber}`)
            setPaymentStep('success')
            setGatewayStatus('success')
            loadTables()
          } else {
            toast.error(verifyRes.error || 'Payment signature verification failed. No order was placed.')
            setGatewayStatus('failed')
          }
        },
        modal: {
          ondismiss: function () {
            setGatewayStatus('idle')
            toast.info('Payment window closed. Order was not placed.')
          },
        },
      }

      const rzpInstance = new windowWithRzp.Razorpay(options)
      rzpInstance.open()
    } catch (err: any) {
      toast.error(err.message || 'Failed to open Razorpay gateway')
      setGatewayStatus('failed')
    }
  }

  // ── Receive Payment & Place Order (Atomic: No Order Without Payment) ────────
  const processPayment = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    if (!shiftOpen) return toast.error('Please open a cashier shift first')
    if (orderType === 'dine_in' && !tableId) {
      return toast.error('Please select a Table for Dine-In orders')
    }

    if (paymentMode === 'cash') {
      const tendered = parseFloat(cashTendered) || totals.total
      if (tendered < totals.total - 0.01) {
        return toast.error(`Insufficient cash tendered. Total is ₹${totals.total.toFixed(2)}`)
      }
    }

    setPlacing(true)
    try {
      // 1. Prepare Payment Tender
      let tenders: POSPaymentTender[] = []
      if (paymentMode === 'cash') {
        const tendered = parseFloat(cashTendered) || totals.total
        const change = Math.max(0, tendered - totals.total)
        tenders = [{ tenderType: 'cash', amount: tendered, changeGiven: change }]
      } else if (paymentMode === 'card') {
        tenders = [{
          tenderType: 'card',
          amount: totals.total,
          reference: cardReference ? `EDC_${cardReference}` : `CARD_${Date.now().toString().slice(-6)}`
        }]
      } else if (paymentMode === 'gateway_qr') {
        tenders = [{
          tenderType: 'upi',
          amount: totals.total,
          reference: upiReference ? `UPI_${upiReference}` : `UPI_QR_${Date.now().toString().slice(-6)}`
        }]
      } else {
        tenders = [{ tenderType: paymentMode as any, amount: totals.total }]
      }

      // 2. Create the Order in Supabase & fire KOT
      const orderPayload = getOrderPayload()
      const orderRes = await createPOSOrder(orderPayload)
      if (!orderRes.success || !orderRes.orderId) {
        throw new Error(orderRes.error || 'Failed to place order')
      }

      // 3. Atomically Record & Settle Payment
      const payRes = await processPOSPayment({
        orderId: orderRes.orderId,
        shiftId,
        tenders,
        orderTotal: totals.total,
      })

      if (!payRes.success) {
        throw new Error(payRes.error || 'Order created but payment settlement failed')
      }

      setLastOrderId(orderRes.orderId)
      setLastKotNumber(orderRes.kotNumber!)
      setPaymentStep('success')
      loadTables()

      toast.success(
        paymentMode === 'cash' && (parseFloat(cashTendered) || 0) > totals.total
          ? `✅ Paid & Order Placed! Return Change: ₹${payRes.changeAmount?.toFixed(2)}`
          : `✅ Payment Received & Order Placed! #${orderRes.kotNumber}`
      )
    } catch (err: any) {
      toast.error(err.message || 'Payment & order placement failed')
    } finally {
      setPlacing(false)
    }
  }

  // ── Hold Order ────────────────────────────────────────────────────────────
  const holdCurrentOrder = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    const label = customerName || (tableId ? `Table ${tables.find(t => t.id === tableId)?.table_number}` : `Ticket #${Date.now().toString().slice(-4)}`)
    const result = await holdOrder(
      cashierId,
      terminalId,
      { cart, orderType, tableId, guestCount, customerName, customerPhone, discountValue, orderNotes, deliveryAddress },
      label
    )
    if (result.success) {
      toast.success(`Order held as "${label}"`)
      clearCart()
    }
  }

  // ── Print Thermal Receipt & KOT Directly ─────────────────────────────────
  const printCurrentPOSReceipt = () => {
    if (!lastOrderId && cart.length === 0) {
      toast.error('No order available to print receipt')
      return
    }

    const targetTableNum = tables.find((t) => t.id === tableId)?.table_number

    triggerPrintPOSReceipt({
      orderId: lastOrderId || `POS-${Date.now().toString().slice(-6)}`,
      kotNumber: lastKotNumber || undefined,
      orderType,
      tableNumber: targetTableNum,
      cashierName: 'Counter Staff',
      customerName: customerName || 'Counter Customer',
      customerPhone,
      items: cart.map((item) => {
        const optionList: string[] = []
        if (item.variantSize) optionList.push(`Size: ${item.variantSize}`)
        if (item.crust) optionList.push(`Crust: ${item.crust}`)
        if (item.modifiers && item.modifiers.length > 0) {
          item.modifiers.forEach((m) => optionList.push(m.name))
        }
        return {
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          selectedOptions: optionList,
          notes: item.notes,
        }
      }),
      subtotal: totals.subtotal,
      discount: totals.discount,
      deliveryFee: 0,
      tax: totals.tax,
      total: totals.total,
      payments: [
        {
          tenderType: paymentMode,
          amount: totals.total,
          changeGiven:
            paymentMode === 'cash' ? Math.max(0, (parseFloat(cashTendered) || 0) - totals.total) : 0,
        },
      ],
      businessInfo: {
        name: settings.businessName || 'PIZZA EXPERT',
        address: settings.address || 'Civil Lines, Prayagraj, UP 211001',
        phone: settings.phone || '+91 91234 56789',
        gstin: '09ABCDE1234F1Z5',
        fssai: '12724052000123',
      },
    })
    toast.success('🖨️ Thermal Receipt Sent to Printer!')
  }

  const printCurrentKOT = () => {
    if (cart.length === 0 && !lastOrderId) {
      toast.error('Cart is empty')
      return
    }

    const targetTableNum = tables.find((t) => t.id === tableId)?.table_number

    triggerPrintKOT({
      kotNumber: lastKotNumber || `KOT-${Date.now().toString().slice(-4)}`,
      orderId: lastOrderId || `ORD-${Date.now().toString().slice(-6)}`,
      orderType,
      tableNumber: targetTableNum,
      createdAt: new Date(),
      specialNotes: orderNotes,
      items: cart.map((item) => {
        const optionList: string[] = []
        if (item.variantSize) optionList.push(`Size: ${item.variantSize}`)
        if (item.crust) optionList.push(`Crust: ${item.crust}`)
        if (item.modifiers && item.modifiers.length > 0) {
          item.modifiers.forEach((m) => optionList.push(m.name))
        }
        return {
          name: item.productName,
          quantity: item.quantity,
          course: item.course,
          selectedOptions: optionList,
          notes: item.notes,
        }
      }),
    })
    toast.success('👨‍🍳 Kitchen Ticket (KOT) Sent to Printer!')
  }

  // ── Generate Dynamic UPI Payment URI ──────────────────────────────────────
  const activeUpiId = settings.upiId || 'pizzaexpert@upi'
  const dynamicUpiUri = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(settings.businessName || 'Pizza Expert')}&am=${totals.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${lastOrderId ? lastOrderId.slice(-6) : 'POS'}`)}`
  const dynamicQrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(dynamicUpiUri)}`
  const customerMenuUrl = typeof window !== 'undefined' ? `${window.location.origin}/menu` : 'https://pizza-expert.in/menu'
  const menuQrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(customerMenuUrl)}`

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-[calc(100vh-56px)] overflow-hidden bg-[#0A0A0A] text-white font-sans relative',
        isDraggingSplitter ? 'cursor-col-resize select-none' : ''
      )}
    >

      {/* ─── LEFT PANEL: Menu & Catalog ──────────────────────────────────── */}
      <div
        className="flex flex-col border-r border-white/10 overflow-hidden bg-[#111111]"
        style={{ width: `${100 - cartPanelWidth}%` }}
      >

        {/* Top Control Bar: Order Types, Menu Selector & Quick Filters */}
        <div className="p-3 border-b border-white/10 space-y-2.5 bg-[#161616]">
          
          {/* Row 1: Order Type Switcher & Customer Menu Trigger */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 flex-1">
              {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map((type, idx) => {
                const Icon = ORDER_TYPE_ICONS[type]
                const shortcutKey = `F${idx + 1}`
                return (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-1 shadow-sm',
                      orderType === type
                        ? 'bg-gradient-to-r from-[#B91C1C] to-[#DC2626] text-white ring-2 ring-red-500/30'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon size={14} />
                    <span>{ORDER_TYPE_LABELS[type]}</span>
                    <span className="text-[10px] opacity-40 font-mono hidden sm:inline">({shortcutKey})</span>
                  </button>
                )
              })}
            </div>

            {/* Customer Menu QR Button for Counter Staff */}
            <button
              onClick={() => setShowCustomerMenuModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition shadow-sm"
              title="Show Digital QR Menu to Customer at Counter"
            >
              <QrCode size={14} />
              <span>Customer Menu</span>
            </button>

            <button
              onClick={() => setShowHotkeysModal(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
              title="Keyboard Shortcuts"
            >
              <HelpCircle size={15} />
            </button>
          </div>

          {/* Row 2: Menu Type Selector for Customer (Combos / Bestsellers / All Day) */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-none">
            <span className="text-[10px] uppercase font-black text-white/40 px-2 shrink-0">
              Menu Type:
            </span>
            {MENU_VIEW_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isSelected = activeMenuView === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setActiveMenuView(opt.id)}
                  className={cn(
                    'flex-none px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap',
                    isSelected
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon size={12} className={isSelected ? 'text-white' : 'text-red-400'} />
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>

          {/* Dine-In Live Table Quick Selector Bar (Shown when Dine-In active) */}
          {orderType === 'dine_in' && (
            <div className="p-2 rounded-xl bg-black/40 border border-white/10 space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] font-semibold text-white/60 px-1">
                <span className="flex items-center gap-1">
                  <UtensilsCrossed size={12} className="text-[#FCA5A5]" />
                  Select Active Table:
                </span>
                <Link
                  href="/admin/pos/tables"
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 font-bold text-[11px]"
                >
                  Interactive Floor Plan <ChevronRight size={12} />
                </Link>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {tables.map((t) => {
                  const isSelected = tableId === t.id
                  const isOccupied = t.status === 'occupied'
                  const isBilling = t.status === 'billing'
                  const isReserved = t.status === 'reserved'

                  return (
                    <button
                      key={t.id}
                      onClick={() => setTableId(isSelected ? '' : t.id)}
                      className={cn(
                        'flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border',
                        isSelected
                          ? 'bg-[#B91C1C] border-red-500 text-white ring-2 ring-red-500/40 shadow-lg'
                          : isOccupied
                          ? 'bg-rose-950/40 border-rose-600/50 text-rose-300 hover:bg-rose-900/50'
                          : isBilling
                          ? 'bg-purple-950/40 border-purple-600/50 text-purple-300 hover:bg-purple-900/50'
                          : isReserved
                          ? 'bg-amber-950/40 border-amber-600/50 text-amber-300 hover:bg-amber-900/50'
                          : 'bg-white/5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30'
                      )}
                    >
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        isSelected ? 'bg-white' : isOccupied ? 'bg-rose-500' : isBilling ? 'bg-purple-500' : isReserved ? 'bg-amber-500' : 'bg-emerald-500'
                      )} />
                      <span>{t.table_number}</span>
                      <span className="text-[10px] opacity-60">({t.capacity}p)</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Search & Veg Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items… (press / to focus)"
                className="w-full pl-8 pr-8 py-2 bg-black/40 border border-white/10 rounded-xl text-sm placeholder:text-white/30 text-white focus:outline-none focus:ring-1 focus:ring-[#B91C1C] transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={() => setVegOnlyFilter(!vegOnlyFilter)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5',
                vegOnlyFilter
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              )}
            >
              <span className="w-2.5 h-2.5 rounded-sm border border-emerald-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </span>
              Veg Only
            </button>
          </div>

          {/* Category Scroll Bar */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                activeCategory === 'all'
                  ? 'bg-white text-black shadow'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              )}
            >
              All Items ({products.length})
            </button>
            {categories.map((c) => {
              const count = products.filter((p) => matchProductToCategory(p, c)).length
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={cn(
                    'flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                    activeCategory === c.id
                      ? 'bg-white text-black shadow'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  )}
                >
                  {c.name} {count > 0 ? `(${count})` : ''}
                </button>
              )
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3.5">
          {loadingCatalog ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/40">
              <Loader2 size={28} className="animate-spin mb-2 text-red-500" />
              <p className="text-xs">Loading menu catalog…</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/30">
              <Search size={36} className="mb-2 text-white/20" />
              <p className="text-sm font-semibold">No items found in selected menu</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('all')
                  setActiveMenuView('all')
                  setVegOnlyFilter(false)
                }}
                className="mt-2 text-xs text-red-400 hover:underline font-bold"
              >
                Reset to Full Menu
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product: Product) => {
                const prodImg = resolveProductImage(product)
                return (
                  <div
                    key={product.id}
                    onClick={() => fastAddToCart(product)}
                    className={cn(
                      'group relative flex flex-col justify-between rounded-2xl border transition-all text-left cursor-pointer select-none overflow-hidden',
                      product.is_available
                        ? 'bg-gradient-to-b from-white/[0.07] to-white/[0.02] border-white/10 hover:border-red-500/60 hover:from-white/[0.12] hover:shadow-xl hover:shadow-red-950/30 active:scale-[0.98]'
                        : 'bg-white/2 border-white/5 opacity-50'
                    )}
                  >
                    {/* Visual Food Thumbnail with Overlay Badges */}
                    <div className="relative w-full h-28 bg-black/60 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={prodImg}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-108"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FOOD_IMAGES['hero-pizza'] || ''
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      {/* Top Left: Veg / Non-Veg Indicator */}
                      <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/15 flex items-center gap-1 shadow-sm">
                        <span className={cn('w-2.5 h-2.5 rounded-sm border flex items-center justify-center', product.is_veg ? 'border-green-500' : 'border-red-500')}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', product.is_veg ? 'bg-green-500' : 'bg-red-500')} />
                        </span>
                        <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">
                          {product.is_veg ? 'Veg' : 'Non-Veg'}
                        </span>
                      </div>

                      {/* Top Right: Quick 86'd stock toggle */}
                      <button
                        onClick={(e) => handleToggle86(product, e)}
                        className={cn(
                          'absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-md transition backdrop-blur-md shadow-sm',
                          product.is_available
                            ? 'bg-black/70 text-white/40 hover:text-red-300 hover:bg-red-950/90 border border-white/15'
                            : 'bg-red-600 text-white border border-red-500'
                        )}
                        title={product.is_available ? "Click to 86 (mark out of stock)" : "Click to mark Available"}
                      >
                        {product.is_available ? "86" : "OUT"}
                      </button>

                      {/* Bottom-left Price inside image container for high visibility */}
                      <div className="absolute bottom-1.5 left-2">
                        <span className="text-sm font-black text-amber-300 drop-shadow-md">
                          ₹{product.price}
                        </span>
                      </div>
                    </div>

                    {/* Card Body: Title & Action Row */}
                    <div className="p-2.5 flex flex-col justify-between flex-1 gap-2 bg-[#171717]">
                      <h4 className="text-xs font-bold text-white/95 leading-snug line-clamp-2 min-h-[2rem]">
                        {product.name}
                      </h4>

                      <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                        <span className="text-[10px] text-white/40 font-medium">
                          {product.is_available ? 'In Stock' : 'Unavailable'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Customize button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openCustomizer(product)
                            }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition"
                            title="Customize crust, size & toppings"
                          >
                            <SlidersHorizontal size={12} />
                          </button>

                          {/* Fast add button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              fastAddToCart(product)
                            }}
                            disabled={!product.is_available}
                            className="w-7 h-7 rounded-lg bg-[#B91C1C] hover:bg-[#DC2626] text-white flex items-center justify-center font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── RESIZABLE SPLITTER DRAG HANDLE ──────────────────────────────── */}
      <div
        onMouseDown={handleSplitterMouseDown}
        onTouchStart={handleSplitterTouchStart}
        onDoubleClick={() => {
          setCartPanelWidth(40)
          try { localStorage.setItem('pos_cart_panel_width', '40') } catch {}
          toast.info('Layout reset to default 60/40 ratio')
        }}
        className={cn(
          'relative z-30 flex-none w-2 hover:w-3 -mx-1 flex items-center justify-center cursor-col-resize select-none transition-all group',
          isDraggingSplitter ? 'w-3 bg-red-600/40' : 'bg-transparent hover:bg-red-500/20'
        )}
        title="Drag left/right to resize menu & cart panel. Double-click to reset."
      >
        {/* Visual Grip Handle */}
        <div
          className={cn(
            'w-1 rounded-full transition-all flex flex-col items-center justify-center gap-1 shadow-sm',
            isDraggingSplitter
              ? 'h-20 bg-[#EF4444] shadow-red-500/60 ring-2 ring-red-500/30'
              : 'h-12 bg-white/25 group-hover:bg-red-400 group-hover:h-16'
          )}
        >
          <span className="w-0.5 h-0.5 rounded-full bg-white/90" />
          <span className="w-0.5 h-0.5 rounded-full bg-white/90" />
          <span className="w-0.5 h-0.5 rounded-full bg-white/90" />
        </div>
      </div>

      {/* ─── RIGHT PANEL: Live Order, Running Ticket & Billing ───────────── */}
      <div
        className="flex flex-col bg-[#141414] overflow-hidden border-l border-white/10"
        style={{ width: `${cartPanelWidth}%` }}
      >

        {/* Panel Header: Mode, Table Info & Shift Details */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
              {(() => {
                const Icon = ORDER_TYPE_ICONS[orderType]
                return <Icon size={16} />
              })()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-white">
                  {ORDER_TYPE_LABELS[orderType]}
                </h3>
                {tableId && orderType === 'dine_in' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/80 border border-red-600/50 text-red-300 font-bold">
                    Table {tables.find((t) => t.id === tableId)?.table_number}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/40">
                {cart.reduce((s, l) => s + l.quantity, 0)} items in ticket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Shift Pill */}
            <Link
              href="/admin/pos/shifts"
              className={cn(
                'text-[10px] px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 border',
                shiftOpen
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', shiftOpen ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse')} />
              {shiftOpen ? 'Active Shift' : 'No Shift'}
            </Link>

            <Link
              href="/admin/kitchen"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
              title="Kitchen Display System (KDS)"
            >
              <ChefHat size={15} />
            </Link>

            <Link
              href="/admin/pos/receipts"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
              title="Receipts & Tax Invoices"
            >
              <Receipt size={15} />
            </Link>

            <button
              onClick={printCurrentPOSReceipt}
              disabled={cart.length === 0 && !lastOrderId}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/60 hover:text-white transition"
              title="Print Current Bill / Estimate Receipt"
            >
              <Printer size={15} />
            </button>
          </div>
        </div>

        {/* Running Ticket Warning / Notice for Occupied Table */}
        {activeTableRunningOrder && (
          <div className="px-4 py-2 bg-purple-950/40 border-b border-purple-600/40 flex items-center justify-between text-xs text-purple-200">
            <span className="flex items-center gap-1.5 font-semibold">
              <Clock size={13} className="text-purple-400" />
              Active Table Ticket (#{activeTableRunningOrder.kot_number || 'Running'})
            </span>
            <span className="font-mono font-bold text-amber-300">
              Running: ₹{Number(activeTableRunningOrder.total).toFixed(2)}
            </span>
          </div>
        )}

        {/* Dynamic Context Fields by Order Type */}
        <div className="px-4 py-2.5 border-b border-white/10 space-y-2 bg-[#171717] text-xs">
          
          {/* Dine-In Extra Fields: Waiter & Guests */}
          {orderType === 'dine_in' && (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
                <Users size={12} className="text-white/40" />
                <span className="text-white/60 text-[11px]">Server:</span>
                <select
                  value={selectedWaiterId}
                  onChange={(e) => setSelectedWaiterId(e.target.value)}
                  className="bg-transparent text-white font-medium text-[11px] focus:outline-none flex-1"
                >
                  <option value="" className="bg-[#1C1917]">Assign Staff…</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#1C1917]">
                      {s.full_name || s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                <span className="text-white/40 text-[11px]">Guests:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-8 bg-transparent text-white font-black text-center text-xs focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Takeaway Extra Fields: Prep Time & Packaging */}
          {(orderType === 'takeaway' || orderType === 'pickup') && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px] text-white/60">
                <Clock size={12} className="text-amber-400" />
                <span>Prep Time:</span>
                {[10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setPrepTimeEstimate(mins)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold border transition',
                      prepTimeEstimate === mins
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                    )}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPackagingCharge(!packagingCharge)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1',
                  packagingCharge
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                )}
              >
                <Check size={10} className={packagingCharge ? 'opacity-100' : 'opacity-20'} />
                Bag (+₹15)
              </button>
            </div>
          )}

          {/* Delivery Extra Fields: Address */}
          {orderType === 'delivery' && (
            <div className="space-y-1.5">
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Delivery Address (Street, House/Flat No.)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
              />
              <input
                value={deliveryLandmark}
                onChange={(e) => setDeliveryLandmark(e.target.value)}
                placeholder="Landmark / Area (e.g. Civil Lines, Allapur)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
              />
            </div>
          )}

          {/* Common Customer Fields */}
          <div className="flex gap-2">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name (optional)"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone (10-digit)"
              className="w-32 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Live Cart Lines */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/30">
              <ShoppingBag size={36} className="mb-2 text-white/15" />
              <p className="text-sm font-semibold">Cart is currently empty</p>
              <p className="text-xs text-white/20 mt-0.5">Select menu items to build ticket</p>
            </div>
          ) : (
            cart.map((line) => {
              const lineImg = resolveProductImage({ id: line.productId, name: line.productName })
              return (
                <div key={line.lineId} className="p-2.5 rounded-xl hover:bg-white/3 transition group space-y-1.5">
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Item Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10 relative mt-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lineImg}
                        alt={line.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FOOD_IMAGES['hero-pizza'] || ''
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {line.productName}
                        </span>
                        {line.variantSize && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/70 font-semibold">
                            {line.variantSize}
                          </span>
                        )}
                        {line.crust && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                            {line.crust}
                          </span>
                        )}
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded font-bold uppercase',
                          line.course === 'Starters' ? 'bg-blue-900/50 text-blue-300' :
                          line.course === 'Beverages' ? 'bg-teal-900/50 text-teal-300' :
                          line.course === 'Dessert' ? 'bg-purple-900/50 text-purple-300' : 'bg-white/10 text-white/60'
                        )}>
                          {line.course}
                        </span>
                        {line.isHeld && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-700 font-bold">
                            ⛔ HELD
                          </span>
                        )}
                      </div>

                      {/* Modifiers / Add-ons pills */}
                      {line.modifiers && line.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {line.modifiers.map((mod, idx) => (
                            <span key={idx} className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-600/30">
                              +{mod.name} (₹{mod.price})
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Special instructions */}
                      {line.notes && (
                        <p className="text-[10px] text-amber-400/90 italic mt-0.5">
                          Note: {line.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-amber-300">
                        ₹{(line.unitPrice * line.quantity).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-white/40">
                        ₹{line.unitPrice} ea
                      </p>
                    </div>
                  </div>

                  {/* Stepper & Line Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleHoldCourse(line.lineId)}
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded transition',
                          line.isHeld
                            ? 'bg-red-900/80 text-white'
                            : 'bg-white/5 hover:bg-white/10 text-white/50'
                        )}
                        title="Hold this item from firing immediately on KOT"
                      >
                        {line.isHeld ? 'Unhold' : 'Hold Course'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQty(line.lineId, -1)}
                          className="w-5 h-5 rounded bg-white/5 hover:bg-white/20 flex items-center justify-center text-white transition"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{line.quantity}</span>
                        <button
                          onClick={() => updateQty(line.lineId, 1)}
                          className="w-5 h-5 rounded bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeLine(line.lineId)}
                        className="text-white/20 hover:text-red-400 transition p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Discount & Promo Bar */}
        {cart.length > 0 && (
          <div className="px-4 py-2 border-t border-white/10 bg-[#161616] space-y-1.5">
            <div className="flex items-center gap-2">
              <Tag size={13} className="text-white/40" />
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="flat">₹ Flat</option>
                <option value="percentage">% Off</option>
              </select>
              <input
                type="number"
                min={0}
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder="Discount"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Quick discount chips */}
            <div className="flex gap-1">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    setDiscountType('percentage')
                    setDiscountValue(pct)
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/60"
                >
                  {pct}%
                </button>
              ))}
              <button
                onClick={() => {
                  setDiscountType('flat')
                  setDiscountValue(0)
                }}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-red-400"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Running Totals Calculation */}
        {cart.length > 0 && (
          <div className="px-4 py-2.5 border-t border-white/10 bg-[#191919] space-y-1 text-xs">
            <div className="flex justify-between text-white/60">
              <span>Subtotal</span>
              <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Discount Applied</span>
                <span className="font-mono">−₹{totals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-white/50">
              <span>GST (5% — CGST 2.5% + SGST 2.5%)</span>
              <span className="font-mono">₹{totals.tax.toFixed(2)}</span>
            </div>
            {packagingCharge && (orderType === 'takeaway' || orderType === 'pickup') && (
              <div className="flex justify-between text-amber-300">
                <span>Packaging & Carry Bag</span>
                <span className="font-mono">+₹15.00</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-white border-t border-white/10 pt-1.5">
              <span>Total Payable</span>
              <span className="font-mono text-amber-300">₹{totals.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* ── Payment Settlement Panel (Always require payment before placing order) ── */}
        {cart.length > 0 && paymentStep !== 'success' && (
          <div className="px-4 py-3 border-t border-white/10 bg-[#161616] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase text-white/70 tracking-wider">
                Select Customer Payment Method
              </p>
              <span className="text-[11px] font-bold text-amber-300 font-mono">
                ₹{totals.total.toFixed(2)}
              </span>
            </div>

            {/* Tender Mode Tabs (Cash, UPI QR, Online Gateway / Razorpay, Card) */}
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { type: 'cash', icon: Banknote, label: 'Cash' },
                { type: 'gateway_qr', icon: QrCode, label: 'UPI QR' },
                { type: 'card', icon: CreditCard, label: 'Card' },
                { type: 'razorpay', icon: CreditCard, label: 'Gateway' },
              ] as const).map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setPaymentMode(type as any)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-bold transition-all text-center',
                    paymentMode === type
                      ? 'border-red-500 bg-red-600/20 text-white ring-1 ring-red-500/40 shadow-sm'
                      : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* 1. Cash Tender Presets */}
            {paymentMode === 'cash' && (
              <div className="space-y-2">
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    onClick={() => setCashTendered(totals.total.toString())}
                    className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-amber-300"
                  >
                    Exact (₹{totals.total.toFixed(0)})
                  </button>
                  {CASH_PRESETS.filter((p) => p >= totals.total).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCashTendered(preset.toString())}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[11px] font-bold text-white/80"
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={`Enter cash given by customer (₹${totals.total.toFixed(2)})`}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-red-500"
                  autoFocus
                />

                {cashTendered && parseFloat(cashTendered) >= totals.total && (
                  <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center font-bold text-emerald-300 text-sm">
                    💵 Return Change: ₹{(parseFloat(cashTendered) - totals.total).toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* 2. Customer Scan-to-Pay Dynamic UPI QR Code */}
            {paymentMode === 'gateway_qr' && (
              <div className="p-3 rounded-2xl bg-black/50 border border-white/15 text-center space-y-2.5">
                <div className="flex items-center justify-between text-xs text-white/70 border-b border-white/10 pb-1.5 font-bold">
                  <span>Customer Scan-to-Pay QR</span>
                  <span className="text-amber-300 font-mono">₹{totals.total.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="p-2 rounded-xl bg-white shadow-lg inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dynamicQrImgUrl}
                      alt="UPI Payment QR"
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                  <div className="text-left space-y-1 text-xs">
                    <p className="text-white/80 font-bold">GPay • PhonePe • Paytm</p>
                    <p className="text-[11px] text-white/40">VPA: <span className="font-mono text-white/70">{activeUpiId}</span></p>
                    <p className="text-[11px] text-emerald-400 font-semibold">✓ Exact Amount Embedded</p>
                    <p className="text-[10px] text-white/30">Ask customer to scan with any UPI app</p>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-white/10 text-left">
                  <input
                    type="text"
                    value={upiReference}
                    onChange={(e) => setUpiReference(e.target.value)}
                    placeholder="Optional: UPI Ref / UTR # (e.g. 423891002341)"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* 3. Card Tender (EDC Swiping Terminal or Online Gateway) */}
            {paymentMode === 'card' && (
              <div className="p-3 rounded-2xl bg-black/50 border border-white/15 space-y-2.5">
                <div className="flex items-center justify-between text-xs border-b border-white/10 pb-1.5 font-bold">
                  <div className="flex items-center gap-1.5 text-white">
                    <CreditCard size={14} className="text-blue-400" />
                    <span>Credit / Debit Card Payment</span>
                  </div>
                  <span className="text-amber-300 font-mono">₹{totals.total.toFixed(2)}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">
                    EDC Machine Auth Code / Card Last 4 Digits (Optional):
                  </label>
                  <input
                    type="text"
                    value={cardReference}
                    onChange={(e) => setCardReference(e.target.value)}
                    placeholder="e.g. Auth #849201 or Visa 4821"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-white/40">
                    Swipe or tap customer card on your counter POS machine (Pine Labs / Paytm / Mosambee), then click Confirm below.
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-white/50">Need online card processing instead?</span>
                  <button
                    onClick={launchRazorpayModal}
                    disabled={gatewayStatus === 'loading'}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[10px] font-bold flex items-center gap-1 transition"
                  >
                    {gatewayStatus === 'loading' ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                    Launch Online Card Modal
                  </button>
                </div>
              </div>
            )}

            {/* 4. Razorpay Payment Gateway Modal / Link Trigger */}
            {paymentMode === 'razorpay' && (
              <div className="p-3 rounded-2xl bg-gradient-to-b from-red-950/30 to-black/40 border border-red-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <CreditCard size={14} className="text-red-400" />
                    <span>Online Payment Gateway</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/50 text-red-300 font-bold">
                    Cards / Netbanking / Wallets
                  </span>
                </div>

                <p className="text-[11px] text-white/60">
                  Accept customer payment via Credit/Debit Cards, Net Banking, or send a payment link directly to customer.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={launchRazorpayModal}
                    disabled={gatewayStatus === 'loading'}
                    className="py-2.5 px-3 rounded-xl bg-[#B91C1C] hover:bg-[#DC2626] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow"
                  >
                    {gatewayStatus === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                    Launch Gateway on POS
                  </button>

                  <button
                    onClick={() => {
                      if (!customerPhone) {
                        toast.error('Please enter customer phone number first')
                        return
                      }
                      const paymentLink = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(`Hi ${customerName || 'Customer'}, please complete your payment of ₹${totals.total.toFixed(2)} for Wood-Fired Pizza order at Pizza Expert Prayagraj: ${window.location.origin}/checkout`)}`
                      window.open(paymentLink, '_blank')
                      toast.success('WhatsApp payment message initiated!')
                    }}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <MessageSquare size={13} />
                    Send WhatsApp Link
                  </button>
                </div>
              </div>
            )}

            {/* Settle Action Button (Only places order upon verified payment) */}
            {paymentMode !== 'razorpay' ? (
              <button
                onClick={processPayment}
                disabled={
                  placing ||
                  (paymentMode === 'cash' && parseFloat(cashTendered || '0') < totals.total)
                }
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-green-950/40 active:scale-98"
              >
                {placing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {paymentMode === 'cash'
                  ? `💵 Receive Cash (₹${totals.total.toFixed(2)}) & Place Order`
                  : paymentMode === 'card'
                  ? `💳 Confirm Card & Place Order (₹${totals.total.toFixed(2)})`
                  : `📱 Confirm UPI & Place Order (₹${totals.total.toFixed(2)})`}
              </button>
            ) : (
              <button
                onClick={launchRazorpayModal}
                disabled={placing || gatewayStatus === 'loading'}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-red-950/40 active:scale-98"
              >
                {gatewayStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                Pay via Online Gateway & Place Order (₹{totals.total.toFixed(2)})
              </button>
            )}

            {/* Secondary Controls (Hold order / Clear cart) */}
            <div className="flex gap-2 pt-1 border-t border-white/10">
              <button
                onClick={holdCurrentOrder}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                title="Hold draft order without losing items (F4)"
              >
                <Pause size={13} /> Hold Order (F4)
              </button>
              <button
                onClick={clearCart}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-red-950/40 text-white/60 hover:text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 size={13} /> Clear Cart
              </button>
            </div>
          </div>
        )}

        {/* ── Success Banner ── */}
        {paymentStep === 'success' && (
          <div className="p-6 border-t border-white/10 text-center space-y-3 bg-[#111111] animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
              <Check size={28} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Payment Received & Order Placed!</h3>
              <p className="text-xs text-white/50 mt-0.5">Order #{lastOrderId ? lastOrderId.slice(-6).toUpperCase() : 'COUNTER'} • {lastKotNumber || 'Receipt Ready'}</p>
            </div>

            {/* Direct Instant Print Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={printCurrentPOSReceipt}
                className="py-3 px-3 rounded-xl bg-[#B91C1C] hover:bg-[#DC2626] text-white text-xs font-black flex items-center justify-center gap-1.5 transition shadow-lg shadow-red-950/40 active:scale-95"
              >
                <Printer size={15} /> Print Receipt (80mm)
              </button>
              <button
                onClick={printCurrentKOT}
                className="py-3 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <ChefHat size={15} className="text-amber-400" /> Print KOT
              </button>
            </div>

            <div className="flex gap-2 justify-center pt-1">
              <Link
                href={`/admin/pos/receipts?orderId=${lastOrderId}`}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Receipt size={13} /> View / A4 Invoice
              </Link>
              <button
                onClick={clearCart}
                className="flex-1 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/40 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5 transition shadow"
              >
                <Plus size={13} /> Next Order
              </button>
            </div>
          </div>
        )}

        {cart.length === 0 && paymentStep === 'idle' && (
          <div className="px-4 py-3 border-t border-white/5 flex gap-2">
            <Link
              href="/admin/pos/held"
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw size={13} /> Resume Held Orders
            </Link>
            <Link
              href="/admin/pos/orders"
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Clock size={13} /> Active Counter Orders
            </Link>
          </div>
        )}
      </div>

      {/* ─── MODAL: Item Customizer (Sizes, Crust, Toppings & Courses) ────── */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#181818] border border-white/15 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl overflow-hidden bg-black/60 shrink-0 border border-white/10 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveProductImage(customizingProduct)}
                    alt={customizingProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FOOD_IMAGES['hero-pizza'] || ''
                    }}
                  />
                  <div className="absolute top-1 left-1 bg-black/80 px-1 py-0.5 rounded border border-white/10 flex items-center justify-center">
                    <span className={cn('w-2 h-2 rounded-sm border flex items-center justify-center', customizingProduct.is_veg ? 'border-green-500' : 'border-red-500')}>
                      <span className={cn('w-1 h-1 rounded-full', customizingProduct.is_veg ? 'bg-green-500' : 'bg-red-500')} />
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Customize {customizingProduct.name}
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">Select size, gourmet crust, toppings and course</p>
                </div>
              </div>

              <button
                onClick={() => setCustomizingProduct(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* 1. Size Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                1. Select Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setCustomSize(size)}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs font-bold text-left transition',
                      customSize.id === size.id
                        ? 'border-red-500 bg-red-600/20 text-white ring-1 ring-red-500/40'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                  >
                    <div>{size.name}</div>
                    <div className="text-[11px] text-amber-300 font-mono mt-0.5">
                      {size.priceDelta === 0 ? 'Included' : `+₹${size.priceDelta}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Crust Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                2. Select Crust
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CRUSTS.map((crust) => (
                  <button
                    key={crust.id}
                    onClick={() => setCustomCrust(crust)}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs font-bold text-left transition',
                      customCrust.id === crust.id
                        ? 'border-red-500 bg-red-600/20 text-white ring-1 ring-red-500/40'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                  >
                    <div>{crust.name}</div>
                    <div className="text-[11px] text-amber-300 font-mono mt-0.5">
                      {crust.priceDelta === 0 ? 'Standard' : `+₹${crust.priceDelta}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Extra Toppings & Add-ons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                3. Extra Toppings
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                {TOPPINGS.map((top) => {
                  const isChecked = customToppings.some((t) => t.id === top.id)
                  return (
                    <button
                      key={top.id}
                      onClick={() => {
                        if (isChecked) {
                          setCustomToppings(customToppings.filter((t) => t.id !== top.id))
                        } else {
                          setCustomToppings([...customToppings, { id: top.id, name: top.name, price: top.price }])
                        }
                      }}
                      className={cn(
                        'px-2.5 py-1.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between',
                        isChecked
                          ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      )}
                    >
                      <span className="truncate">{top.name}</span>
                      <span className="text-[10px] text-amber-300 font-mono">+₹{top.price}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 4. Course & Quick Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                  4. Course & Instructions
                </label>
                <div className="flex gap-1">
                  {(['Starters', 'Mains', 'Beverages', 'Dessert'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCustomCourse(c)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold transition',
                        customCourse === c
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 text-white/40 hover:text-white'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick instruction chips */}
              <div className="flex flex-wrap gap-1">
                {INSTRUCTION_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setCustomNotes((prev) => (prev ? `${prev}, ${tag}` : tag))
                    }}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-white/70"
                  >
                    +{tag}
                  </button>
                ))}
              </div>

              <input
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Custom special instructions for kitchen…"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Modal Bottom: Price Calculation & Confirm Button */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <div>
                <span className="text-[10px] text-white/50 block">Item Unit Price</span>
                <span className="text-base font-black text-amber-300">
                  ₹{(customizingProduct.price + customSize.priceDelta + customCrust.priceDelta + customToppings.reduce((s, t) => s + t.price, 0)).toFixed(2)}
                </span>
              </div>

              <button
                onClick={addCustomizedItem}
                className="px-6 py-2.5 rounded-xl bg-[#B91C1C] hover:bg-[#DC2626] text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
              >
                <Plus size={14} /> Add to Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Customer-Facing QR Menu (For Counter Staff to Display) ─── */}
      {showCustomerMenuModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#181818] border border-amber-500/30 shadow-2xl p-6 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="text-left">
                <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                  <QrCode size={18} className="text-amber-400" />
                  Customer Digital Menu
                </h3>
                <p className="text-xs text-white/50">Point phone camera to browse interactive menu & photos</p>
              </div>
              <button
                onClick={() => setShowCustomerMenuModal(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* QR Code Graphic */}
            <div className="p-4 bg-white rounded-2xl shadow-xl inline-block mx-auto border-4 border-amber-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={menuQrImgUrl}
                alt="Customer Digital Menu QR"
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-bold text-white">
                {settings.businessName || 'Pizza Expert Prayagraj'}
              </p>
              <p className="text-xs text-white/60 font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 truncate">
                {customerMenuUrl}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(customerMenuUrl)
                  toast.success('Menu link copied to clipboard!')
                }}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Copy size={13} /> Copy Menu Link
              </button>

              <button
                onClick={() => {
                  if (!customerPhone) {
                    toast.error('Enter customer phone number in ticket panel first')
                    return
                  }
                  const link = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(`Welcome to ${settings.businessName || 'Pizza Expert'}! Browse our full digital menu & live specials here: ${customerMenuUrl}`)}`
                  window.open(link, '_blank')
                  toast.success('WhatsApp menu link dispatched!')
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <MessageSquare size={13} /> Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Hotkeys Help ────────────────────────────────────────── */}
      {showHotkeysModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#181818] border border-white/15 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <HelpCircle size={16} className="text-red-400" />
                POS Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowHotkeysModal(false)} className="text-white/50 hover:text-white">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/70">Focus Search Bar</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">/</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/70">Dine-In Mode</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">F1</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/70">Takeaway Mode</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">F2</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/70">Delivery Mode</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">F3</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/70">Hold Current Order</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">F4</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/70">Fire KOT & Settle</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">F8</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/70">Close Modals / Clear</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">ESC</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowHotkeysModal(false)}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
