'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resumeHeldOrder } from '@/app/actions/posOrders'
import { Pause, RotateCcw, Trash2, Clock, Loader2, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HeldOrdersPage() {
  const [heldOrders, setHeldOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadHeld = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('held_orders')
      .select('*')
      .eq('cashier_id', user.id)
      .eq('is_active', true)
      .order('held_at', { ascending: false })

    setHeldOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { loadHeld() }, [])

  const handleResume = async (id: string) => {
    const result = await resumeHeldOrder(id)
    if (result.success) {
      // Store order data in session storage and navigate to POS
      sessionStorage.setItem('pos-resume-order', JSON.stringify(result.orderData))
      toast.success('Order resumed')
      router.push('/admin/pos')
    } else {
      toast.error('Failed to resume order')
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('held_orders').update({ is_active: false }).eq('id', id)
    toast.success('Held order discarded')
    loadHeld()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Held Orders</h1>
          <p className="text-sm text-[#78716C] mt-0.5">Resume a paused order</p>
        </div>
        <Link
          href="/admin/pos"
          className="flex items-center gap-2 px-4 py-2 bg-[#B91C1C] text-white rounded-xl text-sm font-semibold hover:bg-[#991B1B] transition"
        >
          <ShoppingBag size={14} /> New Order
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#B91C1C]" /></div>
      ) : heldOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] p-12 text-center">
          <Pause size={40} className="mx-auto mb-3 text-[#D6D3D1]" />
          <p className="text-[#78716C] font-semibold">No held orders</p>
          <p className="text-sm text-[#A8A29E] mt-1">Orders you pause will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {heldOrders.map((order) => {
            const data = order.order_data || {}
            const cart = data.cart || []
            const total = cart.reduce((s: number, l: any) => s + l.unitPrice * l.quantity, 0)
            const itemCount = cart.reduce((s: number, l: any) => s + l.quantity, 0)
            const heldAgo = Math.round((Date.now() - new Date(order.held_at).getTime()) / 60000)

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-[#E7E0D8] p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                    <Pause size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#1C1917] text-sm truncate">
                      {order.label || 'Unnamed Order'}
                    </p>
                    <p className="text-xs text-[#78716C]">
                      {itemCount} items · ₹{total.toFixed(2)} · {heldAgo < 1 ? 'Just now' : `${heldAgo}m ago`}
                    </p>
                    <p className="text-xs text-[#A8A29E] truncate">
                      {cart.slice(0, 3).map((l: any) => `${l.quantity}× ${l.productName}`).join(', ')}
                      {cart.length > 3 && ` +${cart.length - 3} more`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="p-2 rounded-lg border border-[#E7E0D8] text-[#A8A29E] hover:text-[#B91C1C] hover:border-[#B91C1C]/30 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => handleResume(order.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1917] text-white rounded-xl text-xs font-semibold hover:bg-[#292524] transition"
                  >
                    <RotateCcw size={12} /> Resume
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
