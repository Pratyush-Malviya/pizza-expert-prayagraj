'use client'

import { useState, useEffect } from 'react'
import { Award, Zap, Gift, Check, ShieldCheck, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LoyaltyTier } from '@/types'

interface LoyaltyBadgeProps {
  points?: number
  userTierName?: string
}

export default function LoyaltyBadge({ points = 120, userTierName = 'Silver' }: LoyaltyBadgeProps) {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([
    { id: '1', name: 'Silver', min_points: 0, perks: { discount_percent: 0, free_delivery: false, badge: '🥈 Silver Member' }, created_at: '' },
    { id: '2', name: 'Gold', min_points: 500, perks: { discount_percent: 5, free_delivery: true, badge: '🥇 Gold VIP' }, created_at: '' },
    { id: '3', name: 'VIP', min_points: 1500, perks: { discount_percent: 10, free_delivery: true, priority_support: true, badge: '👑 Platinum VIP' }, created_at: '' },
  ])

  useEffect(() => {
    async function fetchTiers() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from('loyalty_tiers').select('*').order('min_points')
        if (!error && data && data.length > 0) {
          setTiers(data)
        }
      } catch (err) {
        console.warn('Loyalty tiers fetch note:', err)
      }
    }
    fetchTiers()
  }, [])

  // Calculate current tier & progress to next
  const currentTier = tiers.reduce((acc, t) => (points >= t.min_points ? t : acc), tiers[0])
  const nextTier = tiers.find(t => t.min_points > points) || null

  const progressPercent = nextTier
    ? Math.min(100, Math.round(((points - currentTier.min_points) / (nextTier.min_points - currentTier.min_points)) * 100))
    : 100

  return (
    <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold font-serif text-lg">
            <Award size={22} />
          </div>
          <div>
            <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block">Membership Rank</span>
            <h3 className="font-serif font-bold text-base text-[#1C1917] flex items-center gap-2">
              {currentTier.perks?.badge || `${currentTier.name} Member`}
            </h3>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-bold font-mono text-[#B91C1C]">{points}</span>
          <span className="text-xs text-[#78716C] block font-medium">Rewards Points</span>
        </div>
      </div>

      {/* Progress Bar to Next Tier */}
      {nextTier && (
        <div className="space-y-1.5 pt-2 border-t border-[#E7E0D8]">
          <div className="flex justify-between text-xs font-semibold text-[#57534E]">
            <span>Current: {currentTier.name}</span>
            <span className="text-[#B91C1C]">Next: {nextTier.name} ({nextTier.min_points - points} pts left)</span>
          </div>
          <div className="w-full h-2.5 bg-[#F5F2EC] rounded-full overflow-hidden border border-[#E7E0D8]">
            <div
              className="h-full bg-gradient-to-r from-[#D97706] to-[#B91C1C] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Tier Perks Breakdown */}
      <div className="bg-[#FDFBF7] p-3 rounded-lg border border-[#E7E0D8] text-xs space-y-2">
        <span className="font-bold text-[#1C1917] block uppercase text-[10px] tracking-wider text-[#78716C]">
          Active {currentTier.name} Privileges
        </span>
        <div className="grid grid-cols-2 gap-2 text-[#44403C]">
          <div className="flex items-center gap-1.5 font-medium">
            <Check size={14} className="text-[#16A34A]" />
            <span>{currentTier.perks?.discount_percent || 0}% Off All Direct Orders</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Check size={14} className="text-[#16A34A]" />
            <span>{currentTier.perks?.free_delivery ? 'Free Priority Delivery' : 'Standard Delivery'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
