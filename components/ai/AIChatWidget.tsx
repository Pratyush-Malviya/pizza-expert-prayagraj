'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  Plus,
  Minus,
  ShoppingCart,
  BadgeCheck,
  ArrowRight,
  MapPin,
  Phone,
  Lock,
  LogIn,
  UserPlus,
  Sparkles,
} from 'lucide-react'
import { useStoreStore } from '@/lib/store/useStoreStore'
import { useCartStore } from '@/store/cartStore'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { createOrder } from '@/app/actions/orders'
import { createRazorpayOrder, verifyRazorpayPayment } from '@/app/actions/razorpay'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────
interface CategoryItem {
  id: string
  name: string
  slug: string
  imageUrl: string
  productCount: number
}

interface ProductItem {
  id: string
  name: string
  slug: string
  description: string
  price: number
  imageUrl: string
  isVeg: boolean
  isSpicy: boolean
  categoryId?: string
}

interface ChatCartItem {
  id: string
  name: string
  slug: string
  price: number
  imageUrl: string
  isVeg: boolean
  quantity: number
}

interface CustomerDetails {
  name: string
  phone: string
  email: string
  line1: string
  city: string
  state: string
  pincode: string
  notes: string
}

interface PendingPayment {
  orderId: string
  razorpayOrderId: string
  keyId: string
  amount: number
  currency: string
  isTestMode: boolean
  total: number
}

type ChatMsg =
  | { kind: 'text'; role: 'user' | 'model'; text: string }
  | { kind: 'welcome'; role: 'model' }
  | { kind: 'categories'; role: 'model'; categories: CategoryItem[] }
  | { kind: 'products'; role: 'model'; categoryName: string; products: ProductItem[] }
  | { kind: 'confirm'; role: 'model'; product: ProductItem }
  | { kind: 'added'; role: 'model'; itemName: string; quantity: number; cartCount: number }
  | { kind: 'auth_required'; role: 'model' }
  | { kind: 'checkout'; role: 'model' }
  | { kind: 'error'; role: 'model'; text: string }
  | { kind: 'payment'; role: 'model'; orderId: string; total: number }
  | { kind: 'done'; role: 'model'; orderId: string; total: number }

interface RazorpayCheckout {
  on: (event: string, cb: (res?: unknown) => void) => void
  open: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function ensureRazorpayScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve()
    if (document.getElementById('razorpay-checkout-js')) return resolve()
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => resolve()
    document.body.appendChild(script)
  })
}

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  pizzas: /pizza|pizzas|margherita|paneer|capsicum|farmhouse|cheese burst/i,
  burgers: /burger|burgers|zinger|crispy veg|patty/i,
  beverages: /drink|drinks|beverage|beverages|coke|pepsi|cola|shake|lassi|juice|water|soda/i,
  sides: /side|sides|garlic bread|fries|finger|nugget|dips/i,
  desserts: /dessert|desserts|sweet|cake|brownie|ice cream|mousse|choco/i,
  combos: /combo|combos|meal|family feast|offer/i,
  pasta: /pasta|pastas|white sauce|red sauce|arrabiata/i,
}

function matchCategoryKeyword(text: string): string | null {
  for (const [slug, regex] of Object.entries(CATEGORY_KEYWORDS)) {
    if (regex.test(text)) return slug
  }
  return null
}

function isGeneralMenuIntent(text: string): boolean {
  return (
    text.includes('menu') ||
    text.includes('khana') ||
    text.includes('khaana') ||
    text.includes('food') ||
    text.includes('items') ||
    text.includes('categories') ||
    text.includes('options') ||
    text.includes('what do you have') ||
    text.includes('what can i eat') ||
    text.includes('recommend') ||
    text.includes('popular') ||
    text.includes('best seller') ||
    text.includes('rate list') ||
    text.includes('price list')
  )
}

function isCheckoutIntent(text: string): boolean {
  return (
    text.includes('checkout') ||
    text.includes('pay now') ||
    text.includes('proceed to pay') ||
    text.includes('ready to pay') ||
    (text.includes('cart') && (text.includes('pay') || text.includes('buy'))) ||
    text.includes('place my order') ||
    text.includes('place order')
  )
}

