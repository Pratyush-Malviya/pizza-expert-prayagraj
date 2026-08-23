'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ShoppingBag, Pizza, Tag, Flame,
  Settings, LogOut, ChevronDown, ChevronRight,
  CreditCard, UtensilsCrossed, Truck, X, Palette,
  TrendingUp, Boxes, FileText, Users, Contact, History, Star,
  Layers, ShieldCheck, Search,
  Monitor, Clock, Pause, ClipboardList, Banknote,
  ChefHat, Trash2, SlidersHorizontal, Gift, Percent, BarChart3,
  Mail, ArrowUpRight, Building
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/lib/store/useSettingsStore'

export interface NavSubItem {
  label: string
  href: string
  icon: any
  keywords?: string[]
}

export interface NavGroup {
  id: string
  label: string
  icon: any
  href?: string
  keywords?: string[]
  items?: NavSubItem[]
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    keywords: ['home', 'overview', 'metrics', 'stats', 'kpi', 'summary'],
  },
  {
    id: 'front_of_house',
    label: 'Front of House',
    icon: Monitor,
    keywords: ['billing', 'pos', 'cashier', 'tables', 'floors'],
    items: [
      { label: '🖥 Counter Billing', href: '/admin/pos', icon: Monitor, keywords: ['pos', 'bill', 'cashier', 'takeaway', 'dine in', 'checkout', 'counter'] },
      { label: 'Floor & Tables', href: '/admin/pos/tables', icon: UtensilsCrossed, keywords: ['tables', 'floor map', 'seating', 'dine in', 'table layout'] },
      { label: 'Active Orders', href: '/admin/pos/orders', icon: ClipboardList, keywords: ['live orders', 'queue', 'processing', 'active'] },
      { label: 'Held Orders', href: '/admin/pos/held', icon: Pause, keywords: ['parked', 'hold', 'paused', 'saved cart'] },
      { label: 'Cashier Shifts', href: '/admin/pos/shifts', icon: Clock, keywords: ['register', 'drawer', 'cash in', 'cash out', 'shift open', 'shift close'] },
      { label: 'Receipts', href: '/admin/pos/receipts', icon: FileText, keywords: ['invoice', 'print bill', 'receipt history', 'tax invoice'] },
    ],
  },
  {
    id: 'back_of_house',
    label: 'Back of House',
    icon: ChefHat,
    keywords: ['kitchen', 'kds', 'cooking', 'delivery', 'dispatch', 'orders'],
    items: [
      { label: 'Kitchen (KDS)', href: '/admin/kitchen', icon: UtensilsCrossed, keywords: ['kds', 'cook', 'chef', 'preparation', 'kitchen display', 'tickets'] },
      { label: 'Deliveries', href: '/admin/deliveries', icon: Truck, keywords: ['dispatch', 'delivery orders', 'rider assignment', 'tracking'] },
      { label: 'Drivers (Fleet)', href: '/admin/drivers', icon: Truck, keywords: ['riders', 'fleet', 'courier', 'delivery boy', 'driver list'] },
      { label: 'All Orders', href: '/admin/orders', icon: ShoppingBag, keywords: ['order history', 'all orders', 'sales list', 'online orders'] },
    ],
  },
  {
    id: 'menu_management',
    label: 'Menu Management',
    icon: Pizza,
    keywords: ['products', 'pizzas', 'categories', 'recipes', 'menu items'],
    items: [
      { label: 'Products', href: '/admin/products', icon: Pizza, keywords: ['pizza', 'menu items', 'dishes', 'food catalog', 'beverages', 'sides'] },
      { label: 'Categories', href: '/admin/categories', icon: Layers, keywords: ['category', 'categories', 'menu categories', 'taxonomies', 'sections'] },
      { label: 'Recipe BOM & Costing', href: '/admin/recipes', icon: ChefHat, keywords: ['bom', 'bill of materials', 'cost per slice', 'margins', 'food cost'] },
    ],
  },
  {
    id: 'inventory_supply',
    label: 'Inventory & Supply',
    icon: Boxes,
    keywords: ['ingredients', 'stock', 'supplies', 'wastage', 'purchases'],
    items: [
      { label: 'Inventory & Stock', href: '/admin/inventory', icon: Boxes, keywords: ['raw materials', 'cheese', 'flour', 'sauce', 'stock level', 'reorder'] },
      { label: 'Wastage Tracker', href: '/admin/inventory/wastage', icon: Trash2, keywords: ['spoilage', 'expired', 'damaged dough', 'waste logging'] },
      { label: 'Stock Adjustments', href: '/admin/inventory/adjustments', icon: SlidersHorizontal, keywords: ['stock count', 'reconciliation', 'audit count', 'variance'] },
      { label: 'Purchase Orders (GRN)', href: '/admin/purchases', icon: Truck, keywords: ['po', 'grn', 'goods receipt', 'procurement', 'vendor invoices'] },
      { label: 'Suppliers & Vendors', href: '/admin/suppliers', icon: Truck, keywords: ['vendor list', 'distributors', 'supplier contacts'] },
    ],
  },
  {
    id: 'growth',
    label: 'Growth & Customers',
    icon: Star,
    keywords: ['marketing', 'crm', 'discounts', 'coupons', 'loyalty', 'reviews'],
    items: [
      { label: 'Customer CRM', href: '/admin/customers', icon: Contact, keywords: ['crm', 'clients', 'addresses', 'phone numbers', 'user directory'] },
      { label: 'Loyalty Rewards', href: '/admin/loyalty', icon: Gift, keywords: ['points', 'loyalty tier', 'vip rewards', 'cashback'] },
      { label: 'Coupons', href: '/admin/coupons', icon: Tag, keywords: ['discount codes', 'promo codes', 'vouchers', 'offers'] },
      { label: 'Flash Offers', href: '/admin/offers', icon: Flame, keywords: ['flash banner', 'carousel offers', 'home deals', 'hero promo'] },
      { label: 'Reviews', href: '/admin/reviews', icon: Star, keywords: ['ratings', 'customer feedback', 'google reviews', 'stars'] },
    ],
  },
  {
    id: 'sales_finance',
    label: 'Sales & Finance',
    icon: CreditCard,
    keywords: ['finance', 'payments', 'pnl', 'reports', 'cashier'],
    items: [
      { label: 'Payments', href: '/admin/payments', icon: CreditCard, keywords: ['razorpay', 'upi', 'cod', 'transactions', 'settlement'] },
      { label: 'Sales by Channel', href: '/admin/reports/sales', icon: TrendingUp, keywords: ['online vs pos', 'dine in vs takeaway', 'channel breakdown'] },
      { label: 'Profit & Loss (P&L)', href: '/admin/reports/pnl', icon: TrendingUp, keywords: ['pnl', 'income', 'expenses', 'ebitda', 'profit margin'] },
      { label: 'Day-End Z-Report', href: '/admin/reports/z-report', icon: FileText, keywords: ['z report', 'closing balance', 'day end register', 'eod'] },
      { label: 'Cashier & Cash', href: '/admin/reports/cashier', icon: Banknote, keywords: ['cash tally', 'shortage', 'drawer count', 'shift summary'] },
    ],
  },
  {
    id: 'data_analytics',
    label: 'Data & Analytics',
    icon: TrendingUp,
    keywords: ['analytics', 'charts', 'performance', 'gst', 'compliance'],
    items: [
      { label: 'Analytics Hub', href: '/admin/analytics?tab=users', icon: Layers, keywords: ['charts', 'revenue trends', 'user stats', 'performance'] },
      { label: 'Menu Engineering', href: '/admin/reports/menu-engineering', icon: BarChart3, keywords: ['bestsellers', 'dogs', 'plowhorses', 'puzzles', 'profitability'] },
      { label: 'GST Compliance', href: '/admin/compliance', icon: FileText, keywords: ['gstr1', 'gstr3b', 'tax return', 'hsn summary', 'gst summary'] },
    ],
  },
  {
    id: 'administration',
    label: 'Administration & Settings',
    icon: Settings,
    keywords: ['admin', 'config', 'staff', 'rbac', 'taxes', 'email templates', 'theme'],
    items: [
      { label: 'User & Team Management', href: '/admin/users', icon: ShieldCheck, keywords: ['users', 'staff', 'drivers', 'roles', 'permissions', 'super admin', 'access control', 'roster'] },
      { label: '🏢 Client Business Hub', href: '/admin/settings', icon: Building, keywords: ['client business', 'client details', 'business info', 'company profile', 'store details', 'fssai', 'gstin', 'operating hours', 'contact', 'address', 'phone', 'branding', 'all settings', 'store center', 'delivery fees', 'upi', 'bank', 'general settings'] },
      { label: 'Email Templates', href: '/admin/settings?tab=emails', icon: Mail, keywords: ['email templates', 'mail notifications', 'resend', 'receipt template', 'alerts'] },
      { label: 'Tax Engine & GST', href: '/admin/settings/taxes', icon: Percent, keywords: ['gst rate', 'tax slab', 'fssai', 'gstin number'] },
      { label: 'Theme & Customizer', href: '/admin/theme', icon: Palette, keywords: ['colors', 'styling', 'hero editor', 'fonts', 'branding'] },
      { label: 'Audit Log', href: '/admin/audit-log', icon: History, keywords: ['security logs', 'activity history', 'audit trail'] },
    ],
  },
]

