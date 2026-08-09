'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Clock, MapPin, ChefHat, CheckCircle2, Flame, Truck, Home } from 'lucide-react'

function TrackOrderContent() {
  const searchParams = useSearchParams()
  const initialOrderId = searchParams.get('orderId') || ''

  const [inputQuery, setInputQuery] = useState(initialOrderId)
  const [currentStatus, setCurrentStatus] = useState<string>('preparing')
  const [addressStr, setAddressStr] = useState<string>('House 42, Civil Lines, Prayagraj')
  const [orderId, setOrderId] = useState<string>(initialOrderId || 'ORD-982143')
  const supabase = createClient()

  // Fetch initial status & setup Supabase Realtime subscription
  useEffect(() => {
    if (!orderId) return

    const fetchStatus = async () => {
      // Check local storage fallback first for instant update
      try {
        const savedStatus = localStorage.getItem(`order_status_${orderId}`)
        if (savedStatus) {
          setCurrentStatus(savedStatus)
        }
        const localOrders = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
        const match = localOrders.find((o: any) => o.id === orderId || o.order_id === orderId)
        if (match && match.status) {
          setCurrentStatus(match.status)
        }
      } catch {}

      // Fetch from Supabase
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (data) {
        setCurrentStatus(data.status)
        if (data.address_json?.line1) {
          setAddressStr(`${data.address_json.line1}, ${data.address_json.city || 'Prayagraj'}`)
        }
      }
    }

    fetchStatus()

    // Realtime WebSocket Subscription
    const channel = supabase
      .channel(`order-track-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.new && (payload.new.id === orderId || payload.new.order_id === orderId) && payload.new.status) {
            setCurrentStatus(payload.new.status)
          }
        }
      )
      .subscribe()

    // Custom Event Listener for local status changes
    const handleStatusSync = (e: any) => {
      if (e.detail?.orderId === orderId && e.detail?.newStatus) {
        setCurrentStatus(e.detail.newStatus)
      } else {
        fetchStatus()
      }
    }

    window.addEventListener('orderStatusUpdated', handleStatusSync)
    window.addEventListener('storage', handleStatusSync)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('orderStatusUpdated', handleStatusSync)
      window.removeEventListener('storage', handleStatusSync)
    }
  }, [orderId])

  const handleSearch = (query: string) => {
    if (!query.trim()) return
    setOrderId(query.trim())
  }

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return 1
      case 'preparing':
        return 2
      case 'out_for_delivery':
        return 3
      case 'delivered':
        return 4
      default:
        return 2
    }
  }

  const stepIndex = getStatusStepIndex(currentStatus)

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1917] mb-2">
            Live Order Tracking
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            Watch your order progress live from our wood-fired oven in Allapur straight to your doorstep.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl p-3 shadow-xs border border-[#E7E0D8] mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Enter Order ID..."
              className="input-field pl-10 pr-3 py-2.5 text-xs sm:text-sm border-none bg-[#FBF9F5]"
            />
          </div>
          <button
            onClick={() => handleSearch(inputQuery)}
            className="btn btn-primary px-5 rounded-md text-xs sm:text-sm"
          >
            Track Order
          </button>
        </div>

        {/* Live Tracking Card */}
        {orderId && (
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#E7E0D8] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-4">
              <div>
                <span className="text-[10px] text-[#A8A29E] uppercase font-bold tracking-wider block">Tracking Order</span>
                <span className="font-mono font-bold text-[#1C1917] text-lg">{orderId}</span>
              </div>
              <div className="bg-[#FFFBEB] text-[#D97706] px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-[#D97706]/30 uppercase font-mono">
                <span className="w-2 h-2 rounded-full bg-[#D97706] animate-ping" />
                {currentStatus.replace(/_/g, ' ')}
              </div>
            </div>

            {/* ETA Box */}
            <div className="bg-[#FEF2F2] rounded-lg p-4 border border-[#B91C1C]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#B91C1C] text-white rounded-md flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-[#57534E] uppercase font-bold tracking-wider block">Estimated Delivery</span>
                  <span className="font-bold text-[#1C1917] text-sm sm:text-base font-mono">
                    {stepIndex === 4 ? 'Delivered!' : '20–25 Minutes'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Status Timeline */}
            <div className="py-4">
              <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E7E0D8]">
                {/* Step 1: Placed */}
                <div className={`flex items-start gap-4 relative ${stepIndex >= 1 ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${stepIndex >= 1 ? 'bg-[#15803D] text-white' : 'bg-[#E7E0D8] text-[#57534E]'}`}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#1C1917] text-sm">Order Confirmed</h4>
                    <p className="text-xs text-[#57534E]">Received by restaurant & sent to kitchen.</p>
                  </div>
                </div>

                {/* Step 2: Preparing / Baking */}
                <div className={`flex items-start gap-4 relative ${stepIndex >= 2 ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${stepIndex >= 2 ? 'bg-[#B91C1C] text-white' : 'bg-[#E7E0D8] text-[#57534E]'}`}>
                    <Flame size={16} />
                  </div>
                  <div>
                    <h4 className={`font-serif font-bold text-sm ${stepIndex === 2 ? 'text-[#B91C1C]' : 'text-[#1C1917]'}`}>
                      Baking in Oven {stepIndex === 2 && '(Live Step)'}
                    </h4>
                    <p className="text-xs text-[#57534E]">Hand-tossed dough baking with premium mozzarella.</p>
                  </div>
                </div>

                {/* Step 3: Out for Delivery */}
                <div className={`flex items-start gap-4 relative ${stepIndex >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${stepIndex >= 3 ? 'bg-purple-600 text-white' : 'bg-[#E7E0D8] text-[#57534E]'}`}>
                    <Truck size={16} />
                  </div>
                  <div>
                    <h4 className={`font-serif font-bold text-sm ${stepIndex === 3 ? 'text-purple-600' : 'text-[#1C1917]'}`}>
                      Out for Delivery {stepIndex === 3 && '(Rider En Route)'}
                    </h4>
                    <p className="text-xs text-[#57534E]">Delivery partner has picked up your fresh hot order.</p>
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className={`flex items-start gap-4 relative ${stepIndex >= 4 ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${stepIndex >= 4 ? 'bg-emerald-600 text-white' : 'bg-[#E7E0D8] text-[#57534E]'}`}>
                    <Home size={16} />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#1C1917] text-sm">Delivered</h4>
                    <p className="text-xs text-[#57534E]">Enjoy your delicious meal!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Footer */}
            <div className="pt-4 border-t border-[#E7E0D8] flex items-center justify-between text-xs text-[#57534E]">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-[#B91C1C]" /> Delivery Address: {addressStr}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-serif">Loading tracking details...</div>}>
      <TrackOrderContent />
    </Suspense>
  )
}
