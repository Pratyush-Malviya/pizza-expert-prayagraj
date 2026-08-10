'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { playNotificationSound, triggerSystemNotification } from '@/lib/utils/notifications'

export default function CustomerRealtimeNotifier() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supabase = createClient()

    // Helper to extract tracked order IDs
    const getTrackedOrderIds = (): string[] => {
      try {
        const localOrders = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
        const ids = localOrders.map((o: any) => o.id || o.order_id).filter(Boolean)
        const lastId = localStorage.getItem('last_placed_order')
        if (lastId && !ids.includes(lastId)) ids.push(lastId)
        return ids
      } catch {
        return []
      }
    }

    const trackedIds = getTrackedOrderIds()

    // Realtime channel for order updates
    const channel = supabase
      .channel('customer-realtime-orders')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload: any) => {
          const updatedOrder = payload.new
          if (!updatedOrder) return

          const idShort = String(updatedOrder.id).slice(0, 8).toUpperCase()
          const newStatus = updatedOrder.status

          // Check if this order is tracked locally
          const localOrders = getTrackedOrderIds()
          const isTracked = localOrders.some(id => String(id).includes(updatedOrder.id) || updatedOrder.id.includes(String(id)))

          if (isTracked || localOrders.length === 0) {
            // Update local storage status
            try {
              localStorage.setItem(`order_status_${updatedOrder.id}`, newStatus)
              const existing = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
              const updated = existing.map((o: any) =>
                o.id === updatedOrder.id ? { ...o, status: newStatus } : o
              )
              localStorage.setItem('pizza_orders', JSON.stringify(updated))
            } catch {}

            // Dispatch event for active tracking page UI update
            window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
              detail: { orderId: updatedOrder.id, newStatus, orderData: updatedOrder }
            }))
            window.dispatchEvent(new Event('storage'))

            // Handle status-specific notifications
            if (newStatus === 'cancelled') {
              playNotificationSound('alert')
              toast.error(`❌ Order #${idShort} Cancelled`, {
                description: 'Your order was cancelled by Pizza Expert. Refund process has been initiated.',
                duration: 9000,
                action: {
                  label: 'View Details',
                  onClick: () => {
                    window.location.href = `/track?orderId=${updatedOrder.id}`
                  }
                }
              })
              triggerSystemNotification(`❌ Order #${idShort} Cancelled`, {
                body: 'Your order was cancelled. Tap to view refund details.'
              })
            } else {
              playNotificationSound('status_change')

              let statusTitle = `🍕 Order #${idShort} Updated`
              let statusDesc = `Status is now ${newStatus.replace(/_/g, ' ').toUpperCase()}`

              if (newStatus === 'confirmed') {
                statusTitle = `✅ Order #${idShort} Confirmed!`
                statusDesc = 'Kitchen has accepted your order and started prep.'
              } else if (newStatus === 'preparing') {
                statusTitle = `🔥 Order #${idShort} in the Oven!`
                statusDesc = 'Your pizza is currently baking in our wood-fired oven.'
              } else if (newStatus === 'out_for_delivery') {
                statusTitle = `🛵 Order #${idShort} Out For Delivery!`
                statusDesc = 'Delivery partner is on the way with your hot meal.'
              } else if (newStatus === 'delivered') {
                statusTitle = `🎉 Order #${idShort} Delivered!`
                statusDesc = 'Order delivered successfully. Enjoy your pizza!'
              }

              toast.success(statusTitle, {
                description: statusDesc,
                duration: 8000,
                action: {
                  label: 'Track Order',
                  onClick: () => {
                    window.location.href = `/track?orderId=${updatedOrder.id}`
                  }
                }
              })

              triggerSystemNotification(statusTitle, { body: statusDesc })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return null
}
