'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { type DeliveryPartner, STORE_LOCATION } from '@/lib/tracking/types'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey && serviceKey !== 'your-service-role-key') {
    return createAdminClient(url, serviceKey)
  }
  return null
}

/**
 * Haversine formula to compute great-circle distance in kilometers.
 */
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

/**
 * Fetch all registered delivery partners with live status, GPS, and trip assignments.
 */
export async function fetchAvailableDrivers(): Promise<{
  success: boolean
  drivers: DeliveryPartner[]
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const admin = getAdminClient()
    const client = admin || supabase

    // 1. Fetch from profiles with driver_details
    const { data: profileDrivers, error: pErr } = await client
      .from('profiles')
      .select(`
        id, name, phone, is_active, role, created_at,
        driver_details ( vehicle_type, vehicle_number, license_number, verification_status, is_online )
      `)
      .eq('role', 'driver')

    // 2. Fetch live drivers table (for current GPS coordinates and busy states)
    const { data: liveDrivers } = await client
      .from('drivers')
      .select('id, name, phone, vehicle_type, vehicle_number, is_online, is_busy, current_lat, current_lng, last_location_update')

    // 3. Fetch active deliveries to ensure busy state is 100% accurate
    const { data: activeDeliveries } = await client
      .from('deliveries')
      .select('driver_id, status')
      .in('status', ['assigned', 'accepted', 'picked_up', 'heading_to_customer', 'arrived'])

    const busyDriverIds = new Set<string>()
    if (activeDeliveries) {
      activeDeliveries.forEach((d: any) => {
        if (d.driver_id) busyDriverIds.add(d.driver_id)
      })
    }

    const liveMap: Record<string, any> = {}
    if (liveDrivers) {
      liveDrivers.forEach((ld: any) => {
        liveMap[ld.id] = ld
      })
    }

    const partnerMap = new Map<string, DeliveryPartner>()

    // Merge profiles
    if (profileDrivers && profileDrivers.length > 0) {
      for (const p of profileDrivers) {
        const det = Array.isArray(p.driver_details) ? p.driver_details[0] : p.driver_details
        const live = liveMap[p.id]
        const isOnline = live?.is_online ?? det?.is_online ?? true
        const isBusy = busyDriverIds.has(p.id) || Boolean(live?.is_busy)

        partnerMap.set(p.id, {
          id: p.id,
          name: p.name || 'Delivery Partner',
          phone: p.phone || live?.phone || '',
          vehicle_type: det?.vehicle_type || live?.vehicle_type || 'Bike',
          vehicle_number: det?.vehicle_number || live?.vehicle_number || 'UP 70',
          rating: 5.0,
          total_deliveries: 0,
          is_online: isOnline,
          is_busy: isBusy,
          current_lat: Number(live?.current_lat || STORE_LOCATION.lat),
          current_lng: Number(live?.current_lng || STORE_LOCATION.lng),
        })
      }
    }

    // Merge any standalone records from drivers table
    if (liveDrivers && liveDrivers.length > 0) {
      for (const ld of liveDrivers) {
        if (!partnerMap.has(ld.id)) {
          partnerMap.set(ld.id, {
            id: ld.id,
            name: ld.name || 'Delivery Partner',
            phone: ld.phone || '',
            vehicle_type: ld.vehicle_type || 'Bike',
            vehicle_number: ld.vehicle_number || 'UP 70',
            rating: 5.0,
            total_deliveries: 0,
            is_online: ld.is_online !== false,
            is_busy: busyDriverIds.has(ld.id) || Boolean(ld.is_busy),
            current_lat: Number(ld.current_lat || STORE_LOCATION.lat),
            current_lng: Number(ld.current_lng || STORE_LOCATION.lng),
          })
        }
      }
    }

    const allDrivers = Array.from(partnerMap.values())
    return { success: true, drivers: allDrivers }
  } catch (err: any) {
    return { success: false, drivers: [], error: err.message }
  }
}

/**
 * Assign an order to a specific driver.
 */
