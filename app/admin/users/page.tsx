import { fetchAllUsers } from '@/app/actions/users'
import UsersManagementClient from './UsersManagementClient'

export const metadata = {
  title: 'User Management & RBAC | Admin Portal',
  description: 'Manage staff, kitchen team, delivery partners, customer accounts, and role-based access control.',
}

export default async function UsersPage() {
  const { users } = await fetchAllUsers()

  return (
    <div className="max-w-6xl mx-auto">
      <UsersManagementClient initialUsers={users || []} />
    </div>
  )
}
