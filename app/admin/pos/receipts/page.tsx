'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Printer, Download, Clock, Check, X, Loader2, ShoppingBag, Receipt, ChefHat } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { triggerPrintPOSReceipt, triggerPrintKOT, POSReceiptOrderData } from '@/lib/utils/posReceipt'
import { handlePrintInvoice } from '@/lib/utils/printInvoice'

interface ReceiptOrder {
  id: string
  created_at: string
  order_type: string
  source: string
  subtotal: number
  tax: number
  discount: number
  delivery_fee: number
  total: number
  payment_status: string
  kot_number: string
  notes: string
  address_json: Record<string, any>
  table_id?: string
  order_items: Array<{
    quantity: number
    unit_price: number
    products: { name: string } | null
    selected_options: any
  }>
  order_payments: Array<{
    tender_type: string
    amount: number
    change_given: number
    reference?: string
  }>
}

function ReceiptsContent() {
  const searchParams = useSearchParams()
  const targetOrderId = searchParams.get('orderId')

  const [orders, setOrders] = useState<ReceiptOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<ReceiptOrder | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('orders')
        .select(`
          id, created_at, order_type, source, subtotal, tax, discount, delivery_fee, total,
          payment_status, kot_number, notes, address_json, table_id,
          order_items(quantity, unit_price, selected_options, products(name)),
          order_payments(tender_type, amount, change_given, reference)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      const fetched = (data as any) || []
      setOrders(fetched)
      setLoading(false)

      if (targetOrderId && fetched.length > 0) {
        const found = fetched.find((o: ReceiptOrder) => o.id === targetOrderId || o.id.slice(-6) === targetOrderId.slice(-6))
        if (found) {
          setSelectedOrder(found)
        } else {
          setSelectedOrder(fetched[0])
        }
      } else if (fetched.length > 0) {
        setSelectedOrder(fetched[0])
      }
    }
    load()
  }, [targetOrderId])

  const filtered = orders.filter((o) => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      (o.kot_number || '').toLowerCase().includes(q) ||
      (o.address_json?.name || '').toLowerCase().includes(q) ||
      o.id.slice(-6).toLowerCase().includes(q) ||
      (o.order_type || '').toLowerCase().includes(q)
    )
  })

  // ── Print Handlers ──────────────────────────────────────────────────────────
  const handleThermalPrint = () => {
    if (!selectedOrder) return

    const receiptPayload: POSReceiptOrderData = {
      orderId: selectedOrder.id,
      kotNumber: selectedOrder.kot_number,
      orderType: selectedOrder.order_type || 'takeaway',
      customerName: selectedOrder.address_json?.name,
      customerPhone: selectedOrder.address_json?.phone,
      createdAt: selectedOrder.created_at,
      items: (selectedOrder.order_items || []).map((item) => {
        const selOpts = item.selected_options as any
        const resolvedName =
          (typeof selOpts === 'object' && selOpts?.productName) ||
          (typeof selOpts === 'object' && selOpts?.name) ||
          item.products?.name ||
          'Pizza Expert Item'

        const optionList: string[] = []
        if (typeof selOpts === 'object' && Array.isArray(selOpts?.modifiers)) {
          selOpts.modifiers.forEach((m: any) => optionList.push(typeof m === 'string' ? m : m.name))
        } else if (Array.isArray(selOpts)) {
          selOpts.forEach((o: any) => optionList.push(typeof o === 'string' ? o : o.choice || o.optionName))
        }

        return {
          name: resolvedName,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.quantity * item.unit_price,
          selectedOptions: optionList.length > 0 ? optionList : undefined,
          notes: typeof selOpts === 'object' ? selOpts?.notes : undefined,
        }
      }),
      subtotal: Number(selectedOrder.subtotal || 0),
      discount: Number(selectedOrder.discount || 0),
      tax: Number(selectedOrder.tax || 0),
      deliveryFee: Number(selectedOrder.delivery_fee || 0),
      total: Number(selectedOrder.total || 0),
      payments: (selectedOrder.order_payments || []).map((p) => ({
        tenderType: p.tender_type,
        amount: Number(p.amount),
        changeGiven: Number(p.change_given || 0),
        reference: p.reference,
      })),
    }

    triggerPrintPOSReceipt(receiptPayload)
  }

  const handleKOTPrint = () => {
    if (!selectedOrder) return

    triggerPrintKOT({
      kotNumber: selectedOrder.kot_number || `#${selectedOrder.id.slice(-4).toUpperCase()}`,
      orderId: selectedOrder.id,
      orderType: selectedOrder.order_type || 'takeaway',
      createdAt: selectedOrder.created_at,
      specialNotes: selectedOrder.notes,
      items: (selectedOrder.order_items || []).map((item) => {
        const selOpts = item.selected_options as any
        const resolvedName =
          (typeof selOpts === 'object' && selOpts?.productName) ||
          (typeof selOpts === 'object' && selOpts?.name) ||
          item.products?.name ||
          'Kitchen Item'

        const optionList: string[] = []
        if (typeof selOpts === 'object' && Array.isArray(selOpts?.modifiers)) {
          selOpts.modifiers.forEach((m: any) => optionList.push(typeof m === 'string' ? m : m.name))
        } else if (Array.isArray(selOpts)) {
          selOpts.forEach((o: any) => optionList.push(typeof o === 'string' ? o : o.choice || o.optionName))
        }

        return {
          name: resolvedName,
          quantity: item.quantity,
          selectedOptions: optionList.length > 0 ? optionList : undefined,
          notes: typeof selOpts === 'object' ? selOpts?.notes : undefined,
        }
      }),
    })
  }

  const handleA4InvoicePrint = () => {
    if (!selectedOrder) return
    handlePrintInvoice({
      id: selectedOrder.id,
      customer: selectedOrder.address_json?.name || 'Walk-in Customer',
      phone: selectedOrder.address_json?.phone || 'N/A',
      address: selectedOrder.address_json?.address || 'Counter POS Order',
      items_detail: (selectedOrder.order_items || []).map((i) => {
        const selOpts = i.selected_options as any
        const resolvedName =
          (typeof selOpts === 'object' && selOpts?.productName) ||
          (typeof selOpts === 'object' && selOpts?.name) ||
          i.products?.name ||
          'Item'
        return {
          product_name: resolvedName,
          quantity: i.quantity,
          unit_price: i.unit_price,
          selected_options: i.selected_options,
        }
      }),
      subtotal: Number(selectedOrder.subtotal || 0),
      tax: Number(selectedOrder.tax || 0),
      delivery_fee: Number(selectedOrder.delivery_fee || 0),
      discount: Number(selectedOrder.discount || 0),
      total: Number(selectedOrder.total || 0),
      status: selectedOrder.payment_status || 'paid',
      payment_method: selectedOrder.order_payments?.[0]?.tender_type || 'POS',
      created_at: selectedOrder.created_at,
    })
  }

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)]">
      {/* Left: Order List */}
      <div className="w-80 shrink-0 flex flex-col space-y-3 bg-white border border-[#E7E0D8] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-[#1C1917]">Receipts & Invoices</h1>
            <p className="text-xs text-[#78716C] mt-0.5">Recent POS & Online orders</p>
          </div>
          <Link
            href="/admin/pos"
            className="text-xs font-bold text-[#B91C1C] hover:underline"
          >
            ← Back to POS
          </Link>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search KOT, customer, ID…"
            className="w-full pl-8 pr-3 py-2 border border-[#E7E0D8] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/30 bg-[#FBF9F5]"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#B91C1C]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#A8A29E] text-xs">No orders found</div>
        ) : (
          <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
            {filtered.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-all text-xs',
                  selectedOrder?.id === order.id
                    ? 'border-[#B91C1C] bg-[#FEF2F2] shadow-sm'
                    : 'border-[#E7E0D8] bg-white hover:border-[#B91C1C]/40 hover:bg-[#FBF9F5]'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-[#B91C1C]">
                    {order.kot_number || `#${order.id.slice(-6).toUpperCase()}`}
                  </span>
                  <span className="font-black text-[#1C1917]">₹{Number(order.total).toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                  <span className="truncate max-w-[120px]">{order.address_json?.name || 'Counter Customer'}</span>
                  <span className="capitalize px-1.5 py-0.5 rounded bg-stone-100 text-[10px] font-semibold text-stone-600">
                    {order.order_type?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[10px] text-[#A8A29E] mt-1">{formatTime(order.created_at)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Receipt Preview & Actions */}
      <div className="flex-1 flex flex-col bg-white border border-[#E7E0D8] rounded-2xl p-6 shadow-sm overflow-hidden">
        {!selectedOrder ? (
          <div className="flex flex-col items-center justify-center flex-1 text-[#D6D3D1]">
            <ShoppingBag size={48} className="mb-3 opacity-50" />
            <p className="text-[#A8A29E] font-semibold text-sm">Select an order from the left list to view and print</p>
          </div>
        ) : (
          <div className="flex flex-col h-full space-y-4">
            {/* Top Action Bar */}
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-4">
              <div>
                <h2 className="font-black text-lg text-[#1C1917] flex items-center gap-2">
                  <Receipt size={18} className="text-[#B91C1C]" />
                  Order #{selectedOrder.id.slice(-6).toUpperCase()}
                  {selectedOrder.kot_number && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                      {selectedOrder.kot_number}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#78716C] mt-0.5">
                  {formatTime(selectedOrder.created_at)} • Payment: <span className="uppercase font-bold text-emerald-600">{selectedOrder.payment_status}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleKOTPrint}
                  className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-[#1C1917] rounded-xl text-xs font-bold transition"
                  title="Print Kitchen Order Ticket (KOT)"
                >
                  <ChefHat size={14} className="text-[#B91C1C]" /> Print KOT
                </button>

                <button
                  onClick={handleA4InvoicePrint}
                  className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-[#1C1917] rounded-xl text-xs font-bold transition"
                  title="Full A4 GST Tax Invoice"
                >
                  <Download size={14} /> A4 Tax Invoice
                </button>

                <button
                  onClick={handleThermalPrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl text-xs font-black transition shadow-md shadow-red-950/20 active:scale-98"
                >
                  <Printer size={15} /> Print Thermal Receipt (80mm)
                </button>
              </div>
            </div>

            {/* Scrollable Receipt Paper Preview */}
            <div className="flex-1 overflow-y-auto bg-[#FBF9F5] p-6 rounded-xl flex justify-center">
              <div
                ref={receiptRef}
                className="bg-white border border-[#E7E0D8] rounded-xl p-6 w-[340px] shadow-sm font-mono text-xs text-[#1C1917] h-fit"
              >
                {/* Header */}
                <div className="text-center mb-3">
                  <h1 className="text-base font-black tracking-wide">🍕 PIZZA EXPERT</h1>
                  <p className="text-[10px] text-[#78716C]">Civil Lines, Prayagraj, UP 211001</p>
                  <p className="text-[10px] text-[#78716C]">Phone: +91 91234 56789</p>
                  <p className="text-[10px] text-[#78716C]">GSTIN: 09ABCDE1234F1Z5</p>
                  <div className="text-[11px] font-bold mt-2 uppercase tracking-wider">*** TAX INVOICE ***</div>
                </div>

                <div className="border-t border-dashed border-[#1C1917] my-2" />

                {/* Order Info */}
                <div className="space-y-1 mb-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Order ID:</span>
                    <span className="font-bold">#{selectedOrder.id.slice(-6).toUpperCase()}</span>
                  </div>
                  {selectedOrder.kot_number && (
                    <div className="flex justify-between">
                      <span className="text-[#78716C]">KOT #:</span>
                      <span className="font-bold">{selectedOrder.kot_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Type:</span>
                    <span className="capitalize font-bold">{selectedOrder.order_type?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Date:</span>
                    <span>{formatTime(selectedOrder.created_at)}</span>
                  </div>
                  {selectedOrder.address_json?.name && (
                    <div className="flex justify-between">
                      <span className="text-[#78716C]">Customer:</span>
                      <span className="font-bold">{selectedOrder.address_json.name}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-[#1C1917] my-2" />

                {/* Items */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex justify-between font-bold text-[10px] text-[#78716C] pb-1 border-b border-stone-200">
                    <span>ITEM</span>
                    <span>AMT (₹)</span>
                  </div>
                  {(selectedOrder.order_items || []).map((item, i) => {
                    const selOpts = item.selected_options as any
                    const resolvedName =
                      (typeof selOpts === 'object' && selOpts?.productName) ||
                      (typeof selOpts === 'object' && selOpts?.name) ||
                      item.products?.name ||
                      'Pizza Item'

                    const optionList: string[] = []
                    if (typeof selOpts === 'object' && Array.isArray(selOpts?.modifiers)) {
                      selOpts.modifiers.forEach((m: any) => optionList.push(typeof m === 'string' ? m : m.name))
                    } else if (Array.isArray(selOpts)) {
                      selOpts.forEach((o: any) => optionList.push(typeof o === 'string' ? o : o.choice || o.optionName))
                    }

                    return (
                      <div key={i} className="flex justify-between items-start text-[11px]">
                        <div className="flex-1 pr-2">
                          <span className="font-bold">{item.quantity}x</span> {resolvedName}
                          {optionList.length > 0 && (
                            <div className="text-[9px] text-[#78716C]">
                              {optionList.join(', ')}
                            </div>
                          )}
                          {typeof selOpts === 'object' && selOpts?.notes && (
                            <div className="text-[9px] text-[#78716C] italic">
                              Note: {selOpts.notes}
                            </div>
                          )}
                        </div>
                        <span className="font-bold">₹{(item.quantity * item.unit_price).toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-dashed border-[#1C1917] my-2" />

                {/* Totals */}
                <div className="space-y-1 mb-2 text-[11px]">
                  <div className="flex justify-between text-[#78716C]">
                    <span>Item Subtotal</span>
                    <span>₹{Number(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(selectedOrder.discount) > 0 && (
                    <div className="flex justify-between text-green-700 font-bold">
                      <span>Discount</span>
                      <span>-₹{Number(selectedOrder.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#78716C]">
                    <span>CGST (2.5%)</span>
                    <span>₹{(Number(selectedOrder.tax) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#78716C]">
                    <span>SGST (2.5%)</span>
                    <span>₹{(Number(selectedOrder.tax) / 2).toFixed(2)}</span>
                  </div>
                  {Number(selectedOrder.delivery_fee) > 0 && (
                    <div className="flex justify-between text-[#78716C]">
                      <span>Delivery Fee</span>
                      <span>₹{Number(selectedOrder.delivery_fee).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Total Box */}
                <div className="border border-[#1C1917] p-2 flex justify-between items-center font-black text-sm my-2">
                  <span>NET TOTAL</span>
                  <span>₹{Number(selectedOrder.total).toFixed(2)}</span>
                </div>

                {/* Payments */}
                {selectedOrder.order_payments && selectedOrder.order_payments.length > 0 && (
                  <div className="text-[10px] space-y-0.5 mt-2 text-[#78716C]">
                    <div className="font-bold text-[#1C1917] uppercase">Tender Details:</div>
                    {selectedOrder.order_payments.map((p, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="uppercase">{p.tender_type}</span>
                        <span>₹{Number(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-dashed border-[#1C1917] my-3" />
                <div className="text-center text-[10px] text-[#78716C] space-y-0.5">
                  <p className="font-bold text-[#1C1917]">Thank you for dining with Pizza Expert!</p>
                  <p>Visit again • FSSAI Lic No: 12724052000123</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReceiptsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-[#B91C1C]" />
        </div>
      }
    >
      <ReceiptsContent />
    </Suspense>
  )
}
