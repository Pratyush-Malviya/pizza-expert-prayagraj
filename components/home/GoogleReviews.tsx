'use client'

import { motion } from 'framer-motion'
import { Star, ShieldCheck, MapPin } from 'lucide-react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { useState, useEffect } from 'react'

const REVIEWS = [
  {
    id: 'r1',
    name: 'Rahul Sharma',
    location: 'Allapur, Prayagraj',
    text: 'Best pizza in Prayagraj, no doubt. The crust is perfectly crispy and the cheese burst option is divine. Ordering every week!',
  },
  {
    id: 'r2',
    name: 'Priya Singh',
    location: 'Civil Lines, Prayagraj',
    text: 'Absolutely love Pizza Expert! The Paneer Tikka Pizza is my all-time favourite. Fast delivery, hot pizza — what more can you ask for?',
  },
  {
    id: 'r3',
    name: 'Amit Verma',
    location: 'Katra, Prayagraj',
    text: 'The Family Feast combo is amazing value! 2 large pizzas + drinks for ₹899. Entire family was happy. Will definitely order again.',
  },
]

export default function GoogleReviews() {
  const [mounted, setMounted] = useState(false)
  const googleReviewsLink = useSettingsStore((state) => state.googleReviewsLink)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="section-py bg-[#08080B] border-y border-white/10" aria-labelledby="reviews-heading">
      <div className="container-custom">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1 text-[#FFC01D]">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} size={18} fill="currentColor" />
                ))}
              </div>
              <span className="font-mono font-black text-white text-sm bg-white/10 px-2 py-0.5 rounded-md">
                4.9 / 5.0
              </span>
            </div>
            <h2 id="reviews-heading" className="section-title text-white">
              PRAYAGRAJ REVIEWS
            </h2>
            <p className="section-subtitle">
              Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad.
            </p>
          </div>
          
          <a
            href={mounted ? googleReviewsLink : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary rounded-full px-6 py-3 text-xs font-extrabold uppercase tracking-wider shrink-0 self-start md:self-auto border border-white/15 hover:border-white/30"
          >
            WRITE A REVIEW
          </a>
        </div>

        {/* 3 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {REVIEWS.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-[#16161E] rounded-3xl p-6 border border-white/10 flex flex-col justify-between h-full hover:border-white/20 transition-all"
            >
              <p className="text-zinc-200 text-base leading-relaxed italic mb-8 font-normal">
                &quot;{review.text}&quot;
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="font-heading font-extrabold text-white text-base tracking-tight">{review.name}</p>
                  <p className="text-zinc-400 text-xs flex items-center gap-1 mt-0.5 font-medium">
                    <MapPin size={12} className="text-[#FF3B00]" /> {review.location}
                  </p>
                </div>
                
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 rounded-md">
                  <ShieldCheck size={12} /> Verified
                </span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}

