import { toast } from 'sonner'

let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return null
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx()
      
      // Auto unlock audio context on user gesture
      const unlockAudio = () => {
        if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
          sharedAudioCtx.resume().then(() => {
            window.removeEventListener('click', unlockAudio)
            window.removeEventListener('keydown', unlockAudio)
            window.removeEventListener('touchstart', unlockAudio)
          }).catch(() => {})
        }
      }
      window.addEventListener('click', unlockAudio)
      window.addEventListener('keydown', unlockAudio)
      window.addEventListener('touchstart', unlockAudio)
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {})
    }
    return sharedAudioCtx
  } catch {
    return null
  }
}

/**
 * Play a clean Web Audio synthesizer chime sound.
 */
export function playNotificationSound(type: 'success' | 'alert' | 'status_change' = 'status_change') {
  if (typeof window === 'undefined') return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc2.type = 'triangle'

    if (type === 'success') {
      osc1.frequency.setValueAtTime(523.25, now) // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15) // E5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.3) // G5
      osc2.frequency.setValueAtTime(261.63, now) // C4
    } else if (type === 'alert') {
      osc1.frequency.setValueAtTime(880, now) // A5
      osc1.frequency.setValueAtTime(659.25, now + 0.15) // E5
      osc2.frequency.setValueAtTime(440, now) // A4
    } else {
      // status change bell
      osc1.frequency.setValueAtTime(587.33, now) // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.2) // A5
      osc2.frequency.setValueAtTime(440, now)
    }

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.5)
    osc2.stop(now + 0.5)
  } catch (err) {
    console.warn('Audio notification note:', err)
  }
}

/**
 * Request Browser Web Notification Permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission !== 'denied') {
    try {
      const perm = await Notification.requestPermission()
      return perm === 'granted'
    } catch {
      return false
    }
  }
  return false
}

/**
 * Trigger System Desktop/Mobile Notification.
 */
export function triggerSystemNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      })
    } catch (err) {
      console.warn('System notification trigger note:', err)
    }
  }
}

/**
 * Notify user of an Order Status Change (Toast + Audio Chime + System Web Notification).
 */
export function notifyOrderStatusChange(orderId: string, status: string) {
  let title = `Order #${orderId} Updated`
  let message = `Status changed to ${status.replace(/_/g, ' ')}.`

  switch (status) {
    case 'pending':
    case 'confirmed':
      title = '🍕 Order Confirmed!'
      message = `Order #${orderId} has been confirmed by Pizza Expert Allapur.`
      break
    case 'preparing':
      title = '🔥 Pizza in the Wood-Fired Oven!'
      message = `Order #${orderId} is now being freshly baked in Allapur.`
      break
    case 'out_for_delivery':
      title = '🛵 Order Out For Delivery!'
      message = `Delivery partner is on the way with your order #${orderId}.`
      break
    case 'delivered':
      title = '🎉 Order Delivered!'
      message = `Order #${orderId} has been delivered. Enjoy your meal!`
      break
    case 'cancelled':
      title = '❌ Order Cancelled'
      message = `Order #${orderId} was cancelled.`
      break
  }

  // 1. Visual Sonner Toast
  toast.success(title, { description: message, duration: 6000 })

  // 2. Audible Chime
  playNotificationSound('status_change')

  // 3. Native Browser Notification
  triggerSystemNotification(title, { body: message })
}
