'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { generateDayEndReport, getDayEndReports } from '@/app/actions/intelligence'
import {
  FileText, Printer, CheckCircle2, Clock, DollarSign,
  AlertTriangle, RefreshCw, Loader2, Calendar, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function ZReportPage() {
  const [reports, setReports] = useState<any[]>([])
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0])
  const [closingNotes, setClosingNotes] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const loadReports = useCallback(async () => {
    const res = await getDayEndReports(30)
    if (res.success) {
      setReports(res.reports)
      if (res.reports.length > 0 && !selectedReport) {
        setSelectedReport(res.reports[0])
      }
    }
    setLoading(false)
  }, [selectedReport])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleGenerate = async () => {
    setGenerating(true)
    const res = await generateDayEndReport(targetDate, undefined, closingNotes)
    setGenerating(false)
    if (res.success) {
      toast.success(`Z-Report generated for ${targetDate}!`)
      setSelectedReport(res.zReport)
      loadReports()
    } else {
      toast.error(res.error || 'Failed to generate Z-Report')
    }
  }

  const handlePrint = () => {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    const printWin = window.open('', '_blank', 'width=340,height=700')
    if (!printWin) return
    printWin.document.write(`
      <html>
        <head>
          <title>Z-Report Closing Slip</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; padding: 12px; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: bold; }
            .title { font-size: 16px; font-weight: bold; text-align: center; }
          </style>
        </head>
        <body onload="window.print(); window.close()">
          ${content}
        </body>
      </html>
    `)
    printWin.document.close()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1C1917] text-white flex items-center justify-center shadow-xs">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Day-End Closing & Z-Reports
            </h1>
            <p className="text-xs text-[#78716C]">
              Daily sales closure, drawer variance reconciliation & financial audit slips
            </p>
          </div>
        </div>

        <button
          onClick={loadReports}
          className="p-2 border border-[#E7E0D8] rounded-xl text-[#78716C] hover:bg-[#F4EFEA] self-end sm:self-auto transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Generator & Report History List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Generator Card */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs space-y-3.5">
            <h2 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
              <Clock size={16} className="text-[#B91C1C]" /> Generate Z-Report
            </h2>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1">Report Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1">Closing Notes (Optional)</label>
                <input
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. End of night register count balanced"
                  className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-2.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Generate & Close Day
              </button>
            </div>
          </div>

          {/* History List */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs space-y-3">
            <h2 className="font-bold text-sm text-[#1C1917]">Previous Z-Reports</h2>

            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#B91C1C]" /></div>
            ) : reports.length === 0 ? (
              <p className="text-xs text-[#A8A29E] text-center py-4">No Z-Reports generated yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {reports.map((rep) => (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      selectedReport?.id === rep.id
                        ? 'border-[#B91C1C] bg-[#FEF2F2]'
                        : 'border-[#E7E0D8] bg-white hover:bg-[#FBF9F5]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono font-bold text-xs text-[#1C1917]">
                        {new Date(rep.report_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="font-mono font-bold text-xs text-[#15803D]">
                        ₹{Number(rep.total_net_sales).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#78716C]">
                      <span>{rep.total_orders} Orders</span>
                      <span className={cn(
                        Number(rep.cash_variance) === 0 ? 'text-emerald-600 font-bold' :
                        Number(rep.cash_variance) > 0 ? 'text-blue-600 font-bold' : 'text-rose-600 font-bold'
                      )}>
                        Var: {Number(rep.cash_variance) > 0 ? '+' : ''}₹{Number(rep.cash_variance || 0).toFixed(0)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Thermal Z-Report Slip Preview */}
        <div className="lg:col-span-7">
          {!selectedReport ? (
            <div className="bg-white rounded-2xl border border-[#E7E0D8] p-12 text-center text-[#A8A29E] shadow-xs">
              <FileText size={40} className="mx-auto mb-2 text-[#D6D3D1]" />
              <p className="font-bold">Select a Z-Report to view closing slip</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1917] hover:bg-[#292524] text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Printer size={14} /> Print Audit Slip
                </button>
              </div>

              {/* Thermal Paper Container */}
              <div className="bg-white border border-[#E7E0D8] rounded-3xl p-6 max-w-sm mx-auto shadow-md">
                <div ref={printRef} className="font-mono text-xs space-y-2">
                  <div className="text-center">
                    <h1 className="text-base font-bold">🍕 PIZZA EXPERT</h1>
                    <p className="text-[10px] text-[#78716C]">Prayagraj, Uttar Pradesh</p>
                    <p className="text-xs font-bold mt-1 bg-[#F4EFEA] py-0.5 rounded">
                      *** DAY-END Z-REPORT ***
                    </p>
                  </div>

                  <div className="border-t border-dashed border-[#E7E0D8] my-2" />

                  <div className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#78716C]">Date</span>
                      <span className="font-bold">{selectedReport.report_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716C]">Closed At</span>
                      <span>{new Date(selectedReport.closed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716C]">Total Orders</span>
                      <span className="font-bold">{selectedReport.total_orders}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-[#E7E0D8] my-2" />

                  {/* Sales Breakdown */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-sm">
                      <span>GROSS SALES</span>
                      <span>₹{Number(selectedReport.total_gross_sales).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Discounts</span>
                      <span>-₹{Number(selectedReport.total_discounts).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-[#15803D]">
                      <span>NET SALES</span>
                      <span>₹{Number(selectedReport.total_net_sales).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-[#E7E0D8] my-2" />

                  {/* Taxes */}
                  <div className="space-y-0.5 text-[11px] text-[#78716C]">
                    <div className="flex justify-between">
                      <span>CGST (2.5%)</span>
                      <span>₹{Number(selectedReport.total_tax_cgst).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (2.5%)</span>
                      <span>₹{Number(selectedReport.total_tax_sgst).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-[#E7E0D8] my-2" />

                  {/* Tender Breakdown */}
                  <div className="space-y-1">
                    <div className="font-bold text-[11px] text-[#78716C]">PAYMENT TENDERS</div>
                    <div className="flex justify-between">
                      <span>Cash Collected</span>
                      <span>₹{Number(selectedReport.total_cash).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>UPI Payments</span>
                      <span>₹{Number(selectedReport.total_upi).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card Payments</span>
                      <span>₹{Number(selectedReport.total_card).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-[#E7E0D8] my-2" />

                  {/* Cash Drawer Reconciliation */}
                  <div className="space-y-1">
                    <div className="font-bold text-[11px] text-[#78716C]">DRAWER RECONCILIATION</div>
                    <div className="flex justify-between text-[11px]">
                      <span>Opening Float</span>
                      <span>₹{Number(selectedReport.cash_opening_float).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Expected Cash</span>
                      <span>₹{Number(selectedReport.cash_expected).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Actual Cash Counted</span>
                      <span>₹{Number(selectedReport.cash_actual).toFixed(2)}</span>
                    </div>
                    <div className={cn(
                      'flex justify-between font-bold py-1 border-t border-[#E7E0D8]',
                      Number(selectedReport.cash_variance) === 0 ? 'text-emerald-700' :
                      Number(selectedReport.cash_variance) > 0 ? 'text-blue-700' : 'text-rose-700'
                    )}>
                      <span>CASH VARIANCE</span>
                      <span>{Number(selectedReport.cash_variance) > 0 ? '+' : ''}₹{Number(selectedReport.cash_variance).toFixed(2)}</span>
                    </div>
                  </div>

                  {selectedReport.notes && (
                    <>
                      <div className="border-t border-dashed border-[#E7E0D8] my-2" />
                      <p className="text-[10px] text-[#78716C]">Notes: {selectedReport.notes}</p>
                    </>
                  )}

                  <div className="border-t border-dashed border-[#E7E0D8] my-2" />
                  <div className="text-center text-[10px] text-[#A8A29E]">
                    <p>Manager Signature: __________________</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
