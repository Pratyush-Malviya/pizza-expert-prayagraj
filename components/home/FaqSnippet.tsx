'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import Link from 'next/link'

const FAQS = [
  {
    id: 'faq-delivery',
    question: 'How fast is delivery in Prayagraj?',
    answer: 'We deliver your order within 30 minutes in Allapur and central Prayagraj. During peak traffic or rain, delivery takes up to 45 minutes.',
  },
  {
    id: 'faq-payment',
    question: 'What payment methods are supported?',
    answer: 'We accept Razorpay (UPI, Google Pay, PhonePe, Paytm, Credit/Debit Cards, Net Banking), Cashfree, and Cash on Delivery (COD).',
  },
  {
    id: 'faq-veg',
    question: 'Are vegetarian items prepared separately?',
    answer: 'Yes! Pure veg items are cooked using 100% separate utensils, dedicated prep counters, and separate oven compartments.',
  },
  {
    id: 'faq-delivery-area',
    question: 'Is delivery free on all orders?',
    answer: 'Delivery is 100% FREE on all orders above ₹499. For orders below ₹499, a nominal delivery fee of ₹30 applies.',
  },
]

export default function FaqSnippet() {
  const [openId, setOpenId] = useState<string | null>(FAQS[0].id)

  return (
    <section className="section-py bg-[#FBF9F5]" aria-labelledby="faq-snippet-heading">
      <div className="container-custom max-w-3xl">
        <div className="text-center mb-12">
          <div className="w-10 h-10 bg-[#FEF2F2] text-[#B91C1C] rounded-md flex items-center justify-center mx-auto mb-3">
            <HelpCircle size={20} />
          </div>
          <h2 id="faq-snippet-heading" className="section-title">Frequently Asked Questions</h2>
          <div className="section-divider"><span /></div>
          <p className="section-subtitle">Got questions? We have answers.</p>
        </div>

        <div className="space-y-3" role="list">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id
            return (
              <div
                key={faq.id}
                className={`bg-white rounded-xl border transition-colors overflow-hidden ${
                  isOpen ? 'border-[#B91C1C]/40 shadow-xs' : 'border-[#E7E0D8]'
                }`}
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left font-serif font-bold text-[#1C1917] text-base sm:text-lg"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                >
                  <span className="pr-4">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isOpen ? 'bg-[#B91C1C] text-white' : 'bg-[#F4EFEA] text-[#57534E]'
                    }`}
                  >
                    <ChevronDown size={16} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 text-[#57534E] text-xs sm:text-sm leading-relaxed border-t border-[#E7E0D8]/60 pt-3">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-8">
          <Link href="/faq" id="view-all-faqs-btn" className="btn btn-outline">
            View All FAQs
          </Link>
        </div>
      </div>
    </section>
  )
}
