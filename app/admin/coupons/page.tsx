'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag, CheckCircle2, XCircle, Search, X, Percent, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export interface Coupon {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order: number
  used_count: number
  active: boolean
  created_at?: string
}

const INITIAL_COUPONS: Coupon[] = [
  { id: 'c1', code: 'WELCOME20', type: 'percentage', value: 20, min_order: 299, used_count: 142, active: true },
  { id: 'c2', code: 'FLAT50', type: 'fixed', value: 50, min_order: 399, used_count: 88, active: true },
  { id: 'c3', code: 'PIZZA10', type: 'percentage', value: 10, min_order: 199, used_count: 210, active: true },
]

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState<{
    code: string
    type: 'percentage' | 'fixed'
    value: number
    min_order: number
    active: boolean
  }>({
    code: '',
    type: 'percentage',
    value: 20,
    min_order: 299,
    active: true,
  })

  // Fetch Coupons from Supabase + Local Storage fallback
  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        const mapped: Coupon[] = data.map((c: any) => ({
          id: c.id,
          code: c.code,
          type: c.type || 'percentage',
          value: Number(c.value) || 0,
          min_order: Number(c.min_order) || 0,
          used_count: Number(c.used_count) || 0,
          active: Boolean(c.active),
          created_at: c.created_at,
        }))
        setCoupons(mapped)
      } else {
        // Localstorage fallback
        try {
          const localCoupons = JSON.parse(localStorage.getItem('pizza_coupons') || '[]')
          if (localCoupons.length > 0) {
            setCoupons(localCoupons)
          }
        } catch {}
      }
    } catch (err) {
      console.warn('Coupons fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const saveLocalCoupons = (updated: Coupon[]) => {
    setCoupons(updated)
    try {
      localStorage.setItem('pizza_coupons', JSON.stringify(updated))
    } catch {}
  }

  // Handle Save (Create or Edit)
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim()) {
      toast.error('Coupon code is required')
      return
    }

    const uppercaseCode = formData.code.trim().toUpperCase()

    if (editingCoupon) {
      // Edit existing
      const updatedList = coupons.map((c) =>
        c.id === editingCoupon.id
          ? {
              ...c,
              code: uppercaseCode,
              type: formData.type,
              value: Number(formData.value),
              min_order: Number(formData.min_order),
              active: formData.active,
            }
          : c
      )
      saveLocalCoupons(updatedList)

      // Supabase update
      try {
        const supabase = createClient()
        await supabase
          .from('coupons')
          .update({
            code: uppercaseCode,
            type: formData.type,
            value: Number(formData.value),
            min_order: Number(formData.min_order),
            active: formData.active,
          })
          .eq('id', editingCoupon.id)
      } catch {}

      toast.success(`Coupon "${uppercaseCode}" updated successfully!`)
    } else {
      // Create new
      const newCoupon: Coupon = {
        id: 'c-' + Date.now(),
        code: uppercaseCode,
        type: formData.type,
        value: Number(formData.value),
        min_order: Number(formData.min_order),
        used_count: 0,
        active: formData.active,
        created_at: new Date().toISOString(),
      }

      const updatedList = [newCoupon, ...coupons]
      saveLocalCoupons(updatedList)

      // Supabase insert
      try {
        const supabase = createClient()
        await supabase.from('coupons').insert({
          code: uppercaseCode,
          type: formData.type,
          value: Number(formData.value),
          min_order: Number(formData.min_order),
          active: formData.active,
        })
      } catch {}

      toast.success(`Coupon "${uppercaseCode}" created successfully!`)
    }

    setShowModal(false)
    setEditingCoupon(null)
  }

  // Handle Delete
  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return

    const updatedList = coupons.filter((c) => c.id !== couponId)
    saveLocalCoupons(updatedList)

    try {
      const supabase = createClient()
      await supabase.from('coupons').delete().eq('id', couponId)
    } catch {}

    toast.success(`Coupon "${code}" deleted`)
  }

  // Handle Toggle Active
  const handleToggleActive = async (coupon: Coupon) => {
    const nextState = !coupon.active
    const updatedList = coupons.map((c) =>
      c.id === coupon.id ? { ...c, active: nextState } : c
    )
    saveLocalCoupons(updatedList)

    try {
      const supabase = createClient()
      await supabase.from('coupons').update({ active: nextState }).eq('id', coupon.id)
    } catch {}

    toast.success(`Coupon "${coupon.code}" is now ${nextState ? 'Active' : 'Disabled'}`)
  }

  const openCreateModal = () => {
    setEditingCoupon(null)
    setFormData({
      code: '',
      type: 'percentage',
      value: 20,
      min_order: 299,
      active: true,
    })
    setShowModal(true)
  }

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      min_order: coupon.min_order,
      active: coupon.active,
    })
    setShowModal(true)
  }

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
            Coupons & Promotional Deals
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            Create, edit, toggle, or delete discount coupons for checkout promotions.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2 text-xs sm:text-sm self-start sm:self-auto">
          <Plus size={16} /> Create New Coupon
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E7E0D8] shadow-xs">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search coupon by code (e.g. WELCOME20)..."
            className="input-field pl-10 pr-3 py-2 text-xs sm:text-sm bg-[#FBF9F5]"
          />
        </div>
      </div>

      {/* Coupons Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCoupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-[#1C1917] tracking-wider text-base bg-[#FBF9F5] px-3 py-1 rounded-md border border-[#E7E0D8] flex items-center gap-1.5">
                  <Tag size={14} className="text-[#B91C1C]" />
                  {coupon.code}
                </span>

                <button
                  onClick={() => handleToggleActive(coupon)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1 transition-all ${
                    coupon.active 
                      ? 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]/30' 
                      : 'bg-[#FEF2F2] text-[#B91C1C] border-[#B91C1C]/30'
                  }`}
                >
                  {coupon.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  <span>{coupon.active ? 'Active' : 'Disabled'}</span>
                </button>
              </div>

              <div className="text-xs text-[#57534E] space-y-1.5 pt-1">
                <div className="flex items-center justify-between border-b border-[#E7E0D8]/60 pb-1.5">
                  <span>Discount Value</span>
                  <strong className="text-[#1C1917] font-bold font-mono">
                    {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `₹${coupon.value} FLAT OFF`}
                  </strong>
                </div>

                <div className="flex items-center justify-between border-b border-[#E7E0D8]/60 pb-1.5">
                  <span>Min Order Amount</span>
                  <strong className="text-[#1C1917] font-mono">₹{coupon.min_order}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span>Total Redemptions</span>
                  <strong className="text-[#1C1917]">{coupon.used_count || 0} times</strong>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-[#E7E0D8] flex items-center justify-end gap-2">
              <button
                onClick={() => openEditModal(coupon)}
                className="px-3 py-1.5 rounded-lg border border-[#E7E0D8] bg-[#FBF9F5] text-xs font-bold text-[#1C1917] hover:border-[#B91C1C] flex items-center gap-1.5 transition-all"
              >
                <Edit2 size={13} /> Edit
              </button>

              <button
                onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ))}

        {filteredCoupons.length === 0 && (
          <div className="col-span-full bg-white rounded-xl p-12 text-center text-[#A8A29E] text-sm border border-[#E7E0D8]">
            No coupons found matching your search. Click "Create New Coupon" to add one.
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">
                {editingCoupon ? 'Edit Coupon Code' : 'Create New Coupon'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-[#A8A29E] hover:text-[#1C1917]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Coupon Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. PIZZA20"
                  className="input-field font-mono font-bold uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Discount Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="input-field bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    {formData.type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Minimum Order Amount (₹)</label>
                <input
                  type="number"
                  value={formData.min_order}
                  onChange={(e) => setFormData({ ...formData, min_order: Number(e.target.value) })}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg">
                <span className="text-xs font-semibold text-[#1C1917]">Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#15803D]"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-[#E7E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline btn-sm text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm text-xs">
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
