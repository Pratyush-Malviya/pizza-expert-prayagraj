import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CustomersClient, { CustomerRow } from './CustomersClient'

export const metadata = {
  title: 'Customer CRM | Admin Portal',
}

export const dynamic = 'force-dynamic'

export default async function CustomersCRMPage() {
  const cookieStore = await cookies()
  const isSimpleAdmin = cookieStore.get('simple_admin')?.value === 'true'

  const clientSupabase = await createClient()
  const { data: { user } } = await clientSupabase.auth.getUser()
  if (!user && !isSimpleAdmin) {
    redirect('/login')
  }

  // Use Admin Service Client to bypass RLS and fetch all user records
  let supabase: any = clientSupabase
  try {
    supabase = await createAdminClient()
  } catch (err) {
    console.warn('Using client fallback for CRM:', err)
  }

  // 1. Fetch all registered users from auth.admin to ensure complete sync
  const userEmailMap: Record<string, string> = {}
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        if (u.email) {
          userEmailMap[u.id] = u.email
        }
        
        const meta = u.user_metadata || {}
        const name = meta.full_name || meta.name || u.email?.split('@')[0] || 'Registered Customer'
        const phone = meta.phone || u.phone || null
        const role = (u.email === 'malviya.pratyush26@gmail.com' || u.email === 'admin@demo.com') ? 'super_admin' : (meta.role || 'customer')

        // Ensure profile exists in public.profiles table
        await supabase.from('profiles').upsert({
          id: u.id,
          name,
          phone,
          role,
          is_active: true,
          loyalty_points: 50,
          created_at: u.created_at,
        }, { onConflict: 'id' })
      }
    }
  } catch (authErr) {
    console.debug('Auth admin user sync note:', authErr)
  }

  // 2. Fetch registered customer profiles
  const { data: customersData } = await supabase
    .from('profiles')
    .select('id, name, phone, role, loyalty_points, is_active, created_at')
    .neq('role', 'staff')
    .neq('role', 'driver')
    .order('created_at', { ascending: false })

  const registeredCustomersMap: Record<string, CustomerRow> = {}

  const rawCustomers: any[] = customersData || []
  rawCustomers.forEach((c: any) => {
    registeredCustomersMap[c.id] = {
      id: c.id,
      name: c.name || 'Registered Customer',
      email: userEmailMap[c.id] || null,
      phone: c.phone || null,
      role: c.role || 'customer',
      loyalty_points: c.loyalty_points || 0,
      is_active: c.is_active !== false,
      created_at: c.created_at,
      order_count: 0,
      total_spend: 0,
      last_order_at: null,
    }
  })

  // 3. Fetch ALL orders to aggregate spend & extract Guest Orders
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, user_id, total, address_json, created_at')
    .order('created_at', { ascending: false })

  const guestCustomersMap: Record<string, CustomerRow> = {}

  if (allOrders) {
    allOrders.forEach((ord: any) => {
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
        const guestEmail = addr.email || null

        if (!guestCustomersMap[guestPhone]) {
          guestCustomersMap[guestPhone] = {
            id: `guest-${String(ord.id).slice(0, 8)}`,
            name: `${guestName} (Guest)`,
            email: guestEmail,
            phone: addr.phone || null,
            role: 'guest',
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
