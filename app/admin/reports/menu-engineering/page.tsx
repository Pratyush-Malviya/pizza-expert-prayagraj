'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMenuEngineeringData, type MenuItemEngineering, type QuadrantType } from '@/app/actions/intelligence'
import {
  Sparkles, Star, TrendingUp, HelpCircle, AlertCircle,
  RefreshCw, Loader2, DollarSign, Percent, BarChart3, Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

const QUADRANT_META: Record<QuadrantType, { label: string; title: string; desc: string; badge: string; border: string; bg: string; icon: any }> = {
  star: {
    label: '⭐ Stars',
    title: 'High Margin, High Volume',
    desc: 'Top performers. Maintain strict quality and recipe consistency.',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    border: 'border-amber-300',
    bg: 'bg-amber-50/30',
    icon: Star,
  },
  plowhorse: {
    label: '🐎 Plowhorses',
    title: 'Low Margin, High Volume',
    desc: 'Popular customer favorites. Increase price slightly or optimize ingredient recipe cost.',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    border: 'border-blue-300',
    bg: 'bg-blue-50/30',
    icon: TrendingUp,
  },
  puzzle: {
    label: '🧩 Puzzles',
    title: 'High Margin, Low Volume',
    desc: 'Profitable but slow moving. Boost marketing, feature on POS promos or combo deals.',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    border: 'border-purple-300',
    bg: 'bg-purple-50/30',
    icon: HelpCircle,
  },
  dog: {
    label: '🐕 Dogs',
    title: 'Low Margin, Low Volume',
    desc: 'Unprofitable and low demand. Candidate for redesign, replacement or removal from menu.',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    border: 'border-rose-300',
    bg: 'bg-rose-50/30',
    icon: AlertCircle,
  },
}

export default function MenuEngineeringPage() {
  const [data, setData] = useState<{
    items: MenuItemEngineering[]
    avgMargin: number
    avgVolume: number
    starsCount: number
    plowhorsesCount: number
    puzzlesCount: number
    dogsCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<number>(30)
  const [activeQuadrantTab, setActiveQuadrantTab] = useState<QuadrantType | 'all'>('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    const res = await getMenuEngineeringData(timeRange)
    if (res.success) {
      setData(res as any)
    }
    setLoading(false)
  }, [timeRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredItems = (data?.items || []).filter((item) =>
    activeQuadrantTab === 'all' ? true : item.quadrant === activeQuadrantTab
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-xs">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
              Menu Engineering & Profitability Matrix
            </h1>
            <p className="text-xs text-[#78716C]">
              4-Quadrant matrix analysis: Stars, Plowhorses, Puzzles & Dogs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-[#E7E0D8] rounded-xl overflow-hidden shadow-xs">
            {[
              { label: '7 Days', days: 7 },
              { label: '30 Days', days: 30 },
              { label: '90 Days', days: 90 },
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
        <>
          {/* 4 Quadrants Visual Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {(Object.keys(QUADRANT_META) as QuadrantType[]).map((q) => {
              const meta = QUADRANT_META[q]
              const Icon = meta.icon
              const count = q === 'star' ? data.starsCount : q === 'plowhorse' ? data.plowhorsesCount : q === 'puzzle' ? data.puzzlesCount : data.dogsCount
              const isSelected = activeQuadrantTab === q

              return (
                <div
                  key={q}
                  onClick={() => setActiveQuadrantTab(isSelected ? 'all' : q)}
                  className={cn(
                    'bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md space-y-2',
                    isSelected ? 'ring-2 ring-[#B91C1C]' : 'border-[#E7E0D8]',
                    meta.bg
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1C1917] flex items-center gap-1.5">
                      <Icon size={16} /> {meta.label}
                    </span>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', meta.badge)}>
                      {count} items
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#1C1917]">{meta.title}</p>
                  <p className="text-[10px] text-[#78716C] leading-relaxed">{meta.desc}</p>
                </div>
              )
            })}
          </div>

          {/* Benchmark Indicators */}
          <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-[#78716C]">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#B91C1C]" />
              <span>
                Benchmark Margin: <strong className="text-[#1C1917] font-mono">₹{data.avgMargin.toFixed(1)}</strong>/unit
              </span>
            </div>
            <div>
              <span>
                Benchmark Volume: <strong className="text-[#1C1917] font-mono">{Math.round(data.avgVolume)}</strong> units sold
              </span>
            </div>
            {activeQuadrantTab !== 'all' && (
              <button
                onClick={() => setActiveQuadrantTab('all')}
                className="text-[#B91C1C] hover:underline text-xs font-bold"
              >
                Clear Filter (Showing {activeQuadrantTab.toUpperCase()})
              </button>
            )}
          </div>

          {/* Detailed Menu Table */}
          <div className="bg-white rounded-2xl border border-[#E7E0D8] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#78716C] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Menu Item</th>
                    <th className="py-3 px-4">Quadrant</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Cost (COGS)</th>
                    <th className="py-3 px-4">Gross Margin</th>
                    <th className="py-3 px-4">Units Sold</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EFEA]">
                  {filteredItems.map((item) => {
                    const qMeta = QUADRANT_META[item.quadrant]
                    return (
                      <tr key={item.id} className="hover:bg-[#FBF9F5] transition">
                        <td className="py-3.5 px-4 font-bold text-[#1C1917]">
                          {item.name}
                          <span className="text-[10px] text-[#A8A29E] block font-normal">{item.categoryName}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border', qMeta.badge)}>
                            {qMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#1C1917]">₹{item.price}</td>
                        <td className="py-3.5 px-4 font-mono text-[#78716C]">
                          ₹{item.ingredientCost.toFixed(1)} ({item.foodCostPercentage}%)
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#15803D]">
                          ₹{item.grossMargin.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#1C1917]">
                          {item.totalQuantitySold}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#1C1917] text-right">
                          ₹{item.totalRevenue.toFixed(0)}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#A8A29E]">
                        No items found in this quadrant
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
