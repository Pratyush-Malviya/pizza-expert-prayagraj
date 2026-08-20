'use client'

import { useState } from 'react'
import { LocateFixed, Loader2, AlertTriangle, MapPin } from 'lucide-react'
import type { ReverseGeocodeResult } from '@/lib/utils/reverseGeocode'

interface LiveLocationButtonProps {
  onLocationDetected: (coords: { lat: number; lng: number }, address: ReverseGeocodeResult) => void
  onError?: (msg: string) => void
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
  label?: string
  id?: string
}

type Step = 'idle' | 'requesting-permission' | 'getting-gps' | 'geocoding' | 'error'

const STEP_LABELS: Record<Step, string> = {
  'idle': '',
  'requesting-permission': 'Allow location in browser…',
  'getting-gps': 'Getting GPS signal…',
  'geocoding': 'Finding your address…',
  'error': '',
}

/**
 * LiveLocationButton — fully self-contained GPS + reverse geocode flow.
 *
 * On click:
 *  1. Shows "Allow location" prompt state
 *  2. Calls navigator.geolocation.getCurrentPosition()
 *  3. Calls /api/geocode/reverse (our server proxy) for address
 *  4. Returns result via onLocationDetected()
 *
 * No external hook dependency — all logic is in the click handler.
 */
export default function LiveLocationButton({
  onLocationDetected,
  onError,
  variant = 'outline',
  className = '',
  label = 'Use My Location',
  id = 'live-location-btn',
}: LiveLocationButtonProps) {
  const [step, setStep] = useState<Step>('idle')
  const [permDenied, setPermDenied] = useState(false)

  const isLoading = step !== 'idle' && step !== 'error'

  const handleClick = async () => {
    // Check browser support
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const msg = 'Your browser does not support location access.'
      setStep('error')
      onError?.(msg)
      return
    }

    setStep('requesting-permission')
    setPermDenied(false)

    // Wrap getCurrentPosition in a Promise for async/await
    const getPosition = (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      })

    let position: GeolocationPosition
    try {
      setStep('getting-gps')
      position = await getPosition()
    } catch (err: any) {
      let msg = 'Unable to get your location. Please try again.'
      if (err?.code === 1) {
        // PERMISSION_DENIED
        msg = 'Location access denied. Please click the 🔒 icon in your browser address bar and allow location, then try again.'
        setPermDenied(true)
      } else if (err?.code === 2) {
        msg = 'Location unavailable. Please check your GPS / Wi-Fi and try again.'
      } else if (err?.code === 3) {
        msg = 'Location request timed out. Please try again.'
      }
      setStep('error')
      onError?.(msg)
      // Auto-reset after 5s so user can try again
      setTimeout(() => setStep('idle'), 5000)
      return
    }

    const { latitude: lat, longitude: lng } = position.coords

    // Reverse geocode via our server proxy
    try {
      setStep('geocoding')
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Geocode failed (${res.status})`)
      }
      const data = await res.json()

      // Parse Nominatim response
      const addr = data.address || {}
      const line1Parts = [addr.house_number, addr.road || addr.pedestrian || addr.path].filter(Boolean)
      const line2Parts = [addr.neighbourhood, addr.suburb, addr.village].filter(Boolean)

      const result: ReverseGeocodeResult = {
        line1: line1Parts.join(', ') || addr.amenity || addr.building || 'Near ' + (addr.road || 'your location'),
        line2: line2Parts.slice(0, 2).join(', '),
        city: addr.city || addr.town || addr.village || addr.county || addr.state_district || '',
        state: addr.state || '',
        pincode: addr.postcode || '',
        country: addr.country || 'India',
        displayName: data.display_name || '',
        raw: data,
      }

      setStep('idle')
      onLocationDetected({ lat, lng }, result)
    } catch (err: any) {
      // Geocode failed — still surface the GPS coords with empty address fields
      // so user can fill in manually
      const emptyResult: ReverseGeocodeResult = {
        line1: '', line2: '', city: 'Prayagraj', state: 'Uttar Pradesh',
        pincode: '', country: 'India', displayName: '', raw: {},
      }
      setStep('idle')
      // Still succeed with GPS coords — let user fill address manually
      onLocationDetected({ lat, lng }, emptyResult)
    }
  }

  const variantStyles: Record<string, string> = {
    default: 'bg-[#B91C1C] hover:bg-[#991B1B] text-white border border-transparent',
    outline: 'bg-white hover:bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]',
    ghost:   'bg-transparent hover:bg-[#FEF2F2] text-[#B91C1C] border border-transparent',
  }

  // Permission hard-denied state
  if (permDenied) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          disabled
          id={id}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
            bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] cursor-not-allowed ${className}`}
        >
          <AlertTriangle size={15} />
          Location Blocked
        </button>
        <p className="text-[11px] text-[#B91C1C] leading-tight max-w-[220px]">
          Click the 🔒 icon in your browser bar → Site Settings → Allow Location, then retry.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        id={id}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
          transition-all duration-200 disabled:opacity-70 disabled:cursor-wait
          ${variantStyles[variant]} ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 size={15} className="animate-spin flex-shrink-0" />
            <span className="truncate">{STEP_LABELS[step]}</span>
          </>
        ) : (
          <>
            <LocateFixed size={15} className="flex-shrink-0" />
            {label}
          </>
        )}
      </button>

      {/* Contextual hint shown while requesting permission */}
      {step === 'requesting-permission' || step === 'getting-gps' ? (
        <p className="text-[11px] text-[#57534E] flex items-center gap-1">
          <MapPin size={10} />
          A browser prompt will appear — click <strong>"Allow"</strong>
        </p>
      ) : null}
    </div>
  )
}
