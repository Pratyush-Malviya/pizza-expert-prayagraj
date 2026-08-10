import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = {
  title: 'Order History | My Account',
}

export default async function AccountOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black font-serif text-[#1C1917] uppercase tracking-tight border-b border-[#E7E0D8] pb-4">
        Order History
      </h1>

      <div className="space-y-4">
        {!orders || orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🍕</div>
            <h3 className="font-bold text-[#1C1917] mb-2">No orders yet</h3>
            <p className="text-sm text-[#A8A29E] mb-6">Looks like you haven't placed any orders with us yet.</p>
            <Link href="/menu" className="btn btn-primary rounded-lg text-sm uppercase tracking-wider font-bold">
              Explore Menu
            </Link>
          </div>
        ) : (
          orders.map((order: any) => (
            <div key={order.id} className="bg-white border border-[#E7E0D8] rounded-xl overflow-hidden shadow-xs hover:border-[#B91C1C]/30 transition-colors">
              <div className="bg-[#FBF9F5] px-5 py-3 border-b border-[#E7E0D8] flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wider">Order #{String(order.id).slice(0, 8).toUpperCase()}</div>
                  <div className="text-sm font-medium text-[#1C1917]">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wider mb-1">Total</div>
                    <div className="text-sm font-bold text-[#1C1917]">₹{order.total}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wider mb-1">Status</div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F0FDF4] text-[#15803D] border border-[#15803D]/20">
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="text-sm text-[#1C1917]">
                  <span className="font-semibold">{order.order_type === 'delivery' ? 'Delivery to:' : 'Pickup for:'} </span>
                  {order.order_type === 'delivery' ? (order.address_json as any)?.line1 : (order.address_json as any)?.name}
                </div>
                
                <Link href={`/track/${order.id}`} className="text-sm font-bold text-[#B91C1C] hover:underline">
                  Track Order
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
