'use client'

import { useState } from 'react'
import { inviteDriver, verifyDriver, rejectDriver, toggleDriverOnline } from '@/app/actions/drivers'
import { toast } from 'sonner'
import {
  Truck, UserPlus, ShieldCheck, Clock, CheckCircle2, XCircle,
  Phone, User, Loader2, Ban, Eye, FileText, Bike, AlertCircle, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DriverRow {
  id: string
  name: string
  phone: string | null
  is_active: boolean
  invite_status?: string | null
  created_at: string
  vehicle_type: string
  vehicle_number: string | null
  license_number: string | null
  verification_status: 'pending' | 'verified' | 'rejected'
  rejection_reason?: string | null
  is_online: boolean
}

export default function DriversClient({ initialDrivers }: { initialDrivers: DriverRow[] }) {
  const [drivers, setDrivers] = useState<DriverRow[]>(initialDrivers)
  const [isInviting, setIsInviting] = useState(false)
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)

  // Verification modal state
  const [selectedDriver, setSelectedDriver] = useState<DriverRow | null>(null)
  const [rejectionReasonInput, setRejectionReasonInput] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  async function handleInviteSubmit(formData: FormData) {
    setIsInviting(true)
    const result = await inviteDriver(formData)
    setIsInviting(false)

    if (result.success) {
      toast.success('Driver invited successfully!')
      window.location.reload()
    } else {
      toast.error(result.error || 'Failed to invite driver')
    }
  }

  async function handleVerify(driverId: string) {
    setLoadingActionId(driverId)
    const result = await verifyDriver(driverId)
    setLoadingActionId(null)

    if (result.success) {
      toast.success('Driver account verified!')
      setDrivers(drivers.map(d => d.id === driverId ? { ...d, verification_status: 'verified', rejection_reason: null } : d))
      if (selectedDriver?.id === driverId) {
        setSelectedDriver({ ...selectedDriver, verification_status: 'verified', rejection_reason: null })
      }
    } else {
      toast.error(result.error || 'Verification failed')
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDriver) return
    setLoadingActionId(selectedDriver.id)
    const result = await rejectDriver(selectedDriver.id, rejectionReasonInput)
    setLoadingActionId(null)

    if (result.success) {
      toast.success('Driver document application rejected')
      setDrivers(drivers.map(d => d.id === selectedDriver.id ? { ...d, verification_status: 'rejected', rejection_reason: rejectionReasonInput } : d))
      setSelectedDriver({ ...selectedDriver, verification_status: 'rejected', rejection_reason: rejectionReasonInput })
      setShowRejectForm(false)
    } else {
      toast.error(result.error || 'Rejection failed')
    }
  }

  async function handleToggleOnline(driver: DriverRow) {
    setLoadingActionId(driver.id)
    const result = await toggleDriverOnline(driver.id, driver.is_online)
    setLoadingActionId(null)

    if (result.success) {
      toast.success(result.is_online ? 'Driver is now Online' : 'Driver is now Offline')
      setDrivers(drivers.map(d => d.id === driver.id ? { ...d, is_online: result.is_online! } : d))
    } else {
      toast.error(result.error || 'Failed to update online status')
    }
  }

  const onlineCount = drivers.filter(d => d.is_online).length
  const pendingVerificationCount = drivers.filter(d => d.verification_status === 'pending').length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Driver List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Fleet KPI Banner */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-xl border border-[#E7E0D8] shadow-xs">
            <span className="text-[11px] font-semibold text-[#A8A29E] uppercase">Total Fleet</span>
            <p className="text-xl font-extrabold text-[#1C1917] mt-0.5">{drivers.length} Drivers</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E7E0D8] shadow-xs">
            <span className="text-[11px] font-semibold text-[#15803D] uppercase flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse" /> Online Now
            </span>
            <p className="text-xl font-extrabold text-[#15803D] mt-0.5">{onlineCount} Active</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E7E0D8] shadow-xs">
            <span className="text-[11px] font-semibold text-[#D97706] uppercase">Pending KYC</span>
            <p className="text-xl font-extrabold text-[#D97706] mt-0.5">{pendingVerificationCount} Require Review</p>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="bg-white rounded-xl shadow-xs border border-[#E7E0D8] overflow-hidden">
          <div className="p-4 border-b border-[#E7E0D8] bg-[#FBF9F5] flex justify-between items-center">
            <h2 className="font-semibold text-[#1C1917] flex items-center gap-2">
              <Truck size={18} className="text-[#B91C1C]" /> Delivery Driver Roster
            </h2>
          </div>

          <div className="divide-y divide-[#E7E0D8]">
            {drivers.length === 0 ? (
              <div className="p-8 text-center text-[#A8A29E] text-sm">
                No delivery drivers found in fleet.
              </div>
            ) : (
              drivers.map((driver) => (
                <div key={driver.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FBF9F5]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#18181B] text-white flex items-center justify-center font-bold font-serif uppercase shrink-0">
                      {(driver.name || 'D').slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1C1917]">{driver.name || 'Unnamed Driver'}</span>
                        
                        {/* Online Badge */}
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full uppercase flex items-center gap-1",
                          driver.is_online ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F5F5F4] text-[#78716C]"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", driver.is_online ? "bg-[#166534]" : "bg-[#A8A29E]")} />
                          {driver.is_online ? 'Online' : 'Offline'}
                        </span>

                        {/* Verification Badge */}
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full uppercase",
                          driver.verification_status === 'verified' && "bg-[#DCFCE7] text-[#166534]",
                          driver.verification_status === 'pending' && "bg-[#FEF3C7] text-[#92400E]",
                          driver.verification_status === 'rejected' && "bg-[#FEE2E2] text-[#991B1B]"
                        )}>
                          {driver.verification_status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#A8A29E] mt-1">
                        <span className="capitalize font-medium text-[#57534E] flex items-center gap-1">
                          <Bike size={12} /> {driver.vehicle_type} {driver.vehicle_number ? `(${driver.vehicle_number})` : ''}
                        </span>
                        {driver.license_number && (
                          <span>Lic: <strong className="font-mono text-[#57534E]">{driver.license_number}</strong></span>
                        )}
                        {driver.phone && (
                          <span>Ph: {driver.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setSelectedDriver(driver)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#E7E0D8] text-xs font-bold text-[#57534E] hover:bg-[#F4EFEA] flex items-center gap-1"
                    >
                      <Eye size={14} /> Review KYC
                    </button>

                    <button
                      onClick={() => handleToggleOnline(driver)}
                      disabled={loadingActionId === driver.id}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                        driver.is_online
                          ? "border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2]"
                          : "border-[#86EFAC] text-[#15803D] hover:bg-[#F0FDF4]"
                      )}
                    >
                      {loadingActionId === driver.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : driver.is_online ? (
                        'Set Offline'
                      ) : (
                        'Set Online'
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Invite Driver Form */}
      <div className="bg-white rounded-xl shadow-xs border border-[#E7E0D8] p-5 h-fit sticky top-20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#B91C1C]">
            <UserPlus size={16} />
          </div>
          <h2 className="font-bold text-[#1C1917]">Onboard New Driver</h2>
        </div>

        <form action={handleInviteSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Driver Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="text"
                name="name"
                required
                className="w-full pl-9 pr-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
                placeholder="e.g. Vikram Singh"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
              placeholder="vikram.driver@pizzaexpert.in"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Vehicle Type</label>
            <select
              name="vehicle_type"
              defaultValue="bike"
              className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm bg-white focus:outline-none focus:border-[#B91C1C]"
            >
              <option value="bike">Motorcycle / Bike</option>
              <option value="scooter">Scooter / Moped</option>
              <option value="ebike">E-Bike / EV</option>
              <option value="car">Four Wheeler / Car</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Vehicle Number Plate</label>
            <input
              type="text"
              name="vehicle_number"
              className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
              placeholder="UP70 AB 1234"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] mb-1">Driving License Number</label>
            <input
              type="text"
              name="license_number"
              className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
              placeholder="UP-70-2024-0012345"
            />
          </div>

          <button
            type="submit"
            disabled={isInviting}
            className="w-full bg-[#B91C1C] hover:bg-[#991B1B] text-white py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isInviting ? (
              <><Loader2 size={16} className="animate-spin" /> Onboarding...</>
            ) : (
              <><UserPlus size={16} /> Send Onboarding Invite</>
            )}
          </button>
        </form>
      </div>

      {/* KYC Verification Drawer / Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E7E0D8] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-bold text-[#1C1917] flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#15803D]" /> Driver KYC Verification
              </h3>
              <button onClick={() => setSelectedDriver(null)} className="text-[#A8A29E] hover:text-[#1C1917]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#FBF9F5] p-3 rounded-xl border border-[#E7E0D8] space-y-1.5">
                <p><strong>Driver Name:</strong> {selectedDriver.name}</p>
                <p><strong>Phone:</strong> {selectedDriver.phone || 'N/A'}</p>
                <p><strong>Vehicle:</strong> {selectedDriver.vehicle_type} ({selectedDriver.vehicle_number || 'No plate recorded'})</p>
                <p><strong>Driving License:</strong> <span className="font-mono">{selectedDriver.license_number || 'Pending document upload'}</span></p>
                <p>
                  <strong>Verification Status:</strong>{' '}
                  <span className="uppercase font-bold text-[#B91C1C]">{selectedDriver.verification_status}</span>
                </p>
                {selectedDriver.rejection_reason && (
                  <p className="text-[#991B1B]"><strong>Rejection Reason:</strong> {selectedDriver.rejection_reason}</p>
                )}
              </div>

              {!showRejectForm ? (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleVerify(selectedDriver.id)}
                    disabled={loadingActionId === selectedDriver.id}
                    className="flex-1 bg-[#15803D] hover:bg-[#166534] text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    {loadingActionId === selectedDriver.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <><CheckCircle2 size={15} /> Approve & Verify</>
                    )}
                  </button>

                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={15} /> Reject KYC
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRejectSubmit} className="space-y-3 pt-2">
                  <div>
                    <label className="block font-semibold text-[#A8A29E] mb-1">Reason for Rejection</label>
                    <textarea
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      required
                      placeholder="e.g. Expired driving license or unclear document photo"
                      className="w-full p-2 border border-[#E7E0D8] rounded-lg text-xs focus:outline-none focus:border-[#B91C1C]"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="px-3 py-1.5 rounded-lg border border-[#E7E0D8] text-xs font-bold text-[#57534E]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loadingActionId === selectedDriver.id}
                      className="px-3 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-bold flex items-center gap-1"
                    >
                      {loadingActionId === selectedDriver.id && <Loader2 size={13} className="animate-spin" />} Confirm Rejection
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
