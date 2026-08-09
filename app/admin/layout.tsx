import AdminSidebar from '@/components/layout/AdminSidebar'
import { Bell } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#FBF9F5]">
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-[#E7E0D8] h-14 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#15803D] bg-[#F0FDF4] px-2.5 py-0.5 rounded-md border border-[#15803D]/20">
              ● Live Kitchen System
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4EFEA] relative">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#B91C1C] rounded-full" />
            </button>

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
        <main className="p-6 sm:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
