'use client'

import { useState } from 'react'
import { inviteStaffMember, updateStaffRole } from '@/app/actions/staff'
import { toast } from 'sonner'
import { UserPlus, Shield, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  name: string
  phone: string | null
  role: string
  created_at: string
}

export default function StaffClient({ initialStaff }: { initialStaff: Profile[] }) {
  const [staff, setStaff] = useState<Profile[]>(initialStaff)
  const [isInviting, setIsInviting] = useState(false)
  
  async function handleInvite(formData: FormData) {
    setIsInviting(true)
    const result = await inviteStaffMember(formData)
    setIsInviting(false)

    if (result.success) {
      toast.success('Staff member invited successfully!')
      // In a real app we might fetch again, but revalidatePath will handle the server side
      window.location.reload()
    } else {
      toast.error(result.error || 'Failed to invite staff')
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const result = await updateStaffRole(userId, newRole)
    if (result.success) {
      toast.success('Role updated successfully!')
      setStaff(staff.map(s => s.id === userId ? { ...s, role: newRole } : s))
    } else {
      toast.error(result.error || 'Failed to update role')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Staff List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow-xs border border-[#E7E0D8] overflow-hidden">
          <div className="p-4 border-b border-[#E7E0D8] bg-[#FBF9F5]">
            <h2 className="font-semibold text-[#1C1917] flex items-center gap-2">
              <Shield size={18} className="text-[#15803D]" /> Active Staff
            </h2>
          </div>
          <div className="divide-y divide-[#E7E0D8]">
            {staff.length === 0 ? (
              <div className="p-8 text-center text-[#A8A29E] text-sm">
                No staff members found.
              </div>
            ) : (
              staff.map((member) => (
                <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FBF9F5]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#18181B] text-white flex items-center justify-center font-bold font-serif uppercase shrink-0">
                      {(member.name || 'S').slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-[#1C1917]">{member.name || 'Unnamed'}</div>
                      <div className="text-xs text-[#A8A29E]">Joined {new Date(member.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select
                      className="text-sm border border-[#E7E0D8] rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20"
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff (Kitchen)</option>
                      <option value="viewer">Viewer</option>
                      <option value="customer">Remove Access (Customer)</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-white rounded-xl shadow-xs border border-[#E7E0D8] p-5 h-fit sticky top-20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#B91C1C]">
            <UserPlus size={16} />
          </div>
          <h2 className="font-bold text-[#1C1917]">Invite New Staff</h2>
        </div>

        <form action={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input 
                type="text" 
                name="name" 
                required
                className="w-full pl-9 pr-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                placeholder="e.g. John Chef"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Email Address</label>
            <input 
              type="email" 
              name="email" 
              required
              className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Role Assignment</label>
            <select 
              name="role" 
              required
              defaultValue="staff"
              className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] bg-white"
            >
              <option value="manager">Manager (Full Ops)</option>
              <option value="staff">Staff (Kitchen Only)</option>
              <option value="viewer">Viewer (Read Only)</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isInviting}
            className="w-full bg-[#B91C1C] hover:bg-[#991B1B] text-white py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isInviting ? (
              <><Loader2 size={16} className="animate-spin" /> Inviting...</>
            ) : (
              <><UserPlus size={16} /> Send Invite Email</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
