'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPOSOrder, calculatePOSTotal, holdOrder, resumeHeldOrder, type POSCartItem, type CreatePOSOrderPayload } from '@/app/actions/posOrders'
import { createKOT } from '@/app/actions/posOrders'
import { processPOSPayment, type POSPaymentTender } from '@/app/actions/posPayments'
import { getActiveShift } from '@/app/actions/cashierSessions'
import {
  Search, Plus, Minus, Trash2, Send, CreditCard, Banknote, Smartphone,
  Users, ChevronRight, Hash, FileText, Pause, RotateCcw, X, Check,
  ShoppingBag, Clock, AlertTriangle, Loader2, UtensilsCrossed, Layers,
  Tag, LogOut
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
}

interface Category {
  id: string
  name: string
  slug: string
}

interface CartLine {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  modifiers: Array<{ id: string; name: string; price: number }>
  notes: string
  lineId: string // client-side unique ID
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
  delivery: Layers,
}

// ─── Main POS Screen Component ────────────────────────────────────────────────

export default function POSScreen() {
  // ── State: Catalog ──
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingCatalog, setLoadingCatalog] = useState(true)

  // ── State: Cart ──
  const [cart, setCart] = useState<CartLine[]>([])
  const [orderType, setOrderType] = useState<OrderType>('takeaway')
  const [tableId, setTableId] = useState<string>('')
  const [guestCount, setGuestCount] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [discountValue, setDiscountValue] = useState(0)
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat')
  const [orderNotes, setOrderNotes] = useState('')

  // ── State: Session ──
  const [cashierId, setCashierId] = useState<string>('')
  const [shiftId, setShiftId] = useState<string>('')
  const [terminalId, setTerminalId] = useState<string>('')
  const [shiftOpen, setShiftOpen] = useState(false)

  // ── State: Totals ──
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, tax: 0, total: 0 })

  // ── State: Payment ──
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle')
  const [cashTendered, setCashTendered] = useState('')
  const [paymentMode, setPaymentMode] = useState<POSPaymentTender['tenderType']>('cash')
  const [placing, setPlacing] = useState(false)
  const [lastOrderId, setLastOrderId] = useState<string>('')
  const [lastKotNumber, setLastKotNumber] = useState<string>('')

  // ── State: UI ──
  const [tables, setTables] = useState<any[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Load catalog ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadCatalog = async () => {
      const supabase = createClient()
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('products').select('id, name, price, category_id, is_available, is_veg').order('sort_order'),
      ])
      setCategories(cats || [])
      setProducts(prods || [])
      setLoadingCatalog(false)
    }
    loadCatalog()
  }, [])

  // ── Load tables ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loadTables = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('tables')
        .select('id, table_number, capacity, status, area_id')
        .eq('is_active', true)
        .order('table_number')
      setTables(data || [])
    }
    loadTables()
  }, [])

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

  // ── Load cashier session ──────────────────────────────────────────────────
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

  // ── Recalculate totals when cart changes ──────────────────────────────────
  useEffect(() => {
    if (cart.length === 0) {
      setTotals({ subtotal: 0, discount: 0, tax: 0, total: 0 })
      return
    }
    const items: POSCartItem[] = cart.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      modifiers: l.modifiers,
    }))
    calculatePOSTotal(items, discountValue, discountType).then(setTotals)
  }, [cart, discountValue, discountType])

  // ── Filtered products ─────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // ── Add to cart ───────────────────────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    if (!product.is_available) {
      toast.error(`${product.name} is not available`)
      return
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id && l.modifiers.length === 0)
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
          lineId: crypto.randomUUID(),
        },
      ]
    })
  }, [])

  // ── Quantity controls ─────────────────────────────────────────────────────
  const updateQty = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev.map((l) => l.lineId === lineId ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l)
    )
  }

  const removeLine = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId))
  }

  const clearCart = () => {
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    setDiscountValue(0)
    setOrderNotes('')
    setTableId('')
    setGuestCount(1)
    setPaymentStep('idle')
  }

  // ── Send to Kitchen (KOT) ─────────────────────────────────────────────────
  const sendToKitchen = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    if (!shiftOpen) return toast.error('Open a cashier shift first')

    setPlacing(true)
    try {
      const orderPayload: CreatePOSOrderPayload = {
        orderType,
        items: cart.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          modifiers: l.modifiers,
          notes: l.notes,
        })),
        tableId: tableId || undefined,
        guestCount,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        discountValue: discountValue || undefined,
        discountType: discountType || undefined,
        notes: orderNotes || undefined,
        shiftId,
        terminalId,
        cashierId,
      }

      const result = await createPOSOrder(orderPayload)
      if (!result.success) throw new Error(result.error)

      setLastOrderId(result.orderId!)
      setLastKotNumber(result.kotNumber!)
      toast.success(`KOT fired! ${result.kotNumber}`)
      setPaymentStep('payment')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order')
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
          ? `Payment done! Change: ₹${result.changeAmount?.toFixed(2)}`
          : 'Payment recorded!'
      )
      setPaymentStep('success')

      // Auto-clear after 3s
      setTimeout(() => { clearCart() }, 3000)
    } catch (err: any) {
      toast.error(err.message || 'Payment failed')
    } finally {
      setPlacing(false)
    }
  }

  // ── Hold order ────────────────────────────────────────────────────────────
  const holdCurrentOrder = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    const result = await holdOrder(cashierId, terminalId, { cart, orderType, tableId, guestCount, customerName, customerPhone, discountValue, orderNotes }, customerName || 'Unnamed')
    if (result.success) {
      toast.success('Order held')
      clearCart()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#0F0F0F] text-white">

      {/* ─── LEFT: Menu Panel ──────────────────────────────────────────── */}
      <div className="flex flex-col w-[58%] border-r border-white/10 overflow-hidden">

        {/* Search + Category bar */}
        <div className="p-3 border-b border-white/10 space-y-2 bg-[#1A1A1A]">
          {/* Order Type Selector */}
          <div className="flex gap-1.5">
            {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map((type) => {
              const Icon = ORDER_TYPE_ICONS[type]
              return (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center',
                    orderType === type
                      ? 'bg-[#B91C1C] text-white shadow-lg shadow-red-900/30'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  )}
                >
                  <Icon size={12} />
                  {ORDER_TYPE_LABELS[type]}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items… (press / to focus)"
              className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/50 transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'flex-none px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap',
                activeCategory === 'all' ? 'bg-[#B91C1C] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={cn(
                  'flex-none px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap',
                  activeCategory === c.id ? 'bg-[#B91C1C] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingCatalog ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-white/30" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-white/30">
              <Search size={32} className="mb-2" />
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={!product.is_available}
                  className={cn(
                    'group relative flex flex-col items-start p-3 rounded-xl border transition-all text-left',
                    product.is_available
                      ? 'bg-white/5 border-white/10 hover:bg-[#B91C1C]/10 hover:border-[#B91C1C]/40 active:scale-95'
                      : 'bg-white/2 border-white/5 opacity-40 cursor-not-allowed'
                  )}
                >
                  {/* Veg/Non-veg indicator */}
                  <span className={cn('w-3 h-3 rounded-sm border flex items-center justify-center mb-1.5', product.is_veg ? 'border-green-500' : 'border-red-500')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', product.is_veg ? 'bg-green-500' : 'bg-red-500')} />
                  </span>

                  <span className="text-xs font-semibold text-white/90 leading-tight line-clamp-2 mb-2">
                    {product.name}
                  </span>
                  <span className="text-sm font-bold text-[#FCA5A5]">₹{product.price}</span>

                  {!product.is_available && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] bg-red-900/80 text-red-200 px-1 py-0.5 rounded font-bold">86</span>
                  )}

                  {/* Quick-add indicator */}
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#B91C1C] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Plus size={10} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: Order Panel ────────────────────────────────────────── */}
      <div className="flex flex-col w-[42%] bg-[#141414] overflow-hidden">

        {/* Panel Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-[#B91C1C]" />
            <span className="font-bold text-sm">
              {ORDER_TYPE_LABELS[orderType]}
              {cart.length > 0 && <span className="ml-2 text-xs font-normal text-white/40">{cart.reduce((s, l) => s + l.quantity, 0)} items</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/admin/pos/tables"
              className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
            >
              <UtensilsCrossed size={12} />
              Floor Map
            </Link>
            {/* Shift indicator */}
            <span className={cn('text-[10px] px-2 py-0.5 rounded font-bold', shiftOpen ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400')}>
              {shiftOpen ? '● SHIFT' : '⚠ NO SHIFT'}
            </span>
            <Link href="/admin/pos/shifts" className="text-white/40 hover:text-white p-1 rounded transition" title="Shift & Cash Drawer">
              <LogOut size={14} />
            </Link>
          </div>
        </div>

        {/* Context Fields */}
        {(orderType === 'dine_in' || orderType === 'takeaway' || orderType === 'delivery') && (
          <div className="px-4 py-2.5 border-b border-white/10 space-y-2 bg-[#191919]">
            {orderType === 'dine_in' && (
              <div className="flex gap-2">
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/50"
                >
                  <option value="">Select Table</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.table_number} ({t.status})
                    </option>
                  ))}
                </select>
                <Link
                  href="/admin/pos/tables"
                  className="px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white flex items-center gap-1 text-xs font-semibold"
                  title="View Floor Map"
                >
                  <UtensilsCrossed size={12} /> Map
                </Link>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2">
                  <Users size={12} className="text-white/40" />
                  <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="text-white/60 hover:text-white"><Minus size={10} /></button>
                  <span className="text-xs font-bold w-5 text-center">{guestCount}</span>
                  <button onClick={() => setGuestCount(guestCount + 1)} className="text-white/60 hover:text-white"><Plus size={10} /></button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name (optional)"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs placeholder:text-white/30 text-white focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/50"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone"
                className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs placeholder:text-white/30 text-white focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/50"
              />
            </div>
          </div>
        )}

        {/* Cart Lines */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-white/20">
              <ShoppingBag size={32} className="mb-2" />
              <p className="text-sm">Tap items to add</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {cart.map((line) => (
                <div key={line.lineId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition group">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/90 truncate">{line.productName}</p>
                    <p className="text-[10px] text-white/40">₹{line.unitPrice} each</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(line.lineId, -1)} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                      <Minus size={10} />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{line.quantity}</span>
                    <button onClick={() => updateQty(line.lineId, 1)} className="w-6 h-6 rounded-full bg-[#B91C1C]/30 hover:bg-[#B91C1C]/50 flex items-center justify-center transition">
                      <Plus size={10} />
                    </button>
                  </div>
                  <div className="text-right shrink-0 min-w-[48px]">
                    <p className="text-xs font-bold text-white">₹{(line.unitPrice * line.quantity).toFixed(0)}</p>
                  </div>
                  <button
                    onClick={() => removeLine(line.lineId)}
                    className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount Row */}
        {cart.length > 0 && (
          <div className="px-4 py-2 border-t border-white/10 bg-[#191919] flex items-center gap-2">
            <Tag size={12} className="text-white/40 shrink-0" />
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
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
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/50"
            />
          </div>
        )}

        {/* Totals */}
        {cart.length > 0 && (
          <div className="px-4 py-3 border-t border-white/10 bg-[#1A1A1A] space-y-1.5">
            <div className="flex justify-between text-xs text-white/50">
              <span>Subtotal</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-xs text-green-400">
                <span>Discount</span>
                <span>−₹{totals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-white/50">
              <span>GST (5%)</span>
              <span>₹{totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white border-t border-white/10 pt-1.5">
              <span>Total</span>
              <span className="text-[#FCA5A5]">₹{totals.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* ── Payment Step ── */}
        {paymentStep === 'payment' && (
          <div className="px-4 py-3 border-t border-white/10 bg-[#1A1A1A] space-y-3">
            <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { type: 'cash', icon: Banknote, label: 'Cash' },
                { type: 'upi', icon: Smartphone, label: 'UPI' },
                { type: 'card', icon: CreditCard, label: 'Card' },
              ] as const).map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setPaymentMode(type)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all',
                    paymentMode === type
                      ? 'border-[#B91C1C] bg-[#B91C1C]/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                  )}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {paymentMode === 'cash' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={`Cash tendered (min ₹${totals.total.toFixed(2)})`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/50"
                    autoFocus
                  />
                </div>
                {cashTendered && parseFloat(cashTendered) >= totals.total && (
                  <div className="text-sm font-bold text-green-400 text-center">
                    Change: ₹{(parseFloat(cashTendered) - totals.total).toFixed(2)}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={processPayment}
              disabled={placing || (paymentMode === 'cash' && parseFloat(cashTendered || '0') < totals.total)}
              className="w-full py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              {placing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Confirm Payment ₹{totals.total.toFixed(2)}
            </button>
          </div>
        )}

        {/* ── Success ── */}
        {paymentStep === 'success' && (
          <div className="px-4 py-6 border-t border-white/10 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-green-900/50 text-green-400 flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <p className="text-sm font-bold text-white">Payment Complete!</p>
            <p className="text-xs text-white/40">{lastKotNumber}</p>
            <p className="text-xs text-white/30">Clearing in 3s…</p>
            <button onClick={clearCart} className="text-xs text-[#B91C1C] hover:underline">New Order Now</button>
          </div>
        )}

        {/* ── Actions ── */}
        {cart.length > 0 && paymentStep === 'idle' && (
          <div className="px-4 py-3 border-t border-white/10 bg-[#0F0F0F] space-y-2">
            <button
              onClick={sendToKitchen}
              disabled={placing || !shiftOpen}
              className="w-full py-3 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
            >
              {placing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {placing ? 'Creating Order…' : `Send to Kitchen — ₹${totals.total.toFixed(2)}`}
            </button>
            <div className="flex gap-2">
              <button
                onClick={holdCurrentOrder}
                className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Pause size={12} /> Hold
              </button>
              <button
                onClick={clearCart}
                className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-red-900/20 text-white/60 hover:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
        )}

        {cart.length === 0 && paymentStep === 'idle' && (
          <div className="px-4 pb-3 flex gap-2">
            <Link
              href="/admin/pos/held"
              className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw size={12} /> Resume Held
            </Link>
            <Link
              href="/admin/pos/orders"
              className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Clock size={12} /> Active Orders
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
