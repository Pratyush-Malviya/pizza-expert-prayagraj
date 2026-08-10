'use client'

import { useState, useEffect } from 'react'
import { Truck, Plus, Search, RefreshCw, CheckCircle2, Clock, DollarSign, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Supplier, PurchaseOrder } from '@/types'

const MOCK_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'Amul Dairy Co. Prayagraj', contact_person: 'Vikas Gupta', phone: '+91 98390 12345', email: 'orders@amuldairy.in', payment_terms: 'Net 15', created_at: '' },
  { id: '2', name: 'Millet & Wheat Mills UP', contact_person: 'Ramesh Singh', phone: '+91 94150 98765', email: 'supplies@uptrade.com', payment_terms: 'Net 30', created_at: '' },
  { id: '3', name: 'Italian Herbs Imports', contact_person: 'Marco Rossi', phone: '+91 99190 54321', email: 'sales@italianherbs.in', payment_terms: 'Advance 50%', created_at: '' },
]

const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: 'PO-2026-089', supplier_id: '1', status: 'received', total_amount: 18500, ordered_at: '2026-08-01', received_at: '2026-08-03', created_at: '' },
  { id: 'PO-2026-090', supplier_id: '2', status: 'ordered', total_amount: 12000, ordered_at: '2026-08-08', received_at: null, created_at: '' },
]

export default function AdminSuppliersPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers')
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(MOCK_PURCHASE_ORDERS)
  const [loading, setLoading] = useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    payment_terms: 'Net 30',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: sData } = await supabase.from('suppliers').select('*').order('name')
      if (sData && sData.length > 0) setSuppliers(sData)

      const { data: poData } = await supabase.from('purchase_orders').select('*, supplier:suppliers(name)').order('created_at', { ascending: false })
      if (poData && poData.length > 0) setPurchaseOrders(poData)
    } catch (err) {
      console.warn('Suppliers fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddSupplier = async () => {
    if (!newSupplier.name) return
    const created: Supplier = {
      id: String(Date.now()),
      name: newSupplier.name,
      contact_person: newSupplier.contact_person || null,
      phone: newSupplier.phone || null,
      email: newSupplier.email || null,
      payment_terms: newSupplier.payment_terms,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = createClient()
      await supabase.from('suppliers').insert(created)
    } catch {}

    setSuppliers(prev => [...prev, created])
    setShowAddSupplierModal(false)
    setNewSupplier({ name: '', contact_person: '', phone: '', email: '', payment_terms: 'Net 30' })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E7E0D8] shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] flex items-center gap-2">
            <Truck className="text-[#B91C1C]" size={26} />
            Vendor & Purchase Order Management
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Maintain ingredient suppliers, purchase orders, and payment terms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus size={16} />
            Add Supplier
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-[#E7E0D8] bg-white text-[#44403C] hover:bg-[#F5F2EC] transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E7E0D8] pb-1">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'suppliers'
              ? 'bg-white border border-[#E7E0D8] border-b-transparent text-[#B91C1C] shadow-2xs -mb-px'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Truck size={15} />
          Supplier Directory ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'orders'
              ? 'bg-white border border-[#E7E0D8] border-b-transparent text-[#B91C1C] shadow-2xs -mb-px'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Package size={15} />
          Purchase Orders ({purchaseOrders.length})
        </button>
      </div>

      {/* TAB 1: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F5F2EC] text-[#78716C] font-semibold uppercase text-[11px] border-b border-[#E7E0D8]">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Payment Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#1C1917]">{s.name}</td>
                    <td className="py-3 px-4 text-[#57534E]">{s.contact_person || 'N/A'}</td>
                    <td className="py-3 px-4 text-[#57534E]">{s.phone || 'N/A'}</td>
                    <td className="py-3 px-4 text-[#57534E]">{s.email || 'N/A'}</td>
                    <td className="py-3 px-4 font-medium text-[#16A34A]">{s.payment_terms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Purchase Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F5F2EC] text-[#78716C] font-semibold uppercase text-[11px] border-b border-[#E7E0D8]">
                <tr>
                  <th className="py-3 px-4">PO #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]">
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#B91C1C]">{po.id}</td>
                    <td className="py-3 px-4 font-semibold text-[#1C1917]">
                      {po.supplier?.name || 'Dairy / Grain Supplier'}
                    </td>
                    <td className="py-3 px-4 text-[#78716C]">{po.ordered_at || 'Recently'}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#16A34A]">{formatPrice(po.total_amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        po.status === 'received'
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        {po.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E7E0D8]">
            <h3 className="text-base font-serif font-bold text-[#1C1917]">Register New Ingredient Supplier</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">Company Name</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="e.g. Amul Dairy Co."
                  className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newSupplier.contact_person}
                    onChange={e => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                    placeholder="Vikas Gupta"
                    className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">Phone</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="+91 98390 00000"
                    className="w-full p-2 text-xs rounded-lg border border-[#E7E0D8]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
              <button onClick={() => setShowAddSupplierModal(false)} className="px-4 py-2 text-xs font-semibold text-[#78716C]">Cancel</button>
              <button onClick={handleAddSupplier} disabled={!newSupplier.name} className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg">Save Supplier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
