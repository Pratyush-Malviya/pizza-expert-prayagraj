'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users, Shield, ShieldCheck, UserPlus, Search, Edit3, Trash2,
  Phone, Mail, Bike, UtensilsCrossed, Crown, Eye, CheckCircle2,
  XCircle, AlertCircle, Sparkles, Filter, Download, X, Loader2,
  KeyRound, FileText, Check, Lock, Unlock, Zap, Send, Building2,
  Car, RefreshCw, Plus
} from 'lucide-react'
import { toast } from 'sonner'
import type { ManagedUser } from '@/app/actions/users'
import {
  updateUserRoleAndDetails,
  createManagedUser,
  deleteManagedUser
} from '@/app/actions/users'
import { inviteStaffMember } from '@/app/actions/staff'
import {
  ROLE_DEFINITIONS,
  ALL_PERMISSIONS,
  hasPermission,
  isPrimarySuperAdmin,
  type UserRole
} from '@/lib/auth/rbac'
import { cn } from '@/lib/utils'

export default function UsersManagementClient({
  initialUsers
}: {
  initialUsers: ManagedUser[]
}) {
  const searchParams = useSearchParams()
  const initialTabParam = searchParams.get('tab')

  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [activeTab, setActiveTab] = useState<'all' | 'staff' | 'driver' | 'customer' | 'matrix'>(
    initialTabParam === 'staff' ? 'staff' : initialTabParam === 'driver' || initialTabParam === 'drivers' ? 'driver' : 'all'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Edit / Inspect Modal
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Invite / Create Modals
  const [modalType, setModalType] = useState<'staff_invite' | 'general_user' | null>(null)
  const [isSubmittingModal, setIsSubmittingModal] = useState(false)

  // Unified Staff / Delivery Invite Form State
  const [staffInviteData, setStaffInviteData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Kitchen Operations',
    role: 'staff' as UserRole,
    vehicle_type: 'bike',
    vehicle_number: '',
    license_number: '',
  })

  // General Create User State
  const [newUserData, setNewUserData] = useState<{
    name: string
    email: string
    phone: string
    role: UserRole
    department: string
    employee_code: string
    vehicle_type: string
    vehicle_number: string
    license_number: string
    auto_verify: boolean
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'staff',
    department: 'Kitchen Operations',
    employee_code: '',
    vehicle_type: 'bike',
    vehicle_number: '',
    license_number: '',
    auto_verify: true,
  })

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'staff') setActiveTab('staff')
    else if (tabParam === 'driver' || tabParam === 'drivers') setActiveTab('driver')
  }, [searchParams])

  // Filter users based on tab, role filter, and search
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.vehicle_number && u.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (activeTab === 'staff') {
      return ['super_admin', 'manager', 'staff', 'viewer'].includes(u.role)
    }
    if (activeTab === 'driver') {
      return u.role === 'driver'
    }
    if (activeTab === 'customer') {
      return u.role === 'customer'
    }

    if (roleFilter !== 'all' && u.role !== roleFilter) {
      return false
    }

    return true
  })

  // Handle Edit Save
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsSaving(true)
    const res = await updateUserRoleAndDetails(selectedUser.id, {
      name: selectedUser.name,
      phone: selectedUser.phone || undefined,
      email: selectedUser.email,
      role: selectedUser.role,
      is_active: selectedUser.is_active,
      department: selectedUser.department || undefined,
      employee_code: selectedUser.employee_code || undefined,
      shift_pattern: selectedUser.shift_pattern || undefined,
      vehicle_type: selectedUser.vehicle_type || undefined,
      vehicle_number: selectedUser.vehicle_number || undefined,
      license_number: selectedUser.license_number || undefined,
      verification_status: selectedUser.verification_status || undefined,
    })
    setIsSaving(false)

    if (res.success) {
      toast.success(`User ${selectedUser.name} updated successfully!`)
      setUsers(users.map((u) => (u.id === selectedUser.id ? selectedUser : u)))
      setSelectedUser(null)
    } else {
      toast.error(res.error || 'Failed to update user')
    }
  }

  // Handle Staff & Delivery Invite Submission
  const handleStaffInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffInviteData.name.trim() || !staffInviteData.email.trim()) {
      toast.error('Please enter full name and email address.')
      return
    }

    setIsSubmittingModal(true)
    const formData = new FormData()
    formData.append('name', staffInviteData.name.trim())
    formData.append('email', staffInviteData.email.trim().toLowerCase())
    formData.append('phone', staffInviteData.phone.trim())
    formData.append('department', staffInviteData.department)
    formData.append('role', staffInviteData.role)

    const res = await inviteStaffMember(formData)
    setIsSubmittingModal(false)

    if (res.success) {
      toast.success(`Invitation email sent to ${staffInviteData.email}!`)
      setModalType(null)
      // Optimistic addition
      const newUserObj: ManagedUser = {
        id: (res as any).userId || `user-${Date.now()}`,
        name: staffInviteData.name.trim(),
        email: staffInviteData.email.trim().toLowerCase(),
        phone: staffInviteData.phone.trim() || null,
        role: staffInviteData.role,
        is_active: true,
        invite_status: 'pending',
        department: staffInviteData.department,
        vehicle_type: staffInviteData.role === 'driver' ? staffInviteData.vehicle_type : undefined,
        vehicle_number: staffInviteData.role === 'driver' ? staffInviteData.vehicle_number : undefined,
        license_number: staffInviteData.role === 'driver' ? staffInviteData.license_number : undefined,
        created_at: new Date().toISOString(),
      }
      setUsers([newUserObj, ...users])
      setStaffInviteData({
        name: '',
        email: '',
        phone: '',
        department: 'Kitchen Operations',
        role: 'staff',
        vehicle_type: 'bike',
        vehicle_number: '',
        license_number: '',
      })
    } else {
      toast.error(res.error || 'Failed to invite team member')
    }
  }

  // Handle General Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      toast.error('Please enter name and email.')
      return
    }

    setIsSubmittingModal(true)
    const res = await createManagedUser(newUserData)
    setIsSubmittingModal(false)

    if (res.success && res.user) {
      toast.success(`User ${newUserData.name} created with role ${newUserData.role.toUpperCase()}!`)
      setUsers([res.user as ManagedUser, ...users])
      setModalType(null)
      setNewUserData({
        name: '',
        email: '',
        phone: '',
        role: 'staff',
        department: 'Kitchen Operations',
        employee_code: '',
        vehicle_type: 'bike',
        vehicle_number: '',
        license_number: '',
        auto_verify: true,
      })
    } else {
      toast.error(res.error || 'Failed to create user')
    }
  }

  // Handle Delete
  const handleDelete = async (user: ManagedUser) => {
    if (user.role === 'super_admin' || isPrimarySuperAdmin(user)) {
      toast.error('👑 Super Admin profiles are permanently locked and cannot be deleted.')
      return
    }

    if (!confirm(`Are you sure you want to delete ${user.name} (${user.role})? This cannot be undone.`)) {
      return
    }

    const res = await deleteManagedUser(user.id)
    if (res.success) {
      toast.success(`User ${user.name} deleted`)
      setUsers(users.filter((u) => u.id !== user.id))
      if (selectedUser?.id === user.id) setSelectedUser(null)
    } else {
      toast.error(res.error || 'Failed to delete user')
    }
  }

  const staffCount = users.filter((u) => ['super_admin', 'manager', 'staff', 'viewer'].includes(u.role)).length
  const driverCount = users.filter((u) => u.role === 'driver').length
  const customerCount = users.filter((u) => u.role === 'customer').length

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E0D8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#B91C1C] flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-serif text-[#1C1917] tracking-tight uppercase">
                User & Team Management
              </h1>
              <p className="text-xs sm:text-sm text-[#78716C]">
                Staff Roster, Delivery Fleet, Customer Directory & RBAC Security Control
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons (Unified Staff & Delivery Invite) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setModalType('staff_invite')}
            className="btn btn-primary px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus size={15} />
            <span>Invite New Staff</span>
          </button>

          <button
            onClick={() => setModalType('general_user')}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-[#E7E0D8] text-[#1C1917] hover:bg-[#F5F5F4] transition-colors flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Roster Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('all')}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            activeTab === 'all' ? "bg-white border-[#B91C1C] shadow-xs ring-1 ring-[#B91C1C]/20" : "bg-white/70 border-[#E7E0D8] hover:bg-white"
          )}
        >
          <div className="flex items-center justify-between text-[#78716C] mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">All Accounts</span>
            <Users size={16} />
          </div>
          <p className="text-2xl font-black text-[#1C1917]">{users.length}</p>
        </div>

        <div
          onClick={() => setActiveTab('staff')}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            activeTab === 'staff' ? "bg-white border-[#B91C1C] shadow-xs ring-1 ring-[#B91C1C]/20" : "bg-white/70 border-[#E7E0D8] hover:bg-white"
          )}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Staff Roster</span>
            <UtensilsCrossed size={16} />
          </div>
          <p className="text-2xl font-black text-emerald-800">{staffCount}</p>
        </div>

        <div
          onClick={() => setActiveTab('driver')}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            activeTab === 'driver' ? "bg-white border-[#B91C1C] shadow-xs ring-1 ring-[#B91C1C]/20" : "bg-white/70 border-[#E7E0D8] hover:bg-white"
          )}
        >
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Delivery Fleet</span>
            <Bike size={16} />
          </div>
          <p className="text-2xl font-black text-blue-800">{driverCount}</p>
        </div>

        <div
          onClick={() => setActiveTab('customer')}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            activeTab === 'customer' ? "bg-white border-[#B91C1C] shadow-xs ring-1 ring-[#B91C1C]/20" : "bg-white/70 border-[#E7E0D8] hover:bg-white"
          )}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Customers</span>
            <Crown size={16} />
          </div>
          <p className="text-2xl font-black text-amber-800">{customerCount}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E7E0D8] pb-1 overflow-x-auto">
        {[
          { id: 'all', label: 'All Directory', count: users.length, icon: Users },
          { id: 'staff', label: 'Active Staff Roster', count: staffCount, icon: UtensilsCrossed },
          { id: 'driver', label: 'Delivery Staff & Partners', count: driverCount, icon: Bike },
          { id: 'customer', label: 'Registered Customers', count: customerCount, icon: Crown },
          { id: 'matrix', label: 'RBAC Permission Matrix', count: null, icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all",
                isActive
                  ? "bg-[#1C1917] text-white shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917] hover:bg-white/80"
              )}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px]",
                  isActive ? "bg-white/20 text-white" : "bg-[#E7E0D8] text-[#57534E]"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      {activeTab !== 'matrix' ? (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-[#E7E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="text"
                placeholder="Search by name, email, phone number, vehicle plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8] text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20"
              />
            </div>

            {activeTab === 'all' && (
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-[#78716C]" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8] text-xs font-bold text-[#1C1917] focus:bg-white focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">👑 Super Admin</option>
                  <option value="manager">👔 Manager</option>
                  <option value="staff">👨‍🍳 Kitchen Staff</option>
                  <option value="driver">🛵 Delivery Staff</option>
                  <option value="viewer">👁️ Auditor / Viewer</option>
                  <option value="customer">👤 Customer</option>
                </select>
              </div>
            )}
          </div>

          {/* User Table Card */}
          <div className="bg-white rounded-3xl border border-[#E7E0D8] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E7E0D8] bg-[#FBF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                  <Users size={16} className="text-[#B91C1C]" />
                  {activeTab === 'staff'
                    ? 'Active Staff Roster'
                    : activeTab === 'driver'
                    ? 'Delivery Staff & Partner Fleet'
                    : activeTab === 'customer'
                    ? 'Customer Directory'
                    : 'All Registered Accounts'}
                </h3>
                <p className="text-[11px] text-[#78716C]">
                  Showing {filteredUsers.length} members matching criteria
                </p>
              </div>

              {(activeTab === 'staff' || activeTab === 'driver') && (
                <button
                  onClick={() => {
                    setStaffInviteData((prev) => ({
                      ...prev,
                      role: activeTab === 'driver' ? 'driver' : 'staff',
                      department: activeTab === 'driver' ? 'Delivery Dispatch' : 'Kitchen Operations',
                    }))
                    setModalType('staff_invite')
                  }}
                  className="btn btn-primary px-3 py-1.5 text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <UserPlus size={13} />
                  <span>{activeTab === 'driver' ? 'Invite Delivery Staff' : 'Invite New Staff'}</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-[#E7E0D8]">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#F5F5F4] text-[#A8A29E] flex items-center justify-center mx-auto">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1C1917]">No users found</p>
                    <p className="text-xs text-[#A8A29E] mt-0.5">
                      {searchQuery ? 'Try adjusting your search terms.' : 'No members currently registered under this filter.'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isPrimary = isPrimarySuperAdmin(user)
                  const isSuperAdmin = user.role === 'super_admin' || isPrimary
                  const isActive = user.is_active !== false

                  return (
                    <div
                      key={user.id}
                      className={cn(
                        "p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors",
                        isSuperAdmin ? "bg-amber-50/30 border-l-4 border-amber-500" : !isActive ? "bg-stone-50/70 opacity-75" : "hover:bg-[#FBF9F5]/60"
                      )}
                    >
                      {/* Left: User Identity */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center font-black uppercase shrink-0 text-white shadow-2xs",
                            isSuperAdmin
                              ? "bg-gradient-to-br from-amber-600 to-amber-800 ring-2 ring-amber-400/50"
                              : user.role === 'driver'
                              ? "bg-blue-600"
                              : user.role === 'manager'
                              ? "bg-emerald-700"
                              : user.role === 'staff'
                              ? "bg-[#B91C1C]"
                              : "bg-[#18181B]"
                          )}
                        >
                          {(user.name || 'U').slice(0, 2)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#1C1917] truncate">{user.name || 'Unnamed User'}</span>

                            {/* Role Badge */}
                            {isSuperAdmin ? (
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-gradient-to-r from-amber-200 via-rose-200 to-amber-200 text-[#78350F] rounded-full border border-amber-400 inline-flex items-center gap-1">
                                <Crown size={10} className="fill-amber-600 text-amber-700" /> {isPrimary ? 'Primary Super Admin (Root)' : 'Super Admin'}
                              </span>
                            ) : (
                              <span className={cn(
                                "px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border",
                                user.role === 'manager' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                user.role === 'driver' ? "bg-blue-50 text-blue-800 border-blue-200" :
                                user.role === 'staff' ? "bg-rose-50 text-[#B91C1C] border-rose-200" :
                                user.role === 'viewer' ? "bg-purple-50 text-purple-800 border-purple-200" :
                                "bg-stone-100 text-[#57534E] border-stone-200"
                              )}>
                                {user.role === 'driver' ? 'Delivery Staff' : user.role}
                              </span>
                            )}

                            {/* Status Badge */}
                            {!isActive && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-stone-200 text-stone-700 rounded-full">
                                Suspended
                              </span>
                            )}
                            {user.invite_status === 'pending' && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                                Invite Sent (Pending)
                              </span>
                            )}
                          </div>

                          {/* Details Row */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#78716C] mt-1">
                            <span className="flex items-center gap-1 truncate">
                              <Mail size={12} className="text-[#A8A29E]" />
                              {user.email || 'No email attached'}
                            </span>
                            {user.phone && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone size={12} className="text-[#A8A29E]" />
                                {user.phone}
                              </span>
                            )}
                            {user.department && (
                              <span className="flex items-center gap-1 font-semibold text-[#57534E]">
                                <Building2 size={12} className="text-[#A8A29E]" />
                                {user.department}
                              </span>
                            )}
                            {user.vehicle_number && (
                              <span className="flex items-center gap-1 font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                <Bike size={11} /> {user.vehicle_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-3 py-1.5 rounded-xl border border-[#E7E0D8] text-xs font-bold text-[#1C1917] hover:bg-[#F5F5F4] transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Edit3 size={13} className="text-[#78716C]" />
                          <span>Manage</span>
                        </button>

                        {!isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* RBAC MATRIX VIEW */
        <div className="bg-white rounded-3xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
          <div>
            <h3 className="font-serif font-black text-lg text-[#1C1917] flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#B91C1C]" />
              Role-Based Access Control (RBAC) Permission Matrix
            </h3>
            <p className="text-xs text-[#78716C] mt-1">
              Authoritative security permission matrix enforced across all API routes, database RLS, and admin tabs.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#E7E0D8] rounded-2xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#1C1917]">
                <tr>
                  <th className="p-3.5 font-bold">Permission / Capability</th>
                  {Object.keys(ROLE_DEFINITIONS).map((r) => (
                    <th key={r} className="p-3.5 font-bold text-center capitalize">
                      {r.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]">
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm.key} className="hover:bg-[#FBF9F5]/50">
                    <td className="p-3.5">
                      <div className="font-bold text-[#1C1917]">{perm.label}</div>
                      <div className="text-[10px] text-[#78716C] font-semibold">{perm.category}</div>
                    </td>
                    {Object.keys(ROLE_DEFINITIONS).map((roleKey) => {
                      const allowed = hasPermission(roleKey as UserRole, perm.key)
                      return (
                        <td key={roleKey} className="p-3.5 text-center">
                          {allowed ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 text-stone-400 font-bold">
                              —
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── UNIFIED INVITE NEW STAFF / DELIVERY MEMBER MODAL ─────────── */}
      {modalType === 'staff_invite' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#E7E0D8] p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <div>
                <h3 className="font-serif font-black text-lg text-[#1C1917] flex items-center gap-2">
                  <UserPlus size={20} className="text-[#B91C1C]" />
                  Invite New Staff Member
                </h3>
                <span className="text-xs text-[#78716C]">
                  Send an official team invite with customized department & role
                </span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-[#78716C] hover:text-[#1C1917]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStaffInviteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aman Sharma"
                  value={staffInviteData.name}
                  onChange={(e) => setStaffInviteData({ ...staffInviteData, name: e.target.value })}
                  className="admin-input text-xs bg-white text-[#1C1917]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aman@pizzaexpert.in"
                  value={staffInviteData.email}
                  onChange={(e) => setStaffInviteData({ ...staffInviteData, email: e.target.value })}
                  className="admin-input text-xs bg-white text-[#1C1917]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={staffInviteData.phone}
                  onChange={(e) => setStaffInviteData({ ...staffInviteData, phone: e.target.value })}
                  className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Department *</label>
                <select
                  value={staffInviteData.department}
                  onChange={(e) => setStaffInviteData({ ...staffInviteData, department: e.target.value })}
                  className="admin-input text-xs bg-white text-[#1C1917] font-bold"
                >
                  <option value="Kitchen Operations">Kitchen Operations / Chef</option>
                  <option value="Front Counter & POS">Front Counter & Cashier</option>
                  <option value="Delivery Dispatch">Delivery Dispatch</option>
                  <option value="Store Management">Store Management</option>
                  <option value="Finance & Accounts">Finance & Accounts</option>
                </select>
              </div>

              {/* Role Assignment with Delivery Staff included */}
              <div className="bg-[#FBF9F5] p-4 rounded-2xl border border-[#E7E0D8] space-y-2">
                <label className="block font-bold text-[#1C1917] uppercase text-[11px] tracking-wider">
                  Role Assignment *
                </label>
                <select
                  value={staffInviteData.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole
                    setStaffInviteData((prev) => ({
                      ...prev,
                      role: newRole,
                      department: newRole === 'driver' ? 'Delivery Dispatch' : prev.department,
                    }))
                  }}
                  className="admin-input text-xs bg-white text-[#1C1917] font-bold"
                >
                  <option value="staff">👨‍🍳 Staff (Kitchen / Orders / KDS)</option>
                  <option value="driver">🛵 Delivery Staff (Rider App & GPS Dispatch)</option>
                  <option value="manager">👔 Store Manager (Inventory & Shifts)</option>
                  <option value="viewer">👁️ Auditor / Viewer (Read-Only Reports)</option>
                </select>
                <p className="text-[11px] text-[#57534E]">
                  {ROLE_DEFINITIONS[staffInviteData.role]?.description}
                </p>
              </div>

              {/* If Delivery Staff is selected, show optional vehicle details */}
              {staffInviteData.role === 'driver' && (
                <div className="bg-[#FBF9F5] p-3.5 rounded-2xl border border-[#E7E0D8] space-y-2.5">
                  <span className="font-bold text-[#1C1917] text-[11px] uppercase tracking-wider block">
                    Vehicle Details (Optional)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Vehicle Type</label>
                      <select
                        value={staffInviteData.vehicle_type}
                        onChange={(e) => setStaffInviteData({ ...staffInviteData, vehicle_type: e.target.value })}
                        className="admin-input text-xs bg-white text-[#1C1917]"
                      >
                        <option value="bike">Motorcycle</option>
                        <option value="scooter">Scooter</option>
                        <option value="ebike">EV Scooter</option>
                        <option value="bicycle">Bicycle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Plate Number</label>
                      <input
                        type="text"
                        placeholder="UP 70 AB 1234"
                        value={staffInviteData.vehicle_number}
                        onChange={(e) => setStaffInviteData({ ...staffInviteData, vehicle_number: e.target.value.toUpperCase() })}
                        className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7E0D8]">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-[#E7E0D8] font-bold text-[#57534E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="btn btn-primary px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmittingModal ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Send Invite Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: GENERAL DIRECT USER CREATE ──────────────────────── */}
      {modalType === 'general_user' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-[#E7E0D8] p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <div>
                <h3 className="font-serif font-black text-lg text-[#1C1917] flex items-center gap-2">
                  <UserPlus size={20} className="text-[#B91C1C]" />
                  Add Direct User Account
                </h3>
                <span className="text-xs text-[#78716C]">
                  Configure account credentials and assigned RBAC role
                </span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-[#78716C] hover:text-[#1C1917]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    className="admin-input text-xs bg-white text-[#1C1917]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#1C1917] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="priya@pizzaexpert.in"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="admin-input text-xs bg-white text-[#1C1917]"
                  />
                </div>
              </div>

              <div className="bg-[#FBF9F5] p-4 rounded-2xl border border-[#E7E0D8] space-y-2">
                <label className="block font-bold text-[#1C1917] uppercase text-[11px] tracking-wider">
                  Assign RBAC Role *
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                  className="admin-input text-xs bg-white text-[#1C1917] font-bold"
                >
                  <option value="super_admin">👑 Super Admin (Full Business Control)</option>
                  <option value="manager">👔 Store Manager (Orders, Inventory & Staff Shift)</option>
                  <option value="staff">👨‍🍳 Kitchen & Counter Staff (KDS & Prep)</option>
                  <option value="driver">🛵 Delivery Staff (Rider App & GPS Dispatch)</option>
                  <option value="viewer">👁️ Auditor / Viewer (Read-Only Reports)</option>
                  <option value="customer">👤 Customer Account</option>
                </select>
                <p className="text-[11px] text-[#57534E]">
                  {ROLE_DEFINITIONS[newUserData.role]?.description}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7E0D8]">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-[#E7E0D8] font-bold text-[#57534E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="btn btn-primary px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmittingModal ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: MANAGE / EDIT USER RBAC ─────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-[#E7E0D8] p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <div>
                <h3 className="font-serif font-black text-lg text-[#1C1917] flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[#B91C1C]" />
                  Manage Role & Access: {selectedUser.name}
                </h3>
                <span className="text-xs text-[#78716C]">
                  User ID: <span className="font-mono">{selectedUser.id}</span>
                </span>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1 text-[#78716C] hover:text-[#1C1917]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={selectedUser.name}
                    onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                    className="admin-input text-xs bg-white text-[#1C1917]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={selectedUser.email}
                  className="admin-input text-xs bg-[#F5F5F4] text-[#78716C] cursor-not-allowed"
                />
              </div>

              {/* Role Selection */}
              <div className="bg-[#FBF9F5] p-4 rounded-2xl border border-[#E7E0D8] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#1C1917] uppercase text-[11px] tracking-wider">
                    Assigned Role
                  </label>
                  {isPrimarySuperAdmin(selectedUser) && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      Primary Super Admin (Permanent)
                    </span>
                  )}
                </div>

                <select
                  disabled={isPrimarySuperAdmin(selectedUser)}
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value as UserRole })}
                  className="admin-input text-xs bg-white text-[#1C1917] font-bold disabled:bg-[#F5F5F4]"
                >
                  <option value="super_admin">👑 Super Admin</option>
                  <option value="manager">👔 Store Manager</option>
                  <option value="staff">👨‍🍳 Kitchen & Counter Staff</option>
                  <option value="driver">🛵 Delivery Staff</option>
                  <option value="viewer">👁️ Auditor / Viewer</option>
                  <option value="customer">👤 Customer</option>
                </select>
                <p className="text-[11px] text-[#57534E]">
                  {ROLE_DEFINITIONS[selectedUser.role]?.description}
                </p>
              </div>

              {/* Staff Specific Fields */}
              {['super_admin', 'manager', 'staff', 'viewer'].includes(selectedUser.role) && (
                <div className="bg-[#FBF9F5] p-4 rounded-2xl border border-[#E7E0D8] space-y-3">
                  <span className="font-bold text-[#1C1917] text-[11px] uppercase tracking-wider block">
                    Staff & Employment Details
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Kitchen Operations"
                        value={selectedUser.department || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, department: e.target.value })}
                        className="admin-input text-xs bg-white text-[#1C1917]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Employee Code</label>
                      <input
                        type="text"
                        placeholder="EMP-012"
                        value={selectedUser.employee_code || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, employee_code: e.target.value })}
                        className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Specific Fields */}
              {selectedUser.role === 'driver' && (
                <div className="bg-[#FBF9F5] p-4 rounded-2xl border border-[#E7E0D8] space-y-3">
                  <span className="font-bold text-[#1C1917] text-[11px] uppercase tracking-wider block">
                    Delivery Partner & Vehicle Details
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Vehicle Type</label>
                      <select
                        value={selectedUser.vehicle_type || 'bike'}
                        onChange={(e) => setSelectedUser({ ...selectedUser, vehicle_type: e.target.value })}
                        className="admin-input text-xs bg-white text-[#1C1917]"
                      >
                        <option value="bike">Motorcycle</option>
                        <option value="scooter">Scooter</option>
                        <option value="ebike">EV Scooter</option>
                        <option value="bicycle">Bicycle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Vehicle Number</label>
                      <input
                        type="text"
                        placeholder="UP 70 AB 1234"
                        value={selectedUser.vehicle_number || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, vehicle_number: e.target.value })}
                        className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">License No.</label>
                      <input
                        type="text"
                        placeholder="UP-70-2024-0012"
                        value={selectedUser.license_number || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, license_number: e.target.value })}
                        className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Verification Status</label>
                      <select
                        value={selectedUser.verification_status || 'verified'}
                        onChange={(e) => setSelectedUser({ ...selectedUser, verification_status: e.target.value as any })}
                        className="admin-input text-xs bg-white text-[#1C1917] font-bold"
                      >
                        <option value="verified">Verified (Approved)</option>
                        <option value="pending">Pending Review</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#E7E0D8] bg-white">
                <div>
                  <span className="font-bold text-[#1C1917] block">Account Access Status</span>
                  <span className="text-[11px] text-[#78716C]">
                    {isPrimarySuperAdmin(selectedUser)
                      ? 'Root Super Admin account is permanently active.'
                      : selectedUser.is_active
                      ? 'User can log in and perform assigned tasks'
                      : 'Account is suspended'}
                  </span>
                </div>
                {isPrimarySuperAdmin(selectedUser) ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-600 text-white flex items-center gap-1">
                    <Lock size={12} /> ACTIVE (ROOT)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedUser({ ...selectedUser, is_active: !selectedUser.is_active })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                      selectedUser.is_active ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    {selectedUser.is_active ? 'ACTIVE' : 'SUSPENDED'}
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E7E0D8]">
                {!isPrimarySuperAdmin(selectedUser) ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedUser)}
                    className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold flex items-center justify-center gap-1.5 transition-colors text-xs"
                  >
                    <Trash2 size={14} />
                    <span>Delete User</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-flex items-center gap-1.5">
                    <Lock size={12} className="text-amber-600" /> Root Profile Locked
                  </span>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 rounded-xl border border-[#E7E0D8] font-bold text-[#57534E] text-xs hover:bg-[#F5F5F4] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn btn-primary px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs text-xs"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
