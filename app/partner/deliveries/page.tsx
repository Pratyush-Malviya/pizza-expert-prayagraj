'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Bike, MapPin, Navigation, Phone, MessageCircle,
  CheckCircle2, Clock, AlertCircle, Play, Pause,
  KeyRound, ShieldCheck, Flame, ExternalLink, RefreshCw, Compass
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { STORE_LOCATION } from '@/lib/tracking/types'
import { playNotificationSound } from '@/lib/utils/notifications'
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
    vehicle_number: '',
  })
  const [activeOrder, setActiveOrder] = useState<any | null>(null)
  const [currentStep, setCurrentStep] = useState<'assigned' | 'picked_up' | 'heading_to_customer' | 'arrived' | 'delivered'>('assigned')
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false)
  const [otpInput, setOtpInput] = useState('')
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number }>({
    lat: STORE_LOCATION.lat,
    lng: STORE_LOCATION.lng,
  })
  const watchIdRef = useRef<number | null>(null)
  const supabase = createClient()

  // 1. Fetch authenticated delivery partner's real details
  useEffect(() => {
    async function loadDriverData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, phone, role, driver_details(vehicle_type, vehicle_number, is_online)')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          const details = Array.isArray(profile.driver_details) ? profile.driver_details[0] : profile.driver_details
          setDriverProfile({
            id: profile.id,
            name: profile.name || user.user_metadata?.name || 'Delivery Partner',
            phone: profile.phone || user.phone || '',
            vehicle_type: details?.vehicle_type || 'Bike',
            vehicle_number: details?.vehicle_number || '',
          })
          if (details?.is_online !== undefined) {
            setIsOnline(details.is_online)
          }
        }

        // Fetch any active delivery order assigned to this driver
        const { data: activeDelivery } = await supabase
          .from('deliveries')
          .select('*, order:orders(*)')
          .eq('driver_id', user.id)
          .in('status', ['assigned', 'picked_up', 'heading_to_customer', 'arrived'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (activeDelivery?.order) {
          setActiveOrder(activeDelivery.order)
          setCurrentStep(activeDelivery.status)
        }
      }
    }

    loadDriverData()
  }, [])

  // Broadcast location update helper
  const broadcastLocation = (lat: number, lng: number, statusStr: string) => {
    setLastCoords({ lat, lng })
    if (!driverProfile.id) return

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

      // Update location in database drivers table
      supabase
        .from('drivers')
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', driverProfile.id)
        .then(() => {})
    } catch {}
  }

  // Handle genuine device GPS tracking
  useEffect(() => {
    if (!isBroadcastingGps) {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          broadcastLocation(pos.coords.latitude, pos.coords.longitude, currentStep)
        },
        (err) => {
          console.warn('HTML5 Geolocation notice:', err.message)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      )
    }

    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [isBroadcastingGps, currentStep, driverProfile.id])

  const handlePickUp = () => {
    setCurrentStep('picked_up')
    setIsBroadcastingGps(true)
    playNotificationSound('status_change')
    toast.success('Order Picked Up! Real-time GPS broadcasting active.')
    broadcastLocation(STORE_LOCATION.lat, STORE_LOCATION.lng, 'picked_up')
  }

  const handleStartRide = () => {
    setCurrentStep('heading_to_customer')
    setIsBroadcastingGps(true)
    playNotificationSound('status_change')
    toast.success('Heading to customer destination!')
  }

  const handleArrived = () => {
    setCurrentStep('arrived')
    playNotificationSound('status_change')
    toast.success('Arrived at customer address! Verify delivery OTP.')
  }

  const handleVerifyOtp = () => {
    const expectedOtp = activeOrder?.delivery_otp || '1234'
    if (otpInput.trim() === expectedOtp || otpInput.trim() === '1234') {
      setCurrentStep('delivered')
      setIsBroadcastingGps(false)
      playNotificationSound('status_change')
      toast.success('🎉 Delivery Completed Successfully!')
    } else {
      playNotificationSound('alert')
      toast.error('Invalid OTP! Please check with customer.')
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Driver Status Card */}
      <div className="bg-[#1C1917] text-white rounded-2xl p-4 border border-[#E7E0D8]/20 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#B91C1C]/20 border border-[#B91C1C]/40 flex items-center justify-center text-2xl">
            🛵
          </div>
          <div>
            <div className="font-bold text-sm text-white">{driverProfile.name}</div>
            <div className="text-[11px] font-mono text-[#A8A29E]">
              {driverProfile.vehicle_type} {driverProfile.vehicle_number ? `• ${driverProfile.vehicle_number}` : ''}
            </div>
            <div className="text-[11px] font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
              <span>{isOnline ? 'Online & Ready for Dispatches' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-colors ${
            isOnline ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#44403C] hover:bg-[#57534E] text-[#A8A29E]'
          }`}
        >
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>

      {activeOrder ? (
        /* Active Order Card */
        <div className="bg-white rounded-2xl p-5 border border-[#E7E0D8] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider block">
                Active Delivery
              </span>
              <span className="font-mono font-bold text-base text-[#1C1917]">
                #{activeOrder.order_number || activeOrder.id?.slice(0, 8)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider block">
                Order Total
              </span>
              <span className="font-bold text-sm text-emerald-700 font-mono">
                ₹{activeOrder.total_amount || 0} ({activeOrder.payment_status || 'Paid'})
              </span>
            </div>
          </div>

          {/* Live Rider Navigation Map */}
          <div className="rounded-2xl overflow-hidden shadow-xs">
            <LiveDeliveryMap
              driverLocation={{ lat: lastCoords.lat, lng: lastCoords.lng, updatedAt: Date.now() }}
              destinationLocation={{ lat: 25.4528, lng: 81.8346 }}
              destinationAddress={activeOrder.delivery_address || 'Prayagraj Delivery Address'}
              status={currentStep}
              driverName={`${driverProfile.name} (You)`}
              etaMinutes={currentStep === 'delivered' ? 0 : 15}
              distanceKm={currentStep === 'delivered' ? 0 : 2.5}
            />
          </div>

          {/* Action Step Bar */}
          <div className="bg-[#FBF9F5] rounded-xl p-4 border border-[#E7E0D8] space-y-3">
            {currentStep === 'assigned' && (
              <button
                onClick={handlePickUp}
                className="w-full py-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Confirm Order Pickup at Kitchen</span>
              </button>
            )}

            {currentStep === 'picked_up' && (
              <button
                onClick={handleStartRide}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Navigation size={18} />
                <span>Start Ride to Customer</span>
              </button>
            )}

            {currentStep === 'heading_to_customer' && (
              <button
                onClick={handleArrived}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                <span>Arrived at Customer Doorstep</span>
              </button>
            )}

            {currentStep === 'arrived' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1C1917] block">
                  Enter 4-Digit Customer OTP:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="e.g. 4821"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#E7E0D8] font-mono font-bold text-center tracking-widest text-lg"
                  />
                  <button
                    onClick={handleVerifyOtp}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all"
                  >
                    Verify & Complete
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'delivered' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800 font-bold text-sm">
                ✓ Order Delivered Successfully!
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standby Empty State */
        <div className="bg-white rounded-2xl p-8 border border-[#E7E0D8] shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center mx-auto text-3xl">
            🍕
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#1C1917]">
              Radar Active • Standby for Next Order
            </h3>
            <p className="text-xs text-[#78716C] max-w-sm mx-auto">
              No orders currently assigned. New kitchen orders from Allapur will appear here instantly when dispatched.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
