'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminNotificationDropdown from '@/components/layout/AdminNotificationDropdown'
import { Menu, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { toast } from 'sonner'
import { playNotificationSound, triggerSystemNotification } from '@/lib/utils/notifications'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  
  // Render login page full-bleed without sidebar or header
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const addNotification = useNotificationStore((state) => state.addNotification)
  
  const adminName = useSettingsStore((state) => state.adminName)
  const adminEmail = useSettingsStore((state) => state.adminEmail)
  const adminAvatarUrl = useSettingsStore((state) => state.adminAvatarUrl)

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Real-time Supabase & local event order listener for Admin
  useEffect(() => {
    try {
      const supabase = createClient()
      const channel = supabase
        .channel('admin-order-events')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload: any) => {
            const newOrder = payload.new
            const addr = newOrder.address_json || {}
            const idShort = String(newOrder.id).slice(0, 8).toUpperCase()
            const customerName = addr.name || 'Guest Customer'
            const orderTotal = Number(newOrder.total || newOrder.subtotal || 0)

            // 1. Play audio chime alert for staff/admin
            playNotificationSound('success')

            // 2. High-visibility Toast Notification Pop-up
            toast.success(`🍕 New Order Received! #${idShort}`, {
              description: `${customerName} placed an order for ₹${orderTotal}.`,
              duration: 10000,
              action: {
                label: 'View Orders',
                onClick: () => {
                  window.location.href = '/admin/orders'
                },
              },
            })

            // 3. Native Browser Notification
            triggerSystemNotification(`🍕 New Order Received #${idShort}`, {
              body: `${customerName} placed an order for ₹${orderTotal}.`,
            })

            // 4. Store in admin notification dropdown state
            addNotification({
              title: `🍕 New Order #${idShort}`,
              message: `${customerName} placed a new order for ₹${orderTotal}.`,
              type: 'order',
              orderId: newOrder.id,
              time: 'Just now',
            })
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.warn('Realtime subscription note:', err)
    }
  }, [addNotification])

  return (
    <div className="flex min-h-screen bg-[#FBF9F5] text-[#1C1917] relative overflow-x-hidden">
      {/* Admin Sidebar (handles both desktop & mobile drawer) */}
      <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-[#E7E0D8] h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-md text-[#1C1917] hover:bg-[#F4EFEA] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <Menu size={20} />
            </button>

            <span className="text-[11px] sm:text-xs font-semibold text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-md border border-[#15803D]/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse" />
              Live Kitchen System
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFEA] border border-[#E7E0D8] transition-colors"
            >
              <ExternalLink size={13} />
              <span>View Site</span>
            </Link>

            <AdminNotificationDropdown />

            <div className="flex items-center gap-2.5 pl-3 border-l border-[#E7E0D8]">
              {adminAvatarUrl ? (
                <img
                  src={adminAvatarUrl}
                  alt={adminName || 'Admin Avatar'}
                  className="w-8 h-8 rounded-full object-cover border border-[#E7E0D8]"
                />
              ) : (
                <div className="w-8 h-8 rounded-md bg-[#B91C1C] text-white flex items-center justify-center font-bold text-xs font-serif uppercase">
                  {(adminName || 'PM').slice(0, 2)}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-bold text-[#1C1917] leading-tight">
                  {adminName || 'Pratyush Malviya'}
                </span>
                <span className="block text-[10px] text-[#A8A29E] truncate max-w-[150px]">
                  {adminEmail || 'malviya.pratyush26@gmail.com'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
