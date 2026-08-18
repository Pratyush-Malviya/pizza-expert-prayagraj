'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Clock, MapPin, ChefHat, CheckCircle2, Flame,
  Truck, Home, Bell, BellRing, XCircle, AlertCircle,
  CreditCard, MessageCircle, RefreshCw, Compass, ShieldCheck
} from 'lucide-react'
import { requestNotificationPermission, notifyOrderStatusChange, playNotificationSound } from '@/lib/utils/notifications'
import LoyaltyBadge from '@/components/profile/LoyaltyBadge'
import QuickReorderButton from '@/components/orders/QuickReorderButton'
import DriverInfoCard from '@/components/tracking/DriverInfoCard'
import DeliverySimulatorControl from '@/components/tracking/DeliverySimulatorControl'
import type { GPSLocation, DeliveryPartner } from '@/lib/tracking/types'
import { DEFAULT_SAMPLE_DRIVER, STORE_LOCATION } from '@/lib/tracking/types'

// Dynamic Map Import to prevent SSR issues with Leaflet
const LiveDeliveryMap = dynamic(() => import('@/components/tracking/LiveDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] sm:h-[440px] rounded-2xl bg-[#FBF9F5] border border-[#E7E0D8] flex flex-col items-center justify-center gap-2 text-xs font-mono text-[#78716C]">
      <Compass size={28} className="text-[#B91C1C] animate-spin" />
      <span>Loading Live GPS Telemetry Map...</span>
    </div>
  ),
})

