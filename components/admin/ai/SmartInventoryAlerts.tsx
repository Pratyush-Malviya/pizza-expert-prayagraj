'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, PackageCheck, RefreshCw, Loader2, ShoppingBag } from 'lucide-react'

interface AlertItem {
  item: string
  issue: string
  recommendation: string
  urgency: 'High' | 'Medium' | 'Low'
}

interface PurchaseSuggestion {
  item: string
  suggested_quantity: number
  reason: string
}

export default function SmartInventoryAlerts({ storeId }: { storeId?: string }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/smart-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      })
      const data = await res.json()
      if (data.success && data.insights) {
        setAlerts(data.insights.alerts || [])
        setSuggestions(data.insights.purchasing_suggestions || [])
      } else {
        setError(data.error || 'Could not evaluate inventory.')
      }
    } catch (err: any) {
      setError('Network error analyzing inventory with Gemini.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [storeId])

  return (
    <div className="rounded-3xl bg-zinc-900 border border-white/15 p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Smart Stock & Purchase Alerts
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                AI Automated
              </span>
            </h3>
            <p className="text-[11px] text-white/50">Predictive ingredient depletion and restock recommendations</p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
          title="Analyze Stock"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {loading && (
        <div className="py-6 text-center space-y-2 text-white/40 text-xs">
          <Loader2 size={24} className="animate-spin mx-auto text-amber-400" />
          <p>Analyzing stock levels & recipe consumption rates...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Active Stock Alerts */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-amber-400" /> Depletion Warnings ({alerts.length})
            </h4>
            {alerts.length === 0 ? (
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white/40">
                No immediate stock alerts. All key ingredients above safety threshold.
              </div>
            ) : (
              alerts.map((al, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{al.item}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                        al.urgency === 'High'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {al.urgency} Urgency
                    </span>
                  </div>
                  <p className="text-white/60 text-[11px]">{al.issue}</p>
                  <p className="text-emerald-400 text-[11px] font-medium font-mono">👉 {al.recommendation}</p>
                </div>
              ))
            )}
          </div>

          {/* Purchasing Suggestions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag size={13} className="text-emerald-400" /> Restock Orders ({suggestions.length})
            </h4>
            {suggestions.length === 0 ? (
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white/40">
                No restock purchase orders needed today.
              </div>
            ) : (
              suggestions.map((sg, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{sg.item}</span>
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">
                      +{sg.suggested_quantity} Units
                    </span>
                  </div>
                  <p className="text-white/60 text-[11px]">{sg.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
