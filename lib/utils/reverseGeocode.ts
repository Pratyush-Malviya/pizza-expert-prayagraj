/**
 * reverseGeocode — Converts GPS coordinates into a human-readable address
 *
 * Calls our own Next.js API proxy (/api/geocode/reverse) which in turn
 * fetches from OpenStreetMap Nominatim server-side — avoiding CORS issues.
 */

export interface ReverseGeocodeResult {
  line1: string         // House number + road
  line2: string         // Neighbourhood / suburb
  city: string
  state: string
  pincode: string
  country: string
  displayName: string   // Full formatted address
  raw: Record<string, unknown>
}

// In-memory cache keyed by "lat,lng" (4 decimal places ≈ ~11m accuracy)
const cache = new Map<string, ReverseGeocodeResult>()

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

  const addr = data.address || {}

  // Build line1 from available parts
  const line1Parts = [
    addr.house_number,
    addr.road || addr.pedestrian || addr.path || addr.footway,
  ].filter(Boolean)

  // Build line2 from neighbourhood/suburb
  const line2Parts = [
    addr.neighbourhood,
    addr.suburb,
    addr.village,
    addr.town,
  ].filter(Boolean)

  const result: ReverseGeocodeResult = {
    line1:
      line1Parts.join(', ') ||
      addr.amenity ||
      addr.building ||
      'Near ' + (addr.road || 'your location'),
    line2: line2Parts.slice(0, 2).join(', '),
    city:
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.state_district ||
      '',
    state: addr.state || '',
    pincode: addr.postcode || '',
    country: addr.country || 'India',
    displayName: data.display_name || '',
    raw: data,
  }

  cache.set(cacheKey, result)
  return result
}

/** Clears the in-memory geocode cache */
export function clearGeocodeCache() {
  cache.clear()
}
