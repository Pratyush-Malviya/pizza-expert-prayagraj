import Link from 'next/link'
import { headers } from 'next/headers'
import { User, ShoppingBag, MapPin, LogOut, LayoutDashboard } from 'lucide-react'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  // Using headers to extract pathname in Server Components can be tricky in Next.js without middleware hacks,
  // but we can rely on client-side active links if needed, or just standard links for now.
  
  return (
    <div className="bg-[#FBF9F5] min-h-screen pt-20 pb-12">
      <div className="container-custom mx-auto max-w-6xl flex flex-col md:flex-row gap-8">
        
        {/* Customer Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-xs border border-[#E7E0D8] p-5 sticky top-24">
            <h2 className="font-serif font-black text-xl text-[#1C1917] mb-6 uppercase tracking-tight">
              My Account
            </h2>
            
            <nav className="space-y-1">
              <Link href="/account" className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold text-[#1C1917] hover:bg-[#FBF9F5] hover:text-[#B91C1C] transition-colors">
                <LayoutDashboard size={18} className="text-[#A8A29E]" /> Dashboard
              </Link>
              <Link href="/account/orders" className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold text-[#1C1917] hover:bg-[#FBF9F5] hover:text-[#B91C1C] transition-colors">
                <ShoppingBag size={18} className="text-[#A8A29E]" /> Order History
              </Link>
              <Link href="/account/profile" className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold text-[#1C1917] hover:bg-[#FBF9F5] hover:text-[#B91C1C] transition-colors">
                <User size={18} className="text-[#A8A29E]" /> Profile
              </Link>
              <Link href="/account/addresses" className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold text-[#1C1917] hover:bg-[#FBF9F5] hover:text-[#B91C1C] transition-colors">
                <MapPin size={18} className="text-[#A8A29E]" /> Addresses
              </Link>
            </nav>

            <div className="mt-8 pt-6 border-t border-[#E7E0D8]">
              <Link href="/login" className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-bold text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors">
                <LogOut size={18} /> Sign Out
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-xs border border-[#E7E0D8] p-6 sm:p-8 min-h-[500px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
