'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

export default function ProfileClient({ initialProfile, userId }: { initialProfile: any, userId: string }) {
  const [name, setName] = useState(initialProfile.name)
  const [phone, setPhone] = useState(initialProfile.phone)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ name, phone })
        .eq('id', userId)

      if (error) throw error

      toast.success('Profile updated successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-md space-y-5">
      <div>
        <label className="block text-xs font-semibold text-[#A8A29E] mb-1 uppercase tracking-wider">Email Address</label>
        <input 
          type="email" 
          disabled
          value={initialProfile.email}
          className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm bg-[#FBF9F5] text-[#A8A29E] cursor-not-allowed"
        />
        <p className="text-[10px] text-[#A8A29E] mt-1">Email address cannot be changed.</p>
      </div>
      
      <div>
        <label className="block text-xs font-semibold text-[#A8A29E] mb-1 uppercase tracking-wider">Full Name</label>
        <input 
          type="text" 
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
          placeholder="e.g. John Doe"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#A8A29E] mb-1 uppercase tracking-wider">Phone Number</label>
        <input 
          type="tel" 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
          placeholder="e.g. 9876543210"
        />
      </div>

      <button 
        type="submit" 
        disabled={isSaving}
        className="btn btn-primary w-full rounded-lg text-sm uppercase tracking-wider font-bold py-3 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <><Loader2 size={18} className="animate-spin" /> Saving...</>
        ) : (
          <><Save size={18} /> Save Changes</>
        )}
      </button>
    </form>
  )
}
