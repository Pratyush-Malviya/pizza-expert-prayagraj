'use client'

import { useState, useEffect } from 'react'
import { X, Home, Briefcase, Star, Building2, MapPin, Phone, Landmark, CheckCircle2, Loader2 } from 'lucide-react'
import type { ReverseGeocodeResult } from '@/lib/utils/reverseGeocode'

export type AddressType = 'home' | 'work' | 'partner' | 'hotel' | 'other'

interface SaveLocationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Pre-filled from reverse geocode */
  geocodeResult: ReverseGeocodeResult | null
  coords: { lat: number; lng: number } | null
  userId: string
  /** Called after address is saved to Supabase */
  onSaved: (newAddress: any) => void
}

const ADDRESS_TYPES: { value: AddressType; label: string; icon: React.ReactNode }[] = [
  { value: 'home',    label: 'Home',    icon: <Home size={16} /> },
  { value: 'work',    label: 'Work',    icon: <Briefcase size={16} /> },
  { value: 'partner', label: 'Partner', icon: <Star size={16} /> },
  { value: 'hotel',   label: 'Hotel',   icon: <Building2 size={16} /> },
  { value: 'other',   label: 'Other',   icon: <MapPin size={16} /> },
]

/**
 * SaveLocationModal
 * 
 * Modal shown after GPS capture. Displays editable address fields
 * pre-filled from Nominatim reverse geocode, with address type selector,
 * landmark, phone, and "set as primary" toggle.
 */
export default function SaveLocationModal({
  isOpen,
  onClose,
  geocodeResult,
  coords,
  userId,
  onSaved,
}: SaveLocationModalProps) {
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

  // Pre-fill form when geocode result arrives or modal opens
  useEffect(() => {
    if (!geocodeResult || !isOpen) return
    setForm((f) => ({
      ...f,
      line1: geocodeResult.line1 || geocodeResult.displayName || '',
      line2: geocodeResult.line2 || '',
      city: geocodeResult.city || '',
      state: geocodeResult.state || '',
      pincode: geocodeResult.pincode || '',
    }))
  }, [geocodeResult, isOpen])

  // Sync label with address_type
  useEffect(() => {
    const type = ADDRESS_TYPES.find((t) => t.value === form.address_type)
    if (type) setForm((f) => ({ ...f, label: type.label }))
  }, [form.address_type])

  const set = (key: keyof typeof form, value: any) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.line1.trim()) return

    setSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = user?.id || userId

      if (!targetUserId) {
        throw new Error('Please log in to save this address to your account.')
      }

      // If setting as default, clear existing defaults first
      if (form.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', targetUserId)
      }

      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: targetUserId,
          label: form.label,
          line1: form.line1,
          line2: form.line2 || null,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          landmark: form.landmark || null,
          phone: form.phone || null,
          address_type: form.address_type,
          is_default: form.is_default,
          is_gps_captured: true,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        })
        .select()
        .single()

      if (error) throw error

      onSaved(data)
      onClose()
    } catch (err: any) {
      const { toast } = await import('sonner')
      toast.error(err.message || 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Save location as address"
    >
      {/* Panel */}
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4EFEA]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FEF2F2] rounded-lg flex items-center justify-center">
              <MapPin size={16} className="text-[#B91C1C]" />
            </div>
            <div>
              <h2 className="font-bold text-[#1C1917] text-sm">Save as Delivery Address</h2>
              {coords && (
                <p className="text-[10px] text-[#A8A29E] font-mono">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A8A29E] hover:text-[#1C1917] transition-colors p-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Address Type Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#A8A29E] uppercase tracking-wider mb-2">
              Address Type
            </label>
            <div className="flex flex-wrap gap-2">
              {ADDRESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => set('address_type', type.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.address_type === type.value
                      ? 'bg-[#B91C1C] text-white border-[#B91C1C] shadow-sm'
                      : 'bg-white text-[#57534E] border-[#E7E0D8] hover:border-[#B91C1C] hover:text-[#B91C1C]'
                  }`}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Label */}
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">Custom Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => set('label', e.target.value)}
              className="input-field-light text-black font-semibold text-sm"
              placeholder="e.g. Mom's House"
            />
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">
              Address Line 1 <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={form.line1}
              onChange={(e) => set('line1', e.target.value)}
              className="input-field-light text-black font-semibold text-sm"
              placeholder="House / Flat / Building / Street"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">
              Address Line 2 <span className="text-[#A8A29E] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.line2}
              onChange={(e) => set('line2', e.target.value)}
              className="input-field-light text-black font-semibold text-sm"
              placeholder="Locality / Area / Colony"
            />
          </div>

          {/* City / State / Pincode */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">City</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="input-field-light text-black font-semibold text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">State</label>
              <input
                type="text"
                required
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
                className="input-field-light text-black font-semibold text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Pincode</label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => set('pincode', e.target.value)}
                className="input-field-light text-black font-semibold text-sm font-mono"
                maxLength={6}
              />
            </div>
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1 flex items-center gap-1">
              <Landmark size={12} /> Landmark <span className="text-[#A8A29E] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.landmark}
              onChange={(e) => set('landmark', e.target.value)}
              className="input-field-light text-black font-semibold text-sm"
              placeholder="Near Allahabad High Court, etc."
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1 flex items-center gap-1">
              <Phone size={12} /> Alternate Phone <span className="text-[#A8A29E] font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="input-field-light text-black font-semibold text-sm"
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Set as Primary toggle */}
          <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl border border-[#E7E0D8] hover:border-[#B91C1C] transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => set('is_default', e.target.checked)}
                className="sr-only"
                id="save-modal-primary"
              />
              <div
                className={`w-10 h-5 rounded-full transition-colors ${form.is_default ? 'bg-[#B91C1C]' : 'bg-[#E7E0D8]'}`}
              />
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_default ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1C1917]">Set as primary delivery address</p>
              <p className="text-xs text-[#A8A29E]">Orders will be delivered here by default</p>
            </div>
          </label>

          {/* GPS badge */}
          {coords && (
            <div className="flex items-center gap-2 text-[11px] text-[#16A34A] bg-[#F0FDF4] px-3 py-2 rounded-lg border border-[#BBF7D0]">
              <CheckCircle2 size={13} />
              GPS coordinates captured and will be saved with this address
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-3 border-t border-[#F4EFEA] pt-4">
          <button
            type="submit"
            form=""
            onClick={handleSave}
            disabled={saving || !form.line1.trim()}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save Address'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
