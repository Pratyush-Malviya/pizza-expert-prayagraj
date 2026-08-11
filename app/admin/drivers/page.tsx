import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DriversClient, { DriverRow } from './DriversClient'

export const metadata = {
  title: 'Driver Fleet & Onboarding | Admin Portal',
}

export default async function DriversPage() {
  const supabase = await createClient()

  const cookieStore = await cookies()
  const isSimpleAdmin = cookieStore.get('simple_admin')?.value === 'true'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isSimpleAdmin) {
    redirect('/login')
  }

  // Fetch driver profiles with driver_details
  const { data: driversData } = await supabase
    .from('profiles')
    .select('id, name, phone, is_active, invite_status, created_at, driver_details(vehicle_type, vehicle_number, license_number, verification_status, rejection_reason, is_online)')
    .eq('role', 'driver')
    .order('created_at', { ascending: false })

  const driversList: DriverRow[] = (driversData || []).map((d: any) => {
    const details = Array.isArray(d.driver_details) ? d.driver_details[0] : d.driver_details
    return {
      id: d.id,
      name: d.name || 'Unnamed Driver',
      phone: d.phone || null,
      is_active: d.is_active !== false,
      invite_status: d.invite_status || null,
      created_at: d.created_at,
      vehicle_type: details?.vehicle_type || 'bike',
      vehicle_number: details?.vehicle_number || null,
      license_number: details?.license_number || null,
      verification_status: details?.verification_status || 'pending',
      rejection_reason: details?.rejection_reason || null,
      is_online: details?.is_online || false,
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black font-serif text-[#1C1917] tracking-tight uppercase">
            Driver Fleet & KYC Onboarding
          </h1>
          <p className="text-sm text-[#A8A29E] mt-1">
            Manage delivery driver accounts, document verifications, vehicle details, and active duty status.
          </p>
        </div>
      </div>

      <DriversClient initialDrivers={driversList} />
    </div>
  )
}
