'use client'

import { useState, useEffect } from 'react'
import { MapPin, Loader2, ChevronDown } from 'lucide-react'
import { useLocationStore } from '@/store/locationStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function HeaderLocationPicker({ className }: { className?: string }) {
  const { currentLocation, setLocation, isDetecting, setDetecting } = useLocationStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const detectLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Location detection is not supported by your browser.')
      return
    }

    setDetecting(true)
    toast.info('Detecting your live location… Please allow browser permission.')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const { reverseGeocode } = await import('@/lib/utils/reverseGeocode')
          const geocodeResult = await reverseGeocode(lat, lng)

          setLocation({
            lat,
            lng,
            line1: geocodeResult.line1,
            line2: geocodeResult.line2,
            city: geocodeResult.city,
            state: geocodeResult.state,
            pincode: geocodeResult.pincode,
            displayName: geocodeResult.displayName,
            isGps: true,
            label: geocodeResult.line2 || geocodeResult.city || 'Live Location',
            updatedAt: new Date().toISOString(),
          })
          toast.success(`Delivery set to: ${geocodeResult.line2 || geocodeResult.city || 'Your Location'}`)
        } catch (e: any) {
          toast.error('Could not resolve location address.')
        } finally {
          setDetecting(false)
        }
      },
      (err) => {
        setDetecting(false)
        if (err.code === 1) {
          toast.error('Location permission was denied in your browser settings.')
        } else {
          toast.error('Unable to fetch GPS position.')
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  }

  if (!mounted) return null

  const displayTitle = currentLocation?.line2 || currentLocation?.city || 'Prayagraj'
  const displaySubtitle = currentLocation?.line1 || (currentLocation ? `${currentLocation.city}, ${currentLocation.pincode}` : 'Tap to detect live location')

  return (
    <button
      onClick={detectLocation}
      disabled={isDetecting}
      className={cn(
        'items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors group cursor-pointer',
        className || 'hidden md:flex max-w-[210px] lg:max-w-[260px]'
      )}
      title="Click to detect or update live delivery location"
    >
      <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-[#FF3B00]/15 text-[#FF3B00] group-hover:scale-110 transition-transform shrink-0">
        {isDetecting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <MapPin size={14} />
        )}
        {currentLocation && (
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#10B981]" />
        )}
      </div>

      <div className="flex flex-col min-w-0 pr-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
            {currentLocation ? 'Deliver to' : 'Set Location'}
          </span>
          <span className="text-[11px] font-bold text-white truncate max-w-[90px] lg:max-w-[120px]">
            {displayTitle}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 truncate max-w-[130px] lg:max-w-[170px] leading-tight">
          {displaySubtitle}
        </span>
      </div>

      <ChevronDown size={12} className="text-zinc-500 group-hover:text-white shrink-0 ml-auto" />
    </button>
  )
}