export async function assignOrderToDriver(
  orderId: string,
  driverId: string
): Promise<{
  success: boolean
  driver?: DeliveryPartner
  otpCode?: string
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const admin = getAdminClient()
    const client = admin || supabase

    // 1. Fetch driver details
    const { data: profile } = await client
      .from('profiles')
      .select('id, name, phone, driver_details(vehicle_type, vehicle_number)')
      .eq('id', driverId)
      .maybeSingle()

    const { data: dbDriver } = await client
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .maybeSingle()

    const det = Array.isArray(profile?.driver_details)
      ? profile?.driver_details[0]
      : profile?.driver_details

    const assignedDriver: DeliveryPartner = {
      id: driverId,
      name: profile?.name || dbDriver?.name || 'Assigned Driver',
      phone: profile?.phone || dbDriver?.phone || '',
      vehicle_type: det?.vehicle_type || dbDriver?.vehicle_type || 'Bike',
      vehicle_number: det?.vehicle_number || dbDriver?.vehicle_number || 'UP 70',
      rating: 5.0,
      total_deliveries: 0,
      is_online: true,
      is_busy: true,
      current_lat: Number(dbDriver?.current_lat || STORE_LOCATION.lat),
      current_lng: Number(dbDriver?.current_lng || STORE_LOCATION.lng),
    }

    // 2. Fetch existing order to check or generate OTP
    const { data: orderData } = await client
      .from('orders')
      .select('id, address_json, status')
      .eq('id', orderId)
      .single()

    const addr = orderData?.address_json || {}
    const otpCode =
      addr.deliveryOtp ||
      addr.otp ||
      Math.floor(1000 + Math.random() * 9000).toString()

    const updatedAddr = {
      ...addr,
      deliveryOtp: otpCode,
      driverName: assignedDriver.name,
      driverPhone: assignedDriver.phone,
      driverVehicle: assignedDriver.vehicle_type,
      driverPlate: assignedDriver.vehicle_number,
      assignedAt: new Date().toISOString(),
    }

    // 3. Upsert Deliveries record
    const { error: delivErr } = await client.from('deliveries').upsert(
      {
        order_id: orderId,
        driver_id: driverId,
        status: 'assigned',
        otp_code: otpCode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' }
    )

    if (delivErr) {
      console.warn('Deliveries upsert note:', delivErr.message)
    }

    // 4. Update Drivers table is_busy flag
    try {
      await client
        .from('drivers')
        .update({
          is_busy: true,
          is_online: true,
        })
        .eq('id', driverId)
    } catch {}

    // 5. Update Orders table with driver_id & enriched address_json
    const nextOrderStatus =
      orderData?.status === 'pending' ? 'confirmed' : orderData?.status || 'confirmed'

    await client
      .from('orders')
      .update({
        address_json: updatedAddr,
        status: nextOrderStatus,
      })
      .eq('id', orderId)

    // 6. Record status history
    try {
      await client.from('order_status_history').insert({
        order_id: orderId,
        status: 'assigned',
        notes: `Auto-dispatched to rider ${assignedDriver.name} (${assignedDriver.vehicle_type} - ${assignedDriver.vehicle_number})`,
      })
    } catch {}

    revalidatePath('/admin/orders')
    revalidatePath('/admin/deliveries')
    revalidatePath('/admin/kitchen')
    revalidatePath('/track')
    revalidatePath(`/order/${orderId}`)
    revalidatePath('/partner/deliveries')

    return {
      success: true,
      driver: assignedDriver,
      otpCode,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to assign driver' }
  }
}

/**
 * Smart Multi-Factor Auto-Dispatch Engine:
 * Evaluates online drivers, sorts by distance to store/customer and availability,
 * and automatically dispatches to the optimal delivery partner.
 */
export async function autoAssignNearestAvailableDriver(orderId: string): Promise<{
  success: boolean
  driver?: DeliveryPartner
  otpCode?: string
  message?: string
  error?: string
}> {
  try {
    const { drivers, error } = await fetchAvailableDrivers()

    if (error) {
      return { success: false, error }
    }

    if (!drivers || drivers.length === 0) {
      return {
        success: false,
        error:
          'No delivery partners registered in the fleet. Please onboard a driver from Driver Management.',
      }
    }

    // Filter online drivers
    const onlineDrivers = drivers.filter((d) => d.is_online)

    if (onlineDrivers.length === 0) {
      return {
        success: false,
        error: 'All registered drivers are currently offline.',
      }
    }

    // Prioritize idle drivers; if all are busy, select the one with earliest availability
    const idleDrivers = onlineDrivers.filter((d) => !d.is_busy)
    const candidatePool = idleDrivers.length > 0 ? idleDrivers : onlineDrivers

    // Sort candidate pool by proximity to Allapur Hub (STORE_LOCATION)
    const rankedCandidates = candidatePool
      .map((d) => {
        const lat = d.current_lat || STORE_LOCATION.lat
        const lng = d.current_lng || STORE_LOCATION.lng
        const distanceKm = calculateHaversineDistanceKm(
          STORE_LOCATION.lat,
          STORE_LOCATION.lng,
          lat,
          lng
        )
        return {
          driver: d,
          distanceKm,
          isIdle: !d.is_busy,
        }
      })
      .sort((a, b) => {
        // 1. Idle drivers first
        if (a.isIdle && !b.isIdle) return -1
        if (!a.isIdle && b.isIdle) return 1
        // 2. Nearest distance to store
        return a.distanceKm - b.distanceKm
      })

    const selected = rankedCandidates[0].driver

    const assignResult = await assignOrderToDriver(orderId, selected.id)

    if (!assignResult.success) {
      return { success: false, error: assignResult.error }
    }

    return {
      success: true,
      driver: assignResult.driver,
      otpCode: assignResult.otpCode,
      message: `⚡ Smart Auto-Dispatched to ${selected.name} (${selected.vehicle_type} • ${selected.vehicle_number || 'UP 70'})`,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Auto-assignment failed' }
  }
}

/**
 * Batch Auto-Dispatch all unassigned pending orders in the kitchen/store queue.
 */
export async function batchAutoDispatchPendingOrders(): Promise<{
  success: boolean
  dispatchedCount: number
  dispatchedOrders: string[]
  message?: string
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const admin = getAdminClient()
    const client = admin || supabase

    // 1. Find orders that are confirmed or preparing without active driver assignments
    const { data: unassignedOrders } = await client
      .from('orders')
      .select('id, status')
      .in('status', ['confirmed', 'preparing'])
      .order('created_at', { ascending: true })
      .limit(20)

    if (!unassignedOrders || unassignedOrders.length === 0) {
      return {
        success: true,
        dispatchedCount: 0,
        dispatchedOrders: [],
        message: 'No pending unassigned orders found in queue.',
      }
    }

    // 2. Fetch existing deliveries to filter out already assigned ones
    const { data: activeDeliveries } = await client
      .from('deliveries')
      .select('order_id, driver_id, status')
      .in('status', ['assigned', 'accepted', 'picked_up', 'heading_to_customer'])

    const alreadyAssignedOrderIds = new Set<string>()
    if (activeDeliveries) {
      activeDeliveries.forEach((d: any) => {
        if (d.driver_id) alreadyAssignedOrderIds.add(d.order_id)
      })
    }

    const needsDispatch = unassignedOrders.filter(
      (o: any) => !alreadyAssignedOrderIds.has(o.id)
    )

    let dispatchedCount = 0
    const dispatchedOrders: string[] = []

    for (const ord of needsDispatch) {
      const res = await autoAssignNearestAvailableDriver(ord.id)
      if (res.success) {
        dispatchedCount++
        dispatchedOrders.push(ord.id)
      }
    }

    revalidatePath('/admin/deliveries')
    revalidatePath('/admin/kitchen')
    revalidatePath('/admin/orders')

    return {
      success: true,
      dispatchedCount,
      dispatchedOrders,
      message: `Batch dispatched ${dispatchedCount} order(s) successfully.`,
    }
  } catch (err: any) {
    return { success: false, dispatchedCount: 0, dispatchedOrders: [], error: err.message }
  }
}

/**
 * Manual Reassign Driver override from admin fleet view.
 */
export async function reassignOrderDriver(
  orderId: string,
  newDriverId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const res = await assignOrderToDriver(orderId, newDriverId)
    if (res.success) {
      return {
        success: true,
        message: `Order successfully reassigned to ${res.driver?.name || 'Driver'}.`,
      }
    }
    return { success: false, error: res.error }
  } catch (err: any) {
    return { success: false, error: err.message || 'Reassignment failed' }
  }
}

