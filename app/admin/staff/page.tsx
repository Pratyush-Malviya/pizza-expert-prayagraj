'use client'

import { useState, useEffect } from 'react'
import { User, Calendar, Clock, Plus, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StaffShift } from '@/types'

const MOCK_SHIFTS: StaffShift[] = [
  { id: '1', profile_id: 'p1', role: 'Head Chef', shift_start: '2026-08-10T10:00:00Z', shift_end: '2026-08-10T18:00:00Z', checked_in_at: '2026-08-10T09:55:00Z', checked_out_at: null, notes: 'Morning Shift', created_at: '' },
  { id: '2', profile_id: 'p2', role: 'Kitchen Staff', shift_start: '2026-08-10T14:00:00Z', shift_end: '2026-08-10T22:00:00Z', checked_in_at: null, checked_out_at: null, notes: 'Evening Shift', created_at: '' },
]

export default function AdminStaffPage() {
  const [shifts, setShifts] = useState<StaffShift[]>(MOCK_SHIFTS)
  const [loading, setLoading] = useState(false)
  const [showAddShiftModal, setShowAddShiftModal] = useState(false)
  const [role, setRole] = useState('Kitchen Staff')
  const [notes, setNotes] = useState('')

  const fetchShifts = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('staff_shifts').select('*, profile:profiles(name)').order('shift_start', { ascending: false })
      if (data && data.length > 0) setShifts(data)
    } catch (err) {
      console.warn('Shifts fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShifts()
  }, [])

  const handleCreateShift = async () => {
    const created: StaffShift = {
      id: String(Date.now()),
      profile_id: 'p1',
      role,
      shift_start: new Date().toISOString(),
      shift_end: new Date(Date.now() + 8 * 3600000).toISOString(),
      checked_in_at: null,
      checked_out_at: null,
      notes,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = createClient()
      await supabase.from('staff_shifts').insert({
        profile_id: 'p1',
        role,
        shift_start: created.shift_start,
        shift_end: created.shift_end,
        notes,
      })
    } catch {}

    setShifts(prev => [...prev, created])
    setShowAddShiftModal(false)
    setNotes('')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] flex items-center gap-2">
            <User className="text-[#B91C1C]" size={26} />
            Staff Shift Planner & Attendance Log
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Manage kitchen station rosters, shift schedules, and check-in attendance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddShiftModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus size={16} />
            Schedule Shift
          </button>
          <button
            onClick={fetchShifts}
            disabled={loading}
            className="p-2 rounded-lg border border-[#E7E0D8] bg-white text-[#44403C] hover:bg-[#F5F2EC] transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F5F2EC] text-[#78716C] font-semibold uppercase text-[11px] border-b border-[#E7E0D8]">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Shift Schedule</th>
                <th className="py-3 px-4">Check-In Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8]">
              {shifts.map(s => (
                <tr key={s.id} className="hover:bg-[#FDFBF7] transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#1C1917]">{s.profile?.name || 'Staff Member'}</td>
                  <td className="py-3 px-4 font-medium text-[#B91C1C]">{s.role}</td>
                  <td className="py-3 px-4 text-[#78716C]">
                    {new Date(s.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(s.shift_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    {s.checked_in_at ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#16A34A]">
                        <CheckCircle2 size={12} /> Checked In ({new Date(s.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#D97706]">
                        <Clock size={12} /> Pending Check-In
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddShiftModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-[#E7E0D8]">
            <h3 className="text-base font-serif font-bold text-[#1C1917]">Schedule Staff Shift</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8]">
                  <option value="Head Chef">Head Chef</option>
                  <option value="Kitchen Staff">Kitchen Staff</option>
                  <option value="Delivery Dispatcher">Delivery Dispatcher</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Morning Oven Duty" className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddShiftModal(false)} className="px-4 py-2 text-xs font-semibold text-[#78716C]">Cancel</button>
              <button onClick={handleCreateShift} className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg">Create Shift</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
