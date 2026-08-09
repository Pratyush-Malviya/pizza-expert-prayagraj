'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, HelpCircle } from 'lucide-react'
import Link from 'next/link'

const ALL_FAQS = [
  {
    category: 'Ordering & Delivery',
    items: [
      {
        q: 'How long does delivery take?',
        a: 'We aim to deliver your order within 30 minutes in Prayagraj. During peak hours (weekends/evenings), it may take up to 45 minutes.',
      },
      {
        q: 'What is the minimum order for free delivery?',
        a: 'We offer FREE delivery on all orders above ₹499. For orders under ₹499, a nominal delivery fee of ₹30 applies.',
      },
      {
        q: 'What areas do you deliver to in Prayagraj?',
        a: 'We deliver across Allapur, Civil Lines, Katra, Tagoretown, Ashok Nagar, and surrounding areas in Prayagraj.',
      },
    ],
  },
  {
    category: 'Payments & Refunds',
    items: [
      {
        q: 'What payment options are available?',
        a: 'We accept Razorpay (UPI, Credit/Debit Cards, Net Banking), Cashfree, and Cash on Delivery (COD).',
      },
      {
        q: 'How do refunds work if my payment failed?',
        a: 'If money was deducted for a failed payment, it will be automatically refunded by your bank within 3–5 business days. Contact us if you need assistance.',
      },
    ],
  },
  {
    category: 'Food & Ingredients',
    items: [
      {
        q: 'Are your vegetarian items prepared separately?',
        a: 'Yes! We follow strict separation protocols. Pure vegetarian items are prepared using dedicated utensils and separate oven spaces.',
      },
      {
        q: 'Can I customize my pizza toppings?',
        a: 'Absolutely! You can choose your pizza size, crust type (Thin Crust, Cheese Burst), and add extra cheese or toppings on the product page.',
      },
    ],
  },
]

export default function FaqPage() {
  const [search, setSearch] = useState('')
  const [openIndex, setOpenIndex] = useState<string | null>(null)

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom max-w-4xl">
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-[#FEF2F2] text-[#B91C1C] rounded-lg flex items-center justify-center mx-auto mb-3">
            <HelpCircle size={24} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#1C1917] mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm max-w-lg mx-auto">
            Everything you need to know about ordering, delivery, and payment at Pizza Expert Prayagraj.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-10 relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions (e.g. delivery time, payment)..."
            className="input-field pl-10 pr-4 py-3 text-xs sm:text-sm rounded-lg bg-white shadow-xs"
          />
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {ALL_FAQS.map((cat, catIdx) => {
            const filteredItems = cat.items.filter(
              (item) =>
                item.q.toLowerCase().includes(search.toLowerCase()) ||
                item.a.toLowerCase().includes(search.toLowerCase())
            )

            if (filteredItems.length === 0) return null

            return (
              <div key={cat.category} className="space-y-3">
                <h2 className="font-serif font-bold text-[#1C1917] text-lg pl-3 border-l-3 border-[#B91C1C]">
                  {cat.category}
                </h2>

                {filteredItems.map((item, itemIdx) => {
                  const id = `${catIdx}-${itemIdx}`
                  const isOpen = openIndex === id

                  return (
                    <div
                      key={id}
                      className="bg-white rounded-xl border border-[#E7E0D8] overflow-hidden shadow-xs"
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : id)}
                        className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-serif font-bold text-[#1C1917] text-sm sm:text-base"
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          size={16}
                          className={`text-[#A8A29E] transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-[#B91C1C]' : ''
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-4 sm:px-5 pb-5 text-[#57534E] text-xs sm:text-sm leading-relaxed border-t border-[#E7E0D8]/60 pt-3">
                              {item.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="text-center mt-12 bg-white rounded-xl p-8 border border-[#E7E0D8] shadow-xs max-w-xl mx-auto space-y-3">
          <h3 className="font-serif font-bold text-[#1C1917] text-lg">
            Still Have Questions?
          </h3>
          <p className="text-[#57534E] text-xs">
            We are always here to help. Reach out to our support team directly.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/contact" className="btn btn-primary btn-sm">
              Contact Us
            </Link>
            <a
              href="https://wa.me/919999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-sm"
            >
              WhatsApp Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
