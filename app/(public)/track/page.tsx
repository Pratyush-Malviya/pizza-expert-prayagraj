'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Clock, MapPin, ChefHat } from 'lucide-react'

function TrackOrderContent() {
  const searchParams = useSearchParams()
  const initialOrderId = searchParams.get('orderId') || ''

  const [inputQuery, setInputQuery] = useState(initialOrderId)
  const [trackedOrder, setTrackedOrder] = useState<{
    id: string
    status: 'placed' | 'preparing' | 'out_for_delivery' | 'delivered'
    statusLabel: string
    eta: string
    address: string
  } | null>(() => {
    if (initialOrderId.trim()) {
      return {
        id: initialOrderId.trim().toUpperCase(),
        status: 'preparing',
        statusLabel: 'Chef is baking your wood-fired pizza',
        eta: '20–25 minutes',
        address: 'House 42, Civil Lines, Prayagraj',
      }
    }
    return null
  })

  const handleSearch = (query: string) => {
    if (!query.trim()) return
    setTrackedOrder({
      id: query.trim().toUpperCase(),
      status: 'preparing',
      statusLabel: 'Chef is baking your wood-fired pizza',
      eta: '20–25 minutes',
      address: 'House 42, Civil Lines, Prayagraj',
    })
  }

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1917] mb-2">
            Track Your Order
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            Enter your Order ID or phone number to see real-time status updates from our kitchen.
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
              placeholder="Enter Order ID (e.g. ORD-982143)..."
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

        {/* Tracking Details */}
        {trackedOrder && (
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#E7E0D8] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-4">
              <div>
                <span className="text-[10px] text-[#A8A29E] uppercase font-bold tracking-wider block">Tracking Order</span>
                <span className="font-mono font-bold text-[#1C1917] text-lg">{trackedOrder.id}</span>
              </div>
              <div className="bg-[#FFFBEB] text-[#D97706] px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 border border-[#D97706]/30">
                <ChefHat size={14} /> {trackedOrder.statusLabel}
              </div>
            </div>

            {/* ETA Box */}
            <div className="bg-[#FEF2F2] rounded-lg p-4 border border-[#B91C1C]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#B91C1C] text-white rounded-md flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-[#57534E] uppercase font-bold tracking-wider block">Estimated Arrival</span>
                  <span className="font-bold text-[#1C1917] text-sm sm:text-base font-mono">{trackedOrder.eta}</span>
                </div>
              </div>
            </div>

            {/* Status Steps Progress */}
            <div className="py-2">
              <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E7E0D8]">
                <div className="flex items-start gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-[#15803D] text-white flex items-center justify-center text-xs font-bold z-10">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#1C1917] text-sm">Order Placed & Confirmed</h4>
                    <p className="text-xs text-[#57534E]">Sent to our Allapur kitchen.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-[#B91C1C] text-white flex items-center justify-center text-xs font-bold z-10">
                    🔥
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#B91C1C] text-sm">Baking in Oven</h4>
                    <p className="text-xs text-[#57534E]">Hand-tossed dough baking with fresh mozzarella.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative opacity-40">
                  <div className="w-7 h-7 rounded-full bg-[#E7E0D8] text-[#57534E] flex items-center justify-center text-xs font-bold z-10">
                    🛵
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#1C1917] text-sm">Out for Delivery</h4>
                    <p className="text-xs text-[#57534E]">Rider will pick up soon.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative opacity-40">
                  <div className="w-7 h-7 rounded-full bg-[#E7E0D8] text-[#57534E] flex items-center justify-center text-xs font-bold z-10">
                    🏡
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#1C1917] text-sm">Delivered</h4>
                    <p className="text-xs text-[#57534E]">Enjoy your hot wood-fired pizza!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Location */}
            <div className="pt-4 border-t border-[#E7E0D8] flex items-center justify-between text-xs text-[#57534E]">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-[#B91C1C]" /> Address: {trackedOrder.address}
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
