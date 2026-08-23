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
          <div className="w-11 h-11 rounded-xl bg-[#B91C1C] flex items-center justify-center text-white font-bold shadow-md">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-base text-white">Pizza Expert Rider</h1>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase border inline-flex items-center gap-1.5 ${
              isOnline
                ? 'text-[#16A34A] bg-[#DCFCE7]/10 border-[#16A34A]/30'
                : 'text-[#A8A29E] bg-[#3F3F46]/30 border-[#3F3F46]/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#16A34A] animate-pulse' : 'bg-[#A8A29E]'}`} />
              {isOnline ? 'Online & On Duty' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Fitts's Law: Large Online/Offline Toggle Button (44px min touch target) */}
          <button
            onClick={() => setIsOnline(prev => !prev)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all active:scale-95 shadow-xs ${
              isOnline
                ? 'bg-[#DCFCE7]/15 border-[#16A34A]/60 text-[#22C55E] hover:bg-[#DCFCE7]/25'
                : 'bg-[#3F3F46] border-[#52525B] text-zinc-300 hover:text-white'
            }`}
          >
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">

        {/* Trip Queue Count */}
        {trips.length > 0 && (
          <div className="bg-[#27272A] rounded-2xl px-4 py-3 border border-[#3F3F46] flex items-center justify-between shadow-sm">
            <span className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider">Active Trips in Queue</span>
            <span className="font-mono font-black text-white text-sm bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">{trips.length}</span>
          </div>
        )}

        {activeTrip ? (
          <div className="bg-[#27272A] rounded-3xl p-5 border-2 border-[#16A34A]/50 shadow-[0_0_30px_rgba(22,163,74,0.15)] space-y-5">
            {/* Top Bar with Von Restorff Badge */}
            <div className="flex items-center justify-between border-b border-[#3F3F46] pb-3.5">
              <div>
                <span className="text-[10px] text-[#22C55E] uppercase font-black tracking-widest block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  Active Live Delivery
                </span>
                <span className="font-mono font-black text-white text-base tracking-tight">{activeTrip.order_id.slice(0, 12).toUpperCase()}</span>
              </div>
              <span className="text-[11px] font-black bg-[#B91C1C] text-white px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                {activeTrip.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Goal-Gradient Effect: 4-Stage Delivery Progress Meter */}
            <div className="bg-[#18181B] rounded-2xl p-3.5 border border-[#3F3F46] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#A8A29E]">
                <span className="text-white flex items-center gap-1">
                  <span>⚡ Delivery Step:</span>
                  <span className="text-[#22C55E] capitalize">
                    {activeTrip.status === 'assigned' ? '1. Accept Trip' : activeTrip.status === 'accepted' ? '2. Pick Up Pizza' : '3. OTP Verification'}
                  </span>
                </span>
                <span className="font-mono text-[#22C55E]">
                  {activeTrip.status === 'assigned' ? '25%' : activeTrip.status === 'accepted' ? '50%' : '75%'}
                </span>
              </div>
              <div className="w-full bg-[#27272A] h-2 rounded-full overflow-hidden border border-white/5">
                <div
                  className="bg-[#16A34A] h-full rounded-full transition-all duration-500"
                  style={{
                    width: activeTrip.status === 'assigned' ? '25%' : activeTrip.status === 'accepted' ? '50%' : '75%'
                  }}
                />
              </div>
            </div>

            {/* ── CHUNK 1: Destination ── */}
            <div className="space-y-3.5 bg-[#18181B] p-4 sm:p-5 rounded-t-2xl border border-[#3F3F46] text-xs">
              <div className="flex items-center justify-between border-b border-[#3F3F46] pb-3">
                <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>📍 1. Customer Destination</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate max-w-[190px]">
                  <span className="text-base">👤</span>
                  <span className="font-extrabold text-base text-white truncate">{activeTrip.customer_name}</span>
                </div>
                {/* Large Call Target with Explicit Information Scent */}
                <a
                  href={`tel:${activeTrip.customer_phone}`}
                  className="min-h-[40px] flex items-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
                >
                  <Phone size={15} /> Call
                </a>
              </div>

              <div className="flex items-start gap-2.5 text-zinc-300 text-xs sm:text-sm">
                <MapPin size={18} className="text-[#B91C1C] shrink-0 mt-0.5" />
                <span className="leading-snug">{activeTrip.address}</span>
              </div>

              {/* Fitts's Law & Information Scent: Massive Navigation Button */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeTrip.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] mt-2 flex items-center justify-center gap-2.5 py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl shadow-lg active:scale-[0.98] transition-all"
              >
                <Navigation size={18} />
                Open GPS Navigation in Google Maps →
              </a>
            </div>

            {/* ── CHUNK 2: Financials ── */}
            <div className="bg-[#27272A] p-4 sm:p-5 border-x border-b border-[#3F3F46] text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-[#3F3F46]/50 pb-2 mb-2">
                <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider">2. Payment Collection</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className={`font-black uppercase ${activeTrip.payment_method === 'cod' ? 'text-[#F59E0B]' : 'text-[#22C55E]'}`}>
                  {activeTrip.payment_method === 'cod' ? '💵 Cash to Collect' : '💳 Online Paid'}
                </span>
                <span className={`font-mono font-black text-xl ${activeTrip.payment_method === 'cod' ? 'text-[#F59E0B]' : 'text-white'}`}>
                  {formatPrice(activeTrip.total_amount)}
                </span>
              </div>
            </div>

            {/* ── CHUNK 3: Next Action ── */}
            <div className="space-y-3 pt-4 border-t border-[#3F3F46] mt-4">
              <div className="text-center mb-2">
                <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider">3. Action Required</span>
              </div>
              {activeTrip.status === 'assigned' && (
                <button
                  onClick={() => handleUpdateStatus('accepted')}
                  disabled={loading}
                  className="w-full min-h-[52px] py-4 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-black rounded-2xl text-sm sm:text-base uppercase tracking-wider shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Accept Delivery Trip'}
                </button>
              )}

              {activeTrip.status === 'accepted' && (
                <button
                  onClick={() => handleUpdateStatus('picked_up')}
                  disabled={loading}
                  className="w-full min-h-[52px] py-4 bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 text-white font-black rounded-2xl text-sm sm:text-base uppercase tracking-wider shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Picked Up From Kitchen'}
                </button>
              )}

              {(activeTrip.status === 'picked_up' || activeTrip.status === 'arrived') && (
                <div className="space-y-4 bg-[#18181B] p-4 sm:p-5 rounded-2xl border border-[#3F3F46]">
                  <h4 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#16A34A]" />
                    OTP Verification & Proof of Delivery
                  </h4>

                  <div>
                    <label className="block text-xs text-[#A8A29E] mb-1.5 font-bold uppercase tracking-wider">
                      Customer 4-Digit OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="• • • •"
                      value={enteredOtp}
                      onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full min-h-[50px] p-3 text-center font-mono font-black text-2xl tracking-[0.4em] bg-[#27272A] border-2 border-[#3F3F46] focus:border-[#16A34A] rounded-xl text-white focus:outline-none transition-all placeholder:text-zinc-600"
                    />
                  </div>

                  <button
                    onClick={() => { setPhotoUploaded(true); toast.success('📷 Proof photo captured!') }}
                    className={`w-full min-h-[44px] py-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-bold border transition-all ${
                      photoUploaded ? 'bg-[#DCFCE7]/15 border-[#16A34A] text-[#22C55E]' : 'bg-[#27272A] border-[#3F3F46] text-[#A8A29E] hover:text-white'
                    }`}
                  >
                    <Camera size={18} />
                    {photoUploaded ? 'Proof Photo Captured ✓' : 'Take Proof Photo'}
                  </button>

                  <button
                    onClick={handleVerifyOtpAndDeliver}
                    disabled={!enteredOtp || enteredOtp.length < 4 || loading}
                    className="w-full min-h-[54px] py-4 bg-[#16A34A] disabled:opacity-40 hover:bg-[#15803D] text-white font-black rounded-2xl text-sm sm:text-base uppercase tracking-wider shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify OTP & Mark Delivered'}
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
