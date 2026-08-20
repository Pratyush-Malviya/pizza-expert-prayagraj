'use client'

import { useEffect } from 'react'
import { LocateFixed, Loader2, AlertTriangle } from 'lucide-react'
import { useGeolocation } from '@/lib/hooks/useGeolocation'
import type { ReverseGeocodeResult } from '@/lib/utils/reverseGeocode'

interface LiveLocationButtonProps {
  /** Called when GPS + reverse geocode completes successfully */
  onLocationDetected: (coords: { lat: number; lng: number }, address: ReverseGeocodeResult) => void
  /** Called when detection fails */
  onError?: (msg: string) => void
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
  label?: string
  id?: string
}

/**
 * LiveLocationButton
 * 
 * Reusable "Use My Location" button. On click:
 *  1. Requests GPS via browser API
 *  2. Calls Nominatim reverse geocoding
 *  3. Returns coords + parsed address via onLocationDetected callback
 */
export default function LiveLocationButton({
  onLocationDetected,
  onError,
  variant = 'outline',
  className = '',
  label = 'Use My Location',
  id = 'live-location-btn',
}: LiveLocationButtonProps) {
  const geo = useGeolocation()

  // When GPS coords obtained → reverse geocode
  useEffect(() => {
    if (geo.lat === null || geo.lng === null) return

    ;(async () => {
      try {
        const { reverseGeocode } = await import('@/lib/utils/reverseGeocode')
        const result = await reverseGeocode(geo.lat!, geo.lng!)
        onLocationDetected({ lat: geo.lat!, lng: geo.lng! }, result)
      } catch (err: any) {
        const msg = err.message || 'Could not determine address from your location.'
        onError?.(msg)
      }
    })()
    // Only trigger when coords change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.lat, geo.lng])

  // Surface geo errors
  useEffect(() => {
    if (geo.error) {
      onError?.(geo.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.error])

  const handleClick = () => {
    geo.clearLocation()
    geo.requestLocation()
  }

  const variantStyles: Record<string, string> = {
    default: 'bg-[#B91C1C] hover:bg-[#991B1B] text-white border border-transparent',
    outline: 'bg-white hover:bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]',
    ghost: 'bg-transparent hover:bg-[#FEF2F2] text-[#B91C1C] border border-transparent',
  }

  const isDisabled = geo.loading || geo.permissionState === 'unsupported'
  const isPermDenied = geo.permissionState === 'denied'

  if (isPermDenied) {
    return (
      <button
        type="button"
        disabled
        id={id}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
          bg-[#F5F5F4] text-[#A8A29E] border border-[#E7E0D8] cursor-not-allowed ${className}`}
        title="Location permission denied. Please enable it in browser settings."
      >
        <AlertTriangle size={15} />
        Location Blocked
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      id={id}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
        transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
        ${variantStyles[variant]} ${className}`}
      title={geo.permissionState === 'unsupported' ? 'Geolocation not supported by your browser' : label}
    >
      {geo.loading ? (
        <>
          <Loader2 size={15} className="animate-spin" />
          Detecting…
        </>
      ) : (
        <>
          <LocateFixed size={15} />
          {label}
        </>
      )}
    </button>
  )
}
