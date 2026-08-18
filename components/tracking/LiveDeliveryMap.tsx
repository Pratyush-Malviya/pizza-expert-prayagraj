'use client'

import { useEffect, useRef, useState } from 'react'
import type { GPSLocation } from '@/lib/tracking/types'
import { STORE_LOCATION } from '@/lib/tracking/types'
import { Navigation, Compass, MapPin, Maximize2, RefreshCw } from 'lucide-react'

interface LiveDeliveryMapProps {
  driverLocation?: GPSLocation | null
  destinationLocation?: { lat: number; lng: number }
  destinationAddress?: string
  status?: string
  driverName?: string
  routeWaypoints?: [number, number][]
  etaMinutes?: number
  distanceKm?: number
}

export default function LiveDeliveryMap({
  driverLocation,
  destinationLocation = { lat: 25.4528, lng: 81.8346 },
  destinationAddress = 'Civil Lines, Prayagraj',
  status = 'heading_to_customer',
  driverName = 'Rahul Sharma',
  routeWaypoints = [],
  etaMinutes = 14,
  distanceKm = 2.8,
}: LiveDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const driverMarkerRef = useRef<any>(null)
  const routePolylineRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [followDriver, setFollowDriver] = useState(true)

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    let isMounted = true

    const initMap = async () => {
      const L = (await import('leaflet')).default

      // Import Leaflet CSS dynamically if not present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      if (!mapContainerRef.current || mapInstanceRef.current) return

      // Clean up previous map if existing
      if ((mapContainerRef.current as any)._leaflet_id) {
        (mapContainerRef.current as any)._leaflet_id = null
      }

      const initialCenter: [number, number] = driverLocation
        ? [driverLocation.lat, driverLocation.lng]
        : [STORE_LOCATION.lat, STORE_LOCATION.lng]

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: false,
      })

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // High quality CartoDB Voyager tiles (Zomato/Uber style clean map)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map)

      // ── 1. Store Marker (Allapur) ──
      const storeIcon = L.divIcon({
        className: 'custom-store-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute -top-1 -left-1 w-10 h-10 bg-red-500/25 rounded-full animate-ping"></span>
            <div class="w-8 h-8 rounded-full bg-[#B91C1C] border-2 border-white shadow-lg flex items-center justify-center text-white text-sm font-bold">
              🍕
            </div>
            <div class="absolute -bottom-6 bg-[#1C1917] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
              Pizza Expert (Allapur)
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      L.marker([STORE_LOCATION.lat, STORE_LOCATION.lng], { icon: storeIcon })
        .addTo(map)
        .bindPopup('<b>Pizza Expert Kitchen</b><br/>Shop 4, Allapur Main Road, Prayagraj')

      // ── 2. Destination Marker (Customer Address) ──
      const destIcon = L.divIcon({
        className: 'custom-dest-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-[#15803D] border-2 border-white shadow-lg flex items-center justify-center text-white text-sm">
              🏠
            </div>
            <div class="absolute -bottom-6 bg-[#15803D] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
              Delivery Address
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      L.marker([destinationLocation.lat, destinationLocation.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>Your Address</b><br/>${destinationAddress}`)

      // ── 3. Delivery Route Polyline ──
      const defaultRoute: [number, number][] = routeWaypoints.length > 0
        ? routeWaypoints
        : [
            [STORE_LOCATION.lat, STORE_LOCATION.lng],
            [25.4410, 81.8590],
            [25.4472, 81.8445],
            [destinationLocation.lat, destinationLocation.lng],
          ]

      const polyline = L.polyline(defaultRoute, {
        color: '#B91C1C',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      routePolylineRef.current = polyline

      // ── 4. Driver Marker (Moving Scooter) ──
      const driverStartLat = driverLocation?.lat ?? defaultRoute[1][0]
      const driverStartLng = driverLocation?.lng ?? defaultRoute[1][1]

      const driverIcon = L.divIcon({
        className: 'custom-driver-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-12 h-12 bg-amber-400/40 rounded-full animate-ping"></span>
            <div class="w-10 h-10 rounded-full bg-[#1C1917] border-2 border-[#F59E0B] shadow-xl flex items-center justify-center text-base transform transition-transform">
              🛵
            </div>
            <div class="absolute -top-6 bg-[#1C1917] text-[#F59E0B] text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow border border-[#F59E0B]/30 whitespace-nowrap">
              ${driverName}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })

      const driverMarker = L.marker([driverStartLat, driverStartLng], { icon: driverIcon }).addTo(map)
      driverMarkerRef.current = driverMarker

      // Fit bounds to show store, driver, and destination
      const bounds = L.latLngBounds([
        [STORE_LOCATION.lat, STORE_LOCATION.lng],
        [destinationLocation.lat, destinationLocation.lng],
        [driverStartLat, driverStartLng],
      ])
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })

      mapInstanceRef.current = map
      if (isMounted) setMapLoaded(true)
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [destinationLocation.lat, destinationLocation.lng, destinationAddress, driverName])

  // Update Driver Marker on live GPS position changes
  useEffect(() => {
    if (!driverLocation || !driverMarkerRef.current || !mapInstanceRef.current) return

    const newLatLng = [driverLocation.lat, driverLocation.lng] as [number, number]
    driverMarkerRef.current.setLatLng(newLatLng)

    if (followDriver && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(newLatLng, { animate: true, duration: 0.8 })
    }
  }, [driverLocation, followDriver])

  const recenterMap = () => {
    if (!mapInstanceRef.current) return
    const L = (window as any).L
    if (!L) return

    const driverLat = driverLocation?.lat ?? STORE_LOCATION.lat
    const driverLng = driverLocation?.lng ?? STORE_LOCATION.lng

    const bounds = L.latLngBounds([
      [STORE_LOCATION.lat, STORE_LOCATION.lng],
      [destinationLocation.lat, destinationLocation.lng],
      [driverLat, driverLng],
    ])
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    setFollowDriver(true)
  }

  return (
    <div className="relative w-full h-[360px] sm:h-[440px] rounded-2xl overflow-hidden border border-[#E7E0D8] shadow-md bg-[#FBF9F5]">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Live Telemetry HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-[#E7E0D8] flex items-center gap-2.5 pointer-events-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
              {status === 'delivered' ? 'Order Delivered' : 'Live Delivery GPS'}
            </div>
            <div className="text-xs sm:text-sm font-black text-[#1C1917] flex items-center gap-1.5 font-mono">
              <span>⏱ {etaMinutes} Mins</span>
              <span className="text-[#A8A29E]">•</span>
              <span className="text-[#B91C1C]">📍 {distanceKm} km away</span>
            </div>
          </div>
        </div>

        {/* Recenter / Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={recenterMap}
            title="Recenter Map on Driver & Destination"
            className="p-2.5 bg-white/95 hover:bg-white text-[#1C1917] rounded-xl shadow-md border border-[#E7E0D8] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 text-xs font-bold"
          >
            <Compass size={16} className="text-[#B91C1C]" />
            <span className="hidden sm:inline">Fit Route</span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Status Tag */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <div className="bg-[#1C1917]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-2 shadow-lg border border-white/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{driverName} is on the way via Allapur & George Town</span>
        </div>
      </div>
    </div>
  )
}
