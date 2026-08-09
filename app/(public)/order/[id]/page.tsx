'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, Clock, Truck, MessageCircle } from 'lucide-react'

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = (params?.id as string) || 'ORD-982143'

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom max-w-2xl">
        <div className="bg-white rounded-xl p-8 sm:p-10 border border-[#E7E0D8] shadow-xs text-center space-y-6">
          {/* Checkmark */}
          <div className="w-16 h-16 bg-[#F0FDF4] text-[#15803D] rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="text-xs font-bold tracking-widest text-[#B91C1C] uppercase font-mono">
              Order Confirmed
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1917] mt-1 mb-2">
              Thank You For Your Order!
            </h1>
            <p className="text-[#57534E] text-xs sm:text-sm">
              We've received your order and our kitchen in Allapur is preparing it with care.
            </p>
          </div>

          {/* Order Summary Pill */}
          <div className="bg-[#FBF9F5] rounded-lg p-4 flex flex-wrap items-center justify-around gap-4 text-left border border-[#E7E0D8]">
            <div>
              <span className="text-[10px] text-[#A8A29E] uppercase font-bold tracking-wider block">Order ID</span>
              <span className="font-mono font-bold text-[#1C1917] text-base">{orderId}</span>
            </div>

            <div>
              <span className="text-[10px] text-[#A8A29E] uppercase font-bold tracking-wider block">Estimated Delivery</span>
              <span className="font-mono font-bold text-[#B91C1C] text-base flex items-center gap-1">
                <Clock size={15} /> 25–30 Mins
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#A8A29E] uppercase font-bold tracking-wider block">Payment Status</span>
              <span className="font-semibold text-[#15803D] text-base">Confirmed</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="py-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E] mb-6">
              Live Status Progress
            </h3>
            <div className="grid grid-cols-4 gap-2 relative">
              <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-[#E7E0D8] -z-0" />
              <div className="absolute top-3.5 left-0 w-1/3 h-0.5 bg-[#B91C1C] -z-0" />

              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#B91C1C] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  ✓
                </div>
                <span className="text-xs font-serif font-bold text-[#1C1917]">Placed</span>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#B91C1C] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  2
                </div>
                <span className="text-xs font-serif font-bold text-[#B91C1C]">Baking</span>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-2 opacity-50">
                <div className="w-7 h-7 rounded-full bg-[#E7E0D8] text-[#57534E] flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <span className="text-xs font-serif font-medium text-[#57534E]">On the Way</span>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-2 opacity-50">
                <div className="w-7 h-7 rounded-full bg-[#E7E0D8] text-[#57534E] flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <span className="text-xs font-serif font-medium text-[#57534E]">Delivered</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/track?orderId=${orderId}`} className="btn btn-primary btn-lg">
              <Truck size={17} /> Track Live Status
            </Link>
            <a
              href={`https://wa.me/919999999999?text=${encodeURIComponent('Hi! I need help with my order ' + orderId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-lg"
            >
              <MessageCircle size={17} /> WhatsApp Updates
            </a>
          </div>

          <p className="text-[11px] text-[#A8A29E] pt-2">
            A confirmation SMS and email have been sent to your registered contact details.
          </p>
        </div>
      </div>
    </div>
  )
}
