'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

const INITIAL_COUPONS = [
  { id: 'c1', code: 'WELCOME20', type: 'Percentage (20%)', minOrder: 299, usedCount: 142, active: true },
  { id: 'c2', code: 'FLAT50', type: 'Fixed (₹50)', minOrder: 399, usedCount: 88, active: true },
  { id: 'c3', code: 'PIZZA10', type: 'Percentage (10%)', minOrder: 199, usedCount: 210, active: true },
]

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState(INITIAL_COUPONS)

  const toggleCoupon = (id: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    )
    toast.success('Coupon status updated')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1C1917]">
            Coupons & Deals
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            Create discount codes and promotional offers.
          </p>
        </div>

        <button onClick={() => toast.info('Create coupon modal coming soon')} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[#1C1917] tracking-wider text-base bg-[#FBF9F5] px-3 py-1 rounded-md border border-[#E7E0D8]">
                {coupon.code}
              </span>
              <button
                onClick={() => toggleCoupon(coupon.id)}
                className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                  coupon.active ? 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]/20' : 'bg-[#F4EFEA] text-[#A8A29E] border-[#E7E0D8]'
                }`}
              >
                {coupon.active ? 'Active' : 'Disabled'}
              </button>
            </div>

            <div className="text-xs text-[#57534E] space-y-1">
              <p>Type: <strong className="text-[#1C1917] font-semibold">{coupon.type}</strong></p>
              <p>Min Order: <strong className="text-[#1C1917] font-mono">₹{coupon.minOrder}</strong></p>
              <p>Total Redemptions: <strong className="text-[#1C1917] font-semibold">{coupon.usedCount} times</strong></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
