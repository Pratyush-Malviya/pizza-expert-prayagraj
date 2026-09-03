'use client'

import React, { useState } from 'react'
import { Sparkles, Send, Loader2, Bot, HelpCircle, BarChart3, TrendingUp, DollarSign } from 'lucide-react'

const SUGGESTED_QUESTIONS = [
  "What were the top 3 best-selling pizzas this week?",
  "Predict peak rush hours for this weekend",
  "Summarize average order values and delivery speeds",
  "Which menu items have high revenue but low margins?"
]

export default function AskYourDataPanel({ storeId }: { storeId?: string }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAsk = async (qText?: string) => {
    const queryToAsk = qText || question
    if (!queryToAsk.trim()) return

    setLoading(true)
    setError(null)
    setAnswer(null)

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryToAsk, storeId })
      })

      const data = await res.json()
      if (data.success && data.answer) {
        setAnswer(data.answer)
      } else {
        setError(data.error || 'Failed to analyze store intelligence.')
      }
    } catch (err: any) {
      setError('Network error while querying Gemini AI assistant.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-black border border-white/15 p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Header Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 text-white shadow-lg">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Ask-Your-Data Intelligence
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono font-normal">
                Gemini 3.7 Flash AI
              </span>
            </h3>
            <p className="text-[11px] text-white/50">Natural language business queries over your live sales & operational data</p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1 mr-1">
          <HelpCircle size={12} /> Suggestions:
        </span>
        {SUGGESTED_QUESTIONS.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuestion(sq)
              handleAsk(sq)
            }}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition hover:text-white"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAsk()
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything (e.g., 'Compare Sunday vs Friday sales')..."
          className="flex-1 bg-black/60 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500 transition"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg hover:brightness-110 transition disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          <span>Query</span>
        </button>
      </form>

      {/* Results / Answer Display */}
      {answer && (
        <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 text-xs text-white/90 leading-relaxed space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px] border-b border-emerald-500/20 pb-1.5">
            <Bot size={14} />
            <span>AI Business Answer</span>
          </div>
          <div className="whitespace-pre-line text-white/80 font-sans">
            {answer}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}
