import { createClient } from '@/lib/supabase/client'
import { notifyOrderStatusChange } from '@/lib/utils/notifications'

/**
 * Universal order status sync helper.
 * Updates order status in Supabase and local storage, triggering instant cross-tab tracking updates.
 */
export async function syncOrderStatus(orderId: string, newStatus: string, notesReason?: string) {
  const isCancel = newStatus === 'cancelled'

  // 1. Sync local storage if present
  try {
    const existing = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
    const updated = existing.map((o: any) =>
      o.id === orderId ? { ...o, status: newStatus, refund_status: isCancel ? 'initiated' : o.refund_status } : o
    )
    localStorage.setItem('pizza_orders', JSON.stringify(updated))
    localStorage.setItem(`order_status_${orderId}`, newStatus)
  } catch (err) {
    console.warn('Localstorage sync note:', err)
  }

  // 2. Dispatch cross-tab / window custom event & trigger notification
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { detail: { orderId, newStatus } }))
    window.dispatchEvent(new Event('storage'))
    notifyOrderStatusChange(orderId, newStatus)
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
        notes: notesReason || (isCancel ? 'Order cancelled by admin. Refund initiated.' : `Status updated to ${newStatus}`),
      })

      // If cancelled, update payments table if record exists
      if (isCancel) {
        await supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('order_id', orderId)
      }
    }
  } catch (err) {
    console.warn('Supabase status sync note:', err)
  }
}
