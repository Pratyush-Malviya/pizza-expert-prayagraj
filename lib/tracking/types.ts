export type DeliveryStatus = 
  | 'unassigned'
  | 'assigned'
  | 'accepted'
  | 'picked_up'
  | 'heading_to_customer'
  | 'arrived'
  | 'delivered'
  | 'failed'
  | 'cancelled'

export interface GPSLocation {
  lat: number
  lng: number
  heading?: number
  speed?: number
  accuracy?: number
  updatedAt: number
}

export interface DeliveryPartner {
  id: string
  name: string
  phone: string
  photo_url?: string
  vehicle_type: string
  vehicle_number: string
  rating: number
  total_deliveries: number
  is_online: boolean
  is_busy: boolean
  current_lat?: number
  current_lng?: number
}

export interface ActiveDelivery {
  id: string
  order_id: string
  driver_id?: string
  driver?: DeliveryPartner
  status: DeliveryStatus
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  otp_code: string
  total_amount: number
  items_summary: string
  customer_name: string
  customer_phone: string
  created_at: string
}

// Store Coordinates (Pizza Expert Allapur, Prayagraj)
export const STORE_LOCATION: GPSLocation = {
  lat: 25.4358,
  lng: 81.8682,
  updatedAt: Date.now()
}

export const STORE_DETAILS = {
  name: 'Pizza Expert Prayagraj',
  address: 'Shop 4, Allapur Main Road, Near Matiyara Chauraha, Prayagraj, UP 211006',
  phone: '+91 99999 99999',
  lat: 25.4358,
  lng: 81.8682
}

// Sample Destination Landmarks in Prayagraj
export const PRAYAGRAJ_LANDMARKS: Record<string, { name: string; lat: number; lng: number }> = {
  civil_lines: { name: 'Civil Lines (MG Marg)', lat: 25.4528, lng: 81.8346 },
  katra: { name: 'Katra Chauraha', lat: 25.4600, lng: 81.8540 },
  george_town: { name: 'George Town, Prayagraj', lat: 25.4410, lng: 81.8590 },
  tagore_town: { name: 'Tagore Town, Prayagraj', lat: 25.4470, lng: 81.8510 },
  allapur_local: { name: 'Allapur Colony Sector 2', lat: 25.4380, lng: 81.8710 }
}

// Simulated Waypoint Routes through Prayagraj streets from Allapur
export const SIMULATED_ROUTE_CIVIL_LINES: [number, number][] = [
  [25.4358, 81.8682], // Store: Allapur
  [25.4369, 81.8655],
  [25.4382, 81.8620],
  [25.4401, 81.8585], // George Town Entry
  [25.4420, 81.8540],
  [25.4445, 81.8490], // Tagore Town Chauraha
  [25.4472, 81.8445],
  [25.4500, 81.8390],
  [25.4520, 81.8360],
  [25.4528, 81.8346]  // Civil Lines Destination
]

export const DEFAULT_SAMPLE_DRIVER: DeliveryPartner = {
  id: 'DP-ALLAPUR-01',
  name: 'Rahul Sharma',
  phone: '+91 98765 43210',
  photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  vehicle_type: 'Honda Activa 6G',
  vehicle_number: 'UP 70 AB 1234',
  rating: 4.9,
  total_deliveries: 1420,
  is_online: true,
  is_busy: true,
  current_lat: 25.4401,
  current_lng: 81.8585
}
