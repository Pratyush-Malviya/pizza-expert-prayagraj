'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, BellRing, Check, CheckCheck, Trash2,
  ShoppingBag, UtensilsCrossed, CreditCard, Info, ExternalLink, X
} from 'lucide-react'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { toast } from 'sonner'

export default function AdminNotificationDropdown() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    notifications,
    browserPermissionGranted,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestBrowserPermission,
  } = useNotificationStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!mounted) {
    return (
      <button className="p-2 rounded-md text-[#57534E] hover:bg-[#F4EFEA] relative">
        <Bell size={18} />
      </button>
    )
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleEnableBrowserPush = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const granted = await requestBrowserPermission()
    if (granted) {
      toast.success('System browser notifications enabled!')
    } else {
      toast.error('Permission denied or not supported by browser.')
    }
  }

  const handleNotifClick = (notif: typeof notifications[0]) => {
    markAsRead(notif.id)
    setOpen(false)
    if (notif.orderId) {
      router.push('/admin/orders')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFEA] relative transition-colors"
        title="Admin Notifications"
        aria-label="Open notifications dropdown"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#B91C1C] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-[#E7E0D8] z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 bg-[#FBF9F5] border-b border-[#E7E0D8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-sm text-[#1C1917]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {!browserPermissionGranted && (
                <button
                  onClick={handleEnableBrowserPush}
                  className="px-2 py-1 bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                  title="Enable Desktop System Notifications"
                >
                  <BellRing size={12} /> Allow System Push
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1 text-[#57534E] hover:text-[#1C1917] hover:bg-[#E7E0D8]/50 rounded text-xs"
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-[#A8A29E] hover:text-[#1C1917] rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* System Push Permission Notice Banner if not granted */}
          {!browserPermissionGranted && (
            <div className="p-2.5 bg-[#FFFBEB] border-b border-[#E7E0D8] flex items-center justify-between text-xs text-[#D97706]">
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <BellRing size={14} className="shrink-0" />
                <span>Get instant system notifications on new orders.</span>
              </div>
              <button
                onClick={handleEnableBrowserPush}
                className="font-bold underline text-[11px] whitespace-nowrap ml-2"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notifications Scrollable List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E7E0D8]/60">
            {notifications.map((n) => {
              let Icon = ShoppingBag
              let iconBg = 'bg-[#FEF2F2] text-[#B91C1C]'

              if (n.type === 'kitchen') {
                Icon = UtensilsCrossed
                iconBg = 'bg-[#FFFBEB] text-[#D97706]'
              } else if (n.type === 'payment') {
                Icon = CreditCard
                iconBg = 'bg-[#F0FDF4] text-[#15803D]'
              } else if (n.type === 'system') {
                Icon = Info
                iconBg = 'bg-[#F0F9FF] text-[#0284C7]'
              }

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-[#FBF9F5] transition-colors cursor-pointer relative ${
                    !n.read ? 'bg-[#FEF2F2]/30' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="font-serif font-bold text-xs text-[#1C1917] truncate">
                        {n.title}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#57534E] leading-snug line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[9px] text-[#A8A29E] font-mono mt-1 block">
                      {n.time}
                    </span>
                  </div>
                  {!n.read && (
                    <span className="absolute right-3 top-4 w-2 h-2 rounded-full bg-[#B91C1C]" />
                  )}
                </div>
              )
            })}

            {notifications.length === 0 && (
              <div className="p-8 text-center text-[#A8A29E] text-xs space-y-1">
                <Bell size={24} className="mx-auto text-[#E7E0D8] mb-2" />
                <p className="font-semibold text-[#1C1917]">No Notifications</p>
                <p>You&apos;re all caught up with new store updates!</p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-[#FBF9F5] border-t border-[#E7E0D8] flex items-center justify-between text-xs">
            <button
              onClick={() => {
                addNotification({
                  title: '🔔 Test Notification Alert',
                  message: 'Kitchen audio chime & system notification is working properly!',
                  type: 'system',
                  time: 'Just now',
                })
                toast.success('🔔 Notification System Verified & Active!')
              }}
              className="text-[#B91C1C] hover:underline font-bold text-[11px] flex items-center gap-1"
              title="Test notification sound and popup"
            >
              <BellRing size={12} /> Test Alert Sound
            </button>

            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[#A8A29E] hover:text-red-600 flex items-center gap-1 text-[11px] transition-colors ml-auto"
              >
                <Trash2 size={12} /> Clear All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
