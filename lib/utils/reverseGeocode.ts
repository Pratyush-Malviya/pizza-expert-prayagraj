/**
 * reverseGeocode — Converts GPS coordinates into a high-precision human-readable address
 *
 * Calls our own Next.js API proxy (/api/geocode/reverse) which in turn
 * fetches from OpenStreetMap Nominatim server-side — avoiding CORS issues.
 */

export interface ReverseGeocodeResult {
  line1: string         // Specific building / house / street / exact place
  line2: string         // Locality / suburb / colony / sector / area
  city: string          // City or Town
  state: string         // State
  pincode: string       // 6-digit PIN code
  country: string       // Country
  displayName: string   // Full formatted address from OSM
  landmark?: string     // Specific POI or landmark if available
  raw: Record<string, unknown>
}

// In-memory cache keyed by "lat,lng" (4 decimal places ≈ ~11m accuracy)
const cache = new Map<string, ReverseGeocodeResult>()

export function parseNominatimAddress(data: any): ReverseGeocodeResult {
  const addr = data?.address || {}
  const displayName: string = data?.display_name || ''

  // 1. Extract PIN Code (from addr.postcode or regex from display_name)
  let pincode = addr.postcode || ''
  if (!pincode && displayName) {
    const pinMatch = displayName.match(/\b([1-9][0-9]{5})\b/)
    if (pinMatch) pincode = pinMatch[1]
  }
  if (!pincode) pincode = '211006'

  // 2. Extract State & City
  const state = addr.state || 'Uttar Pradesh'
  const city =
    addr.city ||
    addr.town ||
    addr.city_district ||
    addr.municipality ||
    addr.district ||
    addr.county ||
    'Prayagraj'

  // 3. Extract Locality / Suburb / Colony / Area (Line 2)
  const line2Candidates = [
    addr.neighbourhood,
    addr.suburb,
    addr.residential,
    addr.quarter,
    addr.locality,
    addr.hamlet,
    addr.village,
    addr.commercial,
    addr.industrial,
    addr.city_district,
  ].filter(Boolean)

  let line2 = Array.from(new Set(line2Candidates)).slice(0, 2).join(', ')

  // 4. Extract Specific Road / Street / Building / House / POI (Line 1)
  const line1Candidates = [
    addr.house_number,
    addr.building || addr.amenity || addr.shop || addr.office || addr.tourism || addr.leisure || addr.historic,
    addr.road || addr.street || addr.pedestrian || addr.path || addr.footway,
  ].filter(Boolean)

  let line1 = Array.from(new Set(line1Candidates)).join(', ')

  // 5. High-Precision Fallback from OSM Display Name
  // Display name is ordered from most specific place to country
  if (displayName) {
    const rawSegments = displayName.split(',').map((s) => s.trim()).filter(Boolean)

    // Filter out generic broad entities
    const specificSegments = rawSegments.filter((seg) => {
      const lower = seg.toLowerCase()
      return (
        lower !== 'india' &&
        lower !== state.toLowerCase() &&
        lower !== city.toLowerCase() &&
        lower !== 'allahabad district' &&
        lower !== 'prayagraj district' &&
        !seg.match(/^\d{6}$/)
      )
    })

    if (!line1 && specificSegments.length > 0) {
      // Use the first 1-2 most specific segments for Line 1
      line1 = specificSegments.slice(0, Math.min(2, specificSegments.length)).join(', ')
    }

    if (!line2 && specificSegments.length > 1) {
      // Use the subsequent segment for Line 2
      line2 = specificSegments[specificSegments.length - 1]
    }
  }

  // If line1 is still identical to line2 or empty, use the leading segment from displayName
  if (!line1 || line1.toLowerCase() === line2.toLowerCase()) {
    if (displayName) {
      const firstPart = displayName.split(',')[0]?.trim()
      if (firstPart) line1 = firstPart
    }
  }

  // Fallback default
  if (!line1) line1 = line2 ? line2 : 'Prayagraj'
  if (!line2) line2 = city

  const landmark = addr.amenity || addr.building || addr.shop || addr.office || addr.tourism || ''

  return {
    line1,
    line2,
    city,
    state,
    pincode,
    country: addr.country || 'India',
    displayName,
    landmark: landmark || undefined,
    raw: data,
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  // Call our server-side proxy to avoid CORS with Nominatim
  const url = `/api/geocode/reverse?lat=${lat}&lng=${lng}`

  const response = await fetch(url)

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Geocode API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Reverse geocode failed: ${data.error}`)
  }

  const result: ReverseGeocodeResult = {
    line1: data.line1 || '',
    line2: data.line2 || '',
    city: data.city || 'Prayagraj',
    state: data.state || 'Uttar Pradesh',
    pincode: data.pincode || '211006',
    country: data.country || 'India',
    displayName: data.displayName || data.display_name || '',
    landmark: data.landmark || undefined,
    raw: data,
  }

  // If server didn't provide pre-parsed fields, parse raw
  if (!result.line1 && data.address) {
    const parsed = parseNominatimAddress(data)
    result.line1 = parsed.line1
    result.line2 = parsed.line2
    result.city = parsed.city
    result.state = parsed.state
    result.pincode = parsed.pincode
  }

  cache.set(cacheKey, result)
  return result
}

/** Clears the in-memory geocode cache */
export function clearGeocodeCache() {
  cache.clear()
}
