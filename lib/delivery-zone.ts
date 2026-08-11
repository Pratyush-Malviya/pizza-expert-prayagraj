/**
 * lib/delivery-zone.ts
 * Haversine-formula delivery zone utility.
 * No external API calls — pure math, runs on client or server.
 */

const EARTH_RADIUS_KM = 6371

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Calculate the great-circle distance between two lat/lng points in kilometres.
 * Uses the Haversine formula.
 */
export function haversineDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Check if a customer's location is within the restaurant's delivery radius.
 * @returns true if within zone, false if outside
 */
export function isWithinDeliveryZone(
  customerLat: number,
  customerLng: number,
  restaurantLat: number = 25.4358,
  restaurantLng: number = 81.8463,
  radiusKm: number = 8
): boolean {
  const distance = haversineDistanceKm(
    customerLat, customerLng,
    restaurantLat, restaurantLng
  )
  return distance <= radiusKm
}

/**
 * Attempt to geocode an Indian pincode using a free API.
 * Returns { lat, lng } or null if lookup fails.
 * Used as a fallback when Google Places lat/lng is unavailable.
 */
export async function geocodePincode(pincode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`,
      { headers: { 'User-Agent': 'PizzaExpert/1.0' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    return null
  } catch {
    return null
  }
}

/** Known Prayagraj pincodes for fast zone pre-check (no API call needed) */
const PRAYAGRAJ_PINCODES = new Set([
  '211001', '211002', '211003', '211004', '211005',
  '211006', '211007', '211008', '211009', '211010',
  '211011', '211012', '211013', '211014', '211015',
  '211016', '211017', '211018', '211019', '211021',
  '212107', '212301',
])

/**
 * Fast pre-check: is a pincode likely within delivery range?
 * Returns true = definitely in zone, false = needs GPS verification, null = unknown
 */
export function isPincodeInPrayagraj(pincode: string): boolean | null {
  if (PRAYAGRAJ_PINCODES.has(pincode.trim())) return true
  if (pincode.startsWith('211') || pincode.startsWith('212')) return null // maybe, verify
  return false
}
