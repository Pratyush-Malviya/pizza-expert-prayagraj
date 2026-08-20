'use client'

import { useState, useEffect } from 'react'
import { MapPin, X } from 'lucide-react'
import { useGeolocation } from '@/lib/hooks/useGeolocation'

const DISMISSED_KEY = 'location_banner_dismissed'

interface LocationPermissionBannerProps {
  onLocationGranted?: (lat: number, lng: number) => void
}

/**
 * LocationPermissionBanner
 * 
 * A dismissible sticky banner shown to users who haven't granted geolocation yet.
 * Prompts them to allow location for faster checkout.
 * Persists dismiss state in localStorage.
 */
export default function LocationPermissionBanner({ onLocationGranted }: LocationPermissionBannerProps) {
  const [visible, setVisible] = useState(false)
  const { permissionState, loading, requestLocation, lat, lng } = useGeolocation()

  // Show banner only when permission is in 'prompt' state and user hasn't dismissed
  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (!dismissed && permissionState === 'prompt') {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [permissionState])

  // Hide banner when permission is granted
  useEffect(() => {
    if (permissionState === 'granted') {
      setVisible(false)
    }
  }, [permissionState])

  // Callback when location obtained
  useEffect(() => {
    if (lat !== null && lng !== null && onLocationGranted) {
      onLocationGranted(lat, lng)
    }
  }, [lat, lng, onLocationGranted])

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  const handleAllow = () => {
    requestLocation()
  }

  if (!visible) return null

  return (
    <div
      className="w-full bg-gradient-to-r from-[#1C1917] to-[#292524] text-white px-4 py-2.5 flex items-center justify-between gap-3 z-50"
      role="banner"
      aria-label="Location permission request"
    >
      {/* Left — icon + text */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <MapPin size={18} className="text-[#EF4444]" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#EF4444] rounded-full animate-ping" />
        </div>
        <p className="text-xs sm:text-sm font-medium truncate">
          <span className="text-[#FCA5A5] font-semibold">Enable location</span>
          {' '}for faster checkout and accurate delivery estimates.
        </p>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleAllow}
          disabled={loading}
          className="text-xs font-bold bg-[#B91C1C] hover:bg-[#991B1B] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          id="location-banner-allow-btn"
        >
          {loading ? 'Detecting…' : 'Allow Location'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-[#A8A29E] hover:text-white transition-colors p-1 rounded"
          aria-label="Dismiss location banner"
          id="location-banner-dismiss-btn"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
