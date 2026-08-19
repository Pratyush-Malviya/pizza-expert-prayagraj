'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Bike, MapPin, Navigation, Phone, MessageCircle,
  CheckCircle2, Clock, AlertCircle, Play, Pause,
  KeyRound, ShieldCheck, Flame, ExternalLink, RefreshCw, Compass,
  Check, ArrowRight, UserCheck, UtensilsCrossed
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { STORE_LOCATION, STORE_DETAILS, SIMULATED_ROUTE_CIVIL_LINES } from '@/lib/tracking/types'
import { playNotificationSound } from '@/lib/utils/notifications'
import { updateDriverTripStatus, broadcastDriverGPS, fetchAvailableDrivers } from '@/app/actions/deliveries'
import { toast } from 'sonner'

const LiveDeliveryMap = dynamic(() => import('@/components/tracking/LiveDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[240px] sm:h-[300px] rounded-2xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-center text-xs font-mono text-[#78716C]">
      <Compass size={24} className="text-[#B91C1C] animate-spin mr-2" />
      <span>Loading Live GPS Telemetry...</span>
    </div>
  ),
})

export default function PartnerDeliveriesPage() {
  const [isOnline, setIsOnline] = useState(true)
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [driverProfile, setDriverProfile] = useState<{
    id: string
    name: string
    phone: string
    vehicle_type: string
    vehicle_number: string
  }>({
    id: '',
    name: 'Delivery Partner',
    phone: '',
    vehicle_type: 'Bike',
    vehicle_number: 'UP 70 AB 1234',
  })

  const [activeDeliveryRow, setActiveDeliveryRow] = useState<any | null>(null)
  const [activeOrder, setActiveOrder] = useState<any | null>(null)
  const [currentStep, setCurrentStep] = useState<
    'assigned' | 'accepted' | 'picked_up' | 'heading_to_customer' | 'arrived' | 'delivered'
  >('assigned')
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [otpInput, setOtpInput] = useState('')
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number }>({
    lat: STORE_LOCATION.lat,
    lng: STORE_LOCATION.lng,
  })

  const watchIdRef = useRef<number | null>(null)
  const simulationIntervalRef = useRef<any>(null)
  const simStepRef = useRef<number>(0)
  const supabase = createClient()

  // 1. Fetch available drivers to populate profile selector & detect auth user
  const loadDriversAndProfile = useCallback(async () => {
    try {
      const { drivers } = await fetchAvailableDrivers()
      if (drivers && drivers.length > 0) {
        setAvailableDrivers(drivers)

        const { data: { user } } = await supabase.auth.getUser()
        const matched = user ? drivers.find(d => d.id === user.id) : null
        const activeDriver = matched || drivers[0]

        if (activeDriver && !driverProfile.id) {
          setSelectedDriverId(activeDriver.id)
          setDriverProfile({
            id: activeDriver.id,
            name: activeDriver.name,
            phone: activeDriver.phone,
            vehicle_type: activeDriver.vehicle_type,
            vehicle_number: activeDriver.vehicle_number || 'UP 70',
          })
          setIsOnline(activeDriver.is_online)
        }
      }
    } catch {}
  }, [driverProfile.id, supabase])

  useEffect(() => {
    loadDriversAndProfile()
  }, [loadDriversAndProfile])

  // 2. Fetch active trip assigned to this driver
  const fetchActiveTrip = useCallback(async (driverId: string) => {
    if (!driverId) return
    try {
      const { data: deliv } = await supabase
        .from('deliveries')
        .select('*, order:orders(*, order_items(*, products(name)))')
        .eq('driver_id', driverId)
        .in('status', ['assigned', 'accepted', 'picked_up', 'heading_to_customer', 'arrived'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (deliv && deliv.order) {
        setActiveDeliveryRow(deliv)
        setActiveOrder(deliv.order)
        setCurrentStep(deliv.status as any)
      } else {
        // Fallback: check orders table directly where driver_id is set
        const { data: ord } = await supabase
          .from('orders')
          .select('*, order_items(*, products(name))')
          .in('status', ['confirmed', 'preparing', 'out_for_delivery'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (ord && ord.address_json?.driverName?.includes(driverProfile.name)) {
          setActiveOrder(ord)
          setCurrentStep(ord.status === 'out_for_delivery' ? 'heading_to_customer' : 'assigned')
        } else {
          setActiveDeliveryRow(null)
          setActiveOrder(null)
        }
      }
    } catch {}
  }, [driverProfile.name, supabase])

  useEffect(() => {
    if (selectedDriverId) {
      fetchActiveTrip(selectedDriverId)
    }
  }, [selectedDriverId, fetchActiveTrip])

  // 3. Realtime subscription for newly dispatched deliveries
  useEffect(() => {
    if (!selectedDriverId) return

    const channel = supabase
      .channel(`driver-partner-${selectedDriverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries', filter: `driver_id=eq.${selectedDriverId}` },
        () => {
          fetchActiveTrip(selectedDriverId)
          playNotificationSound('alert')
          toast.info('🛵 Delivery assignment updated!')
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchActiveTrip(selectedDriverId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDriverId, fetchActiveTrip, supabase])

  // Broadcast location update helper
  const broadcastLocation = useCallback((lat: number, lng: number, statusStr: string) => {
    setLastCoords({ lat, lng })
    if (!selectedDriverId) return

    try {
      if (activeOrder?.id) {
        supabase.channel(`tracking-${activeOrder.id}`).send({
          type: 'broadcast',
          event: 'location',
          payload: {
            lat,
            lng,
            partnerId: driverProfile.id,
            partnerName: driverProfile.name,
            partnerPhone: driverProfile.phone,
            status: statusStr,
            updatedAt: Date.now(),
          },
        })
      }

      broadcastDriverGPS({
        driverId: selectedDriverId,
        lat,
        lng,
        deliveryId: activeDeliveryRow?.id,
        speed: 28,
        heading: 90,
      }).catch(() => {})
    } catch {}
  }, [selectedDriverId, activeOrder?.id, driverProfile, activeDeliveryRow?.id, supabase])

  // Handle GPS simulation along Prayagraj route when active
  useEffect(() => {
    if (currentStep === 'heading_to_customer' && isBroadcastingGps) {
      const waypoints = SIMULATED_ROUTE_CIVIL_LINES
      simStepRef.current = 0

      simulationIntervalRef.current = setInterval(() => {
        if (simStepRef.current < waypoints.length) {
          const pt = waypoints[simStepRef.current]
          broadcastLocation(pt[0], pt[1], 'heading_to_customer')
          simStepRef.current += 1
        } else {
          simStepRef.current = 0
        }
      }, 4000)
    } else {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
    }

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
    }
  }, [currentStep, isBroadcastingGps, broadcastLocation])

  // Driver switch handler for testing
  const handleSwitchDriver = (drvId: string) => {
    setSelectedDriverId(drvId)
    const drv = availableDrivers.find(d => d.id === drvId)
    if (drv) {
      setDriverProfile({
        id: drv.id,
        name: drv.name,
        phone: drv.phone,
        vehicle_type: drv.vehicle_type,
        vehicle_number: drv.vehicle_number || 'UP 70',
      })
      setIsOnline(drv.is_online)
      fetchActiveTrip(drv.id)
    }
  }

  // Step 1: Accept Trip
  const handleAcceptTrip = async () => {
    if (!activeOrder?.id) return
    setIsSubmitting(true)
    try {
      await updateDriverTripStatus({
        deliveryId: activeDeliveryRow?.id,
        orderId: activeOrder.id,
        driverId: selectedDriverId,
        newStatus: 'accepted',
      })
      setCurrentStep('accepted')
      playNotificationSound('status_change')
      toast.success('Trip Accepted! Head to Allapur Kitchen to collect order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2: Confirm Picked Up from Kitchen
  const handlePickUp = async () => {
    if (!activeOrder?.id) return
    setIsSubmitting(true)
    try {
      await updateDriverTripStatus({
        deliveryId: activeDeliveryRow?.id,
        orderId: activeOrder.id,
        driverId: selectedDriverId,
        newStatus: 'picked_up',
      })
      setCurrentStep('picked_up')
      setIsBroadcastingGps(true)
      playNotificationSound('status_change')
      toast.success('Food Picked Up! Live GPS broadcasting active.')
      broadcastLocation(STORE_LOCATION.lat, STORE_LOCATION.lng, 'picked_up')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 3: Start Heading to Customer
  const handleStartRide = async () => {
    if (!activeOrder?.id) return
    setIsSubmitting(true)
    try {
      await updateDriverTripStatus({
        deliveryId: activeDeliveryRow?.id,
        orderId: activeOrder.id,
        driverId: selectedDriverId,
        newStatus: 'heading_to_customer',
      })
      setCurrentStep('heading_to_customer')
      setIsBroadcastingGps(true)
      playNotificationSound('status_change')
      toast.success('En route to customer doorstep!')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 4: Arrived at Doorstep
  const handleArrived = async () => {
    if (!activeOrder?.id) return
    setIsSubmitting(true)
    try {
      await updateDriverTripStatus({
        deliveryId: activeDeliveryRow?.id,
        orderId: activeOrder.id,
        driverId: selectedDriverId,
        newStatus: 'arrived',
      })
      setCurrentStep('arrived')
      playNotificationSound('status_change')
      toast.success('Arrived at customer address! Ask customer for 4-digit Delivery OTP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 5: Verify OTP & Complete Delivery
  const handleVerifyOtpAndComplete = async () => {
    if (!activeOrder?.id) return
    setIsSubmitting(true)
    try {
      const res = await updateDriverTripStatus({
        deliveryId: activeDeliveryRow?.id,
        orderId: activeOrder.id,
        driverId: selectedDriverId,
        newStatus: 'delivered',
        otpCode: otpInput,
      })

      if (res.success) {
        setCurrentStep('delivered')
        setIsBroadcastingGps(false)
        playNotificationSound('status_change')
        toast.success('🎉 Delivery Completed Successfully! Payment & Handover Verified.')
        setActiveOrder(null)
        setActiveDeliveryRow(null)
        setOtpInput('')
        await fetchActiveTrip(selectedDriverId)
      } else {
        playNotificationSound('alert')
        toast.error(res.error || 'Invalid OTP! Please verify with customer.')
      }
    } catch (err: any) {
      toast.error(err.message || 'OTP verification error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addr = activeOrder?.address_json || {}
  const itemsList = activeOrder?.order_items || []
  const summaryStr = itemsList
    .map((i: any) => `${i.quantity}x ${i.products?.name || 'Pizza'}`)
    .join(', ') || 'Wood-Fired Pizza Order'

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12">
      {/* Driver Switcher Header (Testing & Multi-rider simulation) */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E7E0D8] shadow-xs">
        <div className="flex items-center gap-2">
          <UserCheck size={16} className="text-[#B91C1C]" />
          <span className="text-xs font-bold text-[#1C1917]">Active Driver Portal:</span>
        </div>

        <select
          value={selectedDriverId}
          onChange={(e) => handleSwitchDriver(e.target.value)}
          className="text-xs font-bold font-mono bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
        >
          {availableDrivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.vehicle_type} - {d.vehicle_number || 'UP 70'})
            </option>
          ))}
        </select>
      </div>

      {/* Driver Status Card */}
      <div className="bg-[#1C1917] text-white rounded-3xl p-5 border border-[#3F3F46] shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-[#B91C1C]/20 border border-[#B91C1C]/40 flex items-center justify-center text-2xl">
            🛵
          </div>
          <div>
            <div className="font-bold text-base text-white">{driverProfile.name}</div>
            <div className="text-[11px] font-mono text-[#A8A29E]">
              {driverProfile.vehicle_type} • {driverProfile.vehicle_number}
            </div>
            <div className="text-[11px] font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
              <span>{isOnline ? 'Online & Ready for Dispatches' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-colors ${
            isOnline ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#44403C] hover:bg-[#57534E] text-[#A8A29E]'
          }`}
        >
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>

      {/* Active Trip Workflow */}
      {activeOrder ? (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E7E0D8] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider block">
                Active Assigned Delivery
              </span>
              <span className="font-mono font-bold text-lg text-[#B91C1C]">
                #{String(activeOrder.id).slice(-6).toUpperCase()}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider block">
                Collect Amount
              </span>
              <span className="font-mono font-bold text-lg text-emerald-700">
                ₹{activeOrder.total}
              </span>
            </div>
          </div>

          {/* Customer & Destination Card */}
          <div className="bg-[#FBF9F5] rounded-2xl p-4 border border-[#E7E0D8] space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-[#1C1917]">
                {addr.name || 'Customer'}
              </div>

              {addr.phone && (
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${addr.phone}`}
                    className="p-2 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-xs"
                    title="Call Customer"
                  >
                    <Phone size={14} />
                  </a>

                  <a
                    href={`https://wa.me/${addr.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${addr.name || 'Customer'}, I am your Pizza Expert delivery partner for order #${String(activeOrder.id).slice(-6).toUpperCase()}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#25D366] text-white rounded-xl flex items-center justify-center hover:bg-[#1EBE5D] transition-colors shadow-xs"
                    title="WhatsApp Customer"
                  >
                    <MessageCircle size={14} />
                  </a>
                </div>
              )}
            </div>

            <div className="text-xs text-[#57534E] flex items-start gap-1.5">
              <MapPin size={15} className="text-[#B91C1C] flex-shrink-0 mt-0.5" />
              <span>{[addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(', ') || 'Prayagraj'}</span>
            </div>

            <div className="text-xs bg-white p-2.5 rounded-xl border border-[#E7E0D8]">
              <span className="font-bold text-[#1C1917] block mb-1">Order Items:</span>
              <p className="text-[#78716C] font-mono text-[11px]">{summaryStr}</p>
            </div>
          </div>

          {/* Live GPS Telemetry Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1C1917] flex items-center gap-1.5">
                <Compass size={14} className="text-[#B91C1C]" />
                <span>Live Route Telemetry</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-700 font-bold">
                {isBroadcastingGps ? 'GPS Streaming Active' : 'Stationary at Hub'}
              </span>
            </div>

            <div className="h-[240px] rounded-2xl overflow-hidden border border-[#E7E0D8]">
              <LiveDeliveryMap
                driverLocation={{
                  lat: lastCoords.lat,
                  lng: lastCoords.lng,
                  speed: isBroadcastingGps ? 28 : 0,
                  heading: 90,
                  updatedAt: Date.now(),
                }}
                destinationLocation={{ lat: 25.4528, lng: 81.8346 }}
                destinationAddress={addr.line1 || 'Civil Lines, Prayagraj'}
                driverName={driverProfile.name}
                status={currentStep}
                etaMinutes={12}
                distanceKm={2.4}
              />
            </div>
          </div>

          {/* Step Actions Flow */}
          <div className="space-y-3 pt-2">
            {currentStep === 'assigned' && (
              <button
                disabled={isSubmitting}
                onClick={handleAcceptTrip}
                className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
              >
                <span>Accept Delivery Trip</span>
                <ArrowRight size={16} />
              </button>
            )}

            {currentStep === 'accepted' && (
              <button
                disabled={isSubmitting}
                onClick={handlePickUp}
                className="w-full py-3.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
              >
                <UtensilsCrossed size={16} />
                <span>Confirm Food Picked Up from Kitchen Pass</span>
              </button>
            )}

            {currentStep === 'picked_up' && (
              <button
                disabled={isSubmitting}
                onClick={handleStartRide}
                className="w-full py-3.5 bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
              >
                <Navigation size={16} />
                <span>Start Ride to Customer Location</span>
              </button>
            )}

            {currentStep === 'heading_to_customer' && (
              <button
                disabled={isSubmitting}
                onClick={handleArrived}
                className="w-full py-3.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
              >
                <CheckCircle2 size={16} />
                <span>Arrived at Customer Doorstep</span>
              </button>
            )}

            {currentStep === 'arrived' && (
              <div className="bg-[#FFFBEB] p-4 rounded-2xl border border-[#FDE68A] space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <KeyRound size={16} />
                  <span>Enter Customer 4-Digit Delivery OTP</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4821"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-[#E7E0D8] rounded-xl font-mono text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                  />

                  <button
                    disabled={isSubmitting || otpInput.trim().length < 4}
                    onClick={handleVerifyOtpAndComplete}
                    className="px-6 py-3 bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-xs"
                  >
                    <Check size={16} />
                    <span>Verify & Deliver</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#E7E0D8] shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-center mx-auto text-3xl">
            🍕
          </div>
          <h3 className="font-serif font-bold text-lg text-[#1C1917]">No Active Trips Assigned</h3>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto">
            You are online and available in the dispatch pool. When the kitchen bakes an order, it will be automatically dispatched to your app.
          </p>
        </div>
      )}
    </div>
  )
}