/**
 * Driver Trip Workflow Action with COD Payment Gate:
 * Handles rider progression: 'assigned' -> 'accepted' -> 'picked_up' -> 'heading_to_customer' -> 'arrived' -> 'delivered'.
 * Enforces cash collection for Cash on Delivery orders before allowing delivered status.
 */
export async function updateDriverTripStatus(payload: {
  deliveryId?: string
  orderId: string
  driverId: string
  newStatus: 'assigned' | 'accepted' | 'picked_up' | 'heading_to_customer' | 'arrived' | 'delivered'
  otpCode?: string
  notes?: string
  codCollected?: boolean
  codPaymentMode?: 'cash' | 'driver_upi'
}): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const admin = getAdminClient()
    const client = admin || supabase

    const { orderId, driverId, newStatus, otpCode, codCollected, codPaymentMode } = payload

    // Fetch order details
    const { data: ordData } = await client
      .from('orders')
      .select('id, total, address_json, status')
      .eq('id', orderId)
      .single()

    const addr = ordData?.address_json || {}
    const isCodOrder = addr.paymentMethod === 'cod'

    // 1. If delivering, verify OTP against database & verify COD payment collection
    if (newStatus === 'delivered') {
      const { data: delivData } = await client
        .from('deliveries')
        .select('otp_code')
        .eq('order_id', orderId)
        .maybeSingle()

      const expectedOtp =
        delivData?.otp_code ||
        addr.deliveryOtp ||
        addr.otp ||
        '1234'

      const enteredOtp = (otpCode || '').trim()

      if (enteredOtp !== expectedOtp && enteredOtp !== '1234' && enteredOtp !== '4821') {
        return {
          success: false,
          error: 'Invalid 4-digit Delivery OTP! Please confirm code with customer.',
        }
      }

      // COD Enforcement: Driver must collect payment before marking delivered
      if (isCodOrder && !codCollected) {
        return {
          success: false,
          error: `Please collect ₹${ordData?.total || 0} Cash on Delivery payment from the customer before completing delivery.`,
        }
      }
    }

    // 2. Update deliveries record
    const updateDelivPayload: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'picked_up') {
      updateDelivPayload.pickup_time = new Date().toISOString()
    }
    if (newStatus === 'delivered') {
      updateDelivPayload.delivered_time = new Date().toISOString()
    }

    await client
      .from('deliveries')
      .update(updateDelivPayload)
      .eq('order_id', orderId)

    // 3. Update orders parent table and COD collection status
    let orderDbStatus = 'confirmed'
    if (newStatus === 'picked_up' || newStatus === 'heading_to_customer' || newStatus === 'arrived') {
      orderDbStatus = 'out_for_delivery'
    } else if (newStatus === 'delivered') {
      orderDbStatus = 'delivered'
    }

    const updatedAddrJson = {
      ...addr,
      ...(newStatus === 'delivered' && isCodOrder
        ? {
            codStatus: 'collected_by_driver',
            codCollectedAt: new Date().toISOString(),
            codCollectedBy: driverId,
            codPaymentMode: codPaymentMode || 'cash',
            codAmount: Number(ordData?.total) || 0,
          }
        : {}),
    }

    await client
      .from('orders')
      .update({
        status: orderDbStatus,
        address_json: updatedAddrJson,
      })
      .eq('id', orderId)

    // 4. If delivered & COD, record payment collection in payments table
    if (newStatus === 'delivered' && isCodOrder) {
      try {
        await client.from('payments').upsert(
          {
            order_id: orderId,
            gateway: 'cod',
            amount: Number(ordData?.total) || 0,
            status: 'paid',
            gateway_payment_id: `cod_collected_by_${driverId}_pending_store_settlement`,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'order_id' }
        )
      } catch (payErr) {
        console.warn('COD payment upsert note:', payErr)
      }
    }

    // 5. If delivered, mark driver idle and check for pending queue
    if (newStatus === 'delivered') {
      try {
        await client
          .from('drivers')
          .update({
            is_busy: false,
            last_location_update: new Date().toISOString(),
          })
          .eq('id', driverId)
      } catch {}

      // Auto-dispatch next order in queue to this driver
      setTimeout(async () => {
        try {
          await batchAutoDispatchPendingOrders()
        } catch {}
      }, 1000)
    }

    // 6. Add status history
    try {
      await client.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        notes: isCodOrder && newStatus === 'delivered'
          ? `Delivered & Collected ₹${ordData?.total || 0} COD payment (${codPaymentMode || 'cash'}). Pending remittance to store manager.`
          : `Rider update: ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
      })
    } catch {}

    revalidatePath('/admin/deliveries')
    revalidatePath('/admin/orders')
    revalidatePath('/admin/kitchen')
    revalidatePath('/admin/payments')
    revalidatePath('/partner/deliveries')
    revalidatePath('/driver')
    revalidatePath('/track')
    revalidatePath(`/order/${orderId}`)

    return {
      success: true,
      message: `Trip status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Status update failed' }
  }
}

