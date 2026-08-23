'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { getActiveShift } from '@/app/actions/cashierSessions'
import {
  Search, Plus, Minus, Trash2, Send, CreditCard, Banknote, Smartphone,
  Users, ChevronRight, Hash, FileText, Pause, RotateCcw, X, Check,
  ShoppingBag, Clock, AlertTriangle, Loader2, UtensilsCrossed, Layers,
  Tag, LogOut, Printer, Sparkles, SlidersHorizontal, ArrowRight,
  HelpCircle, Eye, RefreshCw, ChefHat, Bike, Receipt, CheckCircle2,
  Percent, ShieldAlert, Coffee
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  price: number
  category_id: string
  is_available: boolean
  is_veg: boolean
  image_url?: string
}

interface Category {
  id: string
  name: string
  slug: string
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
  // ── State: Catalog ──
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
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
  const [paymentMode, setPaymentMode] = useState<POSPaymentTender['tenderType'] | 'split'>('cash')
  const [splitCash, setSplitCash] = useState('')
  const [splitUpi, setSplitUpi] = useState('')
  const [splitCard, setSplitCard] = useState('')
  const [equalSplitCount, setEqualSplitCount] = useState(2)
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
  const [activeTableRunningOrder, setActiveTableRunningOrder] = useState<any | null>(null)

  // ── State: Tables & Staff ──
  const [tables, setTables] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Load Catalog ──────────────────────────────────────────────────────────
  const loadCatalog = useCallback(async () => {
    const supabase = createClient()
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('products').select('id, name, price, category_id, is_available, is_veg, image_url').order('sort_order'),
    ])
    setCategories(cats || [])
    setProducts(prods || [])
    setLoadingCatalog(false)
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  // ── Load Tables & Waiters ─────────────────────────────────────────────────
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

  // ── Recalculate totals when cart changes ──────────────────────────────────
  useEffect(() => {
    if (cart.length === 0) {
      setTotals({ subtotal: 0, discount: 0, tax: 0, total: 0 })
      return
    }
    const items: POSCartItem[] = cart.map((l) => ({
      productId: l.productId,
      productName: `${l.productName}${l.variantSize ? ` (${l.variantSize})` : ''}${l.crust ? ` - ${l.crust}` : ''}`,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      modifiers: l.modifiers,
    }))

    calculatePOSTotal(items, discountValue, discountType).then((res) => {
      let packagingExtra = packagingCharge && (orderType === 'takeaway' || orderType === 'pickup') ? 15 : 0
      setTotals({
        ...res,
        total: Math.round((res.total + packagingExtra) * 100) / 100
      })
    })
  }, [cart, discountValue, discountType, packagingCharge, orderType])

  // ── Keyboard Shortcuts (Section 4.1 of Guide) ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'

      if (e.key === '/' && !isInput) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape') {
        if (customizingProduct) setCustomizingProduct(null)
        if (showHotkeysModal) setShowHotkeysModal(false)
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
        if (cart.length > 0 && paymentStep === 'idle') {
          sendToKitchen()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [customizingProduct, showHotkeysModal, searchQuery, cart, paymentStep])

