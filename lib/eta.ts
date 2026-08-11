/**
 * lib/eta.ts
 * Server-side ETA calculation based on current KDS queue depth.
 * Uses active order count to dynamically estimate preparation time.
 */

import { createClient } from '@/lib/supabase/server'

export interface EtaEstimate {
  prepMin: number
  deliveryMin: number
  totalLabel: string   // e.g. "25–35 min"
  isQuiet: boolean     // true when queue is empty (fastest ETA)
}

/**
 * Calculates estimated delivery time from the current KDS queue.
 * @returns EtaEstimate — server-safe, call from RSC or Server Action
 */
export async function getEstimatedDeliveryMinutes(): Promise<EtaEstimate> {
  const BASE_PREP = 15      // baseline prep time (minutes)
  const BASE_DELIVERY = 15  // fixed travel estimate (minutes)
  const BUFFER = 5          // ±5 min range buffer for display

  try {
    const supabase = await createClient()

    // Count active orders in kitchen (confirmed + preparing = queue depth)
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['confirmed', 'preparing'])

    const queueDepth = count || 0

    // Dynamic prep time based on queue depth
    let prepMin: number
    if (queueDepth === 0) {
      prepMin = BASE_PREP          // quiet: 15 min
    } else if (queueDepth <= 3) {
      prepMin = BASE_PREP + 5      // moderate: 20 min
    } else if (queueDepth <= 6) {
      prepMin = BASE_PREP + 10     // busy: 25 min
    } else {
      prepMin = BASE_PREP + 20     // peak rush: 35 min
    }

    const totalMin = prepMin + BASE_DELIVERY
    const totalLabel = `${totalMin}–${totalMin + BUFFER} min`

    return {
      prepMin,
      deliveryMin: BASE_DELIVERY,
      totalLabel,
      isQuiet: queueDepth === 0,
    }
  } catch {
    // Fallback when DB unavailable (build time, etc.)
    return {
      prepMin: BASE_PREP,
      deliveryMin: BASE_DELIVERY,
      totalLabel: `${BASE_PREP + BASE_DELIVERY}–${BASE_PREP + BASE_DELIVERY + BUFFER} min`,
      isQuiet: true,
    }
  }
}
