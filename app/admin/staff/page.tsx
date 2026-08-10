import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffClient from '@/app/admin/staff/StaffClient'

export const metadata = {
  title: 'Staff Management | Admin Portal',
}

export default async function StaffManagementPage() {
  const supabase = await createClient()

  // Verify super_admin role (middleware should catch this, but double check)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    redirect('/admin')
  }

  // Fetch all staff members (role != customer)
  const { data: staffList } = await supabase
    .from('profiles')
    .select('id, name, phone, role, created_at')
    .neq('role', 'customer')
    .order('created_at', { ascending: false })

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
