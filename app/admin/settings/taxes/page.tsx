'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTaxConfig, saveTaxGroup } from '@/app/actions/taxEngine'
import {
  Percent, ShieldCheck, Plus, CheckCircle2, RefreshCw,
  Loader2, Trash2, Edit3, X, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

export default function TaxesSettingsPage() {
  const [taxGroups, setTaxGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [components, setComponents] = useState<Array<{ componentName: string; rate: number; isInclusive: boolean }>>([
    { componentName: 'CGST', rate: 2.5, isInclusive: false },
    { componentName: 'SGST', rate: 2.5, isInclusive: false },
  ])

  const loadData = useCallback(async () => {
    const res = await getTaxConfig()
    if (res.success) setTaxGroups(res.taxGroups)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const addComponent = () => {
    setComponents((prev) => [...prev, { componentName: 'Service Charge', rate: 5, isInclusive: false }])
  }

  const removeComponent = (idx: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSaveTaxGroup = async () => {
    if (!groupName.trim()) return toast.error('Enter tax group name')
    if (components.length === 0) return toast.error('Add at least one tax component')

    setSubmitting(true)
    const res = await saveTaxGroup({
      name: groupName,
      description,
      isDefault,
      rates: components,
    })
    setSubmitting(false)

    if (res.success) {
      toast.success(`Tax group "${groupName}" saved!`)
      setOpenModal(false)
      loadData()
    } else {
      toast.error(res.error || 'Failed to save tax group')
    }
  }

  const totalRate = components.reduce((sum, c) => sum + Number(c.rate || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1C1917] text-white flex items-center justify-center shadow-xs">
            <Percent size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Tax Engine & GST Configuration
            </h1>
            <p className="text-xs text-[#78716C]">
              Configurable tax groups, CGST / SGST split components & inclusive/exclusive rates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setGroupName('')
              setDescription('')
              setIsDefault(false)
              setComponents([
                { componentName: 'CGST', rate: 2.5, isInclusive: false },
                { componentName: 'SGST', rate: 2.5, isInclusive: false },
              ])
              setOpenModal(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition shadow-xs"
          >
            <Plus size={14} /> New Tax Group
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-[#E7E0D8] rounded-xl text-[#78716C] hover:bg-[#F4EFEA] transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tax Groups List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-[#B91C1C]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {taxGroups.map((group) => {
            const rates = group.tax_rates || []
            const groupTotal = rates.reduce((sum: number, r: any) => sum + Number(r.rate || 0), 0)

            return (
              <div
                key={group.id}
                className={cn(
                  'bg-white rounded-2xl p-5 border shadow-xs space-y-3 relative',
                  group.is_default ? 'border-[#B91C1C] ring-1 ring-[#B91C1C]/20' : 'border-[#E7E0D8]'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#1C1917]">{group.name}</h3>
                    {group.is_default && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        DEFAULT ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-base font-bold font-mono text-[#B91C1C]">
                    {groupTotal}% Total
                  </span>
                </div>

                {group.description && (
                  <p className="text-xs text-[#78716C]">{group.description}</p>
                )}

                {/* Rates breakdown */}
                <div className="pt-2 border-t border-[#F4EFEA] space-y-1.5">
                  <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider block">
                    Tax Components
                  </span>
                  {rates.map((rate: any) => (
                    <div key={rate.id} className="flex items-center justify-between text-xs bg-[#FBF9F5] px-3 py-1.5 rounded-lg border border-[#E7E0D8]">
                      <span className="font-semibold text-[#1C1917]">{rate.component_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#78716C]">
                          {rate.is_inclusive ? 'Inclusive' : 'Exclusive'}
                        </span>
                        <span className="font-mono font-bold text-[#1C1917]">{rate.rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add / Edit Tax Group Modal ── */}
      {openModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D8]">
              <h3 className="text-lg font-bold font-serif text-[#1C1917]">
                Configure Tax Group
              </h3>
              <button onClick={() => setOpenModal(false)} className="p-1.5 rounded-full hover:bg-[#F4EFEA] text-[#78716C]">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Group Name</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. GST 5% or GST 18%"
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Restaurant standard intra-state rate"
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-[#B91C1C] focus:ring-[#B91C1C]"
              />
              <label htmlFor="isDefault" className="text-xs font-bold text-[#1C1917]">
                Set as Default Active Tax Group for POS & Online Orders
              </label>
            </div>

            {/* Components list */}
            <div className="space-y-2 pt-2 border-t border-[#E7E0D8]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#78716C]">Tax Components</span>
                <button onClick={addComponent} className="text-xs font-bold text-[#B91C1C] hover:underline flex items-center gap-1">
                  <Plus size={12} /> Add Component
                </button>
              </div>

              {components.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#FBF9F5] p-2 rounded-xl border border-[#E7E0D8]">
                  <input
                    value={comp.componentName}
                    onChange={(e) => {
                      const val = e.target.value
                      setComponents((prev) => prev.map((c, i) => i === idx ? { ...c, componentName: val } : c))
                    }}
                    placeholder="Component"
                    className="flex-1 bg-white border border-[#E7E0D8] rounded-lg px-2 py-1 text-xs font-bold text-[#1C1917]"
                  />
                  <div className="w-20 flex items-center bg-white border border-[#E7E0D8] rounded-lg px-2 py-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={comp.rate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setComponents((prev) => prev.map((c, i) => i === idx ? { ...c, rate: val } : c))
                      }}
                      className="w-full text-xs font-bold focus:outline-none"
                    />
                    <span className="text-xs text-[#78716C]">%</span>
                  </div>
                  <button onClick={() => removeComponent(idx)} className="text-[#A8A29E] hover:text-rose-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#E7E0D8] flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1917]">
                Total Rate: {totalRate.toFixed(2)}%
              </span>
              <div className="flex gap-2">
                <button onClick={() => setOpenModal(false)} className="px-4 py-2 border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#78716C]">
                  Cancel
                </button>
                <button
                  onClick={handleSaveTaxGroup}
                  disabled={submitting}
                  className="px-5 py-2 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Save Tax Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
