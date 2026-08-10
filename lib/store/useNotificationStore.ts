import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  playNotificationSound,
  triggerSystemNotification,
  requestNotificationPermission,
} from '@/lib/utils/notifications'

export interface AdminNotification {
  id: string
  title: string
  message: string
  type: 'order' | 'kitchen' | 'payment' | 'system'
  orderId?: string
  time: string
  createdAt: string
  read: boolean
}

interface NotificationState {
  notifications: AdminNotification[]
  browserPermissionGranted: boolean
  
  // Actions
  addNotification: (notification: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  requestBrowserPermission: () => Promise<boolean>
}

const INITIAL_NOTIFICATIONS: AdminNotification[] = []

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: INITIAL_NOTIFICATIONS,
      browserPermissionGranted: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',

      addNotification: (data) => {
        const id = `notif-${Date.now()}`
        const createdAt = new Date().toISOString()
        const newNotif: AdminNotification = {
          ...data,
          id,
          createdAt,
          read: false,
        }

        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }))

        // Play audible notification chime
        playNotificationSound(data.type === 'order' ? 'alert' : 'success')

        // Trigger native OS browser notification if permitted
        triggerSystemNotification(data.title, {
          body: data.message,
          tag: id,
        })
      },

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearAll: () =>
        set(() => ({
          notifications: [],
        })),

      requestBrowserPermission: async () => {
        const granted = await requestNotificationPermission()
        set({ browserPermissionGranted: granted })
        if (granted) {
          triggerSystemNotification('🔔 Notifications Enabled!', {
            body: 'You will now receive instant desktop notifications for new sales orders.',
          })
        }
        return granted
      },
    }),
    {
      name: 'pizza-expert-notifications',
    }
  )
)
