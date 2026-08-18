'use client'

import { useState } from 'react'
import { inviteStaffMember, updateStaffRole, deactivateStaffMember, reactivateStaffMember, updateStaffDetails } from '@/app/actions/staff'
import { toast } from 'sonner'
import { UserPlus, Shield, User, Loader2, Ban, CheckCircle2, Clock, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  name: string
  phone: string | null
  role: string
  is_active?: boolean
  invite_status?: string | null
  last_login_at?: string | null
  created_at: string
  department?: string | null
  employee_code?: string | null
}

export default function StaffClient({ initialStaff }: { initialStaff: Profile[] }) {
  const [staff, setStaff] = useState<Profile[]>(initialStaff)
  const [isInviting, setIsInviting] = useState(false)
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)

  async function handleInvite(formData: FormData) {
    setIsInviting(true)
    const result = await inviteStaffMember(formData)
    setIsInviting(false)

    if (result.success) {
      toast.success('Staff member invited successfully!')
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

  async function handleToggleActive(member: Profile) {
    setLoadingActionId(member.id)
    const isCurrentlyActive = member.is_active !== false
    const result = isCurrentlyActive 
      ? await deactivateStaffMember(member.id)
      : await reactivateStaffMember(member.id)
    
    setLoadingActionId(null)

    if (result.success) {
      toast.success(isCurrentlyActive ? 'Staff member deactivated' : 'Staff member reactivated')
      setStaff(staff.map(s => s.id === member.id ? { ...s, is_active: !isCurrentlyActive } : s))
    } else {
      toast.error(result.error || 'Operation failed')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Staff List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow-xs border border-[#E7E0D8] overflow-hidden">
          <div className="p-4 border-b border-[#E7E0D8] bg-[#FBF9F5] flex justify-between items-center">
            <h2 className="font-semibold text-[#1C1917] flex items-center gap-2">
              <Shield size={18} className="text-[#15803D]" /> Active Staff Roster
            </h2>
            <span className="text-xs text-[#A8A29E] font-medium">{staff.length} Members</span>
          </div>
          <div className="divide-y divide-[#E7E0D8]">
            {staff.length === 0 ? (
              <div className="p-8 text-center text-[#A8A29E] text-sm">
                No staff members found.
              </div>
            ) : (
              staff.map((member) => {
                const isActive = member.is_active !== false
                return (
                  <div key={member.id} className={cn("p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors", !isActive ? "bg-[#F5F5F4]/60 opacity-80" : "hover:bg-[#FBF9F5]/50")}>
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold font-serif uppercase shrink-0 text-white", isActive ? "bg-[#18181B]" : "bg-[#71717A]")}>
                        {(member.name || 'S').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1C1917]">{member.name || 'Unnamed'}</span>
                          {/* Active / Inactive Badge */}
                          <span className={cn("px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full uppercase", isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]")}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                          {/* Invite Status Badge */}
                          {member.invite_status === 'pending' && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#FEF3C7] text-[#92400E] rounded-full">
                              Pending Invite
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#A8A29E] mt-1">
                          {member.department && (
                            <span className="flex items-center gap-1 font-medium text-[#57534E]">
                              <Building2 size={12} /> {member.department}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {member.last_login_at ? `Last login: ${new Date(member.last_login_at).toLocaleDateString()}` : `Joined ${new Date(member.created_at).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <select
                        className="text-xs font-medium border border-[#E7E0D8] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20"
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff (Kitchen)</option>
                        <option value="viewer">Viewer</option>
                      </select>

                      <button
                        onClick={() => handleToggleActive(member)}
                        disabled={loadingActionId === member.id}
                        title={isActive ? "Deactivate Account" : "Reactivate Account"}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border",
                          isActive 
                            ? "border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2]" 
                            : "border-[#86EFAC] text-[#15803D] hover:bg-[#F0FDF4]"
                        )}
                      >
                        {loadingActionId === member.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isActive ? (
                          <><Ban size={14} /> Deactivate</>
                        ) : (
                          <><CheckCircle2 size={14} /> Reactivate</>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
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
                className="w-full pl-9 pr-4 py-2 border border-[#E7E0D8] bg-white text-[#1C1917] placeholder-[#A8A29E] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Email Address</label>
            <input 
              type="email" 
              name="email" 
              required
              className="w-full px-4 py-2 border border-[#E7E0D8] bg-white text-[#1C1917] placeholder-[#A8A29E] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
              placeholder="rahul@pizzaexpert.in"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Department</label>
            <input 
              type="text" 
              name="department" 
              className="w-full px-4 py-2 border border-[#E7E0D8] bg-white text-[#1C1917] placeholder-[#A8A29E] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
              placeholder="Kitchen / Dispatch / Inventory"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Role Assignment</label>
            <select 
              name="role" 
              required
              defaultValue="staff"
              className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] bg-white text-[#1C1917]"
            >
              <option value="manager">Manager (Full Ops)</option>
              <option value="staff">Staff (Kitchen / Orders)</option>
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

