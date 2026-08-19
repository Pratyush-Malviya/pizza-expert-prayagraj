'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPurchaseOrders, createPurchaseOrder, receiveGoodsReceipt, type POLineItemInput } from '@/app/actions/purchasing'
import { getInventoryStockWithValuation } from '@/app/actions/inventoryLedger'
import {
  Truck, Plus, CheckCircle2, Clock, DollarSign,
  RefreshCw, Loader2, Search, X, PackageCheck, Eye, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

export default function PurchasesPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [openGRNModal, setOpenGRNModal] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create PO Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [poNotes, setPoNotes] = useState('')
  const [poLines, setPoLines] = useState<Array<{ ingredientId: string; quantityOrdered: number; unitPrice: number }>>([])

  // GRN Form State
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [grnItems, setGrnItems] = useState<Array<{
    ingredientId: string
    quantityReceived: number
    quantityAccepted: number
    quantityRejected: number
    rejectionReason: string
    unitPrice: number
  }>>([])

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const [poRes, stockRes, { data: supps }] = await Promise.all([
      getPurchaseOrders(),
      getInventoryStockWithValuation(),
      supabase.from('suppliers').select('*').order('name', { ascending: true }),
    ])

    if (poRes.success) setPurchaseOrders(poRes.purchaseOrders)
    if (stockRes.success) setIngredients(stockRes.ingredients)
    setSuppliers(supps || [])
    if (supps && supps.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(supps[0].id)
    }
    setLoading(false)
  }, [selectedSupplierId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const addPOLine = () => {
    if (ingredients.length === 0) return toast.error('No ingredients available')
    const first = ingredients[0]
    setPoLines((prev) => [
      ...prev,
      { ingredientId: first.id, quantityOrdered: 10, unitPrice: Number(first.cost_per_unit || 50) },
    ])
  }

  const handleCreatePO = async () => {
    if (!selectedSupplierId) return toast.error('Select supplier')
    if (poLines.length === 0) return toast.error('Add at least one item')

    setSubmitting(true)
    const res = await createPurchaseOrder({
      supplierId: selectedSupplierId,
      items: poLines,
      notes: poNotes,
    })
    setSubmitting(false)

    if (res.success) {
      toast.success('Purchase Order created!')
      setOpenCreateModal(false)
      setPoLines([])
      setPoNotes('')
      loadData()
    } else {
      toast.error(res.error || 'Failed to create PO')
    }
  }

  const handleOpenGRN = (po: any) => {
    setOpenGRNModal(po)
    setInvoiceNumber(`INV-${Date.now().toString().slice(-4)}`)
    const lines = (po.purchase_order_items || []).map((item: any) => ({
      ingredientId: item.ingredient_id,
      quantityReceived: Number(item.quantity_ordered),
      quantityAccepted: Number(item.quantity_ordered),
      quantityRejected: 0,
      rejectionReason: '',
      unitPrice: Number(item.unit_price),
    }))
    setGrnItems(lines)
  }

  const handleReceiveGRN = async () => {
    if (!openGRNModal) return
    setSubmitting(true)
    const res = await receiveGoodsReceipt({
      purchaseOrderId: openGRNModal.id,
      supplierId: openGRNModal.supplier_id,
      invoiceNumber,
      invoiceDate,
      items: grnItems,
    })
    setSubmitting(false)

    if (res.success) {
      toast.success(`Goods Received! Created ${res.grnNumber} & updated stock`)
      setOpenGRNModal(null)
      loadData()
    } else {
      toast.error(res.error || 'Failed to intake GRN')
    }
  }

  const filteredPOs = purchaseOrders.filter((po) =>
    (po.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.id.slice(-6).toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1C1917] text-white flex items-center justify-center shadow-xs">
            <Truck size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Purchase Orders & Goods Receipt (GRN)
            </h1>
            <p className="text-xs text-[#78716C]">
              Procure raw ingredients, receive shipments, track supplier invoices & stock intake
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setOpenCreateModal(true)
              if (poLines.length === 0) addPOLine()
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition shadow-xs"
          >
            <Plus size={14} /> New Purchase Order
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-[#E7E0D8] rounded-xl text-[#78716C] hover:bg-[#F4EFEA] transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by supplier or PO#…"
          className="w-full pl-8 pr-3 py-2 bg-white border border-[#E7E0D8] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/40 shadow-xs"
        />
      </div>

      {/* PO Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-[#B91C1C]" />
        </div>
      ) : filteredPOs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] p-12 text-center shadow-xs">
          <Truck size={36} className="mx-auto mb-2 text-[#A8A29E]" />
          <h3 className="font-bold text-[#1C1917]">No purchase orders found</h3>
          <p className="text-xs text-[#78716C] mt-1">Create a PO to procure ingredients from suppliers</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#78716C] font-semibold">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items Ordered</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EFEA]">
                {filteredPOs.map((po) => {
                  const itemCount = (po.purchase_order_items || []).length
                  const isReceived = po.status === 'received'

                  return (
                    <tr key={po.id} className="hover:bg-[#FBF9F5] transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#B91C1C]">
                        #PO-{po.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1C1917]">
                        {po.supplier?.name || 'Supplier'}
                        {po.supplier?.phone && <span className="text-[10px] text-[#A8A29E] block font-normal">{po.supplier.phone}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-[#78716C] font-mono">
                        {new Date(po.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 text-[#78716C]">
                        {itemCount} {itemCount === 1 ? 'ingredient' : 'ingredients'}
                      </td>
                      <td className="py-3.5 px-4 font-bold font-mono text-[#1C1917]">
                        ₹{Number(po.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          isReceived ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isReceived ? (
                          <button
                            onClick={() => handleOpenGRN(po)}
                            className="px-3 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto shadow-xs"
                          >
                            <PackageCheck size={12} /> Receive GRN
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700">✓ Received</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Purchase Order Modal ── */}
      {openCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D8]">
              <h3 className="text-lg font-bold font-serif text-[#1C1917]">
                New Purchase Order
              </h3>
              <button onClick={() => setOpenCreateModal(false)} className="p-1.5 rounded-full hover:bg-[#F4EFEA] text-[#78716C]">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Select Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.payment_terms || 'Net 15'})</option>
                ))}
              </select>
            </div>

            {/* Line items */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#78716C]">Ordered Ingredients</span>
                <button onClick={addPOLine} className="text-xs font-bold text-[#B91C1C] hover:underline flex items-center gap-1">
                  <Plus size={12} /> Add Item
                </button>
              </div>

              {poLines.map((line, idx) => {
                const ing = ingredients.find((i) => i.id === line.ingredientId)
                return (
                  <div key={idx} className="flex items-center gap-2 bg-[#FBF9F5] p-2.5 rounded-xl border border-[#E7E0D8]">
                    <select
                      value={line.ingredientId}
                      onChange={(e) => {
                        const targetIng = ingredients.find((i) => i.id === e.target.value)
                        setPoLines((prev) => prev.map((l, i) => i === idx ? {
                          ...l,
                          ingredientId: e.target.value,
                          unitPrice: Number(targetIng?.cost_per_unit || l.unitPrice),
                        } : l))
                      }}
                      className="flex-1 bg-white border border-[#E7E0D8] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1917]"
                    >
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                      ))}
                    </select>

                    <div className="w-20 flex items-center bg-white border border-[#E7E0D8] rounded-lg px-2 py-1">
                      <input
                        type="number"
                        min="1"
                        value={line.quantityOrdered}
                        onChange={(e) => setPoLines((prev) => prev.map((l, i) => i === idx ? { ...l, quantityOrdered: parseFloat(e.target.value) || 0 } : l))}
                        className="w-full text-xs font-bold focus:outline-none"
                      />
                    </div>

                    <div className="w-24 flex items-center bg-white border border-[#E7E0D8] rounded-lg px-2 py-1">
                      <span className="text-xs text-[#A8A29E] mr-1">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={line.unitPrice}
                        onChange={(e) => setPoLines((prev) => prev.map((l, i) => i === idx ? { ...l, unitPrice: parseFloat(e.target.value) || 0 } : l))}
                        className="w-full text-xs font-bold focus:outline-none"
                      />
                    </div>

                    <button onClick={() => setPoLines((prev) => prev.filter((_, i) => i !== idx))} className="text-[#A8A29E] hover:text-rose-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 border-t border-[#E7E0D8] flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1917]">
                Total: ₹{poLines.reduce((acc, l) => acc + (l.quantityOrdered * l.unitPrice), 0).toFixed(2)}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setOpenCreateModal(false)} className="px-4 py-2 border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#78716C]">
                  Cancel
                </button>
                <button
                  onClick={handleCreatePO}
                  disabled={submitting}
                  className="px-5 py-2 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Submit Purchase Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Receive GRN Modal ── */}
      {openGRNModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D8]">
              <div>
                <h3 className="text-lg font-bold font-serif text-[#1C1917]">
                  Receive Goods (GRN) — #{openGRNModal.id.slice(-6).toUpperCase()}
                </h3>
                <p className="text-xs text-[#78716C] mt-0.5">Supplier: {openGRNModal.supplier?.name}</p>
              </div>
              <button onClick={() => setOpenGRNModal(null)} className="p-1.5 rounded-full hover:bg-[#F4EFEA] text-[#78716C]">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1">Invoice Number</label>
                <input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none"
                />
              </div>
            </div>

            {/* GRN Item intake */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px]">
              <span className="text-xs font-bold text-[#78716C] block">Intake Quantity & Quality Check</span>
              {grnItems.map((item, idx) => {
                const ing = ingredients.find((i) => i.id === item.ingredientId)
                return (
                  <div key={idx} className="bg-[#FBF9F5] p-3 rounded-xl border border-[#E7E0D8] space-y-2">
                    <div className="flex justify-between text-xs font-bold text-[#1C1917]">
                      <span>{ing?.name || 'Item'}</span>
                      <span className="font-mono text-[#78716C]">Unit Cost: ₹{item.unitPrice}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#78716C] font-semibold block">Accepted Qty ({ing?.unit})</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.quantityAccepted}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setGrnItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantityAccepted: val } : it))
                          }}
                          className="w-full bg-white border border-[#E7E0D8] rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-[#78716C] font-semibold block">Rejected Qty (Damaged)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.quantityRejected}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setGrnItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantityRejected: val } : it))
                          }}
                          className="w-full bg-white border border-[#E7E0D8] rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 border-t border-[#E7E0D8] flex items-center justify-end gap-2">
              <button onClick={() => setOpenGRNModal(null)} className="px-4 py-2 border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#78716C]">
                Cancel
              </button>
              <button
                onClick={handleReceiveGRN}
                disabled={submitting}
                className="px-5 py-2 bg-[#15803D] text-white rounded-xl text-xs font-bold hover:bg-[#166534] transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Confirm Stock Intake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
