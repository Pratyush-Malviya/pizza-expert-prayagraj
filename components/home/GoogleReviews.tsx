'use client'

import { motion } from 'framer-motion'
import { Star, CheckCircle2 } from 'lucide-react'
import { getInitials } from '@/lib/utils'

const REVIEWS = [
  {
    id: 'r1',
    name: 'Rahul Sharma',
    rating: 5,
    text: 'Absolutely love Pizza Expert! The Paneer Tikka Pizza is my all-time favourite. Fast delivery, hot pizza — what more can you ask for?',
    date: '2 days ago',
  },
  {
    id: 'r2',
    name: 'Priya Singh',
    rating: 5,
    text: 'Best pizza in Prayagraj, no doubt. The crust is perfectly crispy and the cheese burst option is divine. Ordering every week!',
    date: '1 week ago',
  },
  {
    id: 'r3',
    name: 'Amit Verma',
    rating: 5,
    text: 'The Family Feast combo is amazing value! 2 large pizzas + drinks for ₹899. Entire family was happy. Will definitely order again.',
    date: '2 weeks ago',
  },
  {
    id: 'r4',
    name: 'Sneha Gupta',
    rating: 5,
    text: 'Ordered the Chicken Supreme via WhatsApp and it arrived in 25 minutes! Still hot and incredibly fresh. Customer service is top notch.',
    date: '3 weeks ago',
  },
]

export default function GoogleReviews() {
  return (
    <section className="section-py bg-[#18181B] text-white" aria-labelledby="reviews-heading">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#27272A] border border-[#3F3F46] text-[#D97706] px-3.5 py-1.5 rounded-md text-xs font-semibold mb-4">
            <Star size={14} fill="currentColor" />
            <span>4.9 / 5.0 Rating on Google Reviews</span>
          </div>

          <h2 id="reviews-heading" className="section-title text-white">Guest Testimonials</h2>
          <div className="section-divider"><span /></div>
          <p className="section-subtitle text-[#A8A29E]">
            Hear from our regulars across Allapur & Prayagraj.
          </p>
        </div>

        {/* Review Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {REVIEWS.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex text-[#D97706] mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-[#E7E0D8] text-xs leading-relaxed italic mb-6">
                  &quot;{review.text}&quot;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#3F3F46]">
                <div className="w-8 h-8 rounded-md bg-[#B91C1C] flex items-center justify-center text-white text-xs font-bold font-mono">
                  {getInitials(review.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-white text-xs truncate">{review.name}</p>
                    <CheckCircle2 size={12} className="text-[#D97706] flex-shrink-0" />
                  </div>
                  <span className="text-[#A8A29E] text-[10px] block">{review.date}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Link */}
        <div className="text-center">
          <a
            href="https://g.page/r/pizzaexpert-prayagraj/review"
            target="_blank"
            rel="noopener noreferrer"
            id="write-review-btn"
            className="btn btn-outline text-white border-[#3F3F46] hover:bg-[#27272A]"
          >
            <Star size={15} fill="#D97706" className="text-[#D97706]" />
            Write a Review on Google
          </a>
        </div>
      </div>
    </section>
  )
}
