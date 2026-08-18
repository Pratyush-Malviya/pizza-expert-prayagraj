'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, FastForward, Activity, Sparkles } from 'lucide-react'
import type { GPSLocation } from '@/lib/tracking/types'
import { SIMULATED_ROUTE_CIVIL_LINES } from '@/lib/tracking/types'
import { createClient } from '@/lib/supabase/client'

interface DeliverySimulatorControlProps {
  orderId: string
  onLocationUpdate?: (location: GPSLocation, progressIndex: number) => void
  onStatusChange?: (status: string) => void
}

export default function DeliverySimulatorControl({
  orderId,
  onLocationUpdate,
  onStatusChange,
}: DeliverySimulatorControlProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const intervalRef = useRef<any>(null)
  const supabase = createClient()

  const totalSteps = SIMULATED_ROUTE_CIVIL_LINES.length

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    const stepInterval = Math.max(1000 / speedMultiplier, 400)

    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1
        if (next >= totalSteps) {
          setIsPlaying(false)
          clearInterval(intervalRef.current)
          onStatusChange?.('delivered')
          return totalSteps - 1
        }

        const [lat, lng] = SIMULATED_ROUTE_CIVIL_LINES[next]
        const loc: GPSLocation = {
          lat,
          lng,
          speed: 28 * speedMultiplier,
          heading: 120,
          updatedAt: Date.now(),
        }

        onLocationUpdate?.(loc, next)

        // Broadcast to Supabase Realtime channel
        try {
          supabase.channel(`tracking-${orderId}`).send({
            type: 'broadcast',
            event: 'location',
            payload: {
              ...loc,
              orderId,
              status: next === totalSteps - 1 ? 'delivered' : 'heading_to_customer',
            },
          })
        } catch {}

        return next
      })
    }, stepInterval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speedMultiplier, orderId, totalSteps, onLocationUpdate, onStatusChange])

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentStep(0)
    const [lat, lng] = SIMULATED_ROUTE_CIVIL_LINES[0]
    onLocationUpdate?.({ lat, lng, updatedAt: Date.now() }, 0)
    onStatusChange?.('heading_to_customer')
  }

  const progressPercent = Math.round((currentStep / (totalSteps - 1)) * 100)

  return (
    <div className="bg-[#1C1917] text-white rounded-2xl p-4 sm:p-5 border border-amber-500/20 shadow-lg space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Activity size={16} className={isPlaying ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="text-xs font-bold font-mono text-amber-400 flex items-center gap-1.5">
              <span>LIVE GPS SIMULATOR</span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">DEMO MODE</span>
            </div>
            <div className="text-[11px] text-[#A8A29E]">
              Simulate delivery partner scooter riding from Allapur to Civil Lines
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-transform active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause Ride' : 'Start Live GPS'}</span>
          </button>

          <button
            onClick={handleReset}
            title="Reset to Store"
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs transition-colors"
          >
            <RotateCcw size={14} />
          </button>

          {/* Speed Pill */}
          <button
            onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 4 : 1)}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-amber-400 rounded-xl text-xs font-bold font-mono flex items-center gap-1"
          >
            <FastForward size={12} />
            <span>{speedMultiplier}x</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#A8A29E]">
          <span>Route: Allapur Kitchen ➔ Civil Lines</span>
          <span className="text-amber-400 font-bold">{progressPercent}% Journey Complete</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
