'use client'

import Link from 'next/link'
import { Tag, Copy, Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const OFFERS = [
  {
    code: 'WELCOME20',
    title: '20% OFF First Order',
    description: 'Get 20% discount on your first online order. Valid for new customers on orders above ₹299.',
    discount: '20% OFF',
    type: 'Percentage Discount',
    minOrder: '₹299',
    badge: 'NEW USER',
  },
  {
    code: 'FLAT50',
    title: 'Flat ₹50 OFF',
    description: 'Flat ₹50 discount on any wood-fired pizza or combo order above ₹399.',
    discount: '₹50 OFF',
    type: 'Flat Discount',
    minOrder: '₹399',
    badge: 'POPULAR',
  },
  {
    code: 'PIZZA10',
    title: '10% Weekend Special',
    description: 'Enjoy 10% off all medium and large pizzas every Saturday & Sunday.',
    discount: '10% OFF',
    type: 'Weekend Deal',
    minOrder: '₹199',
    badge: 'WEEKEND',
  },
]

export default function OffersPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Copied code ${code} to clipboard!`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 bg-[#FEF2F2] border border-[#B91C1C]/20 text-[#B91C1C] px-3.5 py-1.5 rounded-md text-xs font-semibold mb-3">
            <Sparkles size={14} /> Exclusive Pizzeria Offers
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#1C1917] mb-3">
            Coupons & Special Deals
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm max-w-lg mx-auto">
            Copy any promo code below and apply it at checkout to save on your favorite pizzas!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {OFFERS.map((offer) => (
            <div
              key={offer.code}
              className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs flex flex-col justify-between hover:border-[#B91C1C]/30 hover:shadow-md transition-all relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-[#FEF2F2] text-[#B91C1C] px-2.5 py-1 rounded-md border border-[#B91C1C]/20 font-mono">
                    {offer.badge}
                  </span>
                  <span className="font-bold text-lg text-[#B91C1C] font-mono">
                    {offer.discount}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-[#1C1917] text-lg mb-2">
                  {offer.title}
                </h3>
                <p className="text-[#57534E] text-xs leading-relaxed mb-6">
                  {offer.description}
                </p>
              </div>

              <div className="pt-4 border-t border-dashed border-[#E7E0D8] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#57534E]">
                  <span>Min Order: <strong className="text-[#1C1917] font-mono">{offer.minOrder}</strong></span>
                  <span className="text-[#A8A29E]">{offer.type}</span>
                </div>

                <div className="flex items-center justify-between bg-[#FBF9F5] p-2.5 rounded-md border border-[#E7E0D8]">
                  <span className="font-mono font-bold text-[#1C1917] tracking-wider text-sm pl-2">
                    {offer.code}
                  </span>
                  <button
                    onClick={() => copyToClipboard(offer.code)}
                    className="btn btn-outline btn-sm font-semibold text-xs flex items-center gap-1"
                  >
                    {copiedCode === offer.code ? (
                      <>
                        <Check size={14} className="text-[#15803D]" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/menu" className="btn btn-primary btn-lg">
            Browse Menu & Order Now
          </Link>
        </div>
      </div>
    </div>
  )
}
