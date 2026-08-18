'use client'

import { useState } from 'react'
import type { DeliveryPartner } from '@/lib/tracking/types'
import { Phone, MessageCircle, ShieldCheck, Star, Bike, KeyRound, Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface DriverInfoCardProps {
  driver: DeliveryPartner
  otpCode?: string
  orderId?: string
  orderTotal?: number
  itemsSummary?: string
  status?: string
}

export default function DriverInfoCard({
  driver,
  otpCode = '4821',
  orderId = 'ORD-982143',
  orderTotal = 499,
  itemsSummary = '1x Margherita Pizza (Medium), 1x Garlic Breadsticks',
  status = 'heading_to_customer'
}: DriverInfoCardProps) {
  const [copiedOtp, setCopiedOtp] = useState(false)

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(otpCode)
    setCopiedOtp(true)
    toast.success('Delivery OTP copied to clipboard!')
    setTimeout(() => setCopiedOtp(false), 2500)
  }

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E7E0D8] shadow-sm space-y-5">
      {/* Header with Driver Profile */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3.5">
          {/* Driver Avatar */}
          <div className="relative">
            <div className="w-13 h-13 rounded-2xl bg-[#FBF9F5] border-2 border-[#E7E0D8] overflow-hidden flex items-center justify-center text-xl shadow-xs">
              🛵
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#1C1917] text-base">{driver.name}</h3>
              <div className="flex items-center gap-1 bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-md text-xs font-bold font-mono">
                <Star size={12} className="fill-[#F59E0B] text-[#F59E0B]" />
                <span>{driver.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="text-xs text-[#78716C] flex items-center gap-1.5 mt-0.5">
              <Bike size={14} className="text-[#B91C1C]" />
              <span className="font-mono">{driver.vehicle_type}</span>
              <span>•</span>
              <span className="font-mono font-bold text-[#1C1917]">{driver.vehicle_number}</span>
            </div>
          </div>
        </div>

        {/* Call & WhatsApp CTAs */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href={`tel:${driver.phone}`}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
          >
            <Phone size={15} />
            <span>Call Driver</span>
          </a>

          <a
            href={`https://wa.me/${driver.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${driver.name}, I am tracking order #${orderId}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
          >
            <MessageCircle size={15} />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Delivery Verification OTP Card */}
      <div className="bg-[#FBF9F5] rounded-xl p-4 border border-[#E7E0D8] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center">
            <KeyRound size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider">
              Delivery Verification OTP
            </div>
            <div className="text-xs text-[#57534E]">
              Share this 4-digit code with the rider upon doorstep delivery
            </div>
          </div>
        </div>

        <button
          onClick={handleCopyOtp}
          className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#F3EFEA] border border-[#E7E0D8] rounded-xl font-mono text-base font-black text-[#B91C1C] shadow-xs transition-colors"
        >
          <span>{otpCode}</span>
          {copiedOtp ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-[#78716C]" />}
        </button>
      </div>

      {/* Safety Shield & Hygiene Guarantee */}
      <div className="flex items-center justify-between text-xs text-[#78716C] pt-1">
        <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span>Contactless Delivery & Insulated Hot Bag Verified</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-[#1C1917]">
          {driver.total_deliveries.toLocaleString()}+ Trips
        </span>
      </div>
    </div>
  )
}
