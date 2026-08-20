'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, LocateFixed, Loader2, CheckCircle2, ChevronRight, Sparkles, Navigation, AlertCircle, RefreshCw } from 'lucide-react'
import { useLocationStore } from '@/store/locationStore'
import { isPincodeInPrayagraj } from '@/lib/delivery-zone'
import SaveLocationModal from '@/components/shared/SaveLocationModal'
import MapLocationPickerModal from '@/components/shared/MapLocationPickerModal'
import { createClient } from '@/lib/supabase/client'
import type { ReverseGeocodeResult } from '@/lib/utils/reverseGeocode'
import Link from 'next/link'
import { toast } from 'sonner'

export default function HomeLocationWidget() {
  const { currentLocation, setLocation, isDetecting, setDetecting, error, setError } = useLocationStore()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [stepLabel, setStepLabel] = useState<string>('')
  const [rawGeocode, setRawGeocode] = useState<ReverseGeocodeResult | null>(null)
  const [permDenied, setPermDenied] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (e) {
        // guest
      }
    }
    checkUser()
  }, [])

  const detectLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Your browser does not support live location detection.')
      return
    }

    setDetecting(true)
    setError(null)
    setPermDenied(false)
    setStepLabel('Waiting for browser location permission…')

    const getPosition = (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        })
      })

    try {
      setStepLabel('Acquiring high-accuracy GPS…')
      const position = await getPosition()
      const { latitude: lat, longitude: lng } = position.coords

      setStepLabel('Resolving your Prayagraj address…')
      const { reverseGeocode } = await import('@/lib/utils/reverseGeocode')
      const geocodeResult = await reverseGeocode(lat, lng)

      setRawGeocode(geocodeResult)

      const userLoc = {
        lat,
        lng,
        line1: geocodeResult.line1,
        line2: geocodeResult.line2,
        city: geocodeResult.city,
        state: geocodeResult.state,
        pincode: geocodeResult.pincode,
        displayName: geocodeResult.displayName,
        isGps: true,
        label: geocodeResult.line2 || geocodeResult.city || 'Current Location',
        updatedAt: new Date().toISOString(),
      }

      setLocation(userLoc)
      setDetecting(false)
      setStepLabel('')
      toast.success(`Live location detected: ${userLoc.label}`)
    } catch (err: any) {
      setDetecting(false)
      setStepLabel('')
      if (err?.code === 1) {
        setPermDenied(true)
        setError('Location permission was denied. Please allow location in your browser address bar.')
      } else if (err?.code === 2) {
        setError('GPS signal unavailable. Please ensure GPS/Wi-Fi is on.')
      } else if (err?.code === 3) {
        setError('Location request timed out. Please try again.')
      } else {
        setError(err.message || 'Failed to detect location. Please try again.')
      }
    }
  }

  if (!mounted) return null

  const isDeliverable = currentLocation?.pincode ? isPincodeInPrayagraj(currentLocation.pincode) : true

  return (
    <>
      <div className="w-full max-w-xl">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#16161E]/95 via-[#121217]/95 to-[#0D0D11]/95 border border-white/10 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
          {/* Subtle glow accent */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF3B00]/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header row: Live status badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30">
                <Navigation size={14} className="animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Live Delivery Location
              </span>
            </div>

            {currentLocation ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={11} />
                Location Active
              </span>
            ) : (
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                Prayagraj Delivery
              </span>
            )}
          </div>

          {/* Body: Detected Location or Detect Button */}
          {currentLocation ? (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin size={18} className="text-[#FF3B00] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {currentLocation.line1 || 'Live Location'}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {[currentLocation.line2, currentLocation.city, currentLocation.pincode].filter(Boolean).join(', ')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block text-[10px] font-mono font-bold text-[#FFC01D]">
                        ⚡ Express Delivery in ~25-30 mins
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={detectLocation}
                  disabled={isDetecting}
                  className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors flex items-center gap-1"
                  title="Re-detect live location"
                >
                  <RefreshCw size={13} className={isDetecting ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href="/menu"
                  className="flex-1 bg-[#FF3B00] hover:bg-[#E03400] text-white py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#FF3B00]/20"
                >
                  <span>Order Pizzas to This Location</span>
                  <ChevronRight size={14} />
                </Link>

                <button
                  onClick={() => setShowMapModal(true)}
                  className="py-2.5 px-3 rounded-xl border border-[#FF3B00]/40 bg-[#FF3B00]/10 hover:bg-[#FF3B00]/20 text-[#FF3B00] text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="Adjust exact location on map"
                >
                  <MapPin size={13} />
                  <span>Pin on Map</span>
                </button>

                {user ? (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="py-2.5 px-3.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors"
                  >
                    Save as Address
                  </button>
                ) : (
                  <Link
                    href="/login?redirect=/"
                    className="py-2.5 px-3.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-colors"
                  >
                    Login to Save
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Allow browser location or pin on map to unlock instant address checkout and get accurate live delivery estimates across Prayagraj.
              </p>

              {isDetecting ? (
                <div className="bg-[#FF3B00]/10 border border-[#FF3B00]/30 rounded-xl p-3.5 flex items-center gap-3 text-white">
                  <Loader2 size={18} className="animate-spin text-[#FF3B00] shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-[#FF3B00]">Detecting your position…</p>
                    <p className="text-zinc-300 text-[11px]">{stepLabel || 'Please click Allow in your browser popup'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    onClick={detectLocation}
                    className="flex-1 bg-gradient-to-r from-[#FF3B00] to-[#E03400] hover:from-[#E03400] hover:to-[#C02B00] text-white py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF3B00]/25 transition-all group"
                  >
                    <LocateFixed size={16} className="group-hover:rotate-45 transition-transform" />
                    <span>Detect Live GPS</span>
                  </button>

                  <button
                    onClick={() => setShowMapModal(true)}
                    className="py-3 px-4 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MapPin size={15} className="text-[#FF3B00]" />
                    <span>Pin on Map</span>
                  </button>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-400">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <p className="font-semibold">{error}</p>
                    {permDenied && (
                      <p className="text-[11px] text-zinc-400 mt-1">
                        👉 Click the 🔒 lock / tune icon in your browser address bar → enable <strong>Location</strong> → click Detect again. Or click <strong>Pin on Map</strong> to select manually!
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map Location Picker Modal */}
      <MapLocationPickerModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialCoords={currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null}
      />

      {/* Save location modal if user is logged in */}
      {user && rawGeocode && currentLocation && (
        <SaveLocationModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          geocodeResult={rawGeocode}
          coords={{ lat: currentLocation.lat, lng: currentLocation.lng }}
          userId={user.id}
          onSaved={(newAddress) => {
            setShowSaveModal(false)
            toast.success(`Saved as "${newAddress.label}" delivery address!`)
          }}
        />
      )}
    </>
  )
}
