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
      .select('id, name, phone, role, is_active, invite_status, last_login_at, created_at, staff_details(department, employee_code, hire_date)')
      .in('role', ['super_admin', 'manager', 'staff', 'viewer'])
      .order('created_at', { ascending: false })

    staffList = data?.map((m: any) => ({
      ...m,
      department: m.staff_details?.[0]?.department || m.staff_details?.department || null,
      employee_code: m.staff_details?.[0]?.employee_code || m.staff_details?.employee_code || null,
    })) || []
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