// ─── Main Widget ─────────────────────────────────────────────────────────
export default function AIChatWidget() {
  const { activeStoreId } = useStoreStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([{ kind: 'welcome', role: 'model' }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [chatItems, setChatItems] = useState<ChatCartItem[]>([])
  const [customer, setCustomer] = useState<CustomerDetails | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderTotal, setOrderTotal] = useState<number>(0)
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastCategoryRef = useRef<{ id: string; name: string } | null>(null)
  const pendingPaymentRef = useRef<PendingPayment | null>(null)
  const customerRef = useRef<CustomerDetails | null>(null)

  // Track Supabase User state
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
      } catch {}
    }
    checkAuth()
  }, [isOpen])

  useEffect(() => {
    pendingPaymentRef.current = pendingPayment
  }, [pendingPayment])

  useEffect(() => {
    customerRef.current = customer
  }, [customer])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // ── Menu flow ──────────────────────────────────────────────────────────
  const handleBrowse = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeStoreId) params.set('storeId', activeStoreId)
      const res = await fetch(`/api/ai/menu?${params.toString()}`)
      const data = await res.json()
      if (data.success && data.categories?.length) {
        setMessages((m) => [
          ...m,
          { kind: 'text', role: 'model', text: 'Select any category below to browse our fresh hot items with photos and prices: 👇' },
          { kind: 'categories', role: 'model', categories: data.categories },
        ])
      } else {
        setMessages((m) => [...m, { kind: 'error', role: 'model', text: 'Sorry, the menu is unavailable right now. Please try again in a moment.' }])
      }
    } catch {
      setMessages((m) => [...m, { kind: 'error', role: 'model', text: 'Oops! I could not load the menu. Please check your connection and try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCategory = async (categoryId: string, categoryName: string) => {
    lastCategoryRef.current = { id: categoryId, name: categoryName }
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeStoreId) params.set('storeId', activeStoreId)
      params.set('categoryId', categoryId)
      const res = await fetch(`/api/ai/menu?${params.toString()}`)
      const data = await res.json()
      if (data.success && data.products?.length) {
        setMessages((m) => [...m, { kind: 'products', role: 'model', categoryName, products: data.products }])
      } else {
        setMessages((m) => [
          ...m,
          { kind: 'text', role: 'model', text: `Nothing available in ${categoryName} right now. Please pick another category! 👇` },
        ])
        const params2 = new URLSearchParams()
        if (activeStoreId) params2.set('storeId', activeStoreId)
        const res2 = await fetch(`/api/ai/menu?${params2.toString()}`)
        const data2 = await res2.json()
        if (data2.success && data2.categories?.length) {
          setMessages((m) => [...m, { kind: 'categories', role: 'model', categories: data2.categories }])
        }
      }
    } catch {
      setMessages((m) => [...m, { kind: 'error', role: 'model', text: 'Could not load that category. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCategoryBySlug = async (slug: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeStoreId) params.set('storeId', activeStoreId)
      const res = await fetch(`/api/ai/menu?${params.toString()}`)
      const data = await res.json()
      if (data.success && data.categories?.length) {
        const foundCat = data.categories.find((c: CategoryItem) => c.slug.toLowerCase().includes(slug.toLowerCase()) || slug.toLowerCase().includes(c.slug.toLowerCase()))
        if (foundCat) {
          await handleOpenCategory(foundCat.id, foundCat.name)
          return
        }
      }
      await handleBrowse()
    } catch {
      await handleBrowse()
    }
  }

  const goBackToCategory = () => {
    if (lastCategoryRef.current) {
      handleOpenCategory(lastCategoryRef.current.id, lastCategoryRef.current.name)
    } else {
      handleBrowse()
    }
  }

  const handleSelectProduct = (product: ProductItem) => {
    setMessages((m) => [...m, { kind: 'confirm', role: 'model', product }])
  }

  const handleConfirmAdd = (product: ProductItem, qty: number) => {
    setChatItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + qty } : i))
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          imageUrl: product.imageUrl,
          isVeg: product.isVeg,
          quantity: qty,
        },
      ]
    })

    useCartStore.getState().addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl: product.imageUrl,
      isVeg: product.isVeg,
      quantity: qty,
      selectedOptions: [],
    })

    const cartCount = useCartStore.getState().getItemCount()
    toast.success(`${product.name} added to cart!`)
    setMessages((m) => [...m, { kind: 'added', role: 'model', itemName: product.name, quantity: qty, cartCount }])
  }

  const handleCheckout = async () => {
    if (chatItems.length === 0) {
      useCartStore.getState().openCart()
      toast.info('Your cart is empty')
      setMessages((m) => [
        ...m,
        { kind: 'text', role: 'model', text: 'Your cart is empty right now. Pick something delicious from our menu! 🍕' },
        { kind: 'welcome', role: 'model' },
      ])
      return
    }

    // Check user authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    if (!user) {
      // Must sign in before placing order
      setMessages((m) => [...m, { kind: 'auth_required', role: 'model' }])
      return
    }

    setMessages((m) => [...m, { kind: 'checkout', role: 'model' }])
  }

  // ── Order placement ────────────────────────────────────────────────────
  const handlePlaceOrder = async (details: CustomerDetails) => {
    if (chatItems.length === 0) return

    // Re-verify auth
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessages((m) => [...m, { kind: 'auth_required', role: 'model' }])
      return
    }

    setIsLoading(true)
    try {
      const payloadItems = chatItems.map((i) => ({
        id: i.id,
        name: i.name,
        slug: i.slug,
        price: i.price,
        imageUrl: i.imageUrl,
        isVeg: i.isVeg,
        quantity: i.quantity,
        selectedOptions: [],
        totalPrice: i.price * i.quantity,
      }))

      const address = {
        name: details.name,
        phone: details.phone,
        email: details.email,
        line1: details.line1,
        line2: '',
        city: details.city,
        state: details.state,
        pincode: details.pincode,
        notes: details.notes || undefined,
      }

      const res = await createOrder({ cartItems: payloadItems, address, paymentMethod: 'razorpay' })

      if (!res.success || !res.orderId) {
        if (res.error?.toLowerCase().includes('sign in')) {
          setMessages((m) => [...m, { kind: 'auth_required', role: 'model' }])
        } else {
          setMessages((m) => [...m, { kind: 'error', role: 'model', text: res.error || 'Could not place your order. Please try again.' }])
        }
        return
      }

      setOrderId(res.orderId)
      setOrderTotal(res.total)

      const storeSettings = useSettingsStore.getState()
      const rzpRes = await createRazorpayOrder({
        amount: res.total,
        orderId: res.orderId,
        customKeyId: storeSettings.enableRazorpay ? storeSettings.razorpayKeyId : undefined,
        customKeySecret: storeSettings.enableRazorpay ? storeSettings.razorpayKeySecret : undefined,
      })

      if (!rzpRes.success || !rzpRes.razorpayOrderId) {
        setMessages((m) => [
          ...m,
          {
            kind: 'error',
            role: 'model',
            text: `${rzpRes.error || 'Payment gateway could not be initialized.'} Your order #${res.orderId.slice(0, 8).toUpperCase()} is placed — you can pay from the cart page.`,
          },
        ])
        return
      }

      setCustomer(details)
      setPendingPayment({
        orderId: res.orderId,
        razorpayOrderId: rzpRes.razorpayOrderId,
        keyId: rzpRes.keyId!,
        amount: rzpRes.amount!,
        currency: rzpRes.currency || 'INR',
        isTestMode: !!rzpRes.isTestMode,
        total: res.total,
      })

      setMessages((m) => [...m, { kind: 'payment', role: 'model', orderId: res.orderId, total: res.total }])
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong while placing your order.'
      setMessages((m) => [...m, { kind: 'error', role: 'model', text: errMsg }])
    } finally {
      setIsLoading(false)
    }
  }

  // ── Payment ────────────────────────────────────────────────────────────
  const handlePay = async () => {
    const pending = pendingPaymentRef.current
    if (!pending) return
    setIsLoading(true)
    await ensureRazorpayScript()

    const windowWithRzp = window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => RazorpayCheckout }

    if (!windowWithRzp.Razorpay) {
      const verifyRes = await verifyRazorpayPayment({
        orderId: pending.orderId,
        razorpayPaymentId: `pay_demo_${Date.now()}`,
        razorpayOrderId: pending.razorpayOrderId,
        razorpaySignature: 'demo_sig',
        isTestMode: true,
      })
      setIsLoading(false)
      if (verifyRes.success) {
        handlePaymentSuccess(pending.orderId, pending.total)
      } else {
        setMessages((m) => [...m, { kind: 'error', role: 'model', text: verifyRes.error || 'Payment verification failed.' }])
      }
      return
    }

    const customerDetails = customerRef.current

    const options: Record<string, unknown> = {
      key: pending.keyId,
      amount: pending.amount,
      currency: pending.currency,
      name: 'Pizza Expert Prayagraj',
      description: `Wood-Fired Pizza Order #${pending.orderId.slice(0, 8)}`,
      image: '/favicon.ico',
      order_id: pending.razorpayOrderId,
      prefill: {
        name: customerDetails?.name || '',
        email: customerDetails?.email || '',
        contact: customerDetails?.phone || '',
      },
      theme: { color: '#B91C1C' },
      handler: async (response: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string }) => {
        const verifyRes = await verifyRazorpayPayment({
          orderId: pending.orderId,
          razorpayPaymentId: response?.razorpay_payment_id || `pay_${Date.now()}`,
          razorpayOrderId: response?.razorpay_order_id || pending.razorpayOrderId,
          razorpaySignature: response?.razorpay_signature || 'mock_sig',
          isTestMode: pending.isTestMode,
        })
        if (verifyRes.success) {
          handlePaymentSuccess(pending.orderId, pending.total)
        } else {
          setMessages((m) => [...m, { kind: 'error', role: 'model', text: verifyRes.error || 'Payment verification failed.' }])
        }
      },
      modal: {
        ondismiss: () => {
          setIsLoading(false)
          setMessages((m) => [
            ...m,
            { kind: 'text', role: 'model', text: 'Payment window was closed. No problem — tap "Proceed to Pay" below anytime to complete your order. 💳' },
          ])
        },
      },
    }

    const rzp = new windowWithRzp.Razorpay(options)
    rzp.on('payment.failed', (res: unknown) => {
      const errReason = (res as { error?: { description?: string } })?.error?.description || 'Payment failed on Razorpay.'
      setIsLoading(false)
      setMessages((m) => [...m, { kind: 'error', role: 'model', text: errReason }])
    })
    rzp.open()
    setIsLoading(false)
  }

  const handlePaymentSuccess = (paidOrderId: string, paidTotal: number) => {
    setChatItems([])
    setPendingPayment(null)
    setOrderId(paidOrderId)
    setOrderTotal(paidTotal)
    useCartStore.getState().clearCart()
    try {
      localStorage.setItem('pizza-expert-last-order', JSON.stringify({ id: paidOrderId, total: paidTotal, status: 'confirmed' }))
    } catch {}
    setMessages((m) => [...m, { kind: 'done', role: 'model', orderId: paidOrderId, total: paidTotal }])
    setIsLoading(false)
  }

  // ── Free text handling (Visual & Formatted Navigation) ─────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setMessages((m) => [...m, { kind: 'text', role: 'user', text }])
    setInput('')

    const lower = text.toLowerCase()

    // 1. Checkout intent
    if (isCheckoutIntent(lower)) {
      await handleCheckout()
      return
    }

    // 2. Direct category intent (e.g. "pizzas", "burger", "drinks", "sides", "desserts", "pasta")
    const matchedCategory = matchCategoryKeyword(lower)
    if (matchedCategory) {
      await handleOpenCategoryBySlug(matchedCategory)
      return
    }

    // 3. General menu intent
    if (isGeneralMenuIntent(lower)) {
      await handleBrowse()
      return
    }

    // 4. Tracking intent
    if (
      (lower.includes('track') || lower.includes('order status') || lower.includes('where is my')) &&
      (chatItems.length > 0 || orderId)
    ) {
      const target = orderId || ''
      setMessages((m) => [
        ...m,
        {
          kind: 'text',
          role: 'model',
          text: target
            ? `You can track order #${target.slice(0, 8).toUpperCase()} live here: ${window.location.origin}/track?orderId=${target}`
            : `Open this page to track your order: ${window.location.origin}/track`,
        },
      ])
      return
    }

    // 5. Help intent
    if (lower.includes('help') || lower.includes('what can you do')) {
      setMessages((m) => [
        ...m,
        {
          kind: 'text',
          role: 'model',
          text: 'I can help you browse our visual menu and place your complete delivery order right here! 🍕',
        },
        { kind: 'welcome', role: 'model' },
      ])
      return
    }

    // 6. Conversational AI fallback with structured card integration
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/order-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: messages, storeId: activeStoreId }),
      })
      const data = await response.json()
      if (data.success) {
        setMessages((m) => [
          ...m,
          { kind: 'text', role: 'model', text: data.reply || 'Here is what we have on our menu! 🍕' },
        ])

        if (data.categorySlug) {
          await handleOpenCategoryBySlug(data.categorySlug)
        } else if (data.showCategories) {
          await handleBrowse()
        } else if (data.productIds && data.productIds.length > 0) {
          // Fetch and display specific recommended products
          const params = new URLSearchParams()
          if (activeStoreId) params.set('storeId', activeStoreId)
          const menuRes = await fetch(`/api/ai/menu?${params.toString()}`)
          const menuData = await menuRes.json()
          if (menuData.success && menuData.products) {
            const matchedProducts = menuData.products.filter((p: ProductItem) => data.productIds.includes(p.id))
            if (matchedProducts.length > 0) {
              setMessages((m) => [
                ...m,
                { kind: 'products', role: 'model', categoryName: 'Recommended For You', products: matchedProducts },
              ])
            } else {
              await handleBrowse()
            }
          }
        }
      } else {
        setMessages((m) => [
          ...m,
          { kind: 'text', role: 'model', text: 'Here are all our menu categories so you can easily pick what you like: 👇' },
        ])
        await handleBrowse()
      }
    } catch {
      await handleBrowse()
    } finally {
      setIsLoading(false)
    }
  }

  const lastKind = messages[messages.length - 1]?.kind
  const showThinking =
    isLoading && lastKind !== 'checkout' && lastKind !== 'payment'

  // ── Render helper ──────────────────────────────────────────────────────
  const renderMessage = (msg: ChatMsg) => {
    switch (msg.kind) {
      case 'text':
      case 'error':
        if (msg.role === 'user') {
          return (
            <div className="flex justify-end">
              <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-none text-sm bg-[#1C1917] text-white shadow-xs">{msg.text}</div>
            </div>
          )
        }
        return (
          <div className="flex justify-start">
            <div
              className={`max-w-[85%] p-3 rounded-2xl rounded-tl-none text-sm shadow-xs whitespace-pre-line ${
                msg.kind === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-white border border-[#E7E0D8] text-[#1C1917]'
              }`}
            >
              {msg.text}
            </div>
          </div>
        )

      case 'welcome':
        return <WelcomeCard onBrowse={handleBrowse} onCheckout={handleCheckout} />

      case 'categories':
        return <CategoriesCard categories={msg.categories} onSelect={handleOpenCategory} />

      case 'products':
        return (
          <ProductsCard
            categoryName={msg.categoryName}
            products={msg.products}
            onSelect={handleSelectProduct}
            onBack={goBackToCategory}
          />
        )

      case 'confirm':
        return (
          <ConfirmCard product={msg.product} onConfirm={handleConfirmAdd} onBack={goBackToCategory} onBrowse={handleBrowse} />
        )

      case 'added':
        return (
          <AddedCard itemName={msg.itemName} quantity={msg.quantity} cartCount={msg.cartCount} onCheckout={handleCheckout} onBrowse={handleBrowse} />
        )

      case 'auth_required':
        return <AuthRequiredCard onBrowse={handleBrowse} />

      case 'checkout':
        return <CheckoutCard items={chatItems} user={currentUser} loading={isLoading} onSubmit={handlePlaceOrder} />

      case 'payment':
        return <PaymentCard orderId={msg.orderId} total={msg.total} loading={isLoading} onPay={handlePay} />

      case 'done':
        return <DoneCard orderId={msg.orderId} total={msg.total} />

      default:
        return null
    }
  }

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 md:bottom-6 right-6 p-4 rounded-full bg-[#B91C1C] text-white shadow-xl hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
        aria-label="Open Pizza Assistant chat"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-20 md:bottom-6 right-6 w-[360px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-[#E7E0D8] z-50 flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-0 opacity-0 pointer-events-none'
        }`}
        style={{ height: '580px', maxHeight: 'calc(100vh - 100px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#B91C1C] text-white rounded-t-2xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                Pizza Assistant <Sparkles size={12} className="text-amber-300" />
              </h3>
              <p className="text-[10px] text-white/80">Interactive visual ordering 🍕</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chatItems.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-white/20 rounded-full px-2.5 py-1">
                <ShoppingCart size={11} /> {chatItems.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors" aria-label="Close chat">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#FBF9F5]">
          {messages.map((msg, idx) => (
            <div key={idx}>{renderMessage(msg)}</div>
          ))}
          {showThinking && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E7E0D8] p-3 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-2 text-xs text-[#78716C]">
                <Loader2 size={13} className="animate-spin text-[#B91C1C]" /> Loading visual menu...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-[#E7E0D8] rounded-b-2xl">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask for pizzas, burgers, drinks..."
              className="flex-1 px-4 py-2.5 bg-[#F5F2EC] rounded-xl text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] caret-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:bg-white transition-all"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-[#1C1917] text-white disabled:opacity-50 hover:bg-[#44403C] transition-colors shadow-xs"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Message Components ──────────────────────────────────────────────────
function WelcomeCard({
  onBrowse,
  onCheckout,
}: {
  onBrowse: () => void
  onCheckout: () => void
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-xs p-3.5 space-y-3">
        <p className="text-xs sm:text-sm text-[#1C1917] leading-relaxed">
          Welcome to <strong>Pizza Expert</strong>! 🍕 Browse our visual menu cards below, add your favorites to cart, and place your order directly.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onBrowse}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
          >
            🍕 View Menu
          </button>
          <button
            onClick={onCheckout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1917] text-white text-xs font-bold hover:bg-[#44403C] transition-colors shadow-xs"
          >
            🛒 Checkout
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoriesCard({
  categories,
  onSelect,
}: {
  categories: CategoryItem[]
  onSelect: (id: string, name: string) => void
}) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[98%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-xs p-3 space-y-2.5">
        <p className="text-xs font-bold text-[#1C1917] uppercase tracking-wide flex items-center justify-between">
          <span>Explore Categories</span>
          <span className="text-[10px] font-normal text-[#78716C]">Tap to view items</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id, cat.name)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[#E7E0D8] hover:border-[#B91C1C] hover:bg-[#FEF2F2] transition-all text-left group shadow-2xs"
            >
              <img src={cat.imageUrl} alt={cat.name} className="w-full h-14 object-cover rounded-lg group-hover:scale-[1.02] transition-transform" loading="lazy" />
              <span className="text-[11px] font-bold text-[#1C1917] text-center leading-tight">{cat.name}</span>
              <span className="text-[9px] text-[#A8A29E]">{cat.productCount} items</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProductsCard({
  categoryName,
  products,
  onSelect,
  onBack,
}: {
  categoryName: string
  products: ProductItem[]
  onSelect: (product: ProductItem) => void
  onBack: () => void
}) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[98%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-xs p-3 space-y-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-[#F4EFEA]">
          <p className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">{categoryName}</p>
          <button onClick={onBack} className="text-[10px] font-bold text-[#B91C1C] hover:underline">
            ← All Categories
          </button>
        </div>
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-[#E7E0D8] hover:border-[#B91C1C] hover:bg-[#FEF2F2] transition-all text-left shadow-2xs"
            >
              <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-[#1C1917] truncate">{p.name}</span>
                  {p.isVeg && <span className="inline-block w-2.5 h-2.5 rounded-[2px] border-2 border-green-600 shrink-0" title="Veg" />}
                  {p.isSpicy && <span className="text-[9px] shrink-0">🌶️</span>}
                </div>
                <p className="text-[10px] text-[#78716C] truncate">{p.description}</p>
                <p className="text-xs font-extrabold text-[#B91C1C]">{formatPrice(p.price)}</p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center shrink-0 hover:bg-[#B91C1C] hover:text-white transition-colors">
                <Plus size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfirmCard({
  product,
  onConfirm,
  onBack,
  onBrowse,
}: {
  product: ProductItem
  onConfirm: (product: ProductItem, qty: number) => void
  onBack: () => void
  onBrowse: () => void
}) {
  const [qty, setQty] = useState(1)
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-xs p-3 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-xl object-cover shrink-0" loading="lazy" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1C1917] truncate">{product.name}</p>
            <p className="text-xs font-extrabold text-[#B91C1C]">{formatPrice(product.price)}</p>
            {product.isSpicy && <span className="text-[10px] font-bold text-red-600">🌶️ Spicy</span>}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[#F5F2EC] p-2">
          <span className="text-[11px] font-bold text-[#57534E]">Quantity</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-6 h-6 rounded-md bg-white border border-[#E7E0D8] flex items-center justify-center hover:bg-[#F4EFEA]"
              aria-label="Decrease quantity"
            >
              <Minus size={12} />
            </button>
            <span className="w-6 text-center text-sm font-bold text-[#1C1917]">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(10, q + 1))}
              className="w-6 h-6 rounded-md bg-white border border-[#E7E0D8] flex items-center justify-center hover:bg-[#F4EFEA]"
              aria-label="Increase quantity"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
        <button
          onClick={() => onConfirm(product, qty)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
        >
          <BadgeCheck size={14} />
          Add to Cart · {formatPrice(product.price * qty)}
        </button>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 px-2 py-1.5 rounded-lg border border-[#E7E0D8] text-[10px] font-bold text-[#57534E] hover:bg-[#F4EFEA] transition-colors">
            ← Back
          </button>
          <button onClick={onBrowse} className="flex-1 px-2 py-1.5 rounded-lg border border-[#E7E0D8] text-[10px] font-bold text-[#57534E] hover:bg-[#F4EFEA] transition-colors">
            Browse All
          </button>
        </div>
      </div>
    </div>
  )
}

function AddedCard({
  itemName,
  quantity,
  cartCount,
  onCheckout,
  onBrowse,
}: {
  itemName: string
  quantity: number
  cartCount: number
  onCheckout: () => void
  onBrowse: () => void
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-xs p-3 space-y-2.5">
        <p className="text-xs sm:text-sm text-[#1C1917] font-medium">
          ✅ <strong>{itemName}</strong> ×{quantity} added to cart. Total items: <strong>{cartCount}</strong>.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCheckout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
          >
            🛒 Checkout <ArrowRight size={13} />
          </button>
          <button
            onClick={onBrowse}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1917] text-white text-xs font-bold hover:bg-[#44403C] transition-colors shadow-xs"
          >
            + Add More
          </button>
        </div>
      </div>
    </div>
  )
}

function AuthRequiredCard({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-xs p-4 space-y-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 text-[#B91C1C] flex items-center justify-center mx-auto">
          <Lock size={20} />
        </div>
        <div className="text-center space-y-1">
          <h4 className="text-sm font-bold text-[#1C1917]">Sign In Required to Order</h4>
          <p className="text-[11px] text-[#57534E] leading-relaxed">
            Please log in or register so we can link your live GPS tracking, digital receipt, and loyalty points.
          </p>
        </div>
        <div className="space-y-2 pt-1">
          <Link
            href="/login?redirect=/checkout"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
          >
            <LogIn size={14} /> Sign In to Place Order
          </Link>
          <Link
            href="/register?redirect=/checkout"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#E7E0D8] text-[#1C1917] text-xs font-bold hover:bg-[#F4EFEA] transition-colors"
          >
            <UserPlus size={14} /> Create Account
          </Link>
        </div>
        <button
          onClick={onBrowse}
          className="w-full text-center text-[10px] font-semibold text-[#78716C] hover:text-[#1C1917] pt-1"
        >
          ← Keep Browsing Menu
        </button>
      </div>
    </div>
  )
}

function CheckoutCard({
  items,
  user,
  loading,
  onSubmit,
}: {
  items: ChatCartItem[]
  user: any
  loading: boolean
  onSubmit: (details: CustomerDetails) => void
}) {
  const [name, setName] = useState(user?.user_metadata?.name || user?.user_metadata?.full_name || '')
  const [phone, setPhone] = useState(user?.phone || user?.user_metadata?.phone || '')
  const [email, setEmail] = useState(user?.email || '')
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('Prayagraj')
  const [state, setState] = useState('Uttar Pradesh')
  const [pincode, setPincode] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const handleSubmit = () => {
    if (!name.trim()) return setError('Please enter your name.')
    if (!/^[6-9]\d{9}$/.test(phone.replace(/[^0-9]/g, ''))) return setError('Please enter a valid 10-digit mobile number.')
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Please enter a valid email.')
    if (!line1.trim()) return setError('Please enter your delivery address.')
    if (!city.trim()) return setError('Please enter your city.')
    if (!/^\d{6}$/.test(pincode.trim())) return setError('Please enter a valid 6-digit PIN code.')
    setError('')
    onSubmit({ name: name.trim(), phone: phone.replace(/[^0-9]/g, ''), email: email.trim(), line1: line1.trim(), city: city.trim(), state: state.trim(), pincode: pincode.trim(), notes: notes.trim() })
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-[#F5F2EC] text-xs text-[#1C1917] placeholder:text-[#A8A29E] caret-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:bg-white border border-transparent focus:border-[#E7E0D8] transition-all'

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-xs p-3 space-y-2.5">
        <p className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">Order Summary</p>
        <div className="space-y-1.5 rounded-xl bg-[#F5F2EC] p-2.5">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-xs">
              <span className="text-[#1C1917] font-medium">
                {i.name} <span className="text-[#A8A29E]">×{i.quantity}</span>
              </span>
              <span className="font-bold text-[#1C1917]">{formatPrice(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs border-t border-[#E7E0D8] pt-1.5 mt-1.5">
            <span className="font-bold text-[#1C1917]">Subtotal</span>
            <span className="font-extrabold text-[#B91C1C]">{formatPrice(subtotal)}</span>
          </div>
        </div>

        <p className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">Delivery Address</p>
        <input className={inputClass} placeholder="Full Name *" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex items-center gap-1.5">
          <Phone size={14} className="text-[#A8A29E] shrink-0" />
          <input className={inputClass} placeholder="Mobile Number (10 digits) *" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </div>
        <input className={inputClass} placeholder="Email (for order invoice)" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-[#A8A29E] shrink-0" />
          <input className={inputClass} placeholder="Street / House / Flat *" value={line1} onChange={(e) => setLine1(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input className={inputClass} placeholder="City *" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className={inputClass} placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <input className={inputClass} placeholder="PIN Code (6 digits) *" value={pincode} onChange={(e) => setPincode(e.target.value)} inputMode="numeric" />
        <input className={inputClass} placeholder="Notes (e.g., Near Anand Bhawan)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-60 shadow-xs"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {loading ? 'Processing Order...' : 'Confirm Order & Pay'}
        </button>
      </div>
    </div>
  )
}

function PaymentCard({
  orderId,
  total,
  loading,
  onPay,
}: {
  orderId: string
  total: number
  loading: boolean
  onPay: () => void
}) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-xs p-3 space-y-2.5">
        <p className="text-xs sm:text-sm font-bold text-[#1C1917]">Complete payment to confirm! 💳</p>
        <div className="rounded-xl bg-[#F5F2EC] p-2.5 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[#57534E]">Order Ref</span>
            <span className="font-mono font-bold text-[#1C1917]">#{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#57534E]">Total Amount</span>
            <span className="font-extrabold text-[#B91C1C]">{formatPrice(total)}</span>
          </div>
        </div>
        <p className="text-[10px] text-[#78716C] leading-snug">
          Secure checkout via UPI / Credit / Debit / NetBanking.
        </p>
        <button
          onClick={onPay}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors disabled:opacity-60 shadow-xs"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
          {loading ? 'Opening Gateway...' : `Pay ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  )
}

function DoneCard({ orderId, total }: { orderId: string; total: number }) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] bg-white border border-emerald-200 rounded-2xl rounded-tl-none shadow-xs p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <BadgeCheck size={18} className="text-emerald-700" />
          </span>
          <div>
            <p className="text-sm font-bold text-emerald-800">Order Confirmed! 🎉</p>
            <p className="text-[10px] text-[#57534E]">Payment received. Your pizza is being baked.</p>
          </div>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[#57534E]">Order ID</span>
            <span className="font-mono font-bold text-[#1C1917]">#{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#57534E]">Amount Paid</span>
            <span className="font-extrabold text-emerald-700">{formatPrice(total)}</span>
          </div>
        </div>
        <Link
          href={`/track?orderId=${orderId}`}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
        >
          📍 Track Live Delivery <ArrowRight size={13} />
        </Link>
        <Link href={`/order/${orderId}`} className="block text-center text-[11px] font-bold text-[#57534E] hover:text-[#B91C1C] transition-colors">
          View Receipt →
        </Link>
      </div>
    </div>
  )
}