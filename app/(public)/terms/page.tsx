'use client'

import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'

export default function TermsPage() {
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
          Terms & Conditions
        </h1>
        <p className="text-xs text-[#A8A29E]">Last updated: August 2026</p>

        <section className="space-y-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">1. Acceptance of Terms</h2>
          <p>
            By accessing or ordering from the {storeName} website, you agree to comply with these terms. If you do not agree, please refrain from using our online services.
          </p>
        </section>

        <section className="space-y-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">2. Ordering & Pricing</h2>
          <p>
            All prices listed on the site are in Indian Rupees (INR) and subject to applicable taxes. Prices and product availability may change without prior notice.
          </p>
        </section>

        <section className="space-y-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">3. Delivery Policy</h2>
          <p>
            Estimated delivery times (30 minutes) are approximate. Actual delivery time may vary depending on traffic, weather, and peak kitchen hours.
          </p>
        </section>
      </div>
    </div>
  )
}
