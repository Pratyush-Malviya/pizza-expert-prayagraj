'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  MapPin, Plus, Trash2, Edit2, Loader2, Home, Briefcase, Star,
  Building2, CheckCircle2, Lock, LocateFixed, Phone, Landmark,
  X, AlertTriangle
} from 'lucide-react'
import LiveLocationButton from '@/components/shared/LiveLocationButton'
import SaveLocationModal from '@/components/shared/SaveLocationModal'
import type { ReverseGeocodeResult } from '@/lib/utils/reverseGeocode'
import type { Address } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AddressType = 'home' | 'work' | 'partner' | 'hotel' | 'other'

const TYPE_META: Record<AddressType, { icon: React.ReactNode; color: string; bg: string }> = {
  home:    { icon: <Home size={14} />,      color: 'text-[#B91C1C]', bg: 'bg-[#FEF2F2]' },
  work:    { icon: <Briefcase size={14} />, color: 'text-blue-600',  bg: 'bg-blue-50'   },
  partner: { icon: <Star size={14} />,      color: 'text-amber-600', bg: 'bg-amber-50'  },
  hotel:   { icon: <Building2 size={14} />, color: 'text-purple-600',bg: 'bg-purple-50' },
  other:   { icon: <MapPin size={14} />,    color: 'text-[#57534E]', bg: 'bg-[#F5F5F4]' },
}

const ADDRESS_TYPES: { value: AddressType; label: string }[] = [
  { value: 'home',    label: 'Home'    },
  { value: 'work',    label: 'Work'    },
  { value: 'partner', label: 'Partner' },
  { value: 'hotel',   label: 'Hotel'   },
  { value: 'other',   label: 'Other'   },
]

