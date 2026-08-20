'use client'

import { useState, useEffect } from 'react'
import { MapPin, Loader2, ChevronDown, AlertTriangle } from 'lucide-react'
import { useLocationStore } from '@/store/locationStore'
import { checkDeliveryDistance } from '@/lib/delivery-zone'
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
            label: geocodeResult.line2 || geocodeResult.city || 'Live Location',
            updatedAt: new Date().toISOString(),
          }

          setLocation(userLoc)

          const zone = checkDeliveryDistance(lat, lng)
          if (zone.isDeliverable) {
            toast.success(`Delivery set to: ${userLoc.label} (${zone.distanceKm} km)`)
          } else {
            toast.error(`Out of delivery zone (${zone.distanceKm} km away — we deliver within 15 km)`)
          }
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

  const zone = checkDeliveryDistance(currentLocation?.lat, currentLocation?.lng)
  const isDeliverable = zone.isDeliverable
  const displayTitle = currentLocation?.line2 || currentLocation?.city || 'Prayagraj'

  return (
    <button
      onClick={detectLocation}
      disabled={isDetecting}
      className={cn(
        'items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shrink-0',
        isDeliverable
          ? 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10'
          : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/30',
        className
      )}
      title={isDeliverable ? 'Click to detect or change live delivery location' : `Location is ${zone.distanceKm}km away. We deliver within 15km.`}
    >
      {isDetecting ? (
        <Loader2 size={13} className="animate-spin text-[#FF3B00]" />
      ) : !isDeliverable ? (
        <AlertTriangle size={13} className="text-red-400 shrink-0" />
      ) : (
        <MapPin size={13} className="text-[#FF3B00] shrink-0" />
      )}

      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        {currentLocation ? (isDeliverable ? 'Deliver to:' : 'Out of Zone:') : 'Location:'}
      </span>

      <span className={`text-[11px] font-bold truncate max-w-[140px] ${
        isDeliverable ? 'text-white' : 'text-red-200'
      }`}>
        {currentLocation ? displayTitle : 'Prayagraj (Detect GPS)'}
      </span>

      <ChevronDown size={12} className="text-zinc-400 group-hover:text-white shrink-0 ml-0.5" />
    </button>
  )
}
