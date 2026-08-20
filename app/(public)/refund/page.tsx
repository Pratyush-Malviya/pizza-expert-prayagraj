'use client'

import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'

export default function RefundPage() {
  const [mounted, setMounted] = useState(false)
  const store = useSettingsStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const storeName = mounted && store.businessName ? store.businessName : 'Pizza Expert Prayagraj'

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom max-w-3xl bg-white rounded-xl p-8 sm:p-12 border border-[#E7E0D8] shadow-xs space-y-6">
        <h1 className="text-3xl font-serif font-bold text-[#1C1917] border-b border-[#E7E0D8] pb-4">
          Refund & Cancellation Policy
        </h1>
        <p className="text-xs text-[#A8A29E]">Last updated: August 2026</p>

        <section className="space-y-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">1. Order Cancellations</h2>
          <p>
            You may cancel your order within 5 minutes of placing it by contacting {storeName} directly or via WhatsApp. Once kitchen preparation has started, orders cannot be cancelled.
          </p>
        </section>

        <section className="space-y-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">2. Refund Eligibility</h2>
          <p>
            You are eligible for a full refund or replacement if:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You received the wrong item or missing items in your order.</li>
            <li>The order was delivered damaged or in an unhygienic condition.</li>
            <li>Your online payment was deducted but the order failed to confirm.</li>
          </ul>
        </section>

        <section className="space-y-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">3. Refund Processing</h2>
          <p>
            Approved refunds for online payments (Razorpay / Cashfree) will be processed back to your original payment source within 3–5 business days.
          </p>
        </section>
      </div>
    </div>
  )
}
