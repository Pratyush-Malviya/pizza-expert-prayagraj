'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  MapPin,
  LocateFixed,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Sparkles,
  Layers,
} from 'lucide-react'
import { useLocationStore } from '@/store/locationStore'
import { isPincodeInPrayagraj } from '@/lib/delivery-zone'
import type { ReverseGeocodeResult } from '@/lib/utils/reverseGeocode'
import { toast } from 'sonner'

interface MapLocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectLocation?: (result: ReverseGeocodeResult, coords: { lat: number; lng: number }) => void
  initialCoords?: { lat: number; lng: number } | null
}

const DEFAULT_PRAYAGRAJ = { lat: 25.4358, lng: 81.8463 } // Prayagraj Central

export default function MapLocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialCoords,
}: MapLocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || DEFAULT_PRAYAGRAJ
  )
  const [addressData, setAddressData] = useState<ReverseGeocodeResult | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [tileMode, setTileMode] = useState<'osm' | 'satellite'>('osm')

  const setLocationInStore = useLocationStore((s) => s.setLocation)

  // ── Reverse geocode function (debounced) ───────────────────────────────────
  const resolveCoordinates = useCallback(async (lat: number, lng: number) => {
    setIsResolving(true)
    try {
      const { reverseGeocode } = await import('@/lib/utils/reverseGeocode')
      const result = await reverseGeocode(lat, lng)
      setAddressData(result)
    } catch (err: any) {
      console.warn('Map reverse geocode failed:', err)
    } finally {
      setIsResolving(false)
    }
  }, [])

  // ── Initialize Leaflet Map ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return

    let isMounted = true

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default

        if (!mapContainerRef.current) return

        // Clean existing instance
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }

        const startLat = initialCoords?.lat || coords.lat || DEFAULT_PRAYAGRAJ.lat
        const startLng = initialCoords?.lng || coords.lng || DEFAULT_PRAYAGRAJ.lng

        const map = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 16,
          zoomControl: false,
        })

        // Tile layer
        const tileUrl =
          tileMode === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

        L.tileLayer(tileUrl, {
          maxZoom: 19,
          attribution: '© OpenStreetMap / Esri',
        }).addTo(map)

        // Custom pulsing center pin icon
        const pinHtml = `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full">
            <div class="w-10 h-10 rounded-full bg-[#FF3B00] border-2 border-white shadow-2xl flex items-center justify-center text-white text-lg animate-bounce">
              🍕
            </div>
            <div class="absolute -bottom-1 w-3 h-3 bg-black/50 rounded-full blur-[2px]"></div>
          </div>
        `
        const customIcon = L.divIcon({
          html: pinHtml,
          className: 'custom-map-center-pin',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        })

        const marker = L.marker([startLat, startLng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map)

        markerRef.current = marker
        mapInstanceRef.current = map

        // Initial resolution
        resolveCoordinates(startLat, startLng)

        // Map movement events (when user pans or zooms)
        let timeoutId: any = null
        map.on('move', () => {
          const center = map.getCenter()
          marker.setLatLng(center)
        })

        map.on('moveend', () => {
          const center = map.getCenter()
          setCoords({ lat: center.lat, lng: center.lng })
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            if (isMounted) resolveCoordinates(center.lat, center.lng)
          }, 350)
        })

        // Marker drag events
        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          setCoords({ lat: pos.lat, lng: pos.lng })
          map.panTo(pos)
          resolveCoordinates(pos.lat, pos.lng)
        })
      } catch (err) {
        console.error('Leaflet map error:', err)
      }
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isOpen, tileMode])

  // ── Search Autocomplete ───────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.results || [])
        }
      } catch (e) {
        console.warn('Search autocomplete error:', e)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // ── Fly to selected search result ─────────────────────────────────────────
  const handleSelectSearchResult = (res: any) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([res.lat, res.lng], 17, { duration: 1.2 })
    }
    setCoords({ lat: res.lat, lng: res.lng })
    if (markerRef.current) {
      markerRef.current.setLatLng([res.lat, res.lng])
    }
    setSearchQuery('')
    setSearchResults([])
    resolveCoordinates(res.lat, res.lng)
  }

  // ── "Locate Me" Real-Time GPS Action ─────────────────────────────────────
  const handleLocateMe = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    toast.info('Acquiring fresh high-precision GPS signal…')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 18, { duration: 1.2 })
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        }
        resolveCoordinates(lat, lng)
        toast.success('Centered to your exact live GPS location')
      },
      (err) => {
        setIsLocating(false)
        if (err.code === 1) {
          toast.error('Location permission was denied. Please allow in browser.')
        } else {
          toast.error('Could not get GPS signal. Please move the pin on map manually.')
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  }

  // ── Confirm Location ──────────────────────────────────────────────────────
  const handleConfirmLocation = () => {
    if (!addressData) {
      toast.error('Resolving location address… please wait a second.')
      return
    }

    const userLoc = {
      lat: coords.lat,
      lng: coords.lng,
      line1: addressData.line1,
      line2: addressData.line2,
      city: addressData.city,
      state: addressData.state,
      pincode: addressData.pincode,
      displayName: addressData.displayName,
      isGps: true,
      label: addressData.line2 || addressData.city || 'Pinned Location',
      updatedAt: new Date().toISOString(),
    }

    setLocationInStore(userLoc)
    onSelectLocation?.(addressData, coords)
    toast.success(`Address set to: ${addressData.line1}, ${addressData.line2}`)
    onClose()
  }

  if (!isOpen) return null

  const isDeliverable = addressData?.pincode ? isPincodeInPrayagraj(addressData.pincode) : true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#121217] w-full max-w-2xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0D0D11]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30 flex items-center justify-center font-bold">
              <MapPin size={16} />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-sm uppercase tracking-wider">
                Pin Exact Delivery Location
              </h2>
              <p className="text-[10px] text-zinc-400 font-semibold">
                Drag the map to place the pin on your exact doorstep / building
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Map Viewport Area */}
        <div className="relative flex-1 min-h-[340px] sm:min-h-[400px]">
          
          {/* Top Search Overlay */}
          <div className="absolute top-3 left-3 right-3 z-[1000] space-y-1">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area, colony, street or landmark in Prayagraj…"
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#0D0D11]/90 backdrop-blur-md border border-white/20 text-white placeholder:text-zinc-400 text-xs font-semibold shadow-2xl outline-none focus:border-[#FF3B00] transition-colors"
              />
              {isSearching ? (
                <Loader2 size={15} className="animate-spin text-[#FF3B00] absolute right-3.5 top-1/2 -translate-y-1/2" />
              ) : searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="bg-[#16161E] border border-white/15 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-white/5">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-start gap-2.5 transition-colors group"
                  >
                    <MapPin size={14} className="text-[#FF3B00] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-[#FF3B00] truncate">
                        {res.title}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">{res.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Leaflet Map Canvas */}
          <div ref={mapContainerRef} className="w-full h-full min-h-[340px] sm:min-h-[400px] z-10" />

          {/* Floating Controls: Locate Me & Satellite Toggle */}
          <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
            <button
              onClick={() => setTileMode(tileMode === 'osm' ? 'satellite' : 'osm')}
              className="p-2.5 rounded-2xl bg-[#0D0D11]/90 hover:bg-[#16161E] border border-white/20 text-white shadow-2xl transition-all flex items-center justify-center"
              title="Toggle Satellite / Street View"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={handleLocateMe}
              disabled={isLocating}
              className="p-3 rounded-2xl bg-[#FF3B00] hover:bg-[#E03400] text-white shadow-2xl shadow-[#FF3B00]/40 transition-all flex items-center justify-center group"
              title="Locate my exact position"
            >
              <LocateFixed size={18} className={isLocating ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'} />
            </button>
          </div>
        </div>

        {/* Bottom Address Confirmation Panel */}
        <div className="p-4 sm:p-5 bg-[#0D0D11] border-t border-white/10 space-y-4">
          <div className="flex items-start justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin size={18} className="text-[#FF3B00] shrink-0 mt-0.5" />
              <div className="min-w-0">
                {isResolving ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
                    <Loader2 size={13} className="animate-spin text-[#FF3B00]" />
                    <span>Resolving exact street & building…</span>
                  </div>
                ) : addressData ? (
                  <>
                    <p className="text-sm font-bold text-white truncate">
                      {addressData.line1 || 'Pinned Street'}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {[addressData.line2, addressData.city, addressData.pincode].filter(Boolean).join(', ')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-bold text-[#10B981]">
                        ⚡ Delivery in ~25-30 mins
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-zinc-400">Move map to resolve location</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="py-3 px-5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLocation}
              disabled={isResolving || !addressData}
              className="flex-1 bg-gradient-to-r from-[#FF3B00] to-[#E03400] hover:from-[#E03400] hover:to-[#C02B00] text-white py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#FF3B00]/30 transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>Confirm & Use This Exact Address</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
