'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag, Check, ArrowLeft, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { toast } from 'sonner'
import { fetchEta } from '@/app/actions/eta'
import { EtaEstimate } from '@/lib/eta'
import CartUpsell from '@/components/cart/CartUpsell'

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getSubtotal, getItemKey } = useCartStore()
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [eta, setEta] = useState<EtaEstimate | null>(null)

  useEffect(() => {
    fetchEta().then(setEta).catch(console.error)
  }, [])

  const subtotal = getSubtotal()
  const deliveryFee = subtotal >= 499 || subtotal === 0 ? 0 : 30
  const tax = Math.round(subtotal * 0.05) // 5% GST
  const grandTotal = Math.max(0, subtotal + tax + deliveryFee - discount)

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponCode.trim()) return

    const code = couponCode.trim().toUpperCase()
    if (code === 'WELCOME20') {
      const disc = Math.round(subtotal * 0.2)
      setDiscount(disc)
      setAppliedCoupon('WELCOME20')
      toast.success('Coupon WELCOME20 applied! 20% discount added.')
    } else if (code === 'FLAT50') {
      setDiscount(50)
      setAppliedCoupon('FLAT50')
      toast.success('Coupon FLAT50 applied! ₹50 discount added.')
    } else if (code === 'PIZZA10') {
      const disc = Math.round(subtotal * 0.1)
      setDiscount(disc)
      setAppliedCoupon('PIZZA10')
      toast.success('Coupon PIZZA10 applied! 10% discount added.')
    } else {
      toast.error('Invalid coupon code. Try WELCOME20, FLAT50 or PIZZA10')
    }
  }

  const removeCoupon = () => {
    setDiscount(0)
    setAppliedCoupon(null)
    setCouponCode('')
    toast.info('Coupon removed')
  }

  if (items.length === 0) {
    return (
      <div className="bg-[#FBF9F5] min-h-[70vh] flex items-center justify-center py-16">
        <div className="container-custom max-w-md text-center bg-white rounded-xl p-8 shadow-xs border border-[#E7E0D8]">
          <div className="w-16 h-16 bg-[#FEF2F2] text-[#B91C1C] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={28} />
          </div>
          <h2 className="font-serif font-bold text-2xl text-[#1C1917] mb-2">
            Your Cart is Empty
          </h2>
          <p className="text-[#57534E] text-xs sm:text-sm mb-6">
            Looks like you haven&apos;t added any wood-fired pizzas or burgers yet.
          </p>
          <Link href="/menu" className="btn btn-primary btn-lg w-full">
            Browse Menu
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-10">
      <div className="container-custom">
        {/* Back link */}
        <div className="mb-6">
          <Link href="/menu" className="text-xs font-semibold text-[#57534E] hover:text-[#B91C1C] flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={15} /> Continue Shopping
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1917] mb-8">
          Shopping Cart ({items.reduce((s, i) => s + i.quantity, 0)} {items.length === 1 ? 'item' : 'items'})
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-6">
              {items.map((item) => {
                const key = getItemKey(item.id, item.selectedOptions)
                return (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#E7E0D8] last:border-b-0 last:pb-0 gap-4"
                  >
                    {/* Item Details */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#F4EFEA] rounded-lg overflow-hidden flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-3xl select-none">🍕</span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-serif font-bold text-[#1C1917] text-base mb-1">
                          {item.name}
                        </h3>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="text-xs text-[#A8A29E] space-x-1.5 mb-1">
                            {item.selectedOptions.map((opt) => (
                              <span key={opt.optionName} className="inline-block bg-[#FBF9F5] px-2 py-0.5 rounded border border-[#E7E0D8]">
                                {opt.optionName}: {opt.choice}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="font-bold text-[#B91C1C] text-sm">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6">
                      <div className="flex items-center gap-2 bg-[#F4EFEA] rounded-md px-2 py-1">
                        <button
                          onClick={() => updateQuantity(key, item.quantity - 1)}
                          className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-[#1C1917] hover:bg-[#E7E0D8] transition-colors font-bold text-xs"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-bold text-xs text-[#1C1917] w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(key, item.quantity + 1)}
                          className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-[#1C1917] hover:bg-[#E7E0D8] transition-colors font-bold text-xs"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(key)}
                        className="p-1.5 text-[#A8A29E] hover:text-[#B91C1C] transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}

              <div className="pt-4 border-t border-[#E7E0D8] flex justify-between items-center text-xs">
                <button
                  onClick={clearCart}
                  className="text-[#A8A29E] hover:text-[#B91C1C] font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash2 size={13} /> Clear Entire Cart
                </button>
                <span className="text-[#57534E]">
                  Free delivery on orders above ₹499
                </span>
              </div>
            </div>

            {/* Frequently Bought Together Upsell */}
            <CartUpsell />
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Coupon Card */}
            <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-serif font-bold text-[#1C1917] text-sm">
                <Tag size={15} className="text-[#B91C1C]" /> Apply Coupon
              </div>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-[#F0FDF4] border border-[#15803D]/30 rounded-md p-2.5 text-xs text-[#15803D]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Check size={14} />
                    <span>{appliedCoupon}</span>
                  </div>
                  <button onClick={removeCoupon} className="text-[#B91C1C] hover:underline font-semibold">
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. WELCOME20"
                    className="input-field uppercase text-xs font-mono py-2 flex-1"
                  />
                  <button type="submit" className="btn btn-primary btn-sm px-3">
                    Apply
                  </button>
                </form>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs space-y-4">
              <h3 className="font-serif font-bold text-[#1C1917] text-base border-b border-[#E7E0D8] pb-3">
                Order Summary
              </h3>

              <div className="space-y-2 text-xs sm:text-sm text-[#57534E]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#1C1917] font-mono">{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span>GST Tax (5%)</span>
                  <span className="font-semibold text-[#1C1917] font-mono">{formatPrice(tax)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="font-bold text-[#15803D]">FREE</span>
                  ) : (
                    <span className="font-semibold text-[#1C1917] font-mono">{formatPrice(deliveryFee)}</span>
                  )}
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-[#15803D] font-semibold">
                    <span>Discount</span>
                    <span className="font-mono">-{formatPrice(discount)}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E7E0D8] flex justify-between items-center">
                <span className="font-serif font-bold text-[#1C1917]">Total Payable</span>
                <span className="font-bold text-2xl text-[#B91C1C]">
                  {formatPrice(grandTotal)}
                </span>
              </div>

              {eta && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 mt-2 flex items-center gap-2 text-xs">
                  <Clock size={16} className="text-[#B91C1C]" />
                  <span className="text-[#991B1B] font-medium">Estimated Delivery: <strong>~{eta.totalLabel}</strong></span>
                </div>
              )}

              <Link href="/checkout" className="btn btn-primary btn-lg w-full mt-2 flex items-center justify-center gap-2">
                Proceed to Checkout <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
