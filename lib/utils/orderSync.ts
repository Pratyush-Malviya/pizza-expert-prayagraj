import { createClient } from '@/lib/supabase/client'

/**
 * Universal order status sync helper.
 * Updates order status in Supabase and local storage, triggering instant cross-tab tracking updates.
 */
export async function syncOrderStatus(orderId: string, newStatus: string) {
  // 1. Sync local storage if present
  try {
    const existing = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
    const updated = existing.map((o: any) =>
      o.id === orderId ? { ...o, status: newStatus } : o
    )
    localStorage.setItem('pizza_orders', JSON.stringify(updated))
    localStorage.setItem(`order_status_${orderId}`, newStatus)
  } catch (err) {
    console.warn('Localstorage sync note:', err)
  }

  // 2. Dispatch cross-tab / window custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { detail: { orderId, newStatus } }))
    window.dispatchEvent(new Event('storage'))
  }

  // 3. Sync to Supabase Database
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (!error) {
      // Record status change in order_status_history table
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        notes: `Status updated to ${newStatus}`,
      })
    }
  } catch (err) {
    console.warn('Supabase status sync note:', err)
  }
}