interface AdminSidebarProps {
  mobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
}

export default function AdminSidebar({ mobileOpen = false, setMobileOpen }: AdminSidebarProps) {
  const pathname = usePathname()
  const businessName = useSettingsStore((s) => s.businessName)
  const locationTagline = useSettingsStore((s) => s.locationTagline)
  const [mounted, setMounted] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
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

  // Global Keyboard Shortcut: Press '/' or 'Ctrl+K' / 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('')
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Check if a link is active considering query params for tabs
  const checkIsActive = (href: string) => {
    if (href.includes('?tab=')) {
      const parts = href.split('?tab=')
      const targetPath = parts[0]
      const targetTab = parts[1]
      return pathname === targetPath && activeQueryTab === targetTab
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
    setMounted(true)
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

  // ── Flatten & filter search items across all nav groups ──
  const cleanQuery = searchQuery.trim().toLowerCase()
  const isSearching = cleanQuery.length > 0

  const searchResults: Array<{
    groupLabel: string
    label: string
    href: string
    icon: any
  }> = []

  if (isSearching) {
    ADMIN_NAV_GROUPS.forEach((group) => {
      // Standalone group link match
      if (group.href && isLinkAllowed(group.href)) {
        const matchesGroup =
          group.label.toLowerCase().includes(cleanQuery) ||
          group.keywords?.some((k) => k.toLowerCase().includes(cleanQuery))
        if (matchesGroup) {
          searchResults.push({
            groupLabel: 'Overview',
            label: group.label,
            href: group.href,
            icon: group.icon,
          })
        }
      }

      // Sub items match
      group.items?.forEach((item) => {
        if (!isLinkAllowed(item.href)) return
        const matchesItem =
          item.label.toLowerCase().includes(cleanQuery) ||
          group.label.toLowerCase().includes(cleanQuery) ||
          item.keywords?.some((k) => k.toLowerCase().includes(cleanQuery)) ||
          group.keywords?.some((k) => k.toLowerCase().includes(cleanQuery))

        if (matchesItem) {
          searchResults.push({
            groupLabel: group.label,
            label: item.label,
            href: item.href,
            icon: item.icon,
          })
        }
      })
    })
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
        {/* Sidebar Header: Brand Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#292524] shrink-0">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#B91C1C] text-white flex items-center justify-center font-bold text-lg font-serif shadow-xs">
              🍕
            </div>
            <div>
              <span className="font-serif font-bold text-white text-base block leading-tight">
                {mounted && businessName ? businessName : 'Pizza Expert'}
              </span>
              <span className="text-[10px] text-[#A8A29E] font-sans block uppercase tracking-wider font-semibold truncate max-w-[150px]">
                {mounted && locationTagline ? locationTagline : 'Admin Control'}
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setMobileOpen?.(false)}
            className="lg:hidden text-[#A8A29E] hover:text-white p-1"
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── TOP SEARCH BOX ── */}
        <div className="p-3 border-b border-[#292524] bg-[#161412]/50 shrink-0">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-[#78716C] pointer-events-none" />
            <input
              type="text"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu... (Ctrl+K)"
              className="w-full bg-[#24211E] hover:bg-[#2A2724] focus:bg-[#2E2A27] border border-[#3A3531] focus:border-[#B91C1C] rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-[#78716C] focus:outline-none transition-all shadow-inner"
            />
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('')
                  searchInputRef.current?.focus()
                }}
                className="absolute right-2 text-[#A8A29E] hover:text-white p-0.5 rounded-full hover:bg-white/10"
                aria-label="Clear Search"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex absolute right-2.5 px-1.5 py-0.5 text-[9px] font-mono text-[#78716C] bg-[#1C1917] border border-[#3A3531] rounded">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* ── SEARCH RESULTS OR GROUPED NAVIGATION ── */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {isSearching ? (
            /* Search Results View */
            <div className="space-y-1">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-[#A8A29E] uppercase tracking-wider">
                <span>Results ({searchResults.length})</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-[#B91C1C] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#78716C] space-y-2">
                  <p>No menu items found for &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[11px] font-bold text-[#B91C1C] hover:underline"
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                searchResults.map((item) => {
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
                        setSearchQuery('')
                        setMobileOpen?.(false)
                      }}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-xl text-xs transition-all group',
                        isActive
                          ? 'bg-[#B91C1C] text-white font-bold shadow-xs'
                          : 'text-[#E7E0D8] hover:bg-[#292524] hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-white/5 text-[#A8A29E] group-hover:text-white'}`}>
                          <ItemIcon size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate font-semibold">{item.label}</span>
                          <span className="block text-[10px] text-[#78716C] group-hover:text-[#A8A29E] truncate">
                            {item.groupLabel}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight size={13} className="text-[#78716C] group-hover:text-white shrink-0 ml-1 opacity-60 group-hover:opacity-100" />
                    </Link>
                  )
                })
              )}
            </div>
          ) : (
            /* Regular Grouped Navigation */
            ADMIN_NAV_GROUPS.map((group) => {
              const GroupIcon = group.icon

              // Standalone Link
              if (group.href) {
                if (!isLinkAllowed(group.href)) return null
                const isActive = checkIsActive(group.href)

                return (
                  <Link
                    key={group.id}
                    href={group.href}
                    onClick={() => setMobileOpen?.(false)}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-2.5 min-h-[40px] rounded-r-xl text-xs font-bold transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-[#B91C1C] to-[#991B1B] text-white shadow-md shadow-[#B91C1C]/20 border-l-[3px] border-[#FCA5A5]'
                        : 'text-[#A8A29E] hover:bg-[#292524] hover:text-white border-l-[3px] border-transparent'
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
                  {/* Group Header Button (Fitts's Law 40px min-h touch target) */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3.5 py-2.5 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer',
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
                    <div className="pl-3.5 space-y-1 border-l-2 border-[#292524] ml-4 my-1">
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
                              'flex items-center gap-2.5 px-3 py-2 min-h-[38px] rounded-r-xl text-xs transition-all',
                              isActive
                                ? 'bg-gradient-to-r from-[#B91C1C] to-[#991B1B] text-white font-bold shadow-md shadow-[#B91C1C]/20 border-l-[3px] border-[#FCA5A5]'
                                : 'text-[#A8A29E] hover:bg-[#292524] hover:text-white font-medium border-l-[3px] border-transparent'
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
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#292524] space-y-2 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#A8A29E] hover:bg-[#292524] hover:text-red-400 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
