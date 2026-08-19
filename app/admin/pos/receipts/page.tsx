'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Printer, Download, Clock, Check, X, Loader2, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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
  }>
}

export default function ReceiptsPage() {
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
          payment_status, kot_number, notes, address_json,
          order_items(quantity, unit_price, selected_options, products(name)),
          order_payments(tender_type, amount, change_given)
        `)
        .eq('source', 'pos')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(100)

      setOrders((data as any) || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = orders.filter((o) => {
    const q = searchQuery.toLowerCase()
    return !q ||
      (o.kot_number || '').toLowerCase().includes(q) ||
      (o.address_json?.name || '').toLowerCase().includes(q) ||
      o.id.slice(-6).toLowerCase().includes(q)
  })

  const handlePrint = () => {
    if (!receiptRef.current) return
    const content = receiptRef.current.innerHTML
    const printWin = window.open('', '_blank', 'width=320,height=600')
    if (!printWin) return
    printWin.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; padding: 8px; }
            .receipt-content { width: 100%; }
            h1 { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 2px; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .bold { font-weight: bold; }
            .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close()">
          ${content}
        </body>
      </html>
    `)
    printWin.document.close()
  }

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Order List */}
      <div className="w-72 shrink-0 space-y-3">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Receipts</h1>
          <p className="text-sm text-[#78716C] mt-0.5">Paid POS orders</p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search KOT, name, ID…"
            className="w-full pl-8 pr-3 py-2 border border-[#E7E0D8] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/30"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#B91C1C]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-[#A8A29E] text-sm">No paid orders found</div>
        ) : (
          <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {filtered.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-all',
                  selectedOrder?.id === order.id
                    ? 'border-[#B91C1C] bg-[#FEF2F2]'
                    : 'border-[#E7E0D8] bg-white hover:border-[#B91C1C]/40 hover:bg-[#FBF9F5]'
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono font-bold text-xs text-[#B91C1C]">
                    {order.kot_number || `#${order.id.slice(-6).toUpperCase()}`}
                  </span>
                  <span className="text-xs font-bold text-[#1C1917]">₹{Number(order.total).toFixed(0)}</span>
                </div>
                <p className="text-xs text-[#78716C] truncate">{order.address_json?.name || 'Walk-in'}</p>
                <p className="text-[10px] text-[#A8A29E]">{formatTime(order.created_at)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Receipt Preview */}
      <div className="flex-1">
        {!selectedOrder ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#D6D3D1]">
            <ShoppingBag size={48} className="mb-3" />
            <p className="text-[#A8A29E] font-semibold">Select an order to view receipt</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1C1917]">Receipt Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1C1917] text-white rounded-xl text-sm font-semibold hover:bg-[#292524] transition"
                >
                  <Printer size={14} /> Print Receipt
                </button>
              </div>
            </div>

            {/* Receipt Paper */}
            <div className="bg-white border border-[#E7E0D8] rounded-2xl p-6 max-w-xs mx-auto shadow-sm">
              <div ref={receiptRef} className="receipt-content font-mono text-xs">
                {/* Header */}
                <div className="text-center mb-3">
                  <h1 className="text-base font-bold">🍕 PIZZA EXPERT</h1>
                  <p className="text-[10px] text-[#78716C]">Prayagraj, UP</p>
                  <p className="text-[10px] text-[#78716C]">GSTIN: [Your GSTIN]</p>
                </div>

                <div className="border-t border-dashed border-[#E7E0D8] my-2" />

                {/* Order Info */}
                <div className="space-y-0.5 mb-2">
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">KOT#</span>
                    <span className="font-bold">{selectedOrder.kot_number || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Order#</span>
                    <span>{selectedOrder.id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Type</span>
                    <span className="capitalize">{selectedOrder.order_type?.replace('_', '-')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Time</span>
                    <span>{formatTime(selectedOrder.created_at)}</span>
                  </div>
                  {selectedOrder.address_json?.name && (
                    <div className="flex justify-between">
                      <span className="text-[#78716C]">Customer</span>
                      <span>{selectedOrder.address_json.name}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-[#E7E0D8] my-2" />

                {/* Items */}
                <div className="space-y-1 mb-2">
                  {selectedOrder.order_items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="flex-1 mr-2 truncate">
                        {item.quantity}× {item.products?.name || 'Item'}
                      </span>
                      <span>₹{(item.quantity * item.unit_price).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-[#E7E0D8] my-2" />

                {/* Totals */}
                <div className="space-y-0.5 mb-2">
                  <div className="flex justify-between text-[#78716C]">
                    <span>Subtotal</span>
                    <span>₹{Number(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(selectedOrder.discount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-₹{Number(selectedOrder.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#78716C]">
                    <span>GST (5%)</span>
                    <span>₹{Number(selectedOrder.tax).toFixed(2)}</span>
                  </div>
                  {Number(selectedOrder.delivery_fee) > 0 && (
                    <div className="flex justify-between text-[#78716C]">
                      <span>Delivery Fee</span>
                      <span>₹{Number(selectedOrder.delivery_fee).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm mt-1 pt-1 border-t border-[#E7E0D8]">
                    <span>TOTAL</span>
                    <span>₹{Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment */}
                {selectedOrder.order_payments?.length > 0 && (
                  <>
                    <div className="border-t border-dashed border-[#E7E0D8] my-2" />
                    <div className="space-y-0.5">
                      {selectedOrder.order_payments.map((p, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="capitalize text-[#78716C]">{p.tender_type}</span>
                          <span>₹{Number(p.amount).toFixed(2)}</span>
                        </div>
                      ))}
                      {selectedOrder.order_payments.some((p) => Number(p.change_given) > 0) && (
                        <div className="flex justify-between text-[#78716C]">
                          <span>Change</span>
                          <span>₹{selectedOrder.order_payments.reduce((s, p) => s + Number(p.change_given || 0), 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {selectedOrder.notes && (
                  <>
                    <div className="border-t border-dashed border-[#E7E0D8] my-2" />
                    <p className="text-[10px] text-[#78716C]">Note: {selectedOrder.notes}</p>
                  </>
                )}

                <div className="border-t border-dashed border-[#E7E0D8] my-2" />
                <div className="text-center text-[10px] text-[#78716C] space-y-0.5">
                  <p>Thank you for dining with us!</p>
                  <p>www.pizzaexpertprayagraj.com</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
