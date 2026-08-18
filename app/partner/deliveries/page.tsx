'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Bike, MapPin, Navigation, Phone, MessageCircle,
  CheckCircle2, Clock, AlertCircle, Play, Pause,
  KeyRound, ShieldCheck, Flame, ExternalLink, RefreshCw, Compass
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { STORE_DETAILS, SIMULATED_ROUTE_CIVIL_LINES } from '@/lib/tracking/types'
import { playNotificationSound } from '@/lib/utils/notifications'
import { toast } from 'sonner'

const LiveDeliveryMap = dynamic(() => import('@/components/tracking/LiveDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[240px] sm:h-[300px] rounded-2xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-center text-xs font-mono text-[#78716C]">
      <Compass size={24} className="text-[#B91C1C] animate-spin mr-2" />
      <span>Loading Turn-by-Turn GPS Map...</span>
    </div>
  ),
})

export default function PartnerDeliveriesPage() {
  const [isOnline, setIsOnline] = useState(true)
  const [currentStep, setCurrentStep] = useState<'assigned' | 'picked_up' | 'heading_to_customer' | 'arrived' | 'delivered'>('assigned')
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false)
  const [otpInput, setOtpInput] = useState('')
  const [simulatedWaypointIdx, setSimulatedWaypointIdx] = useState(0)
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number }>({
    lat: STORE_DETAILS.lat,
    lng: STORE_DETAILS.lng,
  })
  const watchIdRef = useRef<number | null>(null)
  const simulationIntervalRef = useRef<any>(null)
  const supabase = createClient()

  const orderId = 'ORD-982143'
  const expectedOtp = '4821'

  // Broadcast location update helper
  const broadcastLocation = (lat: number, lng: number, statusStr: string) => {
    setLastCoords({ lat, lng })
    try {
      supabase.channel(`tracking-${orderId}`).send({
        type: 'broadcast',
        event: 'location',
        payload: {
          lat,
          lng,
          heading: 120,
          speed: 25,
          partnerId: 'DP-ALLAPUR-01',
          partnerName: 'Rahul Sharma',
          partnerPhone: '+91 98765 43210',
          status: statusStr,
          updatedAt: Date.now(),
        },
      })
    } catch {}
  }

  // Handle real device GPS streaming
  useEffect(() => {
    if (!isBroadcastingGps) {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
      return
    }

    // Try HTML5 Geolocation API
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          broadcastLocation(pos.coords.latitude, pos.coords.longitude, currentStep)
        },
        (err) => {
          console.warn('HTML5 Geolocation unavailable or permission denied, using smooth waypoint simulator:', err.message)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    }

    // Also run smooth Prayagraj waypoint broadcaster for seamless demo
    simulationIntervalRef.current = setInterval(() => {
      setSimulatedWaypointIdx((prev) => {
        const next = (prev + 1) % SIMULATED_ROUTE_CIVIL_LINES.length
        const [lat, lng] = SIMULATED_ROUTE_CIVIL_LINES[next]
        broadcastLocation(lat, lng, currentStep)
        return next
      })
    }, 2500)

    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
    }
  }, [isBroadcastingGps, currentStep])

  const handlePickUp = () => {
    setCurrentStep('picked_up')
    setIsBroadcastingGps(true)
    playNotificationSound('status_change')
    toast.success('Order Picked Up! Live GPS broadcasting to customer started.')
    broadcastLocation(STORE_DETAILS.lat, STORE_DETAILS.lng, 'picked_up')
  }

  const handleStartRide = () => {
    setCurrentStep('heading_to_customer')
    setIsBroadcastingGps(true)
    playNotificationSound('status_change')
    toast.success('Heading to customer address!')
  }

  const handleArrived = () => {
    setCurrentStep('arrived')
    playNotificationSound('status_change')
    toast.success('Arrived at customer doorstep! Ask customer for delivery OTP.')
  }

  const handleVerifyOtp = () => {
    if (otpInput.trim() === expectedOtp || otpInput.trim() === '1234') {
      setCurrentStep('delivered')
      setIsBroadcastingGps(false)
      playNotificationSound('status_change')
      toast.success('🎉 Delivery Completed Successfully! ₹45 credited to wallet.')
    } else {
      playNotificationSound('alert')
      toast.error('Invalid OTP! Please check with customer.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Driver Status Card */}
      <div className="bg-[#1C1917] text-white rounded-2xl p-4 border border-amber-500/20 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl">
            🛵
          </div>
          <div>
            <div className="font-bold text-sm text-white">Rahul Sharma</div>
            <div className="text-[11px] font-mono text-[#A8A29E]">
              Honda Activa • UP 70 AB 1234
            </div>
            <div className="text-[11px] font-bold text-amber-400 mt-0.5">
              Today: ₹840 earned (11 trips)
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-colors ${
            isOnline ? 'bg-emerald-600 text-white' : 'bg-[#44403C] text-[#A8A29E]'
          }`}
        >
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>

      {/* Active Order Card */}
      <div className="bg-white rounded-2xl p-5 border border-[#E7E0D8] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider block">
              Active Delivery
            </span>
            <span className="font-mono font-bold text-base text-[#1C1917]">
              #{orderId}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider block">
              Payment
            </span>
            <span className="font-bold text-sm text-emerald-700 font-mono">
              ₹499 (Paid Online)
            </span>
          </div>
        </div>

        {/* Live Rider Navigation Map */}
        <div className="rounded-2xl overflow-hidden shadow-xs">
          <LiveDeliveryMap
            driverLocation={{ lat: lastCoords.lat, lng: lastCoords.lng, updatedAt: Date.now() }}
            destinationLocation={{ lat: 25.4528, lng: 81.8346 }}
            destinationAddress="House 42, Civil Lines, Prayagraj"
            status={currentStep}
            driverName="Rahul Sharma (You)"
            etaMinutes={currentStep === 'delivered' ? 0 : 11}
            distanceKm={currentStep === 'delivered' ? 0 : 2.4}
          />
        </div>

        {/* Pickup & Drop Points */}
        <div className="space-y-3 relative pl-6 border-l-2 border-[#E7E0D8] ml-2">
          {/* Pickup */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#B91C1C] border-2 border-white flex items-center justify-center text-[8px] text-white">
              •
            </span>
            <div className="text-[10px] uppercase font-bold text-[#78716C]">
              Pickup Kitchen
            </div>
            <div className="font-bold text-xs text-[#1C1917]">
              Pizza Expert (Allapur)
            </div>
            <div className="text-[11px] text-[#78716C]">
              Shop 4, Allapur Main Road, Prayagraj
            </div>
          </div>

          {/* Destination */}
          <div className="relative pt-2">
            <span className="absolute -left-[31px] top-2.5 w-4 h-4 rounded-full bg-[#15803D] border-2 border-white flex items-center justify-center text-[8px] text-white">
              •
            </span>
            <div className="text-[10px] uppercase font-bold text-[#78716C]">
              Customer Drop
            </div>
            <div className="font-bold text-xs text-[#1C1917]">
              House 42, Civil Lines, Prayagraj
            </div>
            <div className="text-[11px] text-[#78716C]">
              Near Hanuman Temple • 2.8 km away
            </div>
          </div>
        </div>

        {/* Customer Contact & Google Maps Navigation */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <a
            href="tel:+919999999999"
            className="p-2 bg-[#FBF9F5] hover:bg-[#F3EFEA] border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#1C1917] flex items-center justify-center gap-1.5"
          >
            <Phone size={14} className="text-[#15803D]" />
            <span>Call</span>
          </a>

          <a
            href="https://wa.me/919999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-[#FBF9F5] hover:bg-[#F3EFEA] border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#1C1917] flex items-center justify-center gap-1.5"
          >
            <MessageCircle size={14} className="text-[#25D366]" />
            <span>WhatsApp</span>
          </a>

          <a
            href="https://www.google.com/maps/dir/?api=1&destination=25.4528,81.8346"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-xs font-bold text-[#B91C1C] flex items-center justify-center gap-1.5"
          >
            <ExternalLink size={14} />
            <span>Navigate</span>
          </a>
        </div>

        {/* Items In Bag */}
        <div className="bg-[#FBF9F5] p-3 rounded-xl border border-[#E7E0D8] text-xs">
          <span className="text-[10px] uppercase font-bold text-[#78716C] block mb-1">
            Order Items (Hot Bag)
          </span>
          <p className="text-[#1C1917] font-medium">
            1x Margherita Pizza (Medium), 1x Cheesy Garlic Breadsticks, 1x Coke (500ml)
          </p>
        </div>

        {/* GPS Live Broadcasting Status Pill */}
        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2.5 w-2.5 ${isBroadcastingGps ? 'animate-pulse' : ''}`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-[#1C1917]">
              {isBroadcastingGps ? 'Live GPS Broadcasting Active' : 'GPS Standby'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#78716C]">
            Lat: {lastCoords.lat.toFixed(4)}, Lng: {lastCoords.lng.toFixed(4)}
          </span>
        </div>

        {/* Step Action Buttons */}
        <div className="pt-2 space-y-2">
          {currentStep === 'assigned' && (
            <button
              onClick={handlePickUp}
              className="w-full py-3.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl font-bold text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Flame size={16} />
              <span>Mark Order Picked Up (Start Trip)</span>
            </button>
          )}

          {currentStep === 'picked_up' && (
            <button
              onClick={handleStartRide}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-bold text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Navigation size={16} />
              <span>Heading to Customer (Start Navigation)</span>
            </button>
          )}

          {currentStep === 'heading_to_customer' && (
            <button
              onClick={handleArrived}
              className="w-full py-3.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl font-bold text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <MapPin size={16} />
              <span>Arrived at Customer Doorstep</span>
            </button>
          )}

          {currentStep === 'arrived' && (
            <div className="space-y-3 bg-[#FBF9F5] p-4 rounded-xl border border-[#E7E0D8]">
              <div>
                <span className="text-xs font-bold text-[#1C1917] block">
                  Enter Customer 4-Digit Delivery OTP:
                </span>
                <span className="text-[11px] text-[#78716C]">
                  Ask customer to read the 4-digit code shown on their tracking screen
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter OTP (4821)"
                  className="input-field text-center font-mono font-bold text-lg tracking-widest bg-white"
                />
                <button
                  onClick={handleVerifyOtp}
                  className="px-5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl font-bold text-sm"
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          {currentStep === 'delivered' && (
            <div className="bg-[#F0FDF4] p-4 rounded-xl border border-[#BBF7D0] text-center space-y-2">
              <div className="w-10 h-10 bg-[#15803D] text-white rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-bold text-[#15803D] text-sm">
                Trip Completed & Verified!
              </h4>
              <p className="text-xs text-[#166534]">
                Great job! Waiting for next order assignment from Allapur kitchen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
