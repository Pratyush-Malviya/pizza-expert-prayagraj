'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProfitAndLossSummary } from '@/app/actions/intelligence'
import {
  TrendingUp, TrendingDown, DollarSign, Percent, RefreshCw,
  Loader2, Calendar, ShoppingBag, ShieldCheck, ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PnLPage() {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<number>(30)

  const loadData = useCallback(async () => {
    setLoading(true)
    const res = await getProfitAndLossSummary(timeRange)
    if (res.success) {
      setData(res.summary)
    }
    setLoading(false)
  }, [timeRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#15803D] text-white flex items-center justify-center shadow-xs">
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Profit & Loss (P&L) Statement
            </h1>
            <p className="text-xs text-[#78716C]">
              Operational revenue, Cost of Goods Sold (COGS), wastage losses & gross margins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-[#E7E0D8] rounded-xl overflow-hidden shadow-xs">
            {[
              { label: 'Today', days: 1 },
              { label: 'Last 7 Days', days: 7 },
              { label: 'Last 30 Days', days: 30 },
              { label: 'Last 90 Days', days: 90 },
            ].map((t) => (
              <button
                key={t.days}
                onClick={() => setTimeRange(t.days)}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-bold transition-all',
                  timeRange === t.days ? 'bg-[#1C1917] text-white' : 'text-[#78716C] hover:bg-[#F4EFEA]'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="p-2 border border-[#E7E0D8] rounded-xl text-[#78716C] hover:bg-[#F4EFEA] transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-[#B91C1C]" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top KPI Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs">
              <span className="text-xs font-semibold text-[#78716C] block">Net Revenue</span>
              <span className="text-2xl font-bold font-mono text-[#1C1917] mt-1 block">
                ₹{data.netSales.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#A8A29E] mt-0.5 block">{data.orderCount} paid orders</span>
            </div>

            <div className="bg-white rounded-2xl border border-[#E7E0D8] p-5 shadow-xs">
              <span className="text-xs font-semibold text-[#78716C] block">Cost of Goods (COGS)</span>
              <span className="text-2xl font-bold font-mono text-rose-600 mt-1 block">
                ₹{data.totalCostOfFood.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#A8A29E] mt-0.5 block">Food Cost: {data.foodCostPercentage}%</span>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200/60 rounded-2xl p-5 shadow-xs bg-emerald-50/20">
              <span className="text-xs font-semibold text-emerald-700 block">Gross Profit</span>
              <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
                ₹{data.grossProfit.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">Gross Margin: {data.grossMarginPercentage}%</span>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200/60 rounded-2xl p-5 shadow-xs bg-rose-50/20">
              <span className="text-xs font-semibold text-rose-700 block">Wastage Loss</span>
              <span className="text-2xl font-bold font-mono text-rose-700 mt-1 block">
                ₹{data.totalWastage.toFixed(2)}
              </span>
              <span className="text-[10px] text-rose-600 mt-0.5 block">Ingredient prep & spoilage</span>
            </div>
          </div>

          {/* Detailed Financial Breakdown Card */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#1C1917] pb-3 border-b border-[#E7E0D8]">
              Income & Expense Statement
            </h2>

            <div className="space-y-3 font-mono text-xs">
              {/* 1. Gross Revenue */}
              <div className="flex items-center justify-between py-1">
                <span className="font-bold text-[#1C1917]">1. Gross Sales Revenue</span>
                <span className="font-bold text-[#1C1917]">₹{data.grossSales.toFixed(2)}</span>
              </div>

              {/* 2. Discounts */}
              <div className="flex items-center justify-between py-1 text-rose-600 pl-4">
                <span>Less: Discounts & Promos</span>
                <span>-₹{data.totalDiscounts.toFixed(2)}</span>
              </div>

              {/* Net Sales Line */}
              <div className="flex items-center justify-between py-2 border-t border-dashed border-[#E7E0D8] font-bold text-[#1C1917] bg-[#FBF9F5] px-3 rounded-lg">
                <span>= Net Sales Revenue</span>
                <span>₹{data.netSales.toFixed(2)}</span>
              </div>

              {/* 3. Cost of Goods Sold */}
              <div className="flex items-center justify-between py-1 text-[#78716C] pl-4">
                <span>Less: Ingredient Recipe Cost (COGS)</span>
                <span>-₹{data.totalCOGS.toFixed(2)}</span>
              </div>

              {/* 4. Wastage */}
              <div className="flex items-center justify-between py-1 text-rose-600 pl-4">
                <span>Less: Kitchen Wastage & Spoilage</span>
                <span>-₹{data.totalWastage.toFixed(2)}</span>
              </div>

              {/* Gross Profit Line */}
              <div className="flex items-center justify-between py-3 border-t-2 border-[#1C1917] font-bold text-sm text-[#15803D] bg-emerald-50/40 px-3 rounded-lg">
                <span>= GROSS OPERATING PROFIT</span>
                <span>₹{data.grossProfit.toFixed(2)} ({data.grossMarginPercentage}%)</span>
              </div>

              {/* Taxes Collected */}
              <div className="flex items-center justify-between py-2 text-[#78716C] text-[11px] pt-4 border-t border-[#E7E0D8]">
                <span>Taxes Collected (GST 5% - Liability)</span>
                <span>₹{data.totalTax.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
