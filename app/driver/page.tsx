'use client'

import { useState, useEffect } from 'react'
import { Truck, Navigation, CheckCircle2, ShieldCheck, MapPin, Phone, Camera, Clock, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DriverTrip {
  id: string
  order_id: string
  customer_name: string
  customer_phone: string
  address: string
  total_amount: number
  status: 'assigned' | 'accepted' | 'picked_up' | 'arrived' | 'delivered'
  otp_code: string
}

const MOCK_DRIVER_TRIPS: DriverTrip[] = [
  {
    id: 'DEL-1029',
    order_id: 'ORD-982143',
    customer_name: 'Rahul Sharma',
    customer_phone: '+91 98765 43210',
    address: 'House 42, Civil Lines, Prayagraj',
    total_amount: 499,
    status: 'assigned',
    otp_code: '4892',
  },
]

export default function DriverPWAPage() {
  const [trips, setTrips] = useState<DriverTrip[]>(MOCK_DRIVER_TRIPS)
  const [activeTrip, setActiveTrip] = useState<DriverTrip | null>(MOCK_DRIVER_TRIPS[0])
  const [enteredOtp, setEnteredOtp] = useState('')
  const [photoUploaded, setPhotoUploaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleUpdateStatus = async (newStatus: DriverTrip['status']) => {
    if (!activeTrip) return
    setActiveTrip({ ...activeTrip, status: newStatus })
    setTrips(prev => prev.map(t => (t.id === activeTrip.id ? { ...t, status: newStatus } : t)))

    try {
      const supabase = createClient()
      await supabase
        .from('deliveries')
        .update({ status: newStatus })
        .eq('order_id', activeTrip.order_id)
    } catch {}

    toast.success(`Trip status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()}`)
  }

  const handleVerifyOtpAndDeliver = async () => {
    if (!activeTrip) return
    if (enteredOtp !== activeTrip.otp_code && enteredOtp !== '1234') {
      toast.error('Invalid OTP! Please ask customer for correct 4-digit OTP.')
      return
    }

    handleUpdateStatus('delivered')
    toast.success('🎉 Delivery completed successfully! OTP verified.')
  }

  return (
    <div className="bg-[#18181B] text-white min-h-screen pb-12">
      {/* Top Driver Header Bar */}
      <header className="bg-[#27272A] border-b border-[#3F3F46] p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B91C1C] flex items-center justify-center text-white font-bold font-serif">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-base text-white">Pizza Expert Rider</h1>
            <span className="text-[10px] text-[#16A34A] bg-[#DCFCE7]/10 px-2 py-0.5 rounded-md font-bold uppercase border border-[#16A34A]/30">
              ● Online & On Duty
            </span>
          </div>
        </div>

        <button
          onClick={() => alert('Location synced to dispatch board')}
          className="text-xs font-semibold bg-[#3F3F46] px-3 py-1.5 rounded-lg text-[#A8A29E] hover:text-white transition-colors"
        >
          GPS Active
        </button>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {activeTrip ? (
          <div className="bg-[#27272A] rounded-2xl p-5 border border-[#3F3F46] shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#3F3F46] pb-3">
              <div>
                <span className="text-[10px] text-[#A8A29E] uppercase font-bold tracking-wider block">Assigned Order</span>
                <span className="font-mono font-bold text-white text-lg">{activeTrip.order_id}</span>
              </div>
              <span className="text-xs font-bold bg-[#B91C1C] text-white px-3 py-1 rounded-full uppercase">
                {activeTrip.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Customer & Address Details */}
            <div className="space-y-3 bg-[#18181B] p-4 rounded-xl border border-[#3F3F46] text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{activeTrip.customer_name}</span>
                <a
                  href={`tel:${activeTrip.customer_phone}`}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#16A34A] text-white font-bold rounded-lg text-xs"
                >
                  <Phone size={14} /> Call Customer
                </a>
              </div>

              <div className="flex items-start gap-2 text-[#A8A29E]">
                <MapPin size={16} className="text-[#B91C1C] flex-shrink-0 mt-0.5" />
                <span>{activeTrip.address}</span>
              </div>

              <div className="pt-2 border-t border-[#3F3F46] flex items-center justify-between text-[#A8A29E]">
                <span>Collect Cash / Order Value:</span>
                <span className="font-mono font-bold text-white text-sm">{formatPrice(activeTrip.total_amount)}</span>
              </div>
            </div>

            {/* 1-Tap Navigation Handoff */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeTrip.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <Navigation size={18} />
              Open Navigation in Google Maps
            </a>

            {/* Step Action Buttons */}
            <div className="space-y-3 pt-2">
              {activeTrip.status === 'assigned' && (
                <button
                  onClick={() => handleUpdateStatus('accepted')}
                  className="w-full py-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl text-xs"
                >
                  Accept Delivery Trip
                </button>
              )}

              {activeTrip.status === 'accepted' && (
                <button
                  onClick={() => handleUpdateStatus('picked_up')}
                  className="w-full py-3 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-xl text-xs"
                >
                  Confirm Order Picked Up From Kitchen
                </button>
              )}

              {(activeTrip.status === 'picked_up' || activeTrip.status === 'arrived') && (
                <div className="space-y-3 bg-[#18181B] p-4 rounded-xl border border-[#3F3F46]">
                  <h4 className="font-bold text-xs text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#16A34A]" />
                    Proof of Delivery & OTP Verification
                  </h4>

                  <div>
                    <label className="block text-[11px] text-[#A8A29E] mb-1 font-semibold">
                      Enter Customer 4-Digit OTP (Default: 4892 or 1234)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 4892"
                      value={enteredOtp}
                      onChange={e => setEnteredOtp(e.target.value)}
                      className="w-full p-2.5 text-center font-mono font-bold text-base tracking-widest bg-[#27272A] border border-[#3F3F46] rounded-lg text-white focus:outline-hidden focus:border-[#16A34A]"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setPhotoUploaded(true)
                      toast.success('📷 Proof of delivery photo captured!')
                    }}
                    className={`w-full py-2 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold border ${
                      photoUploaded ? 'bg-[#DCFCE7]/10 border-[#16A34A] text-[#16A34A]' : 'bg-[#27272A] border-[#3F3F46] text-[#A8A29E]'
                    }`}
                  >
                    <Camera size={16} />
                    {photoUploaded ? 'Proof Photo Captured ✓' : 'Take Proof Photo'}
                  </button>

                  <button
                    onClick={handleVerifyOtpAndDeliver}
                    disabled={!enteredOtp}
                    className="w-full py-3 bg-[#16A34A] disabled:opacity-50 hover:bg-[#15803D] text-white font-bold rounded-xl text-xs shadow-md"
                  >
                    Verify OTP & Mark Delivered
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-[#A8A29E]">
            <CheckCircle2 size={48} className="mx-auto mb-3 text-[#16A34A]" />
            <h3 className="text-white font-bold font-serif text-lg">No Active Delivery Trips</h3>
            <p className="text-xs">You are online. New delivery orders will pop up here instantly.</p>
          </div>
        )}
      </main>
    </div>
  )
}
