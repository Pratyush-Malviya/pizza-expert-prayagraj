'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
    <section className="section-py bg-[var(--bg-primary)]" aria-labelledby="faq-heading">
      <div className="container-custom max-w-3xl">
        <div className="text-center mb-16">
          <h2 id="faq-heading" className="section-title">Common Questions</h2>
        </div>

        <div className="border-t border-[var(--border)]" role="list">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id
            return (
              <div key={faq.id} className="border-b border-[var(--border)]">
                <button
                  className="w-full flex items-center justify-between py-6 text-left font-serif font-bold text-[var(--text-primary)] text-lg md:text-xl group"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                >
                  <span className="pr-4 group-hover:text-[var(--primary)] transition-colors">{faq.question}</span>
                  <span className="text-[var(--text-secondary)] font-sans font-light text-2xl leading-none">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="pb-8 text-[var(--text-secondary)] text-sm md:text-base leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
