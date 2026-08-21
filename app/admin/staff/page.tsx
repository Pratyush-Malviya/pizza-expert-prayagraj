import { redirect } from 'next/navigation'

export default function StaffPageRedirect() {
  redirect('/admin/users?tab=staff')
}
