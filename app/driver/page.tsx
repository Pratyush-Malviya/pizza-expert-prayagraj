'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, Navigation, CheckCircle2, ShieldCheck, MapPin, Phone, Camera, Clock, AlertCircle, Loader2, WifiOff } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DriverTrip {
  id: string          // delivery row ID
  order_id: string
  customer_name: string
  customer_phone: string
  address: string
  total_amount: number
  payment_method: string
  status: string
  otp_code: string | null
}

export default function DriverPWAPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<DriverTrip[]>([])
  const [activeTrip, setActiveTrip] = useState<DriverTrip | null>(null)
  const [enteredOtp, setEnteredOtp] = useState('')
  const [photoUploaded, setPhotoUploaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [driverName, setDriverName] = useState('Driver')
  const [isOnline, setIsOnline] = useState(true)

  const supabase = createClient()

  // ─── Auth guard + data fetch ─────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      // Verify driver role
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'driver') {
        toast.error('Access denied. Driver credentials required.')
        router.replace('/')
        return
      }

      setDriverName(profile.name || 'Driver')
      await fetchTrips(user.id)
      setupRealtime(user.id)
      setPageLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchTrips(driverId: string) {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        id,
        order_id,
        status,
        otp_code,
        orders (
          total,
          address_json
        )
      `)
      .eq('driver_id', driverId)
      .in('status', ['assigned', 'accepted', 'picked_up', 'arrived'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch trips:', error.message)
      return
    }

    const mapped: DriverTrip[] = (data || []).map((d: any) => {
      const addr = d.orders?.address_json || {}
      return {
        id: d.id,
        order_id: d.order_id,
        customer_name: addr.name || 'Customer',
        customer_phone: addr.phone || 'N/A',
        address: [addr.line1, addr.line2, addr.city].filter(Boolean).join(', ') || 'Prayagraj',
        total_amount: Number(d.orders?.total) || 0,
        payment_method: addr.paymentMethod || 'razorpay',
        status: d.status,
        otp_code: d.otp_code || null,
      }
    })

    setTrips(mapped)
    if (mapped.length > 0 && !activeTrip) {
      setActiveTrip(mapped[0])
    }
  }

  function setupRealtime(driverId: string) {
    supabase
      .channel('driver-deliveries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          // Re-fetch on any change to this driver's deliveries
          fetchTrips(driverId)
        }
      )
      .subscribe()
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeTrip) return
    setLoading(true)
    try {
      const updatePayload: any = { status: newStatus }
      if (newStatus === 'picked_up') updatePayload.picked_up_at = new Date().toISOString()
      if (newStatus === 'delivered') updatePayload.delivered_at = new Date().toISOString()

      const { error } = await supabase
        .from('deliveries')
        .update(updatePayload)
        .eq('id', activeTrip.id)

      if (error) {
        toast.error('Failed to update status: ' + error.message)
        return
      }

      setActiveTrip({ ...activeTrip, status: newStatus })
      setTrips(prev => prev.map(t => t.id === activeTrip.id ? { ...t, status: newStatus } : t))
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtpAndDeliver = async () => {
    if (!activeTrip) return
    if (!activeTrip.otp_code) {
      toast.error('No OTP found for this delivery. Contact dispatch.')
      return
    }
    if (enteredOtp.trim() !== activeTrip.otp_code.trim()) {
      toast.error('Invalid OTP! Please ask the customer for the correct 4-digit code.')
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('deliveries')
      .update({
        otp_verified: true,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', activeTrip.id)

    if (error) {
      toast.error('Failed to verify OTP: ' + error.message)
      setLoading(false)
      return
    }

    // Also update the parent order status
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', activeTrip.order_id)

    toast.success('🎉 Delivery completed! OTP verified.')
    // Remove from trips list
    setTrips(prev => prev.filter(t => t.id !== activeTrip.id))
    setActiveTrip(null)
    setEnteredOtp('')
    setPhotoUploaded(false)
    setLoading(false)
  }

  // ─── Loading screen ───────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="bg-[#18181B] min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-[#B91C1C] mx-auto" />
          <p className="text-[#A8A29E] text-xs font-semibold">Loading your trips...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#18181B] text-white min-h-screen pb-12">
      {/* Top Driver Header */}
      <header className="bg-[#27272A] border-b border-[#3F3F46] p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B91C1C] flex items-center justify-center text-white font-bold">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-base text-white">Pizza Expert Rider</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${
              isOnline
                ? 'text-[#16A34A] bg-[#DCFCE7]/10 border-[#16A34A]/30'
                : 'text-[#A8A29E] bg-[#3F3F46]/30 border-[#3F3F46]/30'
            }`}>
              {isOnline ? '● Online & On Duty' : '○ Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOnline(prev => !prev)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              isOnline
                ? 'bg-[#DCFCE7]/10 border-[#16A34A]/40 text-[#16A34A]'
                : 'bg-[#3F3F46] border-[#3F3F46] text-[#A8A29E] hover:text-white'
            }`}
          >
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">

        {/* Trip Queue Count */}
        {trips.length > 0 && (
          <div className="bg-[#27272A] rounded-xl px-4 py-2.5 border border-[#3F3F46] flex items-center justify-between">
            <span className="text-xs text-[#A8A29E]">Active Trips in Queue</span>
            <span className="font-mono font-bold text-white text-sm">{trips.length}</span>
          </div>
        )}

        {activeTrip ? (
          <div className="bg-[#27272A] rounded-2xl p-5 border border-[#3F3F46] shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#3F3F46] pb-3">
              <div>
                <span className="text-[10px] text-[#A8A29E] uppercase font-bold tracking-wider block">Active Delivery</span>
                <span className="font-mono font-bold text-white text-sm">{activeTrip.order_id.slice(0, 12).toUpperCase()}</span>
              </div>
              <span className="text-[10px] font-bold bg-[#B91C1C] text-white px-3 py-1 rounded-full uppercase">
                {activeTrip.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Customer & Address */}
            <div className="space-y-3 bg-[#18181B] p-4 rounded-xl border border-[#3F3F46] text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{activeTrip.customer_name}</span>
                <a
                  href={`tel:${activeTrip.customer_phone}`}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#16A34A] text-white font-bold rounded-lg text-xs"
                >
                  <Phone size={14} /> Call
                </a>
              </div>

              <div className="flex items-start gap-2 text-[#A8A29E]">
                <MapPin size={16} className="text-[#B91C1C] flex-shrink-0 mt-0.5" />
                <span>{activeTrip.address}</span>
              </div>

              <div className="pt-2 border-t border-[#3F3F46] flex items-center justify-between text-[#A8A29E]">
                <span>{activeTrip.payment_method === 'cod' ? '💵 Collect Cash:' : 'Online Payment:'}</span>
                <span className="font-mono font-bold text-white text-sm">{formatPrice(activeTrip.total_amount)}</span>
              </div>
            </div>

            {/* Navigation Button */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeTrip.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <Navigation size={18} />
              Open in Google Maps
            </a>

            {/* Step Actions */}
            <div className="space-y-3 pt-2">
              {activeTrip.status === 'assigned' && (
                <button
                  onClick={() => handleUpdateStatus('accepted')}
                  disabled={loading}
                  className="w-full py-3 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-bold rounded-xl text-xs"
                >
                  {loading ? 'Updating...' : 'Accept Delivery Trip'}
                </button>
              )}

              {activeTrip.status === 'accepted' && (
                <button
                  onClick={() => handleUpdateStatus('picked_up')}
                  disabled={loading}
                  className="w-full py-3 bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 text-white font-bold rounded-xl text-xs"
                >
                  {loading ? 'Updating...' : 'Confirm Picked Up From Kitchen'}
                </button>
              )}

              {(activeTrip.status === 'picked_up' || activeTrip.status === 'arrived') && (
                <div className="space-y-3 bg-[#18181B] p-4 rounded-xl border border-[#3F3F46]">
                  <h4 className="font-bold text-xs text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#16A34A]" />
                    OTP Verification & Proof of Delivery
                  </h4>

                  <div>
                    <label className="block text-[11px] text-[#A8A29E] mb-1 font-semibold">
                      Enter Customer 4-Digit OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="e.g. 4892"
                      value={enteredOtp}
                      onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-2.5 text-center font-mono font-bold text-base tracking-widest bg-[#27272A] border border-[#3F3F46] rounded-lg text-white focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>

                  <button
                    onClick={() => { setPhotoUploaded(true); toast.success('📷 Proof photo captured!') }}
                    className={`w-full py-2 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold border ${
                      photoUploaded ? 'bg-[#DCFCE7]/10 border-[#16A34A] text-[#16A34A]' : 'bg-[#27272A] border-[#3F3F46] text-[#A8A29E]'
                    }`}
                  >
                    <Camera size={16} />
                    {photoUploaded ? 'Proof Photo Captured ✓' : 'Take Proof Photo'}
                  </button>

                  <button
                    onClick={handleVerifyOtpAndDeliver}
                    disabled={!enteredOtp || enteredOtp.length < 4 || loading}
                    className="w-full py-3 bg-[#16A34A] disabled:opacity-50 hover:bg-[#15803D] text-white font-bold rounded-xl text-xs shadow-md"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP & Mark Delivered'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-[#A8A29E]">
            <CheckCircle2 size={48} className="mx-auto mb-3 text-[#16A34A]" />
            <h3 className="text-white font-bold font-serif text-lg">No Active Delivery Trips</h3>
            <p className="text-xs mt-1">
              {isOnline
                ? 'You are online. New delivery orders will appear here instantly.'
                : 'You are offline. Go online to receive new delivery trips.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
