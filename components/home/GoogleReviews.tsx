'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { useState, useEffect } from 'react'

const REVIEWS = [
  {
    id: 'r1',
    name: 'Rahul Sharma',
    text: 'Best pizza in Prayagraj, no doubt. The crust is perfectly crispy and the cheese burst option is divine. Ordering every week!',
  },
  {
    id: 'r2',
    name: 'Priya Singh',
    text: 'Absolutely love Pizza Expert! The Paneer Tikka Pizza is my all-time favourite. Fast delivery, hot pizza — what more can you ask for?',
  },
  {
    id: 'r3',
    name: 'Amit Verma',
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
    <section className="section-py bg-[var(--bg-dark)]" aria-labelledby="reviews-heading">
      <div className="container-custom">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-[#3F3F46] pb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} fill="var(--primary)" className="text-[var(--primary)]" />
              <Star size={16} fill="var(--primary)" className="text-[var(--primary)]" />
              <Star size={16} fill="var(--primary)" className="text-[var(--primary)]" />
              <Star size={16} fill="var(--primary)" className="text-[var(--primary)]" />
              <Star size={16} fill="var(--primary)" className="text-[var(--primary)]" />
            </div>
            <h2 id="reviews-heading" className="section-title text-white mb-0">Guest Testimonials</h2>
          </div>
          
          <a
            href={mounted ? googleReviewsLink : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary-inverse shrink-0 self-start md:self-auto"
          >
            Leave a Review
          </a>
        </div>

        {/* 3 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {REVIEWS.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col justify-between h-full"
            >
              <p className="font-serif text-[#E7E0D8] text-lg leading-relaxed italic mb-8">
                &quot;{review.text}&quot;
              </p>

              <div>
                <p className="font-sans font-bold text-white tracking-wide">{review.name}</p>
                <p className="text-[#A8A29E] text-xs mt-1">Verified Order</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
