'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, Clock, Truck, MessageCircle, ChefHat, Sparkles, Bike, KeyRound, Phone, ShieldCheck, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playNotificationSound } from '@/lib/utils/notifications'
import { toast } from 'sonner'

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = (params?.id as string) || 'ORD-982143'

  const [currentStatus, setCurrentStatus] = useState<string>('confirmed')
  const [orderTotal, setOrderTotal] = useState<number>(499)
  const [deliveryOtp, setDeliveryOtp] = useState<string>('')
  const [driverInfo, setDriverInfo] = useState<{
    name: string
    phone?: string
    vehicle?: string
    plate?: string
  } | null>(null)
  const [copiedOtp, setCopiedOtp] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date())
  const supabase = createClient()

  // Realtime & background auto-polling (never requires page refresh)
  useEffect(() => {
    if (!orderId) return

    const fetchStatus = async () => {
      // Local storage check
      try {
        const savedStatus = localStorage.getItem(`order_status_${orderId}`)
        if (savedStatus) setCurrentStatus(savedStatus)
        const localOrders = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
        const match = localOrders.find((o: any) => o.id === orderId || o.order_id === orderId)
        if (match?.status) setCurrentStatus(match.status)
        if (match?.total) setOrderTotal(Number(match.total))
      } catch {}

      // Supabase query
      try {
        const { data } = await supabase
          .from('orders')
          .select('status, total, address_json, created_at')
          .eq('id', orderId)
          .single()

        if (data) {
          const addr = data.address_json || {}
          setCurrentStatus((prev) => {
            if (prev !== data.status) {
              playNotificationSound('status_change')
            }
            return data.status
          })
          if (data.total) setOrderTotal(Number(data.total))
          if (addr.deliveryOtp) setDeliveryOtp(String(addr.deliveryOtp))
          if (addr.driverName) {
            setDriverInfo({
              name: addr.driverName,
              phone: addr.driverPhone,
              vehicle: addr.driverVehicle || 'Bike',
              plate: addr.driverPlate || 'UP 70',
            })
          }
          setLastSyncedAt(new Date())
        }

        // Check deliveries table for driver join
        const { data: deliv } = await supabase
          .from('deliveries')
          .select('*, driver:drivers(*)')
          .eq('order_id', orderId)
          .maybeSingle()

        if (deliv) {
          if (deliv.otp_code) setDeliveryOtp(deliv.otp_code)
          if (deliv.driver) {
            setDriverInfo({
              name: deliv.driver.name,
              phone: deliv.driver.phone,
              vehicle: deliv.driver.vehicle_type || 'Bike',
              plate: deliv.driver.vehicle_number || 'UP 70',
            })
          }
        }
      } catch {}
    }

    fetchStatus()

    // ── Continuous Background Auto-Polling (3.5s) ──
    const interval = setInterval(fetchStatus, 3500)

    // ── Supabase Realtime Channel ──
    const channel = supabase
      .channel(`order-confirm-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.new && (payload.new.id === orderId || payload.new.order_id === orderId) && payload.new.status) {
            const newSt = payload.new.status
            setCurrentStatus((prev) => {
              if (prev !== newSt) {
                playNotificationSound('status_change')
              }
              return newSt
            })
            setLastSyncedAt(new Date())
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries', filter: `order_id=eq.${orderId}` },
        () => {
          fetchStatus()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [orderId, supabase])

  const handleCopyOtp = () => {
    if (!deliveryOtp) return
    navigator.clipboard.writeText(deliveryOtp)
    setCopiedOtp(true)
    toast.success('Delivery OTP copied to clipboard!')
    setTimeout(() => setCopiedOtp(false), 2500)
  }

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
      case 'assigned':
        return 1
      case 'preparing':
      case 'baking':
        return 2
      case 'out_for_delivery':
      case 'picked_up':
      case 'heading_to_customer':
      case 'arrived':
        return 3
      case 'delivered':
        return 4
      default:
        return 2
    }
  }

  const stepIndex = getStatusStepIndex(currentStatus)

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom max-w-2xl">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E7E0D8] shadow-md text-center space-y-6">
          {/* Checkmark */}
          <div className="w-16 h-16 bg-[#F0FDF4] text-[#15803D] rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="text-xs font-bold tracking-widest text-[#B91C1C] uppercase font-mono">
              Order Confirmed & In Kitchen
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-[#1C1917] mt-1 mb-2">
              Thank You For Your Order!
            </h1>
            <p className="text-[#57534E] text-xs sm:text-sm">
              We&apos;ve received your order and our wood-fired kitchen in Allapur is preparing it fresh.
            </p>
          </div>

          {/* Live Auto-Refresh Pulse Bar */}
          <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-2xl px-4 py-2 flex items-center justify-between text-xs text-[#57534E]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-[#1C1917]">Live Auto-Sync Active</span>
              <span className="text-[11px] text-[#78716C] hidden sm:inline">• Realtime updates in background</span>
            </div>
            <span className="text-[11px] font-mono text-[#78716C]">
              Updated {lastSyncedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Order Summary Pill */}
          <div className="bg-[#FBF9F5] rounded-2xl p-4 flex flex-wrap items-center justify-around gap-4 text-left border border-[#E7E0D8]">
            <div>
              <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block">Order ID</span>
              <span className="font-mono font-bold text-[#1C1917] text-base">
                #{orderId.slice(-6).toUpperCase()}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block">Status</span>
              <span className="font-mono font-bold text-[#B91C1C] text-base capitalize">
                {currentStatus.replace(/_/g, ' ')}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block">Amount</span>
              <span className="font-bold text-[#15803D] text-base font-mono">₹{orderTotal}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="py-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#78716C] mb-6">
              Live Preparation & Dispatch Milestones
            </h3>
            <div className="grid grid-cols-4 gap-2 relative">
              <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-[#E7E0D8] -z-0" />
              <div
                className="absolute top-3.5 left-0 h-0.5 bg-[#B91C1C] -z-0 transition-all duration-500"
                style={{
                  width: stepIndex === 1 ? '15%' : stepIndex === 2 ? '45%' : stepIndex === 3 ? '75%' : '100%',
                }}
              />

              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-colors ${
                  stepIndex >= 1 ? 'bg-[#B91C1C] text-white' : 'bg-[#E7E0D8] text-[#57534E]'
                }`}>
                  ✓
                </div>
                <span className={`text-xs font-serif font-bold ${stepIndex >= 1 ? 'text-[#1C1917]' : 'text-[#57534E]'}`}>Placed</span>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-colors ${
                  stepIndex >= 2 ? 'bg-[#B91C1C] text-white ring-4 ring-[#B91C1C]/20' : 'bg-[#E7E0D8] text-[#57534E]'
                }`}>
                  {stepIndex > 2 ? '✓' : '2'}
                </div>
                <span className={`text-xs font-serif font-bold ${stepIndex === 2 ? 'text-[#B91C1C]' : stepIndex > 2 ? 'text-[#1C1917]' : 'text-[#57534E]'}`}>Baking</span>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  stepIndex >= 3 ? 'bg-[#B91C1C] text-white ring-4 ring-[#B91C1C]/20' : 'bg-[#E7E0D8] text-[#57534E]'
                }`}>
                  {stepIndex > 3 ? '✓' : '3'}
                </div>
                <span className={`text-xs font-serif font-bold ${stepIndex === 3 ? 'text-[#B91C1C]' : stepIndex > 3 ? 'text-[#1C1917]' : 'text-[#57534E]'}`}>On the Way</span>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  stepIndex >= 4 ? 'bg-[#15803D] text-white' : 'bg-[#E7E0D8] text-[#57534E]'
                }`}>
                  {stepIndex >= 4 ? '✓' : '4'}
                </div>
                <span className={`text-xs font-serif font-bold ${stepIndex >= 4 ? 'text-[#15803D]' : 'text-[#57534E]'}`}>Delivered</span>
              </div>
            </div>
          </div>

          {/* Delivery OTP & Rider Card */}
          {deliveryOtp && (
            <div className="bg-[#FBF9F5] rounded-2xl p-4 border border-[#E7E0D8] flex items-center justify-between flex-wrap gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center flex-shrink-0">
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
                <span>{deliveryOtp}</span>
                {copiedOtp ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-[#78716C]" />}
              </button>
            </div>
          )}

          {driverInfo && (
            <div className="bg-white rounded-2xl p-4 border border-[#E7E0D8] flex items-center justify-between text-left gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-center text-lg">
                  🛵
                </div>
                <div>
                  <span className="font-bold text-xs text-[#1C1917] block">{driverInfo.name}</span>
                  <span className="text-[11px] text-[#78716C] font-mono">
                    {driverInfo.vehicle} • {driverInfo.plate}
                  </span>
                </div>
              </div>

              {driverInfo.phone && (
                <a
                  href={`tel:${driverInfo.phone}`}
                  className="px-3 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Phone size={12} />
                  <span>Call Rider</span>
                </a>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/track?orderId=${orderId}`} className="btn btn-primary btn-lg rounded-xl flex items-center justify-center gap-2 shadow-md">
              <Truck size={17} /> Track Live GPS & Telemetry
            </Link>
            <a
              href={`https://wa.me/919999999999?text=${encodeURIComponent('Hi! I need help with my order ' + orderId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-lg rounded-xl flex items-center justify-center gap-2"
            >
              <MessageCircle size={17} /> WhatsApp Updates
            </a>
          </div>

          <p className="text-[11px] text-[#78716C] pt-2">
            A confirmation SMS and email have been sent to your registered contact details.
          </p>
        </div>
      </div>
    </div>
  )
}