  // ── Filtered Products ─────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesVeg = !vegOnlyFilter || p.is_veg
    return matchesCategory && matchesSearch && matchesVeg
  })

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
    localStorage.removeItem('pos_active_cart_draft')
  }

  // ── Send to Kitchen (KOT) ─────────────────────────────────────────────────
  const sendToKitchen = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    if (!shiftOpen) return toast.error('Please open a cashier shift first')
    if (orderType === 'dine_in' && !tableId) {
      return toast.error('Please select a Table for Dine-In orders')
    }

    setPlacing(true)
    try {
      const orderPayload: CreatePOSOrderPayload = {
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
        customerName: customerName || (orderType === 'dine_in' ? `Table ${tables.find(t => t.id === tableId)?.table_number || ''}` : 'Walk-in Customer'),
        customerPhone: customerPhone || undefined,
        discountValue: discountValue || undefined,
        discountType: discountType || undefined,
        notes: `${prepTimeEstimate ? `⏱ Est. Prep: ${prepTimeEstimate}m | ` : ''}${deliveryAddress ? `📍 Address: ${deliveryAddress} (${deliveryLandmark}) | ` : ''}${orderNotes || ''}`.trim(),
        shiftId,
        terminalId,
        cashierId,
      }

      const result = await createPOSOrder(orderPayload)
      if (!result.success) throw new Error(result.error)

      setLastOrderId(result.orderId!)
      setLastKotNumber(result.kotNumber!)
      toast.success(`🚀 KOT Fired Successfully! #${result.kotNumber}`)
      setPaymentStep('payment')
    } catch (err: any) {
      toast.error(err.message || 'Failed to fire KOT')
    } finally {
      setPlacing(false)
    }
  }

  // ── Process Payment ───────────────────────────────────────────────────────
  const processPayment = async () => {
    if (!lastOrderId) return

    setPlacing(true)
    try {
      let tenders: POSPaymentTender[] = []

      if (paymentMode === 'cash') {
        const tendered = parseFloat(cashTendered) || totals.total
        const change = Math.max(0, tendered - totals.total)
        tenders = [{ tenderType: 'cash', amount: tendered, changeGiven: change }]
      } else if (paymentMode === 'split') {
        const c = parseFloat(splitCash) || 0
        const u = parseFloat(splitUpi) || 0
        const card = parseFloat(splitCard) || 0
        if (c + u + card < totals.total) {
          throw new Error(`Total split tender (₹${(c + u + card).toFixed(2)}) is less than bill amount (₹${totals.total.toFixed(2)})`)
        }
        if (c > 0) tenders.push({ tenderType: 'cash', amount: c, changeGiven: Math.max(0, c + u + card - totals.total) })
        if (u > 0) tenders.push({ tenderType: 'upi', amount: u })
        if (card > 0) tenders.push({ tenderType: 'card', amount: card })
      } else {
        tenders = [{ tenderType: paymentMode, amount: totals.total }]
      }

      const result = await processPOSPayment({
        orderId: lastOrderId,
        shiftId,
        tenders,
        orderTotal: totals.total,
      })

      if (!result.success) throw new Error(result.error)

      toast.success(
        paymentMode === 'cash'
          ? `✅ Bill Settled! Change: ₹${result.changeAmount?.toFixed(2)}`
          : '✅ Payment recorded & Bill closed!'
      )
      setPaymentStep('success')

      // Refresh table floor layout
      loadTables()
    } catch (err: any) {
      toast.error(err.message || 'Payment processing failed')
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

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#0A0A0A] text-white font-sans">

      {/* ─── LEFT PANEL: Menu & Catalog (58% width) ────────────────────── */}
      <div className="flex flex-col w-[58%] border-r border-white/10 overflow-hidden bg-[#111111]">

        {/* Top Control Bar: Order Types & Quick Filters */}
        <div className="p-3 border-b border-white/10 space-y-2.5 bg-[#161616]">
          
          {/* Order Type Toggle (F1, F2, F3) */}
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

            <button
              onClick={() => setShowHotkeysModal(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
              title="Keyboard Shortcuts"
            >
              <HelpCircle size={15} />
            </button>
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
              const count = products.filter((p) => p.category_id === c.id).length
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
                  {c.name} ({count})
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
              <p className="text-sm font-semibold">No items matched your search</p>
              <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); setVegOnlyFilter(false) }} className="mt-2 text-xs text-red-400 hover:underline">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => fastAddToCart(product)}
                  className={cn(
                    'group relative flex flex-col justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer select-none',
                    product.is_available
                      ? 'bg-gradient-to-b from-white/5 to-white/2 border-white/10 hover:border-red-500/50 hover:from-white/10 hover:shadow-lg hover:shadow-red-950/20 active:scale-[0.98]'
                      : 'bg-white/2 border-white/5 opacity-50'
                  )}
                >
                  {/* Top Bar: Veg Badge + 86'd Switch */}
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className={cn('w-3.5 h-3.5 rounded-sm border flex items-center justify-center', product.is_veg ? 'border-green-500' : 'border-red-500')}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', product.is_veg ? 'bg-green-500' : 'bg-red-500')} />
                    </span>

                    {/* Quick 86'd stock toggle */}
                    <button
                      onClick={(e) => handleToggle86(product, e)}
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded transition',
                        product.is_available
                          ? 'text-white/30 hover:text-red-400 hover:bg-red-950/40'
                          : 'bg-red-900/80 text-red-200 border border-red-700'
                      )}
                      title={product.is_available ? "Click to 86 (mark out of stock)" : "Click to mark Available"}
                    >
                      {product.is_available ? "86" : "OUT"}
                    </button>
                  </div>

                  {/* Product Title */}
                  <div className="mb-3">
                    <h4 className="text-xs font-bold text-white/95 leading-snug line-clamp-2">
                      {product.name}
                    </h4>
                  </div>

                  {/* Price & Action Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-sm font-black text-amber-300">
                      ₹{product.price}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Customize button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openCustomizer(product)
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition"
                        title="Customize crust, size & toppings"
                      >
                        <SlidersHorizontal size={11} />
                      </button>

                      {/* Fast add button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          fastAddToCart(product)
                        }}
                        disabled={!product.is_available}
                        className="w-7 h-7 rounded-lg bg-[#B91C1C] hover:bg-[#DC2626] text-white flex items-center justify-center font-bold transition shadow"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL: Live Order, Running Ticket & Billing (42% width) ─ */}
      <div className="flex flex-col w-[42%] bg-[#141414] overflow-hidden border-l border-white/10">

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
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5">
                <Users size={12} className="text-white/40" />
                <span className="text-[11px] text-white/60 flex-1">Guests:</span>
                <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="p-1 hover:text-red-400">
                  <Minus size={10} />
                </button>
                <span className="font-bold text-xs w-4 text-center">{guestCount}</span>
                <button onClick={() => setGuestCount(guestCount + 1)} className="p-1 hover:text-green-400">
                  <Plus size={10} />
                </button>
              </div>

              <select
                value={selectedWaiterId}
                onChange={(e) => setSelectedWaiterId(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="">Select Server / Waiter</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
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
              <p className="text-xs text-white/20 mt-0.5">Tap menu items to start building ticket</p>
            </div>
          ) : (
            cart.map((line) => (
              <div key={line.lineId} className="p-2.5 rounded-xl hover:bg-white/3 transition group space-y-1.5">
                <div className="flex items-start justify-between gap-2">
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
            ))
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

        {/* ── Payment Settlement Panel (When Fired / Settling) ── */}
        {paymentStep === 'payment' && (
          <div className="px-4 py-3 border-t border-white/10 bg-[#161616] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase text-white/70 tracking-wider">
                Select Tender Mode
              </p>
              <span className="text-xs font-bold text-red-400">
                {lastKotNumber}
              </span>
            </div>

            {/* Tender mode tabs */}
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { type: 'cash', icon: Banknote, label: 'Cash' },
                { type: 'upi', icon: Smartphone, label: 'UPI / QR' },
                { type: 'card', icon: CreditCard, label: 'Card' },
                { type: 'split', icon: Layers, label: 'Split' },
              ] as const).map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setPaymentMode(type)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 rounded-xl border text-[11px] font-bold transition-all',
                    paymentMode === type
                      ? 'border-red-500 bg-red-600/20 text-white ring-1 ring-red-500/40 shadow-sm'
                      : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {/* Cash Tender Presets */}
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

            {/* Split Tender Inputs */}
            {paymentMode === 'split' && (
              <div className="space-y-2 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-white/50 block mb-1">💵 Cash (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/50 block mb-1">📱 UPI (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={splitUpi}
                      onChange={(e) => setSplitUpi(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/50 block mb-1">💳 Card (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {(() => {
                  const splitSum = (parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) + (parseFloat(splitCard) || 0)
                  const diff = totals.total - splitSum
                  return (
                    <div className="flex items-center justify-between font-mono pt-1 text-[11px] border-t border-white/10">
                      <span className="text-white/60">Tendered: ₹{splitSum.toFixed(2)}</span>
                      {diff > 0 ? (
                        <span className="text-amber-400 font-bold">Remaining Due: ₹{diff.toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">✓ Settled {diff < 0 ? `(Change: ₹${Math.abs(diff).toFixed(2)})` : ''}</span>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            <button
              onClick={processPayment}
              disabled={
                placing ||
                (paymentMode === 'cash' && parseFloat(cashTendered || '0') < totals.total) ||
                (paymentMode === 'split' &&
                  (parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) + (parseFloat(splitCard) || 0) < totals.total)
              }
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-green-950/40 active:scale-98"
            >
              {placing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirm Settlement (₹{totals.total.toFixed(2)})
            </button>
          </div>
        )}

        {/* ── Success Banner ── */}
        {paymentStep === 'success' && (
          <div className="p-6 border-t border-white/10 text-center space-y-3 bg-[#111111] animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
              <Check size={28} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Bill Settled & Table Freed!</h3>
              <p className="text-xs text-white/50 mt-0.5">Order #{lastOrderId.slice(-6)} • {lastKotNumber}</p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Link
                href={`/admin/pos/receipts?orderId=${lastOrderId}`}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Printer size={13} /> Print Tax Invoice
              </Link>
              <button
                onClick={clearCart}
                className="px-4 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#DC2626] text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
              >
                <Plus size={13} /> Start Next Order
              </button>
            </div>
          </div>
        )}

        {/* ── Primary Action Buttons (When Idle) ── */}
        {cart.length > 0 && paymentStep === 'idle' && (
          <div className="px-4 py-3 border-t border-white/10 bg-[#0F0F0F] space-y-2">
            <button
              onClick={sendToKitchen}
              disabled={placing || !shiftOpen}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#B91C1C] to-[#DC2626] hover:from-[#991B1B] hover:to-[#B91C1C] disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-lg shadow-red-950/40"
            >
              {placing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {placing ? 'Firing KOT to Kitchen…' : `Fire KOT & Settle — ₹${totals.total.toFixed(2)} (F8)`}
            </button>

            <div className="flex gap-2">
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
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn('w-3.5 h-3.5 rounded-sm border flex items-center justify-center', customizingProduct.is_veg ? 'border-green-500' : 'border-red-500')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', customizingProduct.is_veg ? 'bg-green-500' : 'bg-red-500')} />
                  </span>
                  <h3 className="font-extrabold text-base text-white">
                    Customize {customizingProduct.name}
                  </h3>
                </div>
                <p className="text-xs text-white/50 mt-0.5">Select size, gourmet crust, toppings and course</p>
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