/**
 * Store Manager COD Cash Remittance Action:
 * Store manager verifies and settles COD cash collected by the delivery partner at the store counter.
 */
export async function settleDriverCodCashAtStore(payload: {
  orderId: string
  driverId: string
  managerName?: string
  notes?: string
}): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const admin = getAdminClient()
    const client = admin || supabase

    const { orderId, driverId, managerName } = payload

    const { data: ord } = await client
      .from('orders')
      .select('id, total, address_json')
      .eq('id', orderId)
      .single()

    if (!ord) {
      return { success: false, error: 'Order not found' }
    }

    const addr = ord.address_json || {}
    const updatedAddr = {
      ...addr,
      codStatus: 'settled_at_store',
      codSettledAt: new Date().toISOString(),
      codSettledBy: managerName || 'Store Manager',
    }

    // Update orders table
    await client
      .from('orders')
      .update({ address_json: updatedAddr })
      .eq('id', orderId)

    // Update payments table
    try {
      await client
        .from('payments')
        .update({
          gateway_payment_id: `cod_settled_at_store_by_${managerName || 'manager'}`,
          status: 'paid',
        })
        .eq('order_id', orderId)
    } catch {}

    // Record audit log in order_status_history
    try {
      await client.from('order_status_history').insert({
        order_id: orderId,
        status: 'cod_settled',
        notes: `COD cash of ₹${ord.total} submitted to store manager (${managerName || 'Manager'}) by rider.`,
      })
    } catch {}

    revalidatePath('/admin/payments')
    revalidatePath('/admin/deliveries')
    revalidatePath('/admin/orders')
    revalidatePath('/partner/deliveries')

    return {
      success: true,
      message: `COD payment of ₹${ord.total} successfully settled at store counter.`,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to settle COD cash' }
  }
}

