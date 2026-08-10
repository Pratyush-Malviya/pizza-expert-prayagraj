'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ShoppingBag, Pizza, Tag,
  Settings, LogOut, ExternalLink,
  ChevronRight, CreditCard, UtensilsCrossed, Truck, X, Palette,
  TrendingUp, Boxes, FileText, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ADMIN_LINKS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Analytics & BI', href: '/admin/analytics', icon: TrendingUp },
  { label: 'Inventory & Stock', href: '/admin/inventory', icon: Boxes },
  { label: 'GST Compliance', href: '/admin/compliance', icon: FileText },
  { label: 'Suppliers & POs', href: '/admin/suppliers', icon: Truck },
  { label: 'Staff Roster', href: '/admin/staff', icon: Users },
  { label: 'Theme & Customizer', href: '/admin/theme', icon: Palette },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Kitchen (KDS)', href: '/admin/kitchen', icon: UtensilsCrossed },
  { label: 'Deliveries', href: '/admin/deliveries', icon: Truck },
  { label: 'Products', href: '/admin/products', icon: Pizza },
  { label: 'Coupons', href: '/admin/coupons', icon: Tag },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

interface AdminSidebarProps {
  mobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
}

export default function AdminSidebar({ mobileOpen = false, setMobileOpen }: AdminSidebarProps) {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          let userRole = (user.email === 'malviya.pratyush26@gmail.com' || user.email === 'admin@demo.com') ? 'super_admin' : ''
          if (!userRole) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            userRole = profile?.role || user.user_metadata?.role || 'super_admin'
          }
          setRole(userRole || 'super_admin')
        } else {
          setRole('super_admin')
        }
      } catch (e) {
        setRole('super_admin')
      }
    }
    fetchRole()
  }, [])

  // Filter links based on role
  const visibleLinks = ADMIN_LINKS.filter((link) => {
    if (!role) return false // Hide until role is loaded
    if (role === 'super_admin') return true
    
    if (role === 'manager') {
      const hiddenForManager = ['/admin/staff', '/admin/theme', '/admin/settings']
      return !hiddenForManager.includes(link.href)
    }
    
    if (role === 'staff') {
      const allowedForStaff = ['/admin/kitchen', '/admin/inventory']
      return allowedForStaff.includes(link.href)
    }
    
    if (role === 'viewer') {
      const allowedForViewer = ['/admin', '/admin/orders', '/admin/analytics']
      return allowedForViewer.includes(link.href)
    }
    
    return false
  })

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'w-64 bg-[#18181B] text-white flex flex-col border-r border-[#27272A] flex-shrink-0 z-50 transition-transform duration-300 ease-in-out',
          // Desktop behavior: fixed layout, always visible
          'lg:static lg:translate-x-0 lg:min-h-screen',
          // Mobile drawer behavior: fixed overlay sliding from left
          'fixed inset-y-0 left-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
          <Link
            href="/admin"
            onClick={() => setMobileOpen?.(false)}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 bg-[#B91C1C] rounded-md flex items-center justify-center font-bold text-white font-serif">
              PE
            </div>
            <div>
              <span className="block font-serif font-bold text-base text-white">
                Pizza Expert
              </span>
              <span className="block text-[9px] text-[#B91C1C] font-bold tracking-widest uppercase">
                Admin Portal
              </span>
            </div>
          </Link>

          {/* Close Button for Mobile */}
          <button
            onClick={() => setMobileOpen?.(false)}
            className="lg:hidden p-1.5 rounded-md text-[#A8A29E] hover:text-white hover:bg-[#27272A]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {!role ? (
            <div className="text-xs text-[#A8A29E] px-3.5 py-2.5 animate-pulse">Loading menu...</div>
          ) : (
            visibleLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen?.(false)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all',
                    isActive
                      ? 'bg-[#B91C1C] text-white shadow-xs'
                      : 'text-[#A8A29E] hover:text-white hover:bg-[#27272A]'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} />
                    <span>{link.label}</span>
                  </div>
                  {isActive && <ChevronRight size={14} />}
                </Link>
              )
            })
          )}
        </nav>

        {/* Footer Links */}
        <div className="p-3 border-t border-[#27272A] space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold text-[#A8A29E] hover:text-white hover:bg-[#27272A] transition-all"
          >
            <span>Public Website</span>
            <ExternalLink size={13} />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]/10 transition-all"
          >
            <LogOut size={15} /> Sign Out
          </Link>
        </div>
      </aside>
    </>
  )
}
