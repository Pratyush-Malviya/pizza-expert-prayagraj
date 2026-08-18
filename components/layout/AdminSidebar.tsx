'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ShoppingBag, Pizza, Tag, Flame,
  Settings, LogOut, ChevronDown, ChevronRight,
  CreditCard, UtensilsCrossed, Truck, X, Palette,
  TrendingUp, Boxes, FileText, Users, Contact, History, Star,
  Layers, Package, Sparkles, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavSubItem {
  label: string
  href: string
  icon: any
}

export interface NavGroup {
  id: string
  label: string
  icon: any
  href?: string
  items?: NavSubItem[]
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: UtensilsCrossed,
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
      { label: 'Kitchen (KDS)', href: '/admin/kitchen', icon: UtensilsCrossed },
      { label: 'Deliveries', href: '/admin/deliveries', icon: Truck },
      { label: 'Drivers (Fleet)', href: '/admin/drivers', icon: Truck },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog & Engagement',
    icon: Pizza,
    items: [
      { label: 'Products', href: '/admin/products', icon: Pizza },
      { label: 'Flash Offers Carousel', href: '/admin/offers', icon: Flame },
      { label: 'Coupons', href: '/admin/coupons', icon: Tag },
      { label: 'Reviews', href: '/admin/reviews', icon: Star },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Contact,
    items: [
      { label: 'Customer CRM', href: '/admin/customers', icon: Contact },
    ],
  },
  {
    id: 'supply_staff',
    label: 'Supply Chain & Staff',
    icon: Boxes,
    items: [
      { label: 'Inventory & Stock', href: '/admin/inventory', icon: Boxes },
      { label: 'Suppliers & POs', href: '/admin/suppliers', icon: Truck },
      { label: 'Staff Roster', href: '/admin/staff', icon: Users },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Compliance',
    icon: CreditCard,
    items: [
      { label: 'Payments', href: '/admin/payments', icon: CreditCard },
      { label: 'GST Compliance', href: '/admin/compliance', icon: FileText },
      { label: 'Audit Log', href: '/admin/audit-log', icon: History },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & BI',
    icon: TrendingUp,
    items: [
      { label: 'Customers', href: '/admin/analytics?tab=users', icon: Users },
      { label: 'Funnel', href: '/admin/analytics?tab=funnel', icon: Layers },
      { label: 'Financials', href: '/admin/analytics?tab=financials', icon: TrendingUp },
      { label: 'Operations', href: '/admin/analytics?tab=operations', icon: Package },
      { label: 'Insights', href: '/admin/analytics?tab=insights', icon: Sparkles },
      { label: 'Engine Hub', href: '/admin/analytics?tab=engine_hub', icon: ShieldCheck },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { label: 'Settings', href: '/admin/settings', icon: Settings },
      { label: 'Theme & Customizer', href: '/admin/theme', icon: Palette },
    ],
  },
]

interface AdminSidebarProps {
  mobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
}

export default function AdminSidebar({ mobileOpen = false, setMobileOpen }: AdminSidebarProps) {
  const pathname = usePathname()
  const [activeQueryTab, setActiveQueryTab] = useState<string>('users')
  const [role, setRole] = useState<string | null>(null)
  
  // Track open state of collapsible groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ operations: true, analytics: true })

  const syncActiveTabFromUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setActiveQueryTab(params.get('tab') || 'users')
    }
  }, [])

  useEffect(() => {
    syncActiveTabFromUrl()
    window.addEventListener('popstate', syncActiveTabFromUrl)
    return () => window.removeEventListener('popstate', syncActiveTabFromUrl)
  }, [pathname, syncActiveTabFromUrl])

  // Check if a link is active considering query params for tabs
  const checkIsActive = (href: string) => {
    if (href.includes('?tab=')) {
      const targetTab = href.split('?tab=')[1]
      return pathname === '/admin/analytics' && activeQueryTab === targetTab
    }
    return pathname === href
  }

  // Initialize from localStorage and auto-expand active parent group
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_open_groups')
      if (saved) {
        setOpenGroups(JSON.parse(saved))
      }
    } catch {}

    // Auto-expand group containing current route
    ADMIN_NAV_GROUPS.forEach((group) => {
      if (group.items?.some((item) => checkIsActive(item.href))) {
        setOpenGroups((prev) => ({ ...prev, [group.id]: true }))
      }
    })
  }, [pathname, activeQueryTab])

  // Save expanded states
  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const updated = { ...prev, [groupId]: !prev[groupId] }
      try {
        localStorage.setItem('admin_sidebar_open_groups', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          let userRole = (user.email === 'malviya.pratyush26@gmail.com' || user.email === 'admin@demo.com') ? 'super_admin' : ''
          if (!userRole) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
            userRole = profile?.role || user.user_metadata?.role || 'super_admin'
          }
          setRole(userRole || 'super_admin')
        } else {
          setRole('super_admin')
        }
      } catch {
        setRole('super_admin')
      }
    }
    fetchRole()
  }, [])

  // Filter items inside groups based on user role
  const isLinkAllowed = (href: string) => {
    const baseHref = href.split('?')[0]
    if (!role || role === 'super_admin') return true
    if (role === 'manager') {
      const hiddenForManager = ['/admin/staff', '/admin/theme', '/admin/settings']
      return !hiddenForManager.includes(baseHref)
    }
    if (role === 'staff') {
      const allowedForStaff = ['/admin/kitchen', '/admin/inventory']
      return allowedForStaff.includes(baseHref)
    }
    if (role === 'viewer') {
      const allowedForViewer = ['/admin', '/admin/orders', '/admin/analytics']
      return allowedForViewer.includes(baseHref)
    }
    return false
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    if (typeof document !== 'undefined') {
      document.cookie = 'simple_admin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    }
    window.location.href = '/admin/login'
  }

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
          'fixed lg:static top-0 left-0 bottom-0 z-50 w-64 bg-[#1C1917] text-[#E7E0D8] flex flex-col transition-transform duration-300 ease-in-out shrink-0 border-r border-[#292524]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#292524]">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#B91C1C] text-white flex items-center justify-center font-bold text-lg font-serif">
              🍕
            </div>
            <div>
              <span className="font-serif font-bold text-white text-base block leading-tight">
                Pizza Expert
              </span>
              <span className="text-[10px] text-[#A8A29E] font-sans block uppercase tracking-wider font-semibold">
                Admin Control
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setMobileOpen?.(false)}
            className="lg:hidden text-[#A8A29E] hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {ADMIN_NAV_GROUPS.map((group) => {
            const GroupIcon = group.icon

            // Standalone Link
            if (group.href) {
              if (!isLinkAllowed(group.href)) return null
              const isActive = checkIsActive(group.href)

              return (
                <Link
                  key={group.id}
                  href={group.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all',
                    isActive
                      ? 'bg-[#B91C1C] text-white shadow-xs'
                      : 'text-[#A8A29E] hover:bg-[#292524] hover:text-white'
                  )}
                >
                  <GroupIcon size={16} />
                  <span>{group.label}</span>
                </Link>
              )
            }

            // Collapsible Group
            const visibleItems = group.items?.filter((i) => isLinkAllowed(i.href)) || []
            if (visibleItems.length === 0) return null

            const isChildActive = visibleItems.some((i) => checkIsActive(i.href))
            const isOpen = Boolean(openGroups[group.id])

            return (
              <div key={group.id} className="space-y-1 pt-1">
                {/* Group Header Button */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all',
                    isChildActive
                      ? 'text-white bg-[#292524]'
                      : 'text-[#A8A29E] hover:bg-[#292524]/60 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <GroupIcon size={16} className={isChildActive ? 'text-[#B91C1C]' : ''} />
                    <span>{group.label}</span>
                  </div>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Collapsible Submenu */}
                {isOpen && (
                  <div className="pl-4 space-y-1 border-l border-[#292524] ml-4 my-1">
                    {visibleItems.map((item) => {
                      const ItemIcon = item.icon
                      const isActive = checkIsActive(item.href)

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            if (item.href.includes('?tab=')) {
                              const targetTab = item.href.split('?tab=')[1]
                              setActiveQueryTab(targetTab)
                              if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('analytics-tab-change', { detail: targetTab }))
                              }
                            }
                            setMobileOpen?.(false)
                          }}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all',
                            isActive
                              ? 'bg-[#B91C1C] text-white font-bold shadow-xs'
                              : 'text-[#A8A29E] hover:bg-[#292524] hover:text-white font-medium'
                          )}
                        >
                          <ItemIcon size={14} className={isActive ? 'text-white' : 'text-[#A8A29E]'} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#292524] space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-[#A8A29E] hover:bg-[#292524] hover:text-red-400 transition-all"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