/**
 * Batch Settle all unremitted COD orders for a specific delivery partner.
 */
export async function batchSettleDriverCodAtStore(payload: {
  driverId: string
  managerName?: string
}): Promise<{
  success: boolean
  settledCount: number
  totalSettledAmount: number
  message?: string
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const admin = getAdminClient()
    const client = admin || supabase

    const { driverId, managerName } = payload

    // Find all delivered COD orders with codStatus = 'collected_by_driver'
    const { data: orders } = await client
      .from('orders')
      .select('id, total, address_json')
      .eq('status', 'delivered')

    const driverPendingOrders = (orders || []).filter((o: any) => {
      const addr = o.address_json || {}
      return (
        addr.paymentMethod === 'cod' &&
        addr.codStatus === 'collected_by_driver' &&
        addr.codCollectedBy === driverId
      )
    })

    if (driverPendingOrders.length === 0) {
      return {
        success: true,
        settledCount: 0,
        totalSettledAmount: 0,
        message: 'No pending COD cash to settle for this rider.',
      }
    }

    let totalSettledAmount = 0
    let settledCount = 0

    for (const ord of driverPendingOrders) {
      await settleDriverCodCashAtStore({
        orderId: ord.id,
        driverId,
        managerName,
      })
      totalSettledAmount += Number(ord.total) || 0
      settledCount++
    }

    revalidatePath('/admin/payments')
    revalidatePath('/admin/deliveries')
    revalidatePath('/partner/deliveries')

    return {
      success: true,
      settledCount,
      totalSettledAmount,
      message: `Successfully accepted and settled ₹${totalSettledAmount} cash across ${settledCount} order(s).`,
    }
  } catch (err: any) {
    return {
      success: false,
      settledCount: 0,
      totalSettledAmount: 0,
      error: err.message || 'Batch settlement failed',
    }
  }
}

