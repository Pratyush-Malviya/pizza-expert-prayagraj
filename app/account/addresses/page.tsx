import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddressesClient from '@/app/account/addresses/AddressesClient'

export const metadata = {
  title: 'My Addresses | My Account',
}

export default async function AccountAddressesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black font-serif text-[#1C1917] uppercase tracking-tight border-b border-[#E7E0D8] pb-4">
        Saved Addresses
      </h1>

      <AddressesClient initialAddresses={addresses || []} userId={user.id} />
    </div>
  )
}
