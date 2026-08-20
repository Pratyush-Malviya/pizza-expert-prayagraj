/**
 * reverseGeocode — Converts GPS coordinates into a human-readable address
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * 
 * Rate limit: 1 request/second (sufficient for user-triggered calls)
 * Terms: Must include User-Agent header with app info
 */

export interface ReverseGeocodeResult {
  line1: string          // House number + road
  line2: string          // Neighbourhood / suburb
  city: string
  state: string
  pincode: string
  country: string
  displayName: string    // Full formatted address
  raw: Record<string, unknown>  // Raw Nominatim response for debugging
}

// In-memory cache to avoid duplicate API calls (keyed by "lat,lng")
const cache = new Map<string, ReverseGeocodeResult>()

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', lat.toString())
  url.searchParams.set('lon', lng.toString())
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('zoom', '18') // House-level detail

  const response = await fetch(url.toString(), {
    headers: {
      // Required by Nominatim usage policy
      'User-Agent': 'PizzaExpertPrayagraj/1.0 (contact@pizzaexpert.in)',
      'Accept-Language': 'en',
    },
  })

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`)
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
    line1: line1Parts.join(', ') || addr.amenity || addr.building || 'Near ' + (addr.road || 'your location'),
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
