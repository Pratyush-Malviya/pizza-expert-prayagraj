'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { MapPin, Plus, Trash2, Edit2, Loader2 } from 'lucide-react'

export default function AddressesClient({ initialAddresses, userId }: { initialAddresses: any[], userId: string }) {
  const [addresses, setAddresses] = useState(initialAddresses)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    line1: '',
    line2: '',
    city: 'Prayagraj',
    state: 'Uttar Pradesh',
    pincode: ''
  })

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this address?')) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase.from('addresses').delete().eq('id', id)
      if (error) throw error
      
      setAddresses(addresses.filter(a => a.id !== id))
      toast.success('Address deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete address')
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('addresses').insert({
        user_id: userId,
        ...newAddress
      }).select().single()
      
      if (error) throw error
      
      setAddresses([data, ...addresses])
      setIsAdding(false)
      setNewAddress({ label: 'Home', line1: '', line2: '', city: 'Prayagraj', state: 'Uttar Pradesh', pincode: '' })
      toast.success('Address added')
    } catch (err: any) {
      toast.error(err.message || 'Failed to add address')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const supabase = createClient()
      // First, remove default from all
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
      // Then set the selected one as default
      const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id)
      
      if (error) throw error
      
      setAddresses(addresses.map(a => ({
        ...a,
        is_default: a.id === id
      })).sort((a, b) => (a.is_default === b.is_default) ? 0 : a.is_default ? -1 : 1))
      
      toast.success('Default address updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to set default address')
    }
  }

  return (
    <div className="space-y-6">
      {addresses.length === 0 && !isAdding ? (
        <div className="text-center py-12 border border-dashed border-[#E7E0D8] rounded-xl bg-[#FBF9F5]">
          <MapPin size={32} className="mx-auto text-[#A8A29E] mb-3" />
          <h3 className="font-bold text-[#1C1917] mb-1">No addresses saved</h3>
          <p className="text-sm text-[#A8A29E] mb-4">Add an address for faster checkout.</p>
          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn-primary rounded-lg text-xs uppercase tracking-wider font-bold"
          >
            Add New Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className={`border rounded-xl p-4 relative ${addr.is_default ? 'border-[#B91C1C] bg-[#FEF2F2]/50' : 'border-[#E7E0D8] bg-white'}`}>
              {addr.is_default && (
                <span className="absolute top-4 right-4 text-[10px] uppercase tracking-wider font-bold text-[#B91C1C] bg-[#FEF2F2] px-2 py-1 rounded-full">Default</span>
              )}
              
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={16} className={addr.is_default ? 'text-[#B91C1C]' : 'text-[#A8A29E]'} />
                <h4 className="font-bold text-[#1C1917] uppercase text-sm tracking-wide">{addr.label}</h4>
              </div>
              
              <div className="text-sm text-[#1C1917] space-y-1 mb-4">
                <p>{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>{addr.city}, {addr.state} {addr.pincode}</p>
              </div>
              
              <div className="flex items-center gap-3 pt-3 border-t border-[#E7E0D8]">
                {!addr.is_default && (
                  <button onClick={() => handleSetDefault(addr.id)} className="text-xs font-bold text-[#1C1917] hover:text-[#B91C1C]">
                    Set as Default
                  </button>
                )}
                <div className="flex-1" />
                <button onClick={() => handleDelete(addr.id)} className="text-[#A8A29E] hover:text-[#B91C1C]" aria-label="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="border border-dashed border-[#E7E0D8] rounded-xl flex flex-col items-center justify-center p-6 text-[#A8A29E] hover:text-[#1C1917] hover:border-[#1C1917] transition-colors min-h-[160px]"
            >
              <Plus size={24} className="mb-2" />
              <span className="text-sm font-bold uppercase tracking-wider">Add New Address</span>
            </button>
          )}
        </div>
      )}

      {isAdding && (
        <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-5 mt-6">
          <h3 className="font-bold text-[#1C1917] mb-4 uppercase tracking-wider text-sm">Add New Address</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Label (e.g. Home, Office)</label>
                <input 
                  type="text" 
                  required
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Pincode</label>
                <input 
                  type="text" 
                  required
                  value={newAddress.pincode}
                  onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Address Line 1</label>
              <input 
                type="text" 
                required
                value={newAddress.line1}
                onChange={(e) => setNewAddress({...newAddress, line1: e.target.value})}
                className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Address Line 2 (Optional)</label>
              <input 
                type="text" 
                value={newAddress.line2}
                onChange={(e) => setNewAddress({...newAddress, line2: e.target.value})}
                className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A8A29E] mb-1">City</label>
                <input 
                  type="text" 
                  required
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#A8A29E] mb-1">State</label>
                <input 
                  type="text" 
                  required
                  value={newAddress.state}
                  onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                  className="w-full px-3 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button 
                type="submit" 
                disabled={isSaving}
                className="btn btn-primary rounded-lg text-xs uppercase tracking-wider font-bold py-2.5 px-6 flex items-center gap-2"
              >
                {isSaving ? <><Loader2 size={14} className="animate-spin" /> Saving</> : 'Save Address'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="text-sm font-semibold text-[#A8A29E] hover:text-[#1C1917]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