function TrackOrderContent() {
  const searchParams = useSearchParams()
  const initialOrderId = searchParams.get('orderId') || ''

  const [inputQuery, setInputQuery] = useState(initialOrderId)
  const [currentStatus, setCurrentStatus] = useState<string>('heading_to_customer')
  const [addressStr, setAddressStr] = useState<string>('House 42, Civil Lines, Prayagraj')
  const [orderTotal, setOrderTotal] = useState<number>(499)
  const [paymentMethod, setPaymentMethod] = useState<string>('Razorpay UPI')
  const [orderId, setOrderId] = useState<string>(initialOrderId || 'ORD-982143')
  const [notiGranted, setNotiGranted] = useState<boolean>(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date())
  const [driverLocation, setDriverLocation] = useState<GPSLocation | null>({
    lat: 25.4410,
    lng: 81.8590,
    heading: 120,
    speed: 24,
    updatedAt: Date.now(),
  })
  const [driver] = useState<DeliveryPartner>(DEFAULT_SAMPLE_DRIVER)
  const [otpCode] = useState<string>('4821')
  const [etaMinutes, setEtaMinutes] = useState<number>(12)
  const [distanceKm, setDistanceKm] = useState<number>(2.4)
  const supabase = createClient()

  // Fetch initial status, background auto-polling every 3.5s & setup Supabase Realtime subscriptions
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
        if (match) {
          if (match.status) setCurrentStatus(match.status)
          if (match.total) setOrderTotal(Number(match.total))
          if (match.paymentMethod) setPaymentMethod(match.paymentMethod)
        }
      } catch {}

      // Fetch from Supabase directly
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (data) {
          setCurrentStatus((prev) => {
            if (prev !== data.status) {
              if (data.status === 'cancelled') {
                playNotificationSound('alert')
              } else {
                playNotificationSound('status_change')
              }
            }
            return data.status
          })
          if (data.total) setOrderTotal(Number(data.total))
          if (data.address_json?.paymentMethod) setPaymentMethod(data.address_json.paymentMethod)
          if (data.address_json?.line1) {
            setAddressStr(`${data.address_json.line1}, ${data.address_json.city || 'Prayagraj'}`)
          }
          setLastSyncedAt(new Date())
        }
      } catch {}
    }

    fetchStatus()

    // ── Continuous Background Auto-Polling (No Page Reload Needed) ──
    const pollInterval = setInterval(() => {
      fetchStatus()
    }, 3500)

    // ── Realtime WebSocket Subscription & GPS Broadcast Listener ──
    const channel = supabase
      .channel(`tracking-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.new && (payload.new.id === orderId || payload.new.order_id === orderId) && payload.new.status) {
            const newSt = payload.new.status
            setCurrentStatus((prev) => {
              if (prev !== newSt) {
                if (newSt === 'cancelled') {
                  playNotificationSound('alert')
                } else {
                  playNotificationSound('status_change')
                }
              }
              return newSt
            })
            setLastSyncedAt(new Date())
          }
        }
      )
      .on('broadcast', { event: 'location' }, (payload: any) => {
        if (payload?.payload?.lat && payload?.payload?.lng) {
          setDriverLocation({
            lat: payload.payload.lat,
            lng: payload.payload.lng,
            heading: payload.payload.heading,
            speed: payload.payload.speed,
            updatedAt: Date.now(),
          })
          if (payload.payload.status) {
            setCurrentStatus(payload.payload.status)
          }
          setLastSyncedAt(new Date())
        }
      })
      .subscribe()

    // Custom Event Listener for local status changes
    const handleStatusSync = (e: any) => {
      if (e.detail?.orderId === orderId && e.detail?.newStatus) {
        setCurrentStatus(e.detail.newStatus)
        setLastSyncedAt(new Date())
      } else {
        fetchStatus()
      }
    }

    window.addEventListener('orderStatusUpdated', handleStatusSync)
    window.addEventListener('storage', handleStatusSync)

    return () => {
      clearInterval(pollInterval)
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
      case 'assigned':
        return 1
      case 'preparing':
      case 'baking':
        return 2
      case 'picked_up':
      case 'heading_to_customer':
      case 'out_for_delivery':
        return 3
      case 'delivered':
        return 4
      case 'cancelled':
        return -1
      default:
        return 3
    }
  }

  const stepIndex = getStatusStepIndex(currentStatus)
  const isCancelled = currentStatus === 'cancelled'

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-10 sm:py-14">
      <div className="container-custom max-w-3xl space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] text-xs font-bold font-mono uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-[#B91C1C] animate-pulse"></span>
            Real-Time GPS Order Tracking
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-[#1C1917] tracking-tight mb-2">
            Live Order Tracking
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm max-w-lg mx-auto">
            Watch your pizza make its journey live from our wood-fired oven in Allapur straight to your doorstep in Prayagraj.
          </p>
        </div>

        {/* Order ID Search Bar */}
        <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-[#E7E0D8] flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Search by Order ID (e.g. ORD-982143)..."
              className="input-field pl-10 pr-3 py-2.5 text-xs sm:text-sm border-none bg-[#FBF9F5]"
            />
          </div>
          <button
            onClick={() => handleSearch(inputQuery)}
            className="btn btn-primary px-5 rounded-xl text-xs sm:text-sm shadow-xs"
          >
            Track
          </button>
        </div>

        {/* Live GPS Simulator Test Bar (For Demo & Testing) */}
        <DeliverySimulatorControl
          orderId={orderId}
          onLocationUpdate={(loc, idx) => {
            setDriverLocation(loc)
            const remainingSteps = 9 - idx
            setEtaMinutes(Math.max(Math.round(remainingSteps * 1.5), 1))
            setDistanceKm(Number((remainingSteps * 0.35).toFixed(1)))
          }}
          onStatusChange={(st) => setCurrentStatus(st)}
        />

        {/* Live Interactive Map Canvas */}
        <LiveDeliveryMap
          driverLocation={driverLocation}
          destinationLocation={{ lat: 25.4528, lng: 81.8346 }}
          destinationAddress={addressStr}
          status={currentStatus}
          driverName={driver.name}
          etaMinutes={etaMinutes}
          distanceKm={distanceKm}
        />

        {/* Main Tracking Details Card */}
        {orderId && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E7E0D8] shadow-sm space-y-6">
            {/* Top Bar with Order ID & Notifications */}
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-4 flex-wrap gap-2">
              <div>
                <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block">Tracking Order</span>
                <span className="font-mono font-black text-[#1C1917] text-lg sm:text-xl">{orderId}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const granted = await requestNotificationPermission()
                    setNotiGranted(granted)
                    if (granted) {
                      notifyOrderStatusChange(orderId, currentStatus)
                    }
                  }}
                  title={notiGranted ? "Notifications Enabled" : "Enable Live Status Notifications"}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    notiGranted 
                      ? 'bg-[#E6F4EA] border-[#137333] text-[#137333]' 
                      : 'bg-white border-[#E7E0D8] text-[#57534E] hover:border-[#e10600]'
                  }`}
                >
                  {notiGranted ? <BellRing size={16} className="text-[#137333]" /> : <Bell size={16} />}
                  <span className="hidden sm:inline">{notiGranted ? 'Alerts Active' : 'Enable Alerts'}</span>
                </button>

                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border uppercase font-mono ${
                  isCancelled
                    ? 'bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]/30'
                    : 'bg-[#FFFBEB] text-[#D97706] border-[#D97706]/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isCancelled ? 'bg-[#DC2626]' : 'bg-[#D97706] animate-ping'}`} />
                  {currentStatus.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            {/* Live Auto-Refresh Pulse Bar */}
            <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-[#57534E]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-[#1C1917]">Live Auto-Sync Active</span>
                <span className="text-[11px] text-[#78716C] hidden sm:inline">• Streamed via Supabase Realtime</span>
              </div>
              <span className="text-[11px] font-mono text-[#78716C]">
                Updated: {lastSyncedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Rider Information Card (Zomato-Style) */}
            <DriverInfoCard
              driver={driver}
              otpCode={otpCode}
              orderId={orderId}
              orderTotal={orderTotal}
              status={currentStatus}
            />

            {/* ORDER CANCELLED STATE */}
            {isCancelled ? (
              <div className="space-y-6">
                <div className="bg-[#FEF2F2] rounded-xl p-5 border border-[#FCA5A5] space-y-3">
                  <div className="flex items-center gap-3 text-[#B91C1C]">
                    <XCircle size={26} className="flex-shrink-0" />
                    <div>
                      <h3 className="font-serif font-bold text-base text-[#991B1B]">Order Cancelled</h3>
                      <p className="text-xs text-[#7F1D1D]">
                        This order was cancelled by the store. If payment was made, your refund has been automatically initiated.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FDFBF7] rounded-xl p-5 border border-[#E7E0D8] space-y-4">
                  <h4 className="font-serif font-bold text-sm text-[#1C1917] flex items-center gap-2">
                    <CreditCard size={18} className="text-[#16A34A]" />
                    Refund & Transaction Details
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-[#E7E0D8]">
                      <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block mb-1">Refund Status</span>
                      <span className="font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full inline-block">
                        Initiated & Processing
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-[#E7E0D8]">
                      <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block mb-1">Refund Amount</span>
                      <span className="font-bold text-[#1C1917] text-sm font-mono">₹{orderTotal}.00</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-[#E7E0D8]">
                      <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block mb-1">Payment Method</span>
                      <span className="font-semibold text-[#44403C] capitalize">{paymentMethod}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-[#E7E0D8]">
                      <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block mb-1">Refund Reference ID</span>
                      <span className="font-mono text-[#78716C]">RFND-{orderId.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Live Status Progress Stepper */}
                <div className="py-2">
                  <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E7E0D8]">
                    {/* Step 1: Placed */}
                    <div className={`flex items-start gap-4 relative ${stepIndex >= 1 ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${stepIndex >= 1 ? 'bg-[#15803D] text-white' : 'bg-[#E7E0D8] text-[#57534E]'}`}>
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-[#1C1917] text-sm">Order Confirmed</h4>
                        <p className="text-xs text-[#57534E]">Received by restaurant & sent to Allapur kitchen.</p>
                      </div>
                    </div>

                    {/* Step 2: Preparing / Baking */}
                    <div className={`flex items-start gap-4 relative ${stepIndex >= 2 ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${stepIndex >= 2 ? 'bg-[#B91C1C] text-white ring-4 ring-[#B91C1C]/20' : 'bg-[#E7E0D8] text-[#57534E]'}`}>
                        <Flame size={16} />
                      </div>
                      <div>
                        <h4 className={`font-serif font-bold text-sm ${stepIndex === 2 ? 'text-[#B91C1C]' : 'text-[#1C1917]'}`}>
                          Baking in Wood-Fired Oven {stepIndex === 2 && '(Current Step)'}
                        </h4>
                        <p className="text-xs text-[#57534E]">Handcrafted dough baking at 450°C with fresh mozzarella.</p>
                      </div>
                    </div>

                    {/* Step 3: Out for Delivery */}
                    <div className={`flex items-start gap-4 relative ${stepIndex >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${stepIndex >= 3 ? 'bg-amber-500 text-black ring-4 ring-amber-500/20' : 'bg-[#E7E0D8] text-[#57534E]'}`}>
                        <Truck size={16} />
                      </div>
                      <div>
                        <h4 className={`font-serif font-bold text-sm ${stepIndex === 3 ? 'text-amber-600' : 'text-[#1C1917]'}`}>
                          Out for Delivery {stepIndex === 3 && '(Rider En Route on Live Map)'}
                        </h4>
                        <p className="text-xs text-[#57534E]">Rahul is riding with your insulated hot bag.</p>
                      </div>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className={`flex items-start gap-4 relative ${stepIndex >= 4 ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${stepIndex >= 4 ? 'bg-emerald-600 text-white' : 'bg-[#E7E0D8] text-[#57534E]'}`}>
                        <Home size={16} />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-[#1C1917] text-sm">Delivered at Doorstep</h4>
                        <p className="text-xs text-[#57534E]">Enjoy your fresh hot meal!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Quick Re-order & Loyalty Membership Badges */}
            <div className="pt-4 border-t border-[#E7E0D8] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-[#57534E]">Love your order? Reorder in 1-Click:</span>
                <QuickReorderButton orderId={orderId} />
              </div>
              <LoyaltyBadge points={240} userTierName="Silver" />
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
    <Suspense fallback={<div className="text-center py-20 font-serif">Loading live GPS tracking...</div>}>
      <TrackOrderContent />
    </Suspense>
  )
}