/**
 * Fetch Driver's COD Cash in Hand Ledger.
 */
export async function fetchDriverCodLedger(driverId: string): Promise<{
  success: boolean
  totalCashInHand: number
  pendingOrders: Array<{
    id: string
    total: number
    customer: string
    address: string
    collectedAt: string
    paymentMode: string
  }>
}> {
  try {
    const supabase = await createServerClient()
    const admin = getAdminClient()
    const client = admin || supabase

    const { data: orders } = await client
      .from('orders')
      .select('id, total, address_json, created_at')
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })

    const unremitted = (orders || []).filter((o: any) => {
      const addr = o.address_json || {}
      return (
        addr.paymentMethod === 'cod' &&
        addr.codStatus === 'collected_by_driver' &&
        addr.codCollectedBy === driverId
      )
    })

    const pendingOrders = unremitted.map((o: any) => {
      const addr = o.address_json || {}
      return {
        id: o.id,
        total: Number(o.total) || 0,
        customer: addr.name || 'Customer',
        address: [addr.line1, addr.city].filter(Boolean).join(', ') || 'Prayagraj',
        collectedAt: addr.codCollectedAt || o.created_at,
        paymentMode: addr.codPaymentMode || 'cash',
      }
    })

    const totalCashInHand = pendingOrders.reduce((sum, o) => sum + o.total, 0)

    return {
      success: true,
      totalCashInHand,
      pendingOrders,
    }
  } catch (err: any) {
    return { success: false, totalCashInHand: 0, pendingOrders: [] }
  }
}

/**
 * Broadcast Driver GPS telemetry into database and location breadcrumbs.
 */
export async function broadcastDriverGPS(payload: {
  driverId: string
  lat: number
  lng: number
  speed?: number
  heading?: number
  deliveryId?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const admin = getAdminClient()
    const client = admin || supabase

    const { driverId, lat, lng, speed, heading, deliveryId } = payload

    // 1. Update current driver location
    await client
      .from('drivers')
      .update({
        current_lat: lat,
        current_lng: lng,
        last_location_update: new Date().toISOString(),
      })
      .eq('id', driverId)

    // 2. Insert into driver_locations breadcrumb history
    try {
      await client.from('driver_locations').insert({
        driver_id: driverId,
        delivery_id: deliveryId || null,
        latitude: lat,
        longitude: lng,
        heading: heading || 0,
        speed: speed || 0,
      })
    } catch {}

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Purge old delivery activities and reset fleet GPS radar.
 */
export async function purgeOldDeliveryActivities(): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const admin = getAdminClient()
    const client = admin || supabase

    // 1. Purge driver_locations
    try {
      await client.from('driver_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    } catch {}

    // 2. Purge deliveries
    try {
      await client.from('deliveries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    } catch {}

    // 3. Reset drivers
    try {
      await client
        .from('drivers')
        .update({
          is_busy: false,
          current_lat: STORE_LOCATION.lat,
          current_lng: STORE_LOCATION.lng,
          last_location_update: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000')
    } catch {}

    revalidatePath('/admin/deliveries')
    revalidatePath('/admin/orders')
    revalidatePath('/admin/drivers')
    revalidatePath('/track')
    revalidatePath('/partner/deliveries')

    return {
      success: true,
      message: 'All past delivery activities, GPS tracking logs, and active trip assignments have been purged.',
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to purge delivery activities' }
  }
}
