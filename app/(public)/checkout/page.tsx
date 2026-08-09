'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck, CreditCard, Banknote } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { createOrder } from '@/app/actions/orders'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart, getSubtotal } = useCartStore()

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

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contactInfo.name || !contactInfo.phone || !addressInfo.line1) {
      toast.error('Please fill in all required contact and delivery fields.')
      return
    }

    setLoading(true)

    try {
      // Call authoritative Server Action
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
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/cart" className="text-xs font-semibold text-[#57534E] hover:text-[#B91C1C] flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={15} /> Back to Cart
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1917] mb-8">
          Checkout
        </h1>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form Steps */}
            <div className="lg:col-span-2 space-y-6">

              {/* 1. Contact Info */}
              <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
                <div className="flex items-center gap-2 font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3">
                  <span className="w-6 h-6 bg-[#B91C1C] text-white rounded-md flex items-center justify-center text-xs">1</span>
                  Contact Information
                </div>

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
                      className="input-field"
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
                      placeholder="+91 99999 99999"
                      className="input-field"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                      Email Address (optional)
                    </label>
                    <input
                      type="email"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      placeholder="rahul@example.com"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Delivery Address */}
              <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
                <div className="flex items-center gap-2 font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3">
                  <span className="w-6 h-6 bg-[#B91C1C] text-white rounded-md flex items-center justify-center text-xs">2</span>
                  Delivery Address
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                      Street Address / House No. / Landmark *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressInfo.line1}
                      onChange={(e) => setAddressInfo({ ...addressInfo, line1: e.target.value })}
                      placeholder="House 42, Civil Lines, Near Traffic Signal"
                      className="input-field"
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        disabled
                        value={addressInfo.city}
                        className="input-field bg-[#F4EFEA] text-[#57534E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        disabled
                        value={addressInfo.state}
                        className="input-field bg-[#F4EFEA] text-[#57534E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        value={addressInfo.pincode}
                        onChange={(e) => setAddressInfo({ ...addressInfo, pincode: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                      Delivery Instructions (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={addressInfo.notes}
                      onChange={(e) => setAddressInfo({ ...addressInfo, notes: e.target.value })}
                      placeholder="Ring doorbell, leave at gate, etc."
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Payment Option */}
              <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
                <div className="flex items-center gap-2 font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3">
                  <span className="w-6 h-6 bg-[#B91C1C] text-white rounded-md flex items-center justify-center text-xs">3</span>
                  Payment Option
                </div>

                <div className="space-y-3">
                  {/* Razorpay */}
                  <label
                    onClick={() => setPaymentMethod('razorpay')}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === 'razorpay'
                        ? 'border-[#B91C1C] bg-[#FEF2F2]'
                        : 'border-[#E7E0D8] bg-white hover:border-[#A8A29E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-[#B91C1C]" size={20} />
                      <div>
                        <p className="font-bold text-sm text-[#1C1917]">
                          Razorpay (UPI / Cards / NetBanking)
                        </p>
                        <p className="text-xs text-[#57534E]">
                          Instant checkout via Google Pay, PhonePe, Paytm or Card
                        </p>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === 'razorpay'} readOnly className="accent-[#B91C1C]" />
                  </label>

                  {/* Cashfree */}
                  <label
                    onClick={() => setPaymentMethod('cashfree')}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === 'cashfree'
                        ? 'border-[#B91C1C] bg-[#FEF2F2]'
                        : 'border-[#E7E0D8] bg-white hover:border-[#A8A29E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="text-[#18181B]" size={20} />
                      <div>
                        <p className="font-bold text-sm text-[#1C1917]">
                          Cashfree Payments
                        </p>
                        <p className="text-xs text-[#57534E]">
                          Secure wallet and UPI checkout
                        </p>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === 'cashfree'} readOnly className="accent-[#B91C1C]" />
                  </label>

                  {/* COD */}
                  <label
                    onClick={() => setPaymentMethod('cod')}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-[#B91C1C] bg-[#FEF2F2]'
                        : 'border-[#E7E0D8] bg-white hover:border-[#A8A29E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Banknote className="text-[#15803D]" size={20} />
                      <div>
                        <p className="font-bold text-sm text-[#1C1917]">
                          Cash on Delivery (COD)
                        </p>
                        <p className="text-xs text-[#57534E]">
                          Pay with cash when your food arrives
                        </p>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === 'cod'} readOnly className="accent-[#B91C1C]" />
                  </label>
                </div>
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs space-y-4 sticky top-24">
                <h3 className="font-serif font-bold text-[#1C1917] text-base border-b border-[#E7E0D8] pb-3">
                  Order Details ({items.length} items)
                </h3>

                <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <div>
                        <p className="font-bold text-[#1C1917]">{item.name} x {item.quantity}</p>
                        {item.selectedOptions?.map((o) => (
                          <span key={o.optionName} className="text-[#A8A29E] block">{o.choice}</span>
                        ))}
                      </div>
                      <span className="font-semibold text-[#1C1917] font-mono">{formatPrice(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#E7E0D8] space-y-1.5 text-xs text-[#57534E]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST Tax (5%)</span>
                    <span className="font-mono">{formatPrice(tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    {deliveryFee === 0 ? (
                      <span className="text-[#15803D] font-bold">FREE</span>
                    ) : (
                      <span className="font-mono">{formatPrice(deliveryFee)}</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E7E0D8] flex justify-between items-center">
                  <span className="font-serif font-bold text-[#1C1917]">Total Payable</span>
                  <span className="font-bold text-2xl text-[#B91C1C]">
                    {formatPrice(grandTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg w-full mt-2 disabled:opacity-60"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>

                <p className="text-[10px] text-[#A8A29E] text-center flex items-center justify-center gap-1">
                  <ShieldCheck size={12} className="text-[#15803D]" /> Safe & 256-bit Encrypted Checkout
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
