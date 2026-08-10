'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { useSettingsStore } from '@/lib/store/useSettingsStore'

export default function FaqPage() {
  const store = useSettingsStore()
  const [search, setSearch] = useState('')
  const [openIndex, setOpenIndex] = useState<string | null>(null)

  const faqCategories = useMemo(() => {
    const list = store.faqs || []
    const categoryMap = new Map<string, Array<{ id: string; q: string; a: string }>>()
    
    list.forEach((item) => {
      const cat = item.category || 'General Questions'
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, [])
      }
      categoryMap.get(cat)!.push({ id: item.id, q: item.question, a: item.answer })
    })

    return Array.from(categoryMap.entries()).map(([category, items]) => ({
      category,
      items,
    }))
  }, [store.faqs])

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
            Everything you need to know about ordering, delivery, and payment at {store.businessName || 'Pizza Expert Prayagraj'}.
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
          {faqCategories.map((cat) => {
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

                {filteredItems.map((item) => {
                  const isOpen = openIndex === item.id

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-[#E7E0D8] overflow-hidden shadow-xs"
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : item.id)}
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
              href={`https://wa.me/${store.whatsapp || '919999999999'}`}
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
