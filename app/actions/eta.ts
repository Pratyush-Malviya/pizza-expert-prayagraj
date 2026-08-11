'use server'

import { getEstimatedDeliveryMinutes, EtaEstimate } from '@/lib/eta'

export async function fetchEta(): Promise<EtaEstimate> {
  return await getEstimatedDeliveryMinutes()
}
