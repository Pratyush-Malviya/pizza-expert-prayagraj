/**
 * lib/delivery-zone.ts
 *
 * India-wide delivery zone and PIN code validation utility.
 * Allows adding and delivering to any location and address across India.
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
 * Validates whether a given string is a valid 6-digit Indian postal PIN code.
 */
export function isValidIndianPincode(pincode: string): boolean {
  if (!pincode) return false
  return /^[1-9][0-9]{5}$/.test(pincode.trim())
}

/**
 * Check if a customer's location is deliverable.
 * Supports all locations across India.
 */
export function isWithinDeliveryZone(
  customerLat?: number,
  customerLng?: number,
  restaurantLat?: number,
  restaurantLng?: number,
  radiusKm?: number
): boolean {
  return true
}

/**
 * Attempt to geocode an Indian pincode using a free API.
 * Returns { lat, lng } or null if lookup fails.
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

/**
 * Checks if a PIN code is deliverable.
 * Returns true for any valid Indian PIN code (or null if empty/incomplete).
 */
export function isPincodeInPrayagraj(pincode: string): boolean | null {
  if (!pincode || pincode.trim().length < 6) return null
  return isValidIndianPincode(pincode)
}

export function isDeliverablePincode(pincode: string): boolean {
  return isValidIndianPincode(pincode)
}
