/**
 * reverseGeocode — Converts GPS coordinates into a human-readable address
 *
 * Calls our own Next.js API proxy (/api/geocode/reverse) which in turn
 * fetches from OpenStreetMap Nominatim server-side — avoiding CORS issues.
 */

export interface ReverseGeocodeResult {
  line1: string         // House number / building / road / street
  line2: string         // Neighbourhood / locality / suburb / area
  city: string          // City or Town
  state: string         // State
  pincode: string       // 6-digit PIN code
  country: string       // Country
  displayName: string   // Full formatted address
  raw: Record<string, unknown>
}

// In-memory cache keyed by "lat,lng" (4 decimal places ≈ ~11m accuracy)
const cache = new Map<string, ReverseGeocodeResult>()

export function parseNominatimAddress(data: any): ReverseGeocodeResult {
  const addr = data?.address || {}
  const displayName = data?.display_name || ''

  // 1. Extract PIN Code (from addr.postcode or regex from display_name)
  let pincode = addr.postcode || ''
  if (!pincode && displayName) {
    const pinMatch = displayName.match(/\b([1-9][0-9]{5})\b/)
    if (pinMatch) pincode = pinMatch[1]
  }
  if (!pincode) pincode = '211006' // Prayagraj default if unresolved

  // 2. Extract City
  const city =
    addr.city ||
    addr.town ||
    addr.city_district ||
    addr.municipality ||
    addr.subdistrict ||
    addr.district ||
    addr.county ||
    'Prayagraj'

  // 3. Extract State
  const state = addr.state || 'Uttar Pradesh'

  // 4. Extract Locality / Suburb / Neighbourhood (Line 2)
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
  ].filter(Boolean)

  const line2 = line2Candidates.slice(0, 2).join(', ')

  // 5. Extract Road / Building / House / Street (Line 1)
  const line1Candidates = [
    addr.house_number,
    addr.building || addr.amenity || addr.shop || addr.office,
    addr.road || addr.street || addr.pedestrian || addr.path || addr.footway,
  ].filter(Boolean)

  let line1 = line1Candidates.join(', ')

  // Fallback: If line1 is empty, extract the first 2-3 segments from display_name
  if (!line1 && displayName) {
    const segments = displayName
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => {
        // Exclude city, state, country, pincode from line1 segments
        const lower = s.toLowerCase()
        return (
          lower !== 'india' &&
          lower !== state.toLowerCase() &&
          lower !== city.toLowerCase() &&
          !s.match(/^\d{6}$/)
        )
      })

    if (segments.length > 0) {
      line1 = segments.slice(0, 2).join(', ')
    }
  }

  // If still empty, use a clean locality fallback
  if (!line1) {
    line1 = line2 ? `Near ${line2}` : 'Prayagraj Central'
  }

  return {
    line1,
    line2: line2 || 'Prayagraj',
    city,
    state,
    pincode,
    country: addr.country || 'India',
    displayName,
    raw: data,
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`

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

  const result = parseNominatimAddress(data)
  cache.set(cacheKey, result)
  return result
}

/** Clears the in-memory geocode cache */
export function clearGeocodeCache() {
  cache.clear()
}
