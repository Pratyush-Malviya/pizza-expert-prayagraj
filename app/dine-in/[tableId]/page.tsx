'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Pizza, Utensils, CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function DineInTablePage({ params }: { params: Promise<{ tableId: string }> }) {
  const resolvedParams = use(params)
  const tableId = resolvedParams.tableId
  const router = useRouter()
  const { items, getSubtotal, clearCart } = useCartStore()
  const [loading, setLoading] = useState(false)

  const subtotal = getSubtotal()
  const tax = Math.round(subtotal * 0.05)
  const total = subtotal + tax

  const handlePlaceDineInOrder = async () => {
    if (items.length === 0) return
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          status: 'confirmed',
          subtotal,
          tax,
          delivery_fee: 0,
          discount: 0,
          total,
          order_type: 'dine_in',
          address_json: { name: `Table ${tableId}`, line1: `Dine-In Table ${tableId}`, city: 'Allapur Branch', paymentMethod: 'Dine-In Cash/UPI' },
          notes: `DINE-IN ORDER FROM TABLE ${tableId.toUpperCase()}`,
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to send dine-in order to kitchen')
      } else {
        clearCart()
        toast.success(`🍕 Table ${tableId.toUpperCase()} Order Sent to Kitchen!`, {
          description: 'Your food is being freshly prepared.',
          duration: 6000,
        })
        router.push(`/track?orderId=${order.id}`)
      }
    } catch {
      toast.error('Dine-in order error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E7E0D8] shadow-xs text-center space-y-3">
          <div className="w-12 h-12 bg-[#B91C1C] text-white rounded-xl mx-auto flex items-center justify-center font-serif font-bold text-xl">
            <Utensils size={24} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917]">
            Dine-In QR Menu — Table {tableId.toUpperCase()}
          </h1>
          <p className="text-xs text-[#78716C]">
            Order directly from your table. Your order goes straight to our kitchen display in Allapur!
          </p>
        </div>

        {/* Order Summary & Quick Checkout */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-base text-[#1C1917] border-b border-[#E7E0D8] pb-2">
            Selected Table Items ({items.length})
          </h3>

          {items.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-[#78716C]">Your table order is empty.</p>
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#B91C1C] text-white text-xs font-semibold rounded-lg"
              >
                Browse Menu <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs text-[#1C1917]">
                  <span className="font-medium">{item.quantity}x {item.name}</span>
                  <span className="font-mono font-bold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}

              <div className="pt-3 border-t border-[#E7E0D8] space-y-1 text-xs text-[#78716C]">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between"><span>GST (5%):</span><span>{formatPrice(tax)}</span></div>
                <div className="flex justify-between font-bold text-sm text-[#B91C1C] pt-1 border-t border-[#E7E0D8]">
                  <span>Total Payable:</span><span>{formatPrice(total)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceDineInOrder}
                disabled={loading}
                className="w-full py-3 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Send Table Order to Kitchen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
