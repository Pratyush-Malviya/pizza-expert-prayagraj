'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, Calendar, RefreshCw, Loader2, DollarSign, CheckCircle2 } from 'lucide-react'

interface ForecastItem {
  date: string
  expected_revenue: number
  confidence: 'High' | 'Medium' | 'Low'
  notes?: string
}

export default function DemandForecastWidget({ storeId }: { storeId?: string }) {
  const [forecast, setForecast] = useState<ForecastItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchForecast = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/demand-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, timeframe: 7 })
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.forecast)) {
        setForecast(data.forecast)
      } else {
        setError(data.error || 'Unable to generate forecast.')
      }
    } catch (err: any) {
      setError('Network error loading demand forecast.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForecast()
  }, [storeId])

  const totalExpectedRevenue = forecast.reduce((acc, curr) => acc + (curr.expected_revenue || 0), 0)

  return (
    <div className="rounded-3xl bg-zinc-900 border border-white/15 p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              AI Demand Forecast
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                Next 7 Days
              </span>
            </h3>
            <p className="text-[11px] text-white/50">Predicted daily revenue based on historical order telemetry</p>
          </div>
        </div>

        <button
          onClick={fetchForecast}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
          title="Refresh Forecast"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {loading && (
        <div className="py-8 text-center space-y-2 text-white/40 text-xs">
          <Loader2 size={24} className="animate-spin mx-auto text-emerald-400" />
          <p>Running Gemini time-series demand predictions...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}

      {!loading && forecast.length > 0 && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
            <span className="text-white/60">7-Day Projected Total:</span>
            <span className="text-emerald-400 font-bold font-mono text-sm">
              ₹{totalExpectedRevenue.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {forecast.map((item, idx) => {
              const dayName = new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div key={idx} className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">{dayName}</span>
                  <span className="text-xs font-mono font-bold text-white block">
                    ₹{Math.round(item.expected_revenue).toLocaleString('en-IN')}
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md inline-block ${
                      item.confidence === 'High'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.confidence}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
