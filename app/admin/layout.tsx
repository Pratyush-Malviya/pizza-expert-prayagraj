'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminNotificationDropdown from '@/components/layout/AdminNotificationDropdown'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/lib/store/useNotificationStore'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const addNotification = useNotificationStore((state) => state.addNotification)

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Real-time Supabase & local event order listener
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
            const idShort = String(newOrder.id).slice(0, 8)
            addNotification({
              title: `🍕 New Order #${idShort}`,
              message: `${addr.name || 'Customer'} placed a new order for ₹${newOrder.total || newOrder.subtotal || 0}.`,
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
            <AdminNotificationDropdown />

            <div className="flex items-center gap-2.5 pl-3 border-l border-[#E7E0D8]">
              <div className="w-7 h-7 rounded-md bg-[#B91C1C] text-white flex items-center justify-center font-bold text-xs font-serif">
                AD
              </div>
              <div className="hidden sm:block">
                <span className="block text-xs font-semibold text-[#1C1917]">Store Manager</span>
                <span className="block text-[10px] text-[#A8A29E]">Allapur Branch</span>
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
