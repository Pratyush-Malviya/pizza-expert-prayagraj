'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { GPSLocation } from '@/lib/tracking/types'
import { STORE_LOCATION } from '@/lib/tracking/types'
import { Compass, MapPin, Navigation, RefreshCw } from 'lucide-react'

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
  destinationLocation,
  destinationAddress = 'Pizza Expert Kitchen (Allapur)',
  status = 'ready',
  driverName = 'Delivery Partner',
  routeWaypoints = [],
  etaMinutes = 0,
  distanceKm = 0,
}: LiveDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layerGroupRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  const isDriverActive = Boolean(
    driverLocation &&
    (driverLocation.lat !== STORE_LOCATION.lat || driverLocation.lng !== STORE_LOCATION.lng || distanceKm > 0 || (etaMinutes && etaMinutes > 0))
  )

  // 1. Initialize Map Instance Once
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    let isMounted = true
    let map: any = null
    let resizeObserver: ResizeObserver | null = null

    const initialize = async () => {
      try {
        const L = (await import('leaflet')).default

        if (!mapContainerRef.current || !isMounted) return

        // Clean any existing leaflet instances safely
        if ((mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null
        }
        if (mapInstanceRef.current) {
          try { mapInstanceRef.current.remove() } catch {}
          mapInstanceRef.current = null
        }

        map = L.map(mapContainerRef.current, {
          center: [STORE_LOCATION.lat, STORE_LOCATION.lng],
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        })

        L.control.zoom({ position: 'bottomright' }).addTo(map)

        // OpenStreetMap Standard Tiles (100% Free, Global Standard)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)

        const layerGroup = L.layerGroup().addTo(map)
        layerGroupRef.current = layerGroup
        mapInstanceRef.current = map

        // Automatic ResizeObserver to immediately resize tiles when container mounts
        if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            if (map) map.invalidateSize()
          })
          resizeObserver.observe(mapContainerRef.current)
        }

        // Multi-pass invalidation triggers
        setTimeout(() => {
          if (map && isMounted) {
            map.invalidateSize()
            setMapReady(true)
          }
        }, 100)

        setTimeout(() => {
          if (map && isMounted) map.invalidateSize()
        }, 400)

        setTimeout(() => {
          if (map && isMounted) map.invalidateSize()
        }, 1000)
      } catch (err) {
        console.warn('Leaflet map initialization warning:', err)
      }
    }

    initialize()

    return () => {
      isMounted = false
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (map) {
        try { map.remove() } catch {}
      }
      mapInstanceRef.current = null
      layerGroupRef.current = null
    }
  }, [])

  // 2. Update Markers and Polylines inside LayerGroup without destroying map
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return

    let isMounted = true

    import('leaflet').then((LModule) => {
      if (!isMounted || !mapInstanceRef.current || !layerGroupRef.current) return
      const L = LModule.default
      const map = mapInstanceRef.current
      const layerGroup = layerGroupRef.current

      layerGroup.clearLayers()

      // ── Store Pin (Allapur Hub) ──
      const storeIcon = L.divIcon({
        className: 'custom-store-marker',
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);">
            <span style="position:absolute;width:36px;height:36px;background:rgba(239,68,68,0.3);border-radius:9999px;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <div style="width:32px;height:32px;border-radius:9999px;background:#B91C1C;border:2px solid #FFFFFF;box-shadow:0 4px 6px -1px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-size:15px;font-weight:bold;">
              🍕
            </div>
            <div style="position:absolute;bottom:-20px;background:#1C1917;color:#FFFFFF;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
              Pizza Expert (Allapur)
            </div>
          </div>
        `,
        iconSize: [0, 0],
      })

      L.marker([STORE_LOCATION.lat, STORE_LOCATION.lng], { icon: storeIcon })
        .addTo(layerGroup)
        .bindPopup('<b>Pizza Expert Kitchen</b><br/>Shop 4, Allapur Main Road, Prayagraj')

      // ── Destination Pin (Customer) ──
      if (destinationLocation && (destinationLocation.lat !== STORE_LOCATION.lat || destinationLocation.lng !== STORE_LOCATION.lng)) {
        const destIcon = L.divIcon({
          className: 'custom-dest-marker',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);">
              <div style="width:30px;height:30px;border-radius:9999px;background:#15803D;border:2px solid #FFFFFF;box-shadow:0 4px 6px -1px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-size:14px;">
                🏠
              </div>
              <div style="position:absolute;bottom:-20px;background:#15803D;color:#FFFFFF;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                Delivery Address
              </div>
            </div>
          `,
          iconSize: [0, 0],
        })

        L.marker([destinationLocation.lat, destinationLocation.lng], { icon: destIcon })
          .addTo(layerGroup)
          .bindPopup(`<b>Destination</b><br/>${destinationAddress}`)

        // Polyline Route
        const defaultRoute: [number, number][] = routeWaypoints.length > 0
          ? routeWaypoints
          : [
              [STORE_LOCATION.lat, STORE_LOCATION.lng],
              [25.4410, 81.8590],
              [25.4472, 81.8445],
              [destinationLocation.lat, destinationLocation.lng],
            ]

        L.polyline(defaultRoute, {
          color: '#B91C1C',
          weight: 4,
          opacity: 0.85,
          dashArray: '6, 6',
          lineCap: 'round',
        }).addTo(layerGroup)
      }

      // ── Driver Pin (Rider on road) ──
      if (isDriverActive && driverLocation) {
        const driverIcon = L.divIcon({
          className: 'custom-driver-marker',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);">
              <span style="position:absolute;width:42px;height:42px;background:rgba(245,158,11,0.4);border-radius:9999px;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
              <div style="width:36px;height:36px;border-radius:9999px;background:#1C1917;border:2px solid #F59E0B;box-shadow:0 6px 10px -2px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:18px;">
                🛵
              </div>
              <div style="position:absolute;top:-22px;background:#1C1917;color:#F59E0B;font-size:10px;font-family:monospace;font-weight:bold;padding:2px 6px;border-radius:4px;white-space:nowrap;border:1px solid rgba(245,158,11,0.4);">
                ${driverName}
              </div>
            </div>
          `,
          iconSize: [0, 0],
        })

        L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon }).addTo(layerGroup)

        // Fit bounds on active route
        if (destinationLocation) {
          const bounds = L.latLngBounds([
            [STORE_LOCATION.lat, STORE_LOCATION.lng],
            [destinationLocation.lat, destinationLocation.lng],
            [driverLocation.lat, driverLocation.lng],
          ])
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
        }
      } else {
        map.setView([STORE_LOCATION.lat, STORE_LOCATION.lng], 14)
      }

      map.invalidateSize()
    })

    return () => {
      isMounted = false
    }
  }, [
    driverLocation?.lat,
    driverLocation?.lng,
    destinationLocation?.lat,
    destinationLocation?.lng,
    destinationAddress,
    driverName,
    isDriverActive,
    routeWaypoints
  ])

  const recenterMap = () => {
    if (!mapInstanceRef.current) return
    import('leaflet').then((LModule) => {
      const L = LModule.default
      const map = mapInstanceRef.current
      if (!destinationLocation || !isDriverActive || !driverLocation) {
        map.setView([STORE_LOCATION.lat, STORE_LOCATION.lng], 14, { animate: true })
        return
      }

      const bounds = L.latLngBounds([
        [STORE_LOCATION.lat, STORE_LOCATION.lng],
        [destinationLocation.lat, destinationLocation.lng],
        [driverLocation.lat, driverLocation.lng],
      ])
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    })
  }

  return (
    <div className="relative w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-[#E7E0D8] shadow-md bg-[#F4F1EA]">
      {/* Inline Leaflet CSS Guard (prevents any Tailwind reset collapse) */}
      <style>{`
        .leaflet-container img.leaflet-tile {
          max-width: none !important;
          max-height: none !important;
          width: 256px !important;
          height: 256px !important;
          display: block !important;
        }
        .leaflet-pane {
          z-index: 1 !important;
        }
      `}</style>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[360px]"
        style={{ width: '100%', height: '100%', minHeight: '360px', position: 'relative', zIndex: 1 }}
      />

      {/* Floating Live Telemetry HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none" style={{ zIndex: 1000 }}>
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-[#E7E0D8] flex items-center gap-2.5 pointer-events-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
              {isDriverActive ? 'Live Fleet GPS Radar' : 'Radar Standby • Allapur Hub'}
            </div>
            <div className="text-xs sm:text-sm font-black text-[#1C1917] flex items-center gap-1.5 font-mono">
              {isDriverActive ? (
                <>
                  <span>⏱ {etaMinutes} Mins</span>
                  <span className="text-[#A8A29E]">•</span>
                  <span className="text-[#B91C1C]">📍 {distanceKm} km away</span>
                </>
              ) : (
                <span className="text-emerald-700 font-bold">Kitchen Hub Online</span>
              )}
            </div>
          </div>
        </div>

        {/* Recenter Action Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={recenterMap}
            title="Recenter Map on Hub & Fleet"
            className="p-2.5 bg-white/95 hover:bg-white text-[#1C1917] rounded-xl shadow-md border border-[#E7E0D8] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 text-xs font-bold"
          >
            <Compass size={16} className="text-[#B91C1C]" />
            <span className="hidden sm:inline">Center Hub</span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Status Tag */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none max-w-[85%]" style={{ zIndex: 1000 }}>
        <div className="bg-[#1C1917]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-2 shadow-lg border border-white/10 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="truncate">
            {isDriverActive
              ? `${driverName} is on route to ${destinationAddress}`
              : 'Pizza Expert Hub (Allapur, Prayagraj) • Radar Active'}
          </span>
        </div>
      </div>
    </div>
  )
}
