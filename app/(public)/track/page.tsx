'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Clock, MapPin, ChefHat, CheckCircle2, Flame,
  Truck, Home, Bell, BellRing, XCircle, AlertCircle,
  CreditCard, MessageCircle, RefreshCw, Compass, ShieldCheck, KeyRound, Star
} from 'lucide-react'
import { requestNotificationPermission, notifyOrderStatusChange, playNotificationSound } from '@/lib/utils/notifications'
import LoyaltyBadge from '@/components/profile/LoyaltyBadge'
import QuickReorderButton from '@/components/orders/QuickReorderButton'
import DriverInfoCard from '@/components/tracking/DriverInfoCard'
import DeliveryFeedbackModal from '@/components/orders/DeliveryFeedbackModal'
import type { GPSLocation, DeliveryPartner } from '@/lib/tracking/types'
import { STORE_LOCATION, DEFAULT_SAMPLE_DRIVER } from '@/lib/tracking/types'

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
  const [currentStatus, setCurrentStatus] = useState<string>('confirmed')
  const [addressStr, setAddressStr] = useState<string>('House 42, Civil Lines, Prayagraj')
  const [orderTotal, setOrderTotal] = useState<number>(499)
  const [paymentMethod, setPaymentMethod] = useState<string>('Razorpay UPI')
  const [orderId, setOrderId] = useState<string>(initialOrderId || 'ORD-982143')
  const [notiGranted, setNotiGranted] = useState<boolean>(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date())
  const [driverLocation, setDriverLocation] = useState<GPSLocation | null>({
    lat: STORE_LOCATION.lat,
    lng: STORE_LOCATION.lng,
    heading: 90,
    speed: 0,
    updatedAt: Date.now(),
  })
  const [driver, setDriver] = useState<DeliveryPartner>(DEFAULT_SAMPLE_DRIVER)
  const [otpCode, setOtpCode] = useState<string>('1234')
  const [etaMinutes, setEtaMinutes] = useState<number>(18)
  const [distanceKm, setDistanceKm] = useState<number>(2.4)
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false)
  const [hasReviewed, setHasReviewed] = useState<boolean>(false)
  const supabase = createClient()

  // Auto trigger feedback modal when delivered
  useEffect(() => {
    if (typeof window === 'undefined' || !orderId) return
    const reviewed = localStorage.getItem(`reviewed_order_${orderId}`) === 'true'
    setHasReviewed(reviewed)

    if (currentStatus === 'delivered' && !reviewed) {
      const timer = setTimeout(() => {
        setShowFeedbackModal(true)
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [currentStatus, orderId])

  // Fetch real order and delivery details
  const fetchStatus = useCallback(async () => {
    if (!orderId) return

    // 1. Check local storage fallback first
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

    // 2. Fetch from Supabase Orders table
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderData) {
        const addr = orderData.address_json || {}
        setCurrentStatus((prev) => {
          if (prev !== orderData.status) {
            if (orderData.status === 'cancelled') {
              playNotificationSound('alert')
            } else {
              playNotificationSound('status_change')
            }
          }
          return orderData.status
        })

        if (orderData.total) setOrderTotal(Number(orderData.total))
        if (addr.paymentMethod) setPaymentMethod(addr.paymentMethod)
        if (addr.line1) {
          setAddressStr([addr.line1, addr.line2, addr.city].filter(Boolean).join(', ') || 'Prayagraj')
        }
        if (addr.deliveryOtp) {
          setOtpCode(String(addr.deliveryOtp))
        }

        // Check if driver is assigned directly in address_json
        if (addr.driverName) {
          setDriver((prev) => ({
            ...prev,
            name: addr.driverName,
            phone: addr.driverPhone || prev.phone,
            vehicle_type: addr.driverVehicle || prev.vehicle_type,
            vehicle_number: addr.driverPlate || prev.vehicle_number || 'UP 70',
            is_online: true,
            is_busy: true,
          }))
        }
        setLastSyncedAt(new Date())
      }

      // 3. Fetch from Deliveries table (for real driver & live OTP)
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('*, driver:drivers(*)')
        .eq('order_id', orderId)
        .maybeSingle()

      if (deliveryData) {
        if (deliveryData.otp_code) {
          setOtpCode(deliveryData.otp_code)
        }

        if (deliveryData.driver) {
          const d = deliveryData.driver
          setDriver({
            id: d.id,
            name: d.name || 'Delivery Partner',
            phone: d.phone || '',
            vehicle_type: d.vehicle_type || 'Bike',
            vehicle_number: d.vehicle_number || 'UP 70 AB 1234',
            rating: 5.0,
            total_deliveries: 120,
            is_online: d.is_online !== false,
            is_busy: true,
            current_lat: Number(d.current_lat || STORE_LOCATION.lat),
            current_lng: Number(d.current_lng || STORE_LOCATION.lng),
          })

          if (d.current_lat && d.current_lng) {
            setDriverLocation({
              lat: Number(d.current_lat),
              lng: Number(d.current_lng),
              speed: 28,
              heading: 90,
              updatedAt: Date.now(),
            })
          }
        }
      }
    } catch {}
  }, [orderId, supabase])

  useEffect(() => {
    fetchStatus()

    // ── Continuous Background Auto-Polling (3.5s) ──
    const pollInterval = setInterval(() => {
      fetchStatus()
    }, 3500)

    // ── Realtime WebSocket Subscription ──
    const channel = supabase
      .channel(`tracking-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload: any) => {
          if (payload.new && payload.new.status) {
            setCurrentStatus(payload.new.status)
            playNotificationSound('status_change')
            setLastSyncedAt(new Date())
            fetchStatus()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries', filter: `order_id=eq.${orderId}` },
        () => {
          fetchStatus()
        }
      )
      .on('broadcast', { event: 'location' }, (payload: any) => {
        if (payload?.payload?.lat && payload?.payload?.lng) {
          setDriverLocation({
            lat: payload.payload.lat,
            lng: payload.payload.lng,
            heading: payload.payload.heading,
            speed: payload.payload.speed || 24,
            updatedAt: Date.now(),
          })
          if (payload.payload.status) {
            setCurrentStatus(payload.payload.status)
          }
          setLastSyncedAt(new Date())
        }
      })
      .subscribe()

    const handleStatusSync = () => fetchStatus()
    window.addEventListener('orderStatusUpdated', handleStatusSync)
    window.addEventListener('storage', handleStatusSync)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
      window.removeEventListener('orderStatusUpdated', handleStatusSync)
      window.removeEventListener('storage', handleStatusSync)
    }
  }, [orderId, fetchStatus, supabase])

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
      case 'arrived':
        return 3
      case 'delivered':
        return 4
      case 'cancelled':
        return -1
      default:
        return 2
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E0D8] shadow-sm space-y-6">
            {/* Top Bar with Order ID & Notifications */}
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-4 flex-wrap gap-2">
              <div>
                <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block">Tracking Order</span>
                <span className="font-mono font-black text-[#1C1917] text-lg sm:text-xl">
                  #{orderId.slice(-6).toUpperCase()}
                </span>
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
                    : currentStatus === 'out_for_delivery' || currentStatus === 'picked_up'
                    ? 'bg-[#FAF5FF] text-[#9333EA] border-[#E9D5FF]'
                    : currentStatus === 'delivered'
                    ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                    : 'bg-[#FFFBEB] text-[#D97706] border-[#D97706]/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isCancelled ? 'bg-[#DC2626]' : 'bg-[#D97706] animate-ping'}`} />
                  {currentStatus.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            {/* Live Auto-Refresh Pulse Bar */}
            <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs text-[#57534E]">
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

            {/* Milestone Stages Timeline */}
            <div className="py-2">
              <div className="grid grid-cols-4 gap-2 relative">
                <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-[#E7E0D8] -z-0" />
                <div
                  className="absolute top-3.5 left-0 h-0.5 bg-[#B91C1C] -z-0 transition-all duration-500"
                  style={{
                    width: stepIndex === 1 ? '15%' : stepIndex === 2 ? '45%' : stepIndex === 3 ? '75%' : '100%',
                  }}
                />

                <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-colors ${
                    stepIndex >= 1 ? 'bg-[#B91C1C] text-white' : 'bg-[#E7E0D8] text-[#57534E]'
                  }`}>
                    ✓
                  </div>
                  <span className={`text-[11px] font-serif font-bold ${stepIndex >= 1 ? 'text-[#1C1917]' : 'text-[#78716C]'}`}>
                    1. Confirmed
                  </span>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-colors ${
                    stepIndex >= 2 ? 'bg-[#B91C1C] text-white ring-4 ring-[#B91C1C]/20' : 'bg-[#E7E0D8] text-[#57534E]'
                  }`}>
                    {stepIndex > 2 ? '✓' : '2'}
                  </div>
                  <span className={`text-[11px] font-serif font-bold ${stepIndex === 2 ? 'text-[#B91C1C]' : stepIndex > 2 ? 'text-[#1C1917]' : 'text-[#78716C]'}`}>
                    2. In Oven
                  </span>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    stepIndex >= 3 ? 'bg-[#B91C1C] text-white ring-4 ring-[#B91C1C]/20' : 'bg-[#E7E0D8] text-[#57534E]'
                  }`}>
                    {stepIndex > 3 ? '✓' : '3'}
                  </div>
                  <span className={`text-[11px] font-serif font-bold ${stepIndex === 3 ? 'text-[#B91C1C]' : stepIndex > 3 ? 'text-[#1C1917]' : 'text-[#78716C]'}`}>
                    3. On the Way
                  </span>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    stepIndex >= 4 ? 'bg-[#15803D] text-white' : 'bg-[#E7E0D8] text-[#57534E]'
                  }`}>
                    {stepIndex >= 4 ? '✓' : '4'}
                  </div>
                  <span className={`text-[11px] font-serif font-bold ${stepIndex >= 4 ? 'text-[#15803D]' : 'text-[#78716C]'}`}>
                    4. Delivered
                  </span>
                </div>
              </div>
            </div>

            {/* Rider Information Card (Zomato-Style with real Driver + real OTP) */}
            <DriverInfoCard
              driver={driver}
              otpCode={otpCode}
              orderId={orderId}
              orderTotal={orderTotal}
              status={currentStatus}
            />

            {/* Rate & Review Card on Delivery */}
            {currentStatus === 'delivered' && (
              <div className="bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] border border-[#FCD34D] rounded-2xl p-5 text-left flex items-center justify-between flex-wrap gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#D97706]/15 text-[#D97706] flex items-center justify-center text-2xl shrink-0 border border-[#D97706]/30">
                    ⭐
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#1C1917]">
                      {hasReviewed ? 'Thank You for Rating Your Order!' : 'How Was Your Delivery Experience?'}
                    </h4>
                    <p className="text-xs text-[#78716C]">
                      {hasReviewed
                        ? 'Your feedback helps us bake better pizzas.'
                        : 'Rate your hot pizza & delivery to earn loyalty rewards!'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="px-4 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  <Star size={14} className="fill-white" />
                  <span>{hasReviewed ? 'Update Review' : 'Rate & Review'}</span>
                </button>
              </div>
            )}

            {/* ORDER CANCELLED STATE */}
            {isCancelled && (
              <div className="bg-[#FEF2F2] rounded-2xl p-5 border border-[#FCA5A5] space-y-3">
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
            )}
          </div>
        )}
      </div>

      {/* Review / Feedback Popup Modal */}
      <DeliveryFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        orderId={orderId}
        driverName={driver?.name}
        orderTotal={orderTotal}
        onSubmitted={() => setHasReviewed(true)}
      />
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
          <div className="flex items-center gap-2 font-mono text-xs text-[#78716C]">
            <Compass size={20} className="animate-spin text-[#B91C1C]" />
            <span>Loading Live Order Telemetry...</span>
          </div>
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  )
}