function getTypeMeta(type?: string) {
  return TYPE_META[(type as AddressType) || 'other'] ?? TYPE_META.other
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({
  address,
  onConfirm,
  onCancel,
}: {
  address: Address
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
          <Trash2 size={22} className="text-[#B91C1C]" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-[#1C1917] text-base">Delete address?</h3>
          <p className="text-sm text-[#57534E] mt-1">
            <span className="font-semibold">{address.label}</span> — {address.line1}, {address.city}
          </p>
          <p className="text-xs text-[#A8A29E] mt-1">This cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-[#57534E] border border-[#E7E0D8] rounded-xl hover:bg-[#F5F5F4] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Address Modal ───────────────────────────────────────────────────────

function EditAddressModal({
  address,
  onSave,
  onClose,
}: {
  address: Address
  onSave: (updated: Address) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    label: address.label,
    line1: address.line1,
    line2: address.line2 || '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    landmark: address.landmark || '',
    phone: address.phone || '',
    address_type: (address.address_type || 'other') as AddressType,
  })
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Sync label when type changes
  const handleTypeChange = (type: AddressType) => {
    const meta = ADDRESS_TYPES.find((t) => t.value === type)
    setForm((f) => ({ ...f, address_type: type, label: meta?.label || f.label }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('addresses')
        .update({
          label: form.label,
          line1: form.line1,
          line2: form.line2 || null,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          landmark: form.landmark || null,
          phone: form.phone || null,
          address_type: form.address_type,
        })
        .eq('id', address.id)
        .select()
        .single()

      if (error) throw error
      onSave(data)
      toast.success('Address updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update address')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4EFEA]">
          <h2 className="font-bold text-[#1C1917]">Edit Address</h2>
          <button onClick={onClose} className="text-[#A8A29E] hover:text-[#1C1917] transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Type Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] uppercase tracking-wider mb-2">
              Address Type
            </label>
            <div className="flex flex-wrap gap-2">
              {ADDRESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.address_type === type.value
                      ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                      : 'bg-white text-[#57534E] border-[#E7E0D8] hover:border-[#B91C1C] hover:text-[#B91C1C]'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
                className="input-field-light text-black font-semibold text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Pincode</label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => set('pincode', e.target.value)}
                maxLength={6}
                className="input-field-light text-black font-semibold text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">Address Line 1 *</label>
            <input
              type="text"
              required
              value={form.line1}
              onChange={(e) => set('line1', e.target.value)}
              className="input-field-light text-black font-semibold text-sm"
              placeholder="House / Flat / Building / Street"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">Address Line 2</label>
            <input
              type="text"
              value={form.line2}
              onChange={(e) => set('line2', e.target.value)}
              className="input-field-light text-black font-semibold text-sm"
              placeholder="Locality / Area / Colony"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">City</label>
              <input type="text" required value={form.city} onChange={(e) => set('city', e.target.value)}
                className="input-field-light text-black font-semibold text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">State</label>
              <input type="text" required value={form.state} onChange={(e) => set('state', e.target.value)}
                className="input-field-light text-black font-semibold text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">Landmark (optional)</label>
            <input type="text" value={form.landmark} onChange={(e) => set('landmark', e.target.value)}
              placeholder="Near station, etc."
              className="input-field-light text-black font-semibold text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">Alternate Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className="input-field-light text-black font-semibold text-sm" />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 pb-5 pt-4 border-t border-[#F4EFEA] flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn btn-primary rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Changes'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Address Panel ────────────────────────────────────────────────────────

function AddAddressPanel({
  userId,
  onSaved,
  onCancel,
}: {
  userId: string
  onSaved: (address: Address) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    label: 'Home',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    phone: '',
    address_type: 'home' as AddressType,
    is_default: false,
  })
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof form, value: any) => setForm((f) => ({ ...f, [key]: value }))

  const handleTypeChange = (type: AddressType) => {
    const meta = ADDRESS_TYPES.find((t) => t.value === type)
    setForm((f) => ({ ...f, address_type: type, label: meta?.label || f.label }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = user?.id || userId

      if (!targetUserId) {
        throw new Error('Please log in to add addresses.')
      }

      if (form.is_default) {
        await supabase.from('addresses').update({ is_default: false }).eq('user_id', targetUserId)
      }
      const { data, error } = await supabase
        .from('addresses')
        .insert({ user_id: targetUserId, ...form, line2: form.line2 || null, landmark: form.landmark || null, phone: form.phone || null })
        .select()
        .single()

      if (error) throw error
      onSaved(data)
      toast.success('Address added')
    } catch (err: any) {
      toast.error(err.message || 'Failed to add address')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-2xl p-5 space-y-4">
      <h3 className="font-bold text-[#1C1917] text-sm uppercase tracking-wider">New Address</h3>

      {/* Type Picker */}
      <div>
        <label className="block text-xs font-semibold text-[#A8A29E] uppercase tracking-wider mb-2">Address Type</label>
        <div className="flex flex-wrap gap-2">
          {ADDRESS_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleTypeChange(type.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                form.address_type === type.value
                  ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                  : 'bg-white text-[#57534E] border-[#E7E0D8] hover:border-[#B91C1C] hover:text-[#B91C1C]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">Label</label>
            <input type="text" value={form.label} onChange={(e) => set('label', e.target.value)}
              className="input-field-light text-black font-semibold text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">Pincode</label>
            <input type="text" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} maxLength={6}
              className="input-field-light text-black font-semibold text-sm font-mono" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1C1917] mb-1">Address Line 1 *</label>
          <input type="text" required value={form.line1} onChange={(e) => set('line1', e.target.value)}
            placeholder="House / Flat / Building / Street"
            className="input-field-light text-black font-semibold text-sm" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1C1917] mb-1">Address Line 2</label>
          <input type="text" value={form.line2} onChange={(e) => set('line2', e.target.value)}
            placeholder="Locality / Colony (optional)"
            className="input-field-light text-black font-semibold text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">City</label>
            <input type="text" required value={form.city} onChange={(e) => set('city', e.target.value)}
              className="input-field-light text-black font-semibold text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">State</label>
            <input type="text" required value={form.state} onChange={(e) => set('state', e.target.value)}
              className="input-field-light text-black font-semibold text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1C1917] mb-1">Landmark (optional)</label>
          <input type="text" value={form.landmark} onChange={(e) => set('landmark', e.target.value)}
            placeholder="Near station, temple, etc."
            className="input-field-light text-black font-semibold text-sm" />
        </div>

        {/* Set as primary toggle */}
        <label className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl border border-[#E7E0D8] hover:border-[#B91C1C] transition-colors">
          <div className="relative flex-shrink-0">
            <input type="checkbox" checked={form.is_default} onChange={(e) => set('is_default', e.target.checked)} className="sr-only" />
            <div className={`w-10 h-5 rounded-full transition-colors ${form.is_default ? 'bg-[#B91C1C]' : 'bg-[#E7E0D8]'}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_default ? 'translate-x-5' : ''}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1C1917]">Set as primary delivery address</p>
            <p className="text-xs text-[#A8A29E]">Orders delivered here by default</p>
          </div>
        </label>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="btn btn-primary rounded-xl py-2.5 px-6 text-xs uppercase tracking-wider font-bold flex items-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Address'}
          </button>
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-[#A8A29E] hover:text-[#1C1917]">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Address Card ─────────────────────────────────────────────────────────────

function AddressCard({
  address,
  onSetDefault,
  onEdit,
  onDelete,
}: {
  address: Address
  onSetDefault: (id: string) => void
  onEdit: (address: Address) => void
  onDelete: (address: Address) => void
}) {
  const meta = getTypeMeta(address.address_type)

  return (
    <div
      className={`relative rounded-2xl border p-4 transition-all ${
        address.is_default
          ? 'border-[#B91C1C] bg-[#FEF2F2]/60 shadow-sm'
          : 'border-[#E7E0D8] bg-white hover:border-[#BFBAB5]'
      }`}
    >
      {/* Primary badge */}
      {address.is_default && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-[#B91C1C] bg-white border border-[#FECACA] px-2 py-0.5 rounded-full shadow-xs">
          <CheckCircle2 size={10} />
          Primary
        </div>
      )}

      {/* GPS badge */}
      {address.is_gps_captured && (
        <div className="absolute bottom-3 right-3">
          <div title="GPS captured" className="w-5 h-5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-full flex items-center justify-center">
            <LocateFixed size={11} className="text-[#16A34A]" />
          </div>
        </div>
      )}

      {/* Header: type icon + label */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg} ${meta.color}`}>
          {meta.icon}
        </div>
        <h4 className="font-bold text-[#1C1917] text-sm uppercase tracking-wide">{address.label}</h4>
      </div>

      {/* Address lines */}
      <div className="text-sm text-[#57534E] space-y-0.5 mb-1">
        <p className="font-medium">{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>{address.city}, {address.state} {address.pincode}</p>
        {address.landmark && (
          <p className="text-xs text-[#A8A29E] flex items-center gap-1 mt-1">
            <Landmark size={11} />
            {address.landmark}
          </p>
        )}
        {address.phone && (
          <p className="text-xs text-[#A8A29E] flex items-center gap-1">
            <Phone size={11} />
            {address.phone}
          </p>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-3 pt-3 mt-1 border-t border-[#F4EFEA]">
        {!address.is_default && (
          <button
            onClick={() => onSetDefault(address.id)}
            className="text-xs font-bold text-[#57534E] hover:text-[#B91C1C] transition-colors flex items-center gap-1"
            id={`set-primary-${address.id}`}
          >
            Set as Primary
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onEdit(address)}
          className="text-[#A8A29E] hover:text-[#1C1917] transition-colors p-1"
          aria-label="Edit address"
          id={`edit-addr-${address.id}`}
        >
          <Edit2 size={15} />
        </button>
        <button
          onClick={() => onDelete(address)}
          className="text-[#A8A29E] hover:text-[#B91C1C] transition-colors p-1"
          aria-label="Delete address"
          id={`delete-addr-${address.id}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AddressesClient({
  initialAddresses,
  userId,
}: {
  initialAddresses: Address[]
  userId: string
}) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses)
  const [isAdding, setIsAdding] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null)

  // GPS / Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsGeocode, setGpsGeocode] = useState<ReverseGeocodeResult | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSetDefault = useCallback(async (id: string) => {
    try {
      const supabase = createClient()
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
      const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id)
      if (error) throw error
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
            .sort((a, b) => (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1))
      )
      toast.success('Primary address updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update primary address')
    }
  }, [userId])

  const handleDelete = useCallback(async () => {
    if (!deletingAddress) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('addresses').delete().eq('id', deletingAddress.id)
      if (error) throw error
      setAddresses((prev) => prev.filter((a) => a.id !== deletingAddress.id))
      toast.success('Address deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete address')
    } finally {
      setDeletingAddress(null)
    }
  }, [deletingAddress])

  const handleGpsDetected = useCallback((
    coords: { lat: number; lng: number },
    geocode: ReverseGeocodeResult
  ) => {
    setGpsCoords(coords)
    setGpsGeocode(geocode)
    setGpsError(null)
    setShowSaveModal(true)
  }, [])

  const handleAddressSaved = useCallback((newAddr: Address) => {
    setAddresses((prev) => {
      const updated = newAddr.is_default
        ? prev.map((a) => ({ ...a, is_default: false }))
        : [...prev]
      return [newAddr, ...updated.filter((a) => a.id !== newAddr.id)]
        .sort((a, b) => (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1))
    })
    setShowSaveModal(false)
    setIsAdding(false)
    toast.success('Address saved!')
  }, [])

  const handleEditSaved = useCallback((updated: Address) => {
    setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setEditingAddress(null)
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── Live Location Bar ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-[#FEF2F2] to-[#FFF7ED] border border-[#FECACA] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <LocateFixed size={18} className="text-[#B91C1C]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1C1917]">Use current location</p>
            <p className="text-xs text-[#A8A29E]">Auto-detect & save your GPS position as an address</p>
          </div>
        </div>
        <div className="space-y-1">
          <LiveLocationButton
            onLocationDetected={handleGpsDetected}
            onError={setGpsError}
            variant="default"
            label="Detect My Location"
            id="addresses-gps-btn"
            className="text-xs py-2 px-4"
          />
          {gpsError && (
            <p className="text-[11px] text-[#B91C1C] flex items-center gap-1">
              <AlertTriangle size={11} />
              {gpsError}
            </p>
          )}
        </div>
      </div>

      {/* ─── Address Grid ───────────────────────────────────────────────── */}
      {addresses.length === 0 && !isAdding ? (
        <div className="text-center py-14 border border-dashed border-[#E7E0D8] rounded-2xl bg-[#FBF9F5]">
          <div className="w-14 h-14 bg-[#FEF2F2] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MapPin size={26} className="text-[#B91C1C]" />
          </div>
          <h3 className="font-bold text-[#1C1917] mb-1">No saved addresses</h3>
          <p className="text-sm text-[#A8A29E] mb-5">Add an address for faster checkout.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="btn btn-primary rounded-xl text-xs uppercase tracking-wider font-bold px-6"
            id="add-first-address-btn"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onSetDefault={handleSetDefault}
              onEdit={setEditingAddress}
              onDelete={setDeletingAddress}
            />
          ))}

          {/* Add new card */}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="border-2 border-dashed border-[#E7E0D8] rounded-2xl flex flex-col items-center justify-center p-6 text-[#A8A29E] hover:text-[#1C1917] hover:border-[#B91C1C] hover:bg-[#FEF2F2]/30 transition-all duration-200 min-h-[160px] group"
              id="add-new-address-card"
            >
              <div className="w-10 h-10 border-2 border-dashed border-current rounded-xl flex items-center justify-center mb-2 group-hover:border-[#B91C1C] group-hover:bg-[#FEF2F2] transition-all">
                <Plus size={20} className="group-hover:text-[#B91C1C]" />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Add New Address</span>
            </button>
          )}
        </div>
      )}

      {/* ─── Add Address Form ────────────────────────────────────────────── */}
      {isAdding && (
        <AddAddressPanel
          userId={userId}
          onSaved={handleAddressSaved}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* ─── Primary address info note ───────────────────────────────────── */}
      {addresses.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-[#A8A29E] bg-[#F5F5F4] rounded-xl px-3 py-2.5 border border-[#E7E0D8]">
          <Lock size={12} className="flex-shrink-0 mt-0.5" />
          <p>
            Your <strong>primary address</strong> is pre-selected at checkout. Once an order is placed, the delivery address cannot be changed.
            To update a delivery address for an active order, please{' '}
            <a href="/contact" className="text-[#B91C1C] font-semibold hover:underline">contact support</a>.
          </p>
        </div>
      )}

      {/* ─── Modals ──────────────────────────────────────────────────────── */}
      {editingAddress && (
        <EditAddressModal
          address={editingAddress}
          onSave={handleEditSaved}
          onClose={() => setEditingAddress(null)}
        />
      )}

      {deletingAddress && (
        <DeleteConfirmDialog
          address={deletingAddress}
          onConfirm={handleDelete}
          onCancel={() => setDeletingAddress(null)}
        />
      )}

      <SaveLocationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        geocodeResult={gpsGeocode}
        coords={gpsCoords}
        userId={userId}
        onSaved={handleAddressSaved}
      />
    </div>
  )
}
