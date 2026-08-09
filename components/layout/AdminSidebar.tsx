'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Pizza, Tag,
  Settings, LogOut, ExternalLink,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ADMIN_LINKS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Products', href: '/admin/products', icon: Pizza },
  { label: 'Coupons', href: '/admin/coupons', icon: Tag },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-[#18181B] text-white flex flex-col min-h-screen border-r border-[#27272A] flex-shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#27272A]">
        <Link href="/admin" className="flex items-center gap-3">
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
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1">
        {ADMIN_LINKS.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all',
                isActive
                  ? 'bg-[#B91C1C] text-white'
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
        })}
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
  )
}
