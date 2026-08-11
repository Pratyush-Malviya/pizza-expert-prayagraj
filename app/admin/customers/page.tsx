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

  // 1. Fetch registered customer profiles
  const { data: customersData } = await supabase
    .from('profiles')
    .select('id, name, phone, loyalty_points, is_active, created_at')
    .neq('role', 'staff')
    .neq('role', 'driver')
    .order('created_at', { ascending: false })

  const registeredCustomersMap: Record<string, CustomerRow> = {}
  
  (customersData || []).forEach(c => {
    registeredCustomersMap[c.id] = {
      id: c.id,
      name: c.name || 'Registered Customer',
      phone: c.phone || null,
      loyalty_points: c.loyalty_points || 0,
      is_active: c.is_active !== false,
      created_at: c.created_at,
      order_count: 0,
      total_spend: 0,
      last_order_at: null,
    }
  })

  // 2. Fetch ALL orders to aggregate spend & extract Guest Orders
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, user_id, total, address_json, created_at')
    .order('created_at', { ascending: false })

  const guestCustomersMap: Record<string, CustomerRow> = {}

  if (allOrders) {
    allOrders.forEach(ord => {
      const orderTotal = Number(ord.total || 0)
      const orderDate = ord.created_at

      if (ord.user_id && registeredCustomersMap[ord.user_id]) {
        // Aggregate for registered customer
        const cust = registeredCustomersMap[ord.user_id]
        cust.order_count += 1
        cust.total_spend += orderTotal
        if (!cust.last_order_at || new Date(orderDate) > new Date(cust.last_order_at)) {
          cust.last_order_at = orderDate
        }
      } else {
        // Guest customer from address_json
        const addr = ord.address_json || {}
        const guestPhone = addr.phone || addr.email || `guest_${String(ord.id).slice(0, 8)}`
        const guestName = addr.name || 'Guest Customer'

        if (!guestCustomersMap[guestPhone]) {
          guestCustomersMap[guestPhone] = {
            id: `guest-${String(ord.id).slice(0, 8)}`,
            name: `${guestName} (Guest)`,
            phone: addr.phone || null,
            loyalty_points: 0,
            is_active: true,
            created_at: orderDate,
            order_count: 1,
            total_spend: orderTotal,
            last_order_at: orderDate,
          }
        } else {
          const guest = guestCustomersMap[guestPhone]
          guest.order_count += 1
          guest.total_spend += orderTotal
          if (new Date(orderDate) > new Date(guest.last_order_at!)) {
            guest.last_order_at = orderDate
          }
        }
      }
    })
  }

  // Combine registered and guest customers
  const finalCustomersList: CustomerRow[] = [
    ...Object.values(registeredCustomersMap),
    ...Object.values(guestCustomersMap),
  ]

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

      <CustomersClient initialCustomers={finalCustomersList} />
    </div>
  )
}
