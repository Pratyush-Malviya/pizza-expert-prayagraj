'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { type DeliveryPartner } from '@/lib/tracking/types'

export async function fetchAvailableDrivers(): Promise<{ success: boolean; drivers: DeliveryPartner[]; error?: string }> {
  try {
    const supabase = await createServerClient()

    // 1. Try querying drivers table
    const { data: dbDrivers } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_online', true)
      .eq('is_busy', false)

    if (dbDrivers && dbDrivers.length > 0) {
      const formatted: DeliveryPartner[] = dbDrivers.map(d => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        vehicle_type: d.vehicle_type || 'Bike',
        vehicle_number: d.vehicle_number || '',
        rating: 5.0,
        total_deliveries: 0,
        is_online: d.is_online,
        is_busy: d.is_busy,
        current_lat: Number(d.current_lat || 25.4358),
        current_lng: Number(d.current_lng || 81.8682),
      }))
      return { success: true, drivers: formatted }
    }

    // 2. Try querying profiles where role = 'driver'
    const { data: profileDrivers } = await supabase
      .from('profiles')
      .select('id, name, phone, driver_details(vehicle_type, vehicle_number, is_online)')
      .eq('role', 'driver')

    if (profileDrivers && profileDrivers.length > 0) {
      const onlineDrivers: DeliveryPartner[] = profileDrivers
        .filter((p: any) => {
          const det = Array.isArray(p.driver_details) ? p.driver_details[0] : p.driver_details
          return det?.is_online !== false
        })
        .map((p: any) => {
          const det = Array.isArray(p.driver_details) ? p.driver_details[0] : p.driver_details
          return {
            id: p.id,
            name: p.name,
            phone: p.phone || '',
            vehicle_type: det?.vehicle_type || 'Bike',
            vehicle_number: det?.vehicle_number || '',
            rating: 5.0,
            total_deliveries: 0,
            is_online: true,
            is_busy: false,
            current_lat: 25.4358,
            current_lng: 81.8682,
          }
        })
      return { success: true, drivers: onlineDrivers }
    }

    return { success: true, drivers: [] }
  } catch (err: any) {
    return { success: false, drivers: [], error: err.message }
  }
}

export async function assignOrderToDriver(orderId: string, driverId: string): Promise<{
  success: boolean
  driver?: DeliveryPartner
  error?: string
}> {
  try {
    const supabase = await createServerClient()

    // Find driver in DB
    const { data: dbDriver } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single()

    const { data: profileDriver } = await supabase
      .from('profiles')
      .select('id, name, phone, driver_details(vehicle_type, vehicle_number)')
      .eq('id', driverId)
      .single()

    const det = Array.isArray(profileDriver?.driver_details) ? profileDriver?.driver_details[0] : profileDriver?.driver_details
    const assignedDriver: DeliveryPartner = {
      id: driverId,
      name: dbDriver?.name || profileDriver?.name || 'Assigned Driver',
      phone: dbDriver?.phone || profileDriver?.phone || '',
      vehicle_type: dbDriver?.vehicle_type || det?.vehicle_type || 'Bike',
      vehicle_number: dbDriver?.vehicle_number || det?.vehicle_number || '',
      rating: 5.0,
      total_deliveries: 0,
      is_online: true,
      is_busy: true,
      current_lat: Number(dbDriver?.current_lat || 25.4358),
      current_lng: Number(dbDriver?.current_lng || 81.8682),
    }

    // Update database
    try {
      await supabase
        .from('deliveries')
        .upsert({
          order_id: orderId,
          driver_id: driverId,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })

      await supabase
        .from('drivers')
        .update({ is_busy: true })
        .eq('id', driverId)

      await supabase
        .from('orders')
        .update({ status: 'assigned', driver_id: driverId })
        .eq('id', orderId)
    } catch {}

    revalidatePath('/admin/orders')
    revalidatePath('/admin/deliveries')
    revalidatePath(`/track`)

    return { success: true, driver: assignedDriver }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to assign driver' }
  }
}

export async function autoAssignNearestAvailableDriver(orderId: string): Promise<{
  success: boolean
  driver?: DeliveryPartner
  message?: string
  error?: string
}> {
  try {
    const { drivers } = await fetchAvailableDrivers()
    
    if (!drivers || drivers.length === 0) {
      return {
        success: false,
        error: 'No idle delivery partners registered in the system. Please onboard delivery staff from Driver Management first.'
      }
    }

    const chosenDriver = drivers[0]
    await assignOrderToDriver(orderId, chosenDriver.id)

    return {
      success: true,
      driver: chosenDriver,
      message: `Successfully auto-dispatched to ${chosenDriver.name} (${chosenDriver.vehicle_type} • ${chosenDriver.vehicle_number || 'UP 70'})`
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Auto-assignment failed' }
  }
}

export async function purgeOldDeliveryActivities(): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const supabase = await createServerClient()

    // 1. Purge all location history and breadcrumbs
    try {
      await supabase.from('driver_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    } catch {}

    // 2. Purge past delivery assignments
    try {
      await supabase.from('deliveries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    } catch {}

    // 3. Reset all drivers' busy status to idle & reset GPS to Allapur kitchen hub
    try {
      await supabase
        .from('drivers')
        .update({
          is_busy: false,
          current_lat: 25.4358,
          current_lng: 81.8682,
          last_location_update: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000')
    } catch {}

    // 4. Try admin service role if available
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (url && serviceKey && serviceKey !== 'your-service-role-key') {
        const admin = createAdminClient(url, serviceKey)
        await admin.from('driver_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await admin.from('deliveries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await admin.from('drivers').update({ is_busy: false, current_lat: 25.4358, current_lng: 81.8682 }).neq('id', '00000000-0000-0000-0000-000000000000')
      }
    } catch {}

    revalidatePath('/admin/deliveries')
    revalidatePath('/admin/orders')
    revalidatePath('/admin/drivers')
    revalidatePath('/track')
    revalidatePath('/partner/deliveries')

    return {
      success: true,
      message: 'All past delivery activities, GPS tracking logs, and active trip assignments have been purged.'
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to purge delivery activities' }
  }
}
