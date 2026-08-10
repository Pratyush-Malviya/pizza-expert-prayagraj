import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import StaffClient from '@/app/admin/staff/StaffClient'

export const metadata = {
  title: 'Staff Management | Admin Portal',
}

export default async function StaffManagementPage() {
  const supabase = await createClient()

  const cookieStore = await cookies()
  const isSimpleAdmin = cookieStore.get('simple_admin')?.value === 'true'

  // Verify super_admin role (middleware should catch this, but double check)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isSimpleAdmin) {
    redirect('/login')
  }

  let staffList: any[] = []
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role && profile.role !== 'super_admin' && !isSimpleAdmin) {
      redirect('/admin')
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, name, phone, role, created_at')
      .neq('role', 'customer')
      .order('created_at', { ascending: false })

    staffList = data || []
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black font-serif text-[#1C1917] tracking-tight uppercase">
            Staff Roster
          </h1>
          <p className="text-sm text-[#A8A29E] mt-1">
            Manage roles and access permissions for your team.
          </p>
        </div>
      </div>

      <StaffClient initialStaff={staffList || []} />
    </div>
  )
}
