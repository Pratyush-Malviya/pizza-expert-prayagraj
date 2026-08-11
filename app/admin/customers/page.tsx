import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CustomersClient, { CustomerRow } from './CustomersClient'

export const metadata = {
  title: 'Customer CRM | Admin Portal',
}

export default async function CustomersCRMPage() {
  const supabase = await createClient()

  const cookieStore = await cookies()
  const isSimpleAdmin = cookieStore.get('simple_admin')?.value === 'true'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isSimpleAdmin) {
    redirect('/login')
  }

  // 1. Fetch customer profiles
  const { data: customersData } = await supabase
    .from('profiles')
    .select('id, name, phone, loyalty_points, is_active, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  const rawCustomers = customersData || []

  // 2. Fetch order aggregates for each customer
  const customerIds = rawCustomers.map(c => c.id)

  let ordersMap: Record<string, { count: number; total_spend: number; last_order_at: string | null }> = {}

  if (customerIds.length > 0) {
    const { data: ordersData } = await supabase
      .from('orders')
      .select('user_id, total, created_at')
      .in('user_id', customerIds)

    if (ordersData) {
      ordersData.forEach(ord => {
        if (!ord.user_id) return
        if (!ordersMap[ord.user_id]) {
          ordersMap[ord.user_id] = { count: 0, total_spend: 0, last_order_at: null }
        }
        ordersMap[ord.user_id].count += 1
        ordersMap[ord.user_id].total_spend += Number(ord.total || 0)
        
        if (!ordersMap[ord.user_id].last_order_at || new Date(ord.created_at) > new Date(ordersMap[ord.user_id].last_order_at!)) {
          ordersMap[ord.user_id].last_order_at = ord.created_at
        }
      })
    }
  }

  // 3. Assemble CustomerRow[]
  const customersList: CustomerRow[] = rawCustomers.map(c => ({
    id: c.id,
    name: c.name || 'Guest User',
    phone: c.phone || null,
    loyalty_points: c.loyalty_points || 0,
    is_active: c.is_active !== false,
    created_at: c.created_at,
    order_count: ordersMap[c.id]?.count || 0,
    total_spend: ordersMap[c.id]?.total_spend || 0,
    last_order_at: ordersMap[c.id]?.last_order_at || null,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black font-serif text-[#1C1917] tracking-tight uppercase">
            Customer CRM Directory
          </h1>
          <p className="text-sm text-[#A8A29E] mt-1">
            Manage customer relationships, loyalty tiers, lifetime spend, and account access.
          </p>
        </div>
      </div>

      <CustomersClient initialCustomers={customersList} />
    </div>
  )
}
