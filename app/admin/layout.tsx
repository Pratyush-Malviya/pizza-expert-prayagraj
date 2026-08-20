'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminNotificationDropdown from '@/components/layout/AdminNotificationDropdown'
import StoreSwitcher from '@/components/layout/StoreSwitcher'
import { Menu, ExternalLink, LogOut, Loader2, ChevronDown } from 'lucide-react'
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const pathname = usePathname()
  
  // Render login page full-bleed without sidebar or header
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const addNotification = useNotificationStore((state) => state.addNotification)
  
  const adminName = useSettingsStore((state) => state.adminName)
  const adminEmail = useSettingsStore((state) => state.adminEmail)
  const adminAvatarUrl = useSettingsStore((state) => state.adminAvatarUrl)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    if (typeof document !== 'undefined') {
      document.cookie = 'simple_admin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    }
    window.location.href = '/admin/login'
  }

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Real-time Supabase, Broadcast, Storage, and Polling Order Notifier for Admin
  useEffect(() => {
    const notifiedOrderIds = new Set<string>()
    const supabase = createClient()

    const handleNewOrderNotification = (order: any) => {
      if (!order?.id || notifiedOrderIds.has(order.id)) return
      notifiedOrderIds.add(order.id)

      const addr = order.address_json || {}
      const idShort = String(order.id).slice(0, 8).toUpperCase()
      const customerName = addr.name || order.customer_name || 'Customer'
      const orderTotal = Number(order.total || order.total_amount || order.subtotal || 0)

      // 1. Play audio chime alert for staff/admin
      playNotificationSound('alert')

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

      // 3. Native Browser System Notification
      triggerSystemNotification(`🍕 New Order Received #${idShort}`, {
        body: `${customerName} placed an order for ₹${orderTotal}.`,
      })

      // 4. Store in admin notification dropdown state
      addNotification({
        title: `🍕 New Order #${idShort}`,
        message: `${customerName} placed a new order for ₹${orderTotal}.`,
        type: 'order',
        orderId: order.id,
        time: 'Just now',
      })
    }

    // ── Channel 1: Supabase Realtime Postgres Changes ──
    const channel = supabase
      .channel('admin-realtime-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload?.new) handleNewOrderNotification(payload.new)
        }
      )
      .on(
        'broadcast',
        { event: 'new-order' },
        (payload: any) => {
          if (payload?.payload) handleNewOrderNotification(payload.payload)
        }
      )
      .subscribe()

    // ── Channel 2: Cross-tab LocalStorage Event ──
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pizza-expert-last-order' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          handleNewOrderNotification(parsed)
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)

    // ── Channel 3: Active Order Polling Heartbeat (every 12s) ──
    const pollInterval = setInterval(async () => {
      try {
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('id, total, subtotal, address_json, created_at')
          .order('created_at', { ascending: false })
          .limit(5)

        if (recentOrders && recentOrders.length > 0) {
          for (const ord of recentOrders) {
            const createdAtMs = new Date(ord.created_at).getTime()
            const ageSeconds = (Date.now() - createdAtMs) / 1000
            // If order was created in the last 45 seconds and hasn't been notified yet
            if (ageSeconds < 45 && !notifiedOrderIds.has(ord.id)) {
              handleNewOrderNotification(ord)
            } else {
              notifiedOrderIds.add(ord.id)
            }
          }
        }
      } catch {}
    }, 12000)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('storage', handleStorage)
      clearInterval(pollInterval)
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
            <StoreSwitcher />

            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFEA] border border-[#E7E0D8] transition-colors"
            >
              <ExternalLink size={13} />
              <span>View Site</span>
            </Link>

            <AdminNotificationDropdown />

            <div
              className="relative flex items-center gap-2.5 pl-3 border-l border-[#E7E0D8] cursor-pointer select-none"
              onMouseEnter={() => setUserMenuOpen(true)}
              onMouseLeave={() => setUserMenuOpen(false)}
            >
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
              <ChevronDown size={14} className={`text-[#A8A29E] transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#E7E0D8] shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#E7E0D8]">
                    <span className="block text-sm font-bold text-[#1C1917] truncate">
                      {adminName || 'Pratyush Malviya'}
                    </span>
                    <span className="block text-[11px] text-[#A8A29E] truncate">
                      {adminEmail || 'malviya.pratyush26@gmail.com'}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm font-bold text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors disabled:opacity-70"
                  >
                    {isSigningOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content — POS uses full-bleed for split-panel layout */}
        <main className={pathname?.startsWith('/admin/pos') ? 'flex-1 min-w-0 overflow-hidden' : 'p-4 sm:p-6 lg:p-8 flex-1 min-w-0 overflow-x-hidden'}>
          {children}
        </main>
      </div>
    </div>
  )
}
