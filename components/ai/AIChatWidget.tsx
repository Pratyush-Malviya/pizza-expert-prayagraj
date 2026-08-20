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
} from 'lucide-react'
import { useStoreStore } from '@/lib/store/useStoreStore'
import { useCartStore } from '@/store/cartStore'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { createOrder } from '@/app/actions/orders'
import { createRazorpayOrder, verifyRazorpayPayment } from '@/app/actions/razorpay'
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

function isMenuIntent(text: string): boolean {
  return (
    text.includes('menu') ||
    text.includes('khana') ||
    text.includes('khaana') ||
    text.includes('something to eat') ||
    text.includes('eat something') ||
    text.includes('show food') ||
    (text.includes('order') &&
      (text.includes('place') || text.includes('new') || text.includes('pizza') || text.includes(' want '))) ||
    (text.includes('order food'))
  )
}

function isCheckoutIntent(text: string): boolean {
  return (
    text.includes('checkout') ||
    text.includes('pay now') ||
    text.includes('proceed to pay') ||
    text.includes('ready to pay') ||
    (text.includes('cart') && (text.includes('pay') || text.includes('buy'))) ||
    text.includes('place my order')
  )
}

// ─── Main Widget ─────────────────────────────────────────────────────────
export default function AIChatWidget() {
  const { activeStoreId } = useStoreStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([{ kind: 'welcome', role: 'model' }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [chatItems, setChatItems] = useState<ChatCartItem[]>([])
  const [customer, setCustomer] = useState<CustomerDetails | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderTotal, setOrderTotal] = useState<number>(0)
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastCategoryRef = useRef<{ id: string; name: string } | null>(null)
  const pendingPaymentRef = useRef<PendingPayment | null>(null)
  const customerRef = useRef<CustomerDetails | null>(null)

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
          { kind: 'text', role: 'model', text: `We have ${data.categories.length} delicious categories. Pick one and I'll show you what's inside! 👇` },
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

  const handleCheckout = () => {
    if (chatItems.length === 0) {
      useCartStore.getState().openCart()
      toast.info('Your cart is empty')
      setMessages((m) => [
        ...m,
        { kind: 'text', role: 'model', text: 'Your cart is empty right now. Let us fix that! 🍕' },
        { kind: 'welcome', role: 'model' },
      ])
      return
    }
    setMessages((m) => [...m, { kind: 'checkout', role: 'model' }])
  }

  // ── Order placement ────────────────────────────────────────────────────
  const handlePlaceOrder = async (details: CustomerDetails) => {
    if (chatItems.length === 0) return
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
        setMessages((m) => [...m, { kind: 'error', role: 'model', text: res.error || 'Could not place your order. Please try again.' }])
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
      theme: { color: '#FF3B00' },
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
            { kind: 'text', role: 'model', text: 'Payment window was closed. No problem — tap "Proceed to Pay" below anytime to retry. 💳' },
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

  // ── Free text handling (LLM + intent detection) ───────────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setMessages((m) => [...m, { kind: 'text', role: 'user', text }])
    setInput('')

    const lower = text.toLowerCase()

    if (isMenuIntent(lower)) {
      await handleBrowse()
      return
    }

    if (isCheckoutIntent(lower)) {
      handleCheckout()
      return
    }

    if (
      (lower.includes('track') || (lower.includes('order status') || lower.includes('where is my'))) &&
      (chatItems.length > 0 || orderId)
    ) {
      const target = orderId || ''
      setMessages((m) => [
        ...m,
        {
          kind: 'text',
          role: 'model',
          text: target
            ? `You can track order #${target.slice(0, 8).toUpperCase()} here: ${window.location.origin}/track?orderId=${target}`
            : `Open this page to track your order: ${window.location.origin}/track`,
        },
      ])
      return
    }

    if (lower.includes('help') || lower.includes('what can you do')) {
      setMessages((m) => [
        ...m,
        {
          kind: 'text',
          role: 'model',
          text: 'I can take your complete order right here! 🍕\n\n• Type "menu" to browse categories & items\n• Type "checkout" to pay once you have selected items\n• Type "track" for your order status\n\nJust tap the buttons I show you and we will get you sorted in no time!',
        },
      ])
      return
    }

    // General conversation via LLM
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/order-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: messages, storeId: activeStoreId }),
      })
      const data = await response.json()
      if (data.success && data.reply) {
        setMessages((m) => [
          ...m,
          { kind: 'text', role: 'model', text: data.reply },
          { kind: 'text', role: 'model', text: 'Want to place an order? Just type "menu" and I will walk you through it. 😊' },
        ])
      } else {
        setMessages((m) => [...m, { kind: 'error', role: 'model', text: 'Sorry, I am having trouble connecting right now.' }])
      }
    } catch {
      setMessages((m) => [...m, { kind: 'error', role: 'model', text: 'An error occurred. Please try again later.' }])
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
              <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-none text-sm bg-[#1C1917] text-white">{msg.text}</div>
            </div>
          )
        }
        return (
          <div className="flex justify-start">
            <div
              className={`max-w-[85%] p-3 rounded-2xl rounded-tl-none text-sm shadow-sm whitespace-pre-line ${
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

      case 'checkout':
        return <CheckoutCard items={chatItems} loading={isLoading} onSubmit={handlePlaceOrder} />

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
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-[#B91C1C] text-white shadow-lg hover:bg-rose-700 transition-all z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
        aria-label="Open Pizza Assistant chat"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-[360px] bg-white rounded-2xl shadow-2xl border border-[#E7E0D8] z-50 flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
        style={{ height: '560px', maxHeight: 'calc(100vh - 48px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#B91C1C] text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <div>
              <h3 className="font-bold text-sm leading-tight">Pizza Assistant</h3>
              <p className="text-[10px] text-white/80">Order delivery right here 🍕</p>
            </div>
          </div>
          {chatItems.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-white/20 rounded-full px-2 py-1">
              <ShoppingCart size={11} /> {chatItems.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors" aria-label="Close chat">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#FBF9F5]">
          {messages.map((msg, idx) => (
            <div key={idx}>{renderMessage(msg)}</div>
          ))}
          {showThinking && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E7E0D8] p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-sm text-[#78716C]">
                <Loader2 size={14} className="animate-spin" /> Thinking...
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
              placeholder="Ask about our menu..."
              className="flex-1 px-4 py-2 bg-[#F5F2EC] rounded-xl text-sm text-[#1C1917] placeholder:text-[#A8A29E] caret-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:bg-white transition-all"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-[#1C1917] text-white disabled:opacity-50 hover:bg-[#44403C] transition-colors"
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
      <div className="max-w-[90%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-sm p-3 space-y-2.5">
        <p className="text-sm text-[#1C1917] leading-relaxed">
          Hi! I&apos;m your virtual pizza assistant. I can take your <strong>full delivery order</strong> right here. 🍕
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onBrowse}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            🍕 Browse Menu
          </button>
          <button
            onClick={onCheckout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C1917] text-white text-xs font-bold hover:bg-[#44403C] transition-colors"
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
      <div className="w-full max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-sm p-3 space-y-2">
        <p className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">Choose a category</p>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id, cat.name)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[#E7E0D8] hover:border-[#B91C1C] hover:bg-[#FEF2F2] transition-colors text-left"
            >
              <img src={cat.imageUrl} alt={cat.name} className="w-full h-14 object-cover rounded-lg" loading="lazy" />
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
      <div className="w-full max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-sm p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">{categoryName}</p>
          <button onClick={onBack} className="text-[10px] font-bold text-[#B91C1C] hover:underline">
            ← Back
          </button>
        </div>
        <div className="space-y-2">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-[#E7E0D8] hover:border-[#B91C1C] hover:bg-[#FEF2F2] transition-colors text-left"
            >
              <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-[#1C1917] truncate">{p.name}</span>
                  {p.isVeg && <span className="inline-block w-3 h-3 rounded-[3px] border-2 border-green-600 shrink-0" title="Veg" />}
                  {p.isSpicy && <span className="text-[9px] font-bold text-red-600 shrink-0">🌶️</span>}
                </div>
                <p className="text-[10px] text-[#A8A29E] truncate">{p.description}</p>
                <p className="text-xs font-extrabold text-[#B91C1C]">{formatPrice(p.price)}</p>
              </div>
              <Plus size={16} className="text-[#B91C1C] shrink-0" />
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
      <div className="w-full max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-sm p-3 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-xl object-cover shrink-0" loading="lazy" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1C1917] truncate">{product.name}</p>
            <p className="text-xs font-extrabold text-[#B91C1C]">{formatPrice(product.price)}</p>
            {product.isSpicy && <span className="text-[10px] font-bold text-red-600">🌶️ Spicy</span>}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-[#F5F2EC] p-1.5">
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
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors"
        >
          <BadgeCheck size={14} />
          Confirm · {formatPrice(product.price * qty)}
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
      <div className="max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-sm p-3 space-y-2.5">
        <p className="text-sm text-[#1C1917] font-medium">
          ✅ <strong>{itemName}</strong> ×{quantity} added to your cart. You have <strong>{cartCount}</strong> item(s).
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCheckout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            🛒 Checkout <ArrowRight size={13} />
          </button>
          <button
            onClick={onBrowse}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C1917] text-white text-xs font-bold hover:bg-[#44403C] transition-colors"
          >
            + Add More
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckoutCard({
  items,
  loading,
  onSubmit,
}: {
  items: ChatCartItem[]
  loading: boolean
  onSubmit: (details: CustomerDetails) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
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
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Please enter a valid email (optional).')
    if (!line1.trim()) return setError('Please enter your delivery address.')
    if (!city.trim()) return setError('Please enter your city.')
    if (!/^\d{6}$/.test(pincode.trim())) return setError('Please enter a valid 6-digit PIN code.')
    setError('')
    onSubmit({ name: name.trim(), phone: phone.replace(/[^0-9]/g, ''), email: email.trim(), line1: line1.trim(), city: city.trim(), state: state.trim(), pincode: pincode.trim(), notes: notes.trim() })
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-[#F5F2EC] text-sm text-[#1C1917] placeholder:text-[#A8A29E] caret-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:bg-white border border-transparent focus:border-[#E7E0D8] transition-all'

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-sm p-3 space-y-2.5">
        <p className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">Your Order</p>
        <div className="space-y-1.5 rounded-lg bg-[#F5F2EC] p-2.5">
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

        <p className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">Delivery Details</p>
        <input className={inputClass} placeholder="Full Name *" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex items-center gap-1.5">
          <Phone size={14} className="text-[#A8A29E] shrink-0" />
          <input className={inputClass} placeholder="Mobile Number (10 digits) *" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </div>
        <input className={inputClass} placeholder="Email (for receipt) — optional" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-[#A8A29E] shrink-0" />
          <input className={inputClass} placeholder="Full Delivery Address *" value={line1} onChange={(e) => setLine1(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input className={inputClass} placeholder="City *" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className={inputClass} placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <input className={inputClass} placeholder="PIN Code (6 digits) *" value={pincode} onChange={(e) => setPincode(e.target.value)} inputMode="numeric" />
        <input className={inputClass} placeholder="Notes (landmark, etc.)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {loading ? 'Placing Order...' : 'Place Order & Go to Payment'}
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
      <div className="w-full max-w-[95%] bg-white border border-[#E7E0D8] rounded-2xl rounded-tl-none shadow-sm p-3 space-y-2.5">
        <p className="text-sm font-bold text-[#1C1917]">Almost done — pay to confirm! 💳</p>
        <div className="rounded-lg bg-[#F5F2EC] p-2.5 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[#57534E]">Order Ref</span>
            <span className="font-mono font-bold text-[#1C1917]">#{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#57534E]">Payable Amount</span>
            <span className="font-extrabold text-[#B91C1C]">{formatPrice(total)}</span>
          </div>
        </div>
        <p className="text-[10px] text-[#A8A29E] leading-snug">
          This will open a secure payment link (UPI / Card / NetBanking). Your order is confirmed as soon as payment succeeds.
        </p>
        <button
          onClick={onPay}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-green-700 text-white text-xs font-bold hover:bg-green-800 transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
          {loading ? 'Opening Gateway...' : `Proceed to Pay ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  )
}

function DoneCard({ orderId, total }: { orderId: string; total: number }) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] bg-white border border-green-200 rounded-2xl rounded-tl-none shadow-sm p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <BadgeCheck size={18} className="text-green-700" />
          </span>
          <div>
            <p className="text-sm font-bold text-green-800">Thank you, {total > 0 ? 'payment received! 🎉' : ''}</p>
            <p className="text-[10px] text-[#57534E]">Your order has been placed successfully.</p>
          </div>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-200 p-2.5 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[#57534E]">Order ID</span>
            <span className="font-mono font-bold text-[#1C1917]">#{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#57534E]">Amount Paid</span>
            <span className="font-extrabold text-green-700">{formatPrice(total)}</span>
          </div>
        </div>
        <Link
          href={`/track?orderId=${orderId}`}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#B91C1C] text-white text-xs font-bold hover:bg-rose-700 transition-colors"
        >
          📍 Track My Order <ArrowRight size={13} />
        </Link>
        <Link href={`/order/${orderId}`} className="block text-center text-[11px] font-bold text-[#57534E] hover:text-[#B91C1C] transition-colors">
          View Order Details →
        </Link>
      </div>
    </div>
  )
}