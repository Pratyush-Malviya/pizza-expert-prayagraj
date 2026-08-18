import type { Metadata } from 'next'
import Link from 'next/link'
import { Bike, ShieldCheck, User, Compass, History } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Delivery Partner Portal | Pizza Expert Prayagraj',
  description: 'Live order dispatch and real-time delivery GPS navigation for Pizza Expert riders.',
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#1C1917] flex flex-col font-sans">
      {/* Mobile Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#1C1917] text-white px-4 py-3 shadow-md border-b border-amber-500/20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#B91C1C] flex items-center justify-center text-white text-base shadow-xs">
              🛵
            </div>
            <div>
              <span className="font-serif font-black text-sm tracking-wide text-amber-400">
                PIZZA EXPERT
              </span>
              <span className="text-[10px] block font-mono text-[#A8A29E] uppercase tracking-wider">
                Rider Partner Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-950 border border-emerald-500/40 text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ON DUTY</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto pb-24 px-3 pt-4">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E7E0D8] shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-3 py-2 text-center">
          <Link
            href="/partner/deliveries"
            className="flex flex-col items-center justify-center gap-1 text-[#B91C1C] font-bold text-[10px]"
          >
            <Bike size={18} />
            <span>Active Trips</span>
          </Link>

          <Link
            href="/track"
            className="flex flex-col items-center justify-center gap-1 text-[#78716C] hover:text-[#1C1917] font-semibold text-[10px]"
          >
            <Compass size={18} />
            <span>Customer Map</span>
          </Link>

          <Link
            href="/admin/deliveries"
            className="flex flex-col items-center justify-center gap-1 text-[#78716C] hover:text-[#1C1917] font-semibold text-[10px]"
          >
            <ShieldCheck size={18} />
            <span>Fleet View</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
