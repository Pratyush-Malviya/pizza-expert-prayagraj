'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck, CreditCard, Banknote, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { createOrder } from '@/app/actions/orders'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart, getSubtotal } = useCartStore()

  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const [addressInfo, setAddressInfo] = useState({
    line1: '',
    line2: '',
    city: 'Prayagraj',
    state: 'Uttar Pradesh',
    pincode: '211006',
    notes: '',
  })

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cashfree' | 'cod'>('razorpay')
  const [loading, setLoading] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    async function checkUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const isSimpleAdmin = typeof document !== 'undefined' && document.cookie.includes('simple_admin=true')

      if (user) {
        setUser(user)
        setContactInfo((prev) => ({
          ...prev,
          email: user.email || prev.email,
          name: user.user_metadata?.name || prev.name,
          phone: user.user_metadata?.phone || prev.phone,
        }))
      } else if (isSimpleAdmin) {
        setUser({ id: 'admin-guest', email: 'admin@demo.com', user_metadata: { name: 'Admin Demo' } })
        setContactInfo((prev) => ({ ...prev, email: 'admin@demo.com', name: 'Admin Demo' }))
      }
      setCheckingAuth(false)
    }
    checkUser()
  }, [])

  const subtotal = getSubtotal()
  const deliveryFee = subtotal >= 499 || subtotal === 0 ? 0 : 30
  const tax = Math.round(subtotal * 0.05)
  const grandTotal = Math.max(0, subtotal + tax + deliveryFee)

  if (items.length === 0) {
    return (
      <div className="bg-[#FBF9F5] min-h-[70vh] flex items-center justify-center py-16">
        <div className="container-custom max-w-md text-center bg-white rounded-xl p-8 shadow-xs border border-[#E7E0D8]">
          <h2 className="font-serif font-bold text-2xl text-[#1C1917] mb-2">
            No Items in Cart
          </h2>
          <p className="text-[#57534E] text-xs mb-6">
            Please add items to your cart before proceeding to checkout.
          </p>
          <Link href="/menu" className="btn btn-primary btn-lg w-full">
            Back to Menu
          </Link>
        </div>
      </div>
    )
  }

  // Mandatory Authentication Check screen
  if (checkingAuth) {
    return (
      <div className="bg-[#FBF9F5] min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-[#B91C1C] mx-auto" />
          <p className="text-xs font-semibold text-[#57534E]">Verifying session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-[#FBF9F5] min-h-[80vh] flex items-center justify-center py-16 px-4">
        <div className="bg-white rounded-2xl p-8 sm:p-10 max-w-md w-full border border-[#E7E0D8] shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-[#B91C1C] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock size={30} />
          </div>

          <div>
            <h2 className="font-serif font-bold text-2xl text-[#1C1917]">
              Sign In Required to Checkout
            </h2>
            <p className="text-[#57534E] text-xs sm:text-sm mt-2 leading-relaxed">
              Please sign in or create an account to complete your order and track live pizza delivery.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/login?redirect=/checkout"
              className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
            >
              <LogIn size={18} /> Sign In to Continue
            </Link>

            <Link
              href="/register?redirect=/checkout"
              className="btn btn-secondary btn-lg w-full flex items-center justify-center gap-2"
            >
              <UserPlus size={18} /> Create New Account
            </Link>
          </div>

          <div className="pt-4 border-t border-[#F4EFEA] text-[11px] text-[#A8A29E]">
            Your items will stay saved in your cart after logging in.
          </div>
        </div>
      </div>
    )
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contactInfo.name || !contactInfo.phone || !addressInfo.line1) {
      toast.error('Please fill in all required fields (Name, Phone, Address)')
      return
    }

    setLoading(true)

    try {
      const res = await createOrder({
        cartItems: items,
        address: {
          name: contactInfo.name,
          phone: contactInfo.phone,
          email: contactInfo.email,
          line1: addressInfo.line1,
          line2: addressInfo.line2,
          city: addressInfo.city,
          state: addressInfo.state,
          pincode: addressInfo.pincode,
          paymentMethod,
        },
        notes: addressInfo.notes,
      })

      if (res.success && res.orderId) {
        toast.success('Order placed successfully!')
        clearCart()
        router.push(`/order/${res.orderId}`)
      } else {
        toast.error(res.error || 'Failed to place order on backend.')
      }
    } catch {
      toast.error('Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-10">
      <div className="container-custom">
        <div className="mb-6">
          <Link href="/cart" className="text-xs font-semibold text-[#57534E] hover:text-[#B91C1C] flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={15} /> Back to Cart
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1917] mb-8">
          Checkout
        </h1>

        <form onSubmit={handlePlaceOrder} className="grid lg:grid-cols-3 gap-8">
          {/* Left Form Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Contact Info Card */}
            <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
              <h2 className="font-serif font-bold text-lg text-[#1C1917] flex items-center justify-between border-b border-[#E7E0D8] pb-3">
                <span>1. Contact Details</span>
                <span className="text-xs font-sans font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Logged in as {user.email || 'User'}
                </span>
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactInfo.name}
                    onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                    placeholder="Rahul Sharma"
                    className="input-field text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="input-field text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                    placeholder="rahul@example.com"
                    className="input-field text-xs sm:text-sm bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
              <h2 className="font-serif font-bold text-lg text-[#1C1917] border-b border-[#E7E0D8] pb-3">
                2. Delivery Address (Prayagraj)
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    House / Flat No., Building Name, Street *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressInfo.line1}
                    onChange={(e) => setAddressInfo({ ...addressInfo, line1: e.target.value })}
                    placeholder="Flat 302, Green Valley Apartments, Allapur"
                    className="input-field text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Landmark / Sector (Optional)
                  </label>
                  <input
                    type="text"
                    value={addressInfo.line2}
                    onChange={(e) => setAddressInfo({ ...addressInfo, line2: e.target.value })}
                    placeholder="Near Allapur Water Tank"
                    className="input-field text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    disabled
                    value={addressInfo.city}
                    className="input-field text-xs sm:text-sm bg-[#F4EFEA] font-semibold text-[#57534E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={addressInfo.pincode}
                    onChange={(e) => setAddressInfo({ ...addressInfo, pincode: e.target.value })}
                    className="input-field text-xs sm:text-sm font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Delivery Instructions / Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={addressInfo.notes}
                    onChange={(e) => setAddressInfo({ ...addressInfo, notes: e.target.value })}
                    placeholder="Please ring the bell twice or leave at the security gate."
                    className="input-field text-xs sm:text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
              <h2 className="font-serif font-bold text-lg text-[#1C1917] border-b border-[#E7E0D8] pb-3">
                3. Select Payment Gateway
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    paymentMethod === 'razorpay'
                      ? 'border-[#B91C1C] bg-[#FEF2F2] ring-2 ring-[#B91C1C]/20'
                      : 'border-[#E7E0D8] hover:border-[#A8A29E]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs uppercase text-[#B91C1C] font-mono">Razorpay</span>
                    <CreditCard size={18} className="text-[#B91C1C]" />
                  </div>
                  <span className="text-[11px] text-[#57534E] leading-tight">
                    UPI, Credit/Debit Cards, NetBanking
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cashfree')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    paymentMethod === 'cashfree'
                      ? 'border-[#B91C1C] bg-[#FEF2F2] ring-2 ring-[#B91C1C]/20'
                      : 'border-[#E7E0D8] hover:border-[#A8A29E]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs uppercase text-[#B91C1C] font-mono">Cashfree</span>
                    <CreditCard size={18} className="text-[#B91C1C]" />
                  </div>
                  <span className="text-[11px] text-[#57534E] leading-tight">
                    Instant UPI, Cards & Wallet
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-[#B91C1C] bg-[#FEF2F2] ring-2 ring-[#B91C1C]/20'
                      : 'border-[#E7E0D8] hover:border-[#A8A29E]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs uppercase text-[#1C1917] font-mono">Cash on Delivery</span>
                    <Banknote size={18} className="text-[#1C1917]" />
                  </div>
                  <span className="text-[11px] text-[#57534E] leading-tight">
                    Pay with Cash or UPI upon delivery
                  </span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Summary Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4 sticky top-28">
              <h3 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3">
                Order Summary
              </h3>

              {/* Items List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-[#1C1917]">{item.quantity}x {item.name}</span>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <p className="text-[10px] text-[#A8A29E]">
                          {item.selectedOptions.map((o) => o.choice).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-[#1C1917]">{formatPrice(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              {/* Pricing breakdown */}
              <div className="pt-3 border-t border-[#E7E0D8] space-y-2 text-xs sm:text-sm text-[#57534E]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold text-[#1C1917]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Tax (5%)</span>
                  <span className="font-mono font-semibold text-[#1C1917]">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="font-bold text-emerald-700">FREE</span>
                  ) : (
                    <span className="font-mono font-semibold text-[#1C1917]">{formatPrice(deliveryFee)}</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E7E0D8] flex justify-between items-center">
                <span className="font-serif font-bold text-[#1C1917]">Total Payable</span>
                <span className="font-mono font-bold text-2xl text-[#B91C1C]">
                  {formatPrice(grandTotal)}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full mt-2 font-bold"
              >
                {loading ? 'Processing Order...' : `Place Order (${paymentMethod.toUpperCase()})`}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#A8A29E] pt-2">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>256-Bit SSL Encrypted & 100% Safe Checkout</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
