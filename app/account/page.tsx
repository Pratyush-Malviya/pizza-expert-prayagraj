import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'

export const metadata = {
  title: 'My Account | Pizza Expert',
}

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch recent orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, status, total, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const userName = profile?.name || user.user_metadata?.name || 'Customer'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black font-serif text-[#1C1917] uppercase tracking-tight">
          Welcome back, {userName}!
        </h1>
        <p className="text-[#A8A29E] mt-1">
          Manage your orders, profile, and addresses from your account dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Orders Summary */}
        <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1C1917] flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#B91C1C]" /> Recent Orders
            </h2>
            <Link href="/account/orders" className="text-sm font-semibold text-[#B91C1C] hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="space-y-3">
            {!recentOrders || recentOrders.length === 0 ? (
              <p className="text-sm text-[#A8A29E]">You have no recent orders.</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#E7E0D8]">
                  <div>
                    <div className="font-mono text-xs text-[#A8A29E]">#{String(order.id).slice(0, 8).toUpperCase()}</div>
                    <div className="font-semibold text-sm text-[#1C1917] capitalize">{order.status.replace('_', ' ')}</div>
                  </div>
                  <div className="font-bold text-[#1C1917]">
                    ₹{order.total}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-5">
          <h2 className="font-bold text-[#1C1917] mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/menu" className="block w-full text-center bg-[#1C1917] text-white py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-black transition-colors">
              Order Now
            </Link>
            <Link href="/account/addresses" className="block w-full text-center bg-white border border-[#E7E0D8] text-[#1C1917] py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-[#F4EFEA] transition-colors">
              Manage Addresses
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
