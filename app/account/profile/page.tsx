import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from '@/app/account/profile/ProfileClient'

export const metadata = {
  title: 'Profile | My Account',
}

export default async function AccountProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const defaultProfile = {
    name: profile?.name || user.user_metadata?.name || '',
    phone: profile?.phone || '',
    email: user.email || ''
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black font-serif text-[#1C1917] uppercase tracking-tight border-b border-[#E7E0D8] pb-4">
        My Profile
      </h1>

      <ProfileClient initialProfile={defaultProfile} userId={user.id} />
    </div>
  )
}
