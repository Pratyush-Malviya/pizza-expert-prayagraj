/**
 * lib/delivery-zone.ts
 *
 * Delivery zone and distance calculation utility.
 * Enforces a strict 15 km maximum delivery radius from our Allapur, Prayagraj kitchen.
 */

export const STORE_LOCATION = {
  name: 'Pizza Expert Allapur',
  lat: 25.4358,
  lng: 81.8463,
  address: 'Allapur, Prayagraj, Uttar Pradesh 211006',
}

export const MAX_DELIVERY_RADIUS_KM = 15

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

export interface DeliveryZoneCheckResult {
  isDeliverable: boolean
  distanceKm: number | null
  maxRadiusKm: number
  message?: string
}

/**
 * Checks whether customer coordinates are within the 15 km delivery radius.
 */
export function checkDeliveryDistance(
  customerLat?: number | null,
  customerLng?: number | null,
  maxRadiusKm = MAX_DELIVERY_RADIUS_KM
): DeliveryZoneCheckResult {
  if (customerLat == null || customerLng == null || isNaN(customerLat) || isNaN(customerLng)) {
    return {
      isDeliverable: true,
      distanceKm: null,
      maxRadiusKm,
    }
  }

  const distance = haversineDistanceKm(
    customerLat,
    customerLng,
    STORE_LOCATION.lat,
    STORE_LOCATION.lng
  )

  const distanceKm = Math.round(distance * 10) / 10
  const isDeliverable = distance <= maxRadiusKm

  return {
    isDeliverable,
    distanceKm,
    maxRadiusKm,
    message: isDeliverable
      ? `Within 15 km delivery radius (${distanceKm} km from store)`
      : `Delivery unavailable. We only deliver within ${maxRadiusKm} km of our kitchen in Allapur. Your location is ${distanceKm} km away.`,
  }
}

/**
 * Backward compatible check for delivery zone.
 */
export function isWithinDeliveryZone(
  customerLat?: number,
  customerLng?: number,
  restaurantLat: number = STORE_LOCATION.lat,
  restaurantLng: number = STORE_LOCATION.lng,
  radiusKm: number = MAX_DELIVERY_RADIUS_KM
): boolean {
  if (customerLat == null || customerLng == null) return true
  const distance = haversineDistanceKm(customerLat, customerLng, restaurantLat, restaurantLng)
  return distance <= radiusKm
}

/**
 * Validates whether a given string is a valid 6-digit Indian postal PIN code.
 */
export function isValidIndianPincode(pincode: string): boolean {
  if (!pincode) return false
  return /^[1-9][0-9]{5}$/.test(pincode.trim())
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
 * Legacy helper
 */
export function isPincodeInPrayagraj(pincode: string): boolean | null {
  if (!pincode || pincode.trim().length < 6) return null
  return isValidIndianPincode(pincode)
}

export function isDeliverablePincode(pincode: string): boolean {
  return isValidIndianPincode(pincode)
}
