'use client'

import { useState, useEffect } from 'react'
import { MapPin, X, Loader2 } from 'lucide-react'

const DISMISSED_KEY = 'location_banner_dismissed'

interface LocationPermissionBannerProps {
  onLocationGranted?: (lat: number, lng: number) => void
}

/**
 * LocationPermissionBanner
 *
 * Dismissible banner shown when browser location hasn't been granted yet.
 * Directly calls navigator.geolocation on "Allow Location" click —
 * no hook dependency chain.
 */
export default function LocationPermissionBanner({ onLocationGranted }: LocationPermissionBannerProps) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Don't show if already dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return

    // Don't show if geolocation not supported
    if (!navigator.geolocation) return

    // Check current permission state (without triggering a prompt)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'prompt') {
          setVisible(true)
        }
        // If already granted or denied, don't show the banner
      }).catch(() => {
        // permissions API not available — show banner anyway
        setVisible(true)
      })
    } else {
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  const handleAllow = () => {
    if (!navigator.geolocation) return
    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false)
        setVisible(false)
        onLocationGranted?.(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        // Permission denied or error — just hide the banner
        setLoading(false)
        setVisible(false)
        localStorage.setItem(DISMISSED_KEY, '1')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  if (!visible) return null

  return (
    <div
      className="w-full bg-gradient-to-r from-[#1C1917] to-[#292524] text-white px-4 py-2.5 flex items-center justify-between gap-3 z-50"
      role="banner"
      aria-label="Location permission request"
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <MapPin size={18} className="text-[#EF4444]" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#EF4444] rounded-full animate-ping" />
        </div>
        <p className="text-xs sm:text-sm font-medium truncate">
          <span className="text-[#FCA5A5] font-semibold">Allow location access</span>
          {' '}for faster checkout and accurate delivery.
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleAllow}
          disabled={loading}
          className="text-xs font-bold bg-[#B91C1C] hover:bg-[#991B1B] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap flex items-center gap-1.5"
          id="location-banner-allow-btn"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
          {loading ? 'Waiting…' : 'Allow Location'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-[#A8A29E] hover:text-white transition-colors p-1 rounded"
          aria-label="Dismiss"
          id="location-banner-dismiss-btn"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
