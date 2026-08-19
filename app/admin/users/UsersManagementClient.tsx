'use client'

import { useState } from 'react'
import {
  Users, Shield, ShieldCheck, UserPlus, Search, Edit3, Trash2,
  Phone, Mail, Bike, UtensilsCrossed, Crown, Eye, CheckCircle2,
  XCircle, AlertCircle, Sparkles, Filter, Download, X, Loader2,
  KeyRound, FileText, Check, Lock, Unlock, Zap
} from 'lucide-react'
import { toast } from 'sonner'
import type { ManagedUser } from '@/app/actions/users'
import {
  updateUserRoleAndDetails,
  createManagedUser,
  deleteManagedUser
} from '@/app/actions/users'
import {
  ROLE_DEFINITIONS,
  ALL_PERMISSIONS,
  hasPermission,
  isPrimarySuperAdmin,
  type UserRole
} from '@/lib/auth/rbac'

export default function UsersManagementClient({
  initialUsers
}: {
  initialUsers: ManagedUser[]
}) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [activeTab, setActiveTab] = useState<'all' | 'staff' | 'driver' | 'customer' | 'matrix'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Edit / Inspect Modal
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
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

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      toast.error('Please enter name and email.')
      return
    }

    setIsCreating(true)
    const res = await createManagedUser(newUserData)
    setIsCreating(false)

    if (res.success && res.user) {
      toast.success(`🎉 User ${newUserData.name} created with role ${newUserData.role.toUpperCase()}!`)
      setUsers([res.user as ManagedUser, ...users])
      setShowCreateModal(false)
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
      toast.error('👑 Super Admin profiles are permanently locked and cannot be deleted by anyone.')
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
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] text-xs font-bold font-mono uppercase mb-1">
            <ShieldCheck size={14} /> Role-Based Access Control (RBAC)
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#1C1917]">
            User & Team Management
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C]">
            Manage staff members, kitchen crew, delivery partners, customers, and granular RBAC permissions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs"
        >
          <UserPlus size={16} />
          <span>Add User / Onboard Staff</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C]">Total Directory</span>
          <div className="text-2xl font-bold font-mono text-[#1C1917]">{users.length} Users</div>
          <span className="text-[11px] text-emerald-600 font-medium">● Unified RBAC Hub</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C]">Staff & Managers</span>
          <div className="text-2xl font-bold font-mono text-[#B91C1C]">{staffCount} Members</div>
          <span className="text-[11px] text-[#78716C]">Kitchen, Counter & Admin</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C]">Delivery Partners</span>
          <div className="text-2xl font-bold font-mono text-amber-600">{driverCount} Riders</div>
          <span className="text-[11px] text-emerald-600 font-medium">● Active Fleet</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C]">Registered Customers</span>
          <div className="text-2xl font-bold font-mono text-purple-700">{customerCount} Accounts</div>
          <span className="text-[11px] text-[#78716C]">Ordering & Loyalty</span>
        </div>
      </div>

      {/* Tabbed Navigation Bar */}
      <div className="bg-white rounded-2xl border border-[#E7E0D8] shadow-xs p-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { key: 'all', label: `All Users (${users.length})`, icon: Users },
            { key: 'staff', label: `Staff & Team (${staffCount})`, icon: UtensilsCrossed },
            { key: 'driver', label: `Delivery Partners (${driverCount})`, icon: Bike },
            { key: 'customer', label: `Customers (${customerCount})`, icon: UserPlus },
            { key: 'matrix', label: '🛡️ RBAC Permissions Matrix', icon: Shield },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === key
                  ? 'bg-[#1C1917] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FBF9F5]'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        {activeTab !== 'matrix' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
              <input
                type="text"
                placeholder="Search name, email, phone, plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input pl-9 pr-3 py-2 text-xs bg-white text-[#1C1917]"
              />
            </div>

            {activeTab === 'all' && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="admin-input py-2 px-3 text-xs bg-white text-[#1C1917] w-auto font-bold"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="driver">Driver</option>
                <option value="viewer">Viewer</option>
                <option value="customer">Customer</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* TAB CONTENT: RBAC PERMISSIONS MATRIX */}
      {activeTab === 'matrix' ? (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] shadow-xs overflow-hidden space-y-4 p-6">
          <div className="border-b border-[#E7E0D8] pb-4">
            <h3 className="font-serif font-black text-lg text-[#1C1917]">
              Role-Based Access Control (RBAC) Permission Matrix
            </h3>
            <p className="text-xs text-[#78716C] mt-0.5">
              Granular permission matrix defining what actions each user role can perform across Pizza Expert.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FBF9F5] border-b border-[#E7E0D8]">
                  <th className="p-3.5 font-mono uppercase font-bold text-[#78716C]">Permission Module</th>
                  {(['super_admin', 'manager', 'staff', 'driver', 'viewer', 'customer'] as UserRole[]).map((r) => {
                    const def = ROLE_DEFINITIONS[r]
                    return (
                      <th key={r} className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${def.badgeColor} ${def.textColor} border ${def.borderColor}`}>
                          {def.label}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]">
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm.key} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-[#1C1917]">{perm.label}</div>
                      <div className="text-[10px] font-mono text-[#78716C]">{perm.category} • <span className="text-[#B91C1C]">{perm.key}</span></div>
                    </td>
                    {(['super_admin', 'manager', 'staff', 'driver', 'viewer', 'customer'] as UserRole[]).map((r) => {
                      const allowed = hasPermission(r, perm.key)
                      return (
                        <td key={r} className="p-3 text-center">
                          {allowed ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                              <Check size={14} className="stroke-[3]" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 text-stone-300">
                              -
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
      ) : (
        /* TAB CONTENT: USERS DIRECTORY TABLE */
        <div className="bg-white rounded-2xl border border-[#E7E0D8] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#78716C] uppercase font-mono font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3">User & Contact</th>
                  <th className="px-5 py-3">Assigned Role (RBAC)</th>
                  <th className="px-5 py-3">Role Details</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#78716C] italic">
                      No users found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const roleDef = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.customer
                    const isPrimary = isPrimarySuperAdmin(user)
                    const isSuperAdmin = user.role === 'super_admin' || isPrimary
                    return (
                      <tr key={user.id} className={`transition-colors ${isSuperAdmin ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-[#FDFBF7]'}`}>
                        {/* Name & Contact */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs font-serif uppercase shrink-0 shadow-2xs ${
                              isSuperAdmin ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white ring-2 ring-amber-400/50' : 'bg-[#1C1917] text-white'
                            }`}>
                              {user.name.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-[#1C1917] text-sm flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isPrimary ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-200 text-amber-900 border border-amber-400 inline-flex items-center gap-0.5">
                                    <Crown size={10} className="fill-amber-600 text-amber-700" /> Root
                                  </span>
                                ) : user.role === 'super_admin' ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 text-red-900 border border-red-300 inline-flex items-center gap-0.5">
                                    <Crown size={10} className="fill-red-600 text-red-700" /> Super Admin
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[11px] text-[#78716C] flex items-center gap-1.5">
                                <span>{user.email}</span>
                                {user.phone && <span>• {user.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* RBAC Role */}
                        <td className="px-5 py-4">
                          {isSuperAdmin ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-100 via-rose-100 to-amber-100 text-[#78350F] border border-amber-300 flex items-center gap-1 shadow-2xs w-fit">
                              <Crown size={12} className="text-amber-600 fill-amber-500" /> {isPrimary ? 'Primary Super Admin' : 'Super Admin (Locked)'}
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${roleDef.badgeColor} ${roleDef.textColor} border ${roleDef.borderColor}`}>
                              {roleDef.label}
                            </span>
                          )}
                        </td>

                        {/* Specific details */}
                        <td className="px-5 py-4">
                          {isSuperAdmin ? (
                            <div className="text-[11px]">
                              <span className="font-bold text-amber-900">👑 {isPrimary ? 'Root Founder Account' : 'Super Admin Account'}</span>
                              <span className="block text-[10px] font-mono text-emerald-700 font-bold">Immutable Authority</span>
                            </div>
                          ) : user.role === 'driver' ? (
                            <div className="text-[11px]">
                              <span className="font-bold text-[#1C1917]">{user.vehicle_type}</span>
                              <span className="text-[#78716C]"> • {user.vehicle_number || 'No plate'}</span>
                              <span className="block text-[10px] font-mono text-emerald-700 font-bold">
                                KYC: {user.verification_status || 'Verified'}
                              </span>
                            </div>
                          ) : ['super_admin', 'manager', 'staff', 'viewer'].includes(user.role) ? (
                            <div className="text-[11px]">
                              <span className="font-bold text-[#1C1917]">{user.department || 'Operations'}</span>
                              {user.employee_code && (
                                <span className="block text-[10px] font-mono text-[#78716C]">{user.employee_code}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#78716C] text-[11px]">Customer Profile</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {user.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                              Deactivated
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedUser({ ...user })}
                              className="px-3 py-1.5 bg-[#FBF9F5] hover:bg-[#E7E0D8] rounded-lg text-xs font-bold text-[#1C1917] flex items-center gap-1 transition-colors"
                            >
                              <Edit3 size={13} />
                              <span>Manage / RBAC</span>
                            </button>

                            {isSuperAdmin ? (
                              <span
                                className="p-1.5 text-stone-400 bg-stone-100 rounded-lg inline-flex items-center cursor-not-allowed"
                                title="👑 Super Admin profiles are permanently locked and cannot be deleted by anyone."
                              >
                                <Lock size={14} className="text-amber-600" />
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDelete(user)}
                                className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Delete user"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT / INSPECT USER DRAWER & MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-[#E7E0D8] p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <div>
                <h3 className="font-serif font-black text-lg text-[#1C1917] flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[#B91C1C]" />
                  Manage User: {selectedUser.name}
                </h3>
                <span className="text-xs text-[#78716C]">User ID: {selectedUser.id}</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 text-[#78716C] hover:text-[#1C1917]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={selectedUser.name}
                    onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                    className="admin-input text-xs bg-white text-[#1C1917]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#1C1917] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    className="admin-input text-xs bg-white text-[#1C1917]"
                  />
                </div>
              </div>

              {/* Role Selection (RBAC) */}
              <div className="bg-[#FBF9F5] p-4 rounded-2xl border border-[#E7E0D8] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#1C1917] uppercase text-[11px] tracking-wider">
                    Role Assignment (RBAC)
                  </label>
                  {(selectedUser.role === 'super_admin' || isPrimarySuperAdmin(selectedUser)) && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-200 text-amber-900 border border-amber-400 inline-flex items-center gap-1">
                      <Lock size={10} /> Protected Authority
                    </span>
                  )}
                </div>

                {selectedUser.role === 'super_admin' || isPrimarySuperAdmin(selectedUser) ? (
                  <div className="admin-input text-xs bg-stone-100 text-stone-700 font-bold flex items-center justify-between border-amber-300">
                    <span className="flex items-center gap-1.5">
                      <Crown size={14} className="text-amber-600 fill-amber-500" />
                      {isPrimarySuperAdmin(selectedUser) ? 'Primary Super Admin (Root / Founder)' : 'Super Admin (Full Business Control)'}
                    </span>
                    <span className="text-[10px] text-amber-800 font-mono flex items-center gap-1">
                      <Lock size={10} /> Immutable Role
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value as UserRole })}
                    className="admin-input text-xs bg-white text-[#1C1917] font-bold"
                  >
                    <option value="super_admin">👑 Super Admin (Full Business Control)</option>
                    <option value="manager">👔 Store Manager (Orders & Staff Shift)</option>
                    <option value="staff">👨‍🍳 Kitchen & Counter Staff (KDS & Prep)</option>
                    <option value="driver">🛵 Delivery Partner (Rider App & GPS)</option>
                    <option value="viewer">👁️ Auditor / Viewer (Read-Only Reports)</option>
                    <option value="customer">🛍️ Customer Account</option>
                  </select>
                )}

                <p className="text-[11px] text-[#57534E] italic">
                  {selectedUser.role === 'super_admin' || isPrimarySuperAdmin(selectedUser)
                    ? 'Super Admin profiles have full unrestricted control over the business and cannot be demoted or removed by any user.'
                    : ROLE_DEFINITIONS[selectedUser.role]?.description}
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
                        placeholder="e.g. Kitchen (Allapur)"
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
                    Delivery Partner & Vehicle KYC Details
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Vehicle Type</label>
                      <select
                        value={selectedUser.vehicle_type || 'bike'}
                        onChange={(e) => setSelectedUser({ ...selectedUser, vehicle_type: e.target.value })}
                        className="admin-input text-xs bg-white text-[#1C1917]"
                      >
                        <option value="bike">Motorcycle (Hero/Bajaj)</option>
                        <option value="scooter">Scooter (Activa/Jupiter)</option>
                        <option value="ebike">Electric Scooter / EV</option>
                        <option value="bicycle">Bicycle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Vehicle Plate Number</label>
                      <input
                        type="text"
                        placeholder="UP 70 AB 1234"
                        value={selectedUser.vehicle_number || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, vehicle_number: e.target.value })}
                        className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Driving License No.</label>
                      <input
                        type="text"
                        placeholder="UP-70-2024-001234"
                        value={selectedUser.license_number || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, license_number: e.target.value })}
                        className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">KYC Verification Status</label>
                      <select
                        value={selectedUser.verification_status || 'verified'}
                        onChange={(e) => setSelectedUser({ ...selectedUser, verification_status: e.target.value as any })}
                        className="admin-input text-xs bg-white text-[#1C1917] font-bold"
                      >
                        <option value="verified">Verified (Approved)</option>
                        <option value="pending">Pending Document Review</option>
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
                    {selectedUser.role === 'super_admin' || isPrimarySuperAdmin(selectedUser)
                      ? 'Super Admin account is permanently active and locked against deactivation.'
                      : selectedUser.is_active
                      ? 'User can log in and perform assigned role tasks'
                      : 'Account is suspended'}
                  </span>
                </div>
                {selectedUser.role === 'super_admin' || isPrimarySuperAdmin(selectedUser) ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-600 text-white flex items-center gap-1">
                    <Lock size={12} /> ACTIVE (LOCKED)
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
                {!(selectedUser.role === 'super_admin' || isPrimarySuperAdmin(selectedUser)) ? (
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
                    <Lock size={12} className="text-amber-600" /> Super Admin Profile Locked
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
                    <span>Save RBAC Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW USER / ONBOARD TEAM MEMBER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-[#E7E0D8] p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <div>
                <h3 className="font-serif font-black text-lg text-[#1C1917] flex items-center gap-2">
                  <UserPlus size={20} className="text-[#B91C1C]" />
                  Add User / Onboard Team Member
                </h3>
                <span className="text-xs text-[#78716C]">
                  Configure account credentials and assigned RBAC permissions
                </span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#78716C] hover:text-[#1C1917]"
              >
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
                    placeholder="e.g. Ramesh Singh"
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
                    placeholder="ramesh@pizzaexpert.in"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="admin-input text-xs bg-white text-[#1C1917]"
                  />
                </div>
              </div>

              {/* Role Selection */}
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
                  <option value="driver">🛵 Delivery Partner (Rider App & GPS Dispatch)</option>
                  <option value="viewer">👁️ Auditor / Viewer (Read-Only Reports)</option>
                </select>
                <p className="text-[11px] text-[#57534E]">
                  {ROLE_DEFINITIONS[newUserData.role]?.description}
                </p>
              </div>

              {/* If Staff / Manager */}
              {['super_admin', 'manager', 'staff', 'viewer'].includes(newUserData.role) && (
                <div className="grid grid-cols-2 gap-3 bg-[#FBF9F5] p-4 rounded-2xl border border-[#E7E0D8]">
                  <div>
                    <label className="block font-semibold text-[#78716C] mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="Kitchen Operations"
                      value={newUserData.department}
                      onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                      className="admin-input text-xs bg-white text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#78716C] mb-1">Employee Code</label>
                    <input
                      type="text"
                      placeholder="EMP-025"
                      value={newUserData.employee_code}
                      onChange={(e) => setNewUserData({ ...newUserData, employee_code: e.target.value })}
                      className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                    />
                  </div>
                </div>
              )}

              {/* If Driver */}
              {newUserData.role === 'driver' && (
                <div className="space-y-3 bg-[#FBF9F5] p-4 rounded-2xl border border-[#E7E0D8]">
                  <span className="font-bold text-[#1C1917] text-[11px] uppercase tracking-wider block">
                    Driver Vehicle & KYC Details
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Vehicle Type</label>
                      <select
                        value={newUserData.vehicle_type}
                        onChange={(e) => setNewUserData({ ...newUserData, vehicle_type: e.target.value })}
                        className="admin-input text-xs bg-white text-[#1C1917]"
                      >
                        <option value="bike">Motorcycle</option>
                        <option value="scooter">Scooter</option>
                        <option value="ebike">EV Scooter</option>
                        <option value="bicycle">Bicycle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Number Plate</label>
                      <input
                        type="text"
                        placeholder="UP 70 AB 1234"
                        value={newUserData.vehicle_number}
                        onChange={(e) => setNewUserData({ ...newUserData, vehicle_number: e.target.value.toUpperCase() })}
                        className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#78716C] mb-1">Driving License No.</label>
                      <input
                        type="text"
                        placeholder="UP-70-2024-0012"
                        value={newUserData.license_number}
                        onChange={(e) => setNewUserData({ ...newUserData, license_number: e.target.value.toUpperCase() })}
                        className="admin-input text-xs font-mono bg-white text-[#1C1917]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7E0D8]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E0D8] font-bold text-[#57534E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  {isCreating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  <span>Create & Onboard Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
