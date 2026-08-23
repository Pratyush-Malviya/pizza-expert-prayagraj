'use client'

import { motion } from 'framer-motion'
import { Star, ShieldCheck, MapPin } from 'lucide-react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { useState, useEffect } from 'react'
import { getPublicReviews, ReviewItem } from '@/app/actions/reviews'
import { getHomepageReviewSettings, HomepageReviewSettings } from '@/app/actions/settings'

export default function GoogleReviews() {
  const [mounted, setMounted] = useState(false)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const storeSettings = useSettingsStore()
  const [headerSettings, setHeaderSettings] = useState<HomepageReviewSettings>({
    ratingScore: '4.9 / 5.0',
    sectionTitle: 'PRAYAGRAJ REVIEWS',
    sectionSubtitle: 'Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad.',
    btnText: 'WRITE A REVIEW',
    googleReviewsLink: 'https://g.page/r/pizzaexpert-prayagraj/review',
  })

  useEffect(() => {
    setMounted(true)
    // 1. Fetch live review items
    getPublicReviews().then((data) => {
      if (data && data.length > 0) {
        setReviews(data)
      }
    })

    // 2. Fetch server persisted settings
    getHomepageReviewSettings().then((res) => {
      if (res) {
        setHeaderSettings(res)
        storeSettings.updateSettings({
          reviewsRatingScore: res.ratingScore,
          reviewsSectionTitle: res.sectionTitle,
          reviewsSectionSubtitle: res.sectionSubtitle,
          reviewsBtnText: res.btnText,
          googleReviewsLink: res.googleReviewsLink,
        })
      }
    })
  }, [])

  const ratingScore =
    mounted && storeSettings.reviewsRatingScore
      ? storeSettings.reviewsRatingScore
      : headerSettings.ratingScore || '4.9 / 5.0'
  const sectionTitle =
    mounted && storeSettings.reviewsSectionTitle
      ? storeSettings.reviewsSectionTitle
      : headerSettings.sectionTitle || 'PRAYAGRAJ REVIEWS'
  const sectionSubtitle =
    mounted && storeSettings.reviewsSectionSubtitle
      ? storeSettings.reviewsSectionSubtitle
      : headerSettings.sectionSubtitle ||
        'Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad.'
  const btnText =
    mounted && storeSettings.reviewsBtnText
      ? storeSettings.reviewsBtnText
      : headerSettings.btnText || 'WRITE A REVIEW'
  const googleLink =
    mounted && storeSettings.googleReviewsLink
      ? storeSettings.googleReviewsLink
      : headerSettings.googleReviewsLink || 'https://g.page/r/pizzaexpert-prayagraj/review'

  return (
    <section className="section-py bg-[var(--bg-subtle)] border-y border-[var(--border)]" aria-labelledby="reviews-heading">
      <div className="container-custom">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 border-b border-[var(--border)] pb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1 text-[#FFC01D]">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} size={18} fill="currentColor" />
                ))}
              </div>
              <span className="font-mono font-black text-[var(--text-primary)] text-sm bg-[var(--bg-surface)] border border-[var(--border)] px-2 py-0.5 rounded-md shadow-xs">
                {ratingScore}
              </span>
            </div>
            <h2 id="reviews-heading" className="section-title text-[var(--text-primary)]">
              {sectionTitle}
            </h2>
            <p className="section-subtitle">
              {sectionSubtitle}
            </p>
          </div>

          <a
            href={mounted ? googleLink : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary rounded-full px-6 py-3 text-xs font-extrabold uppercase tracking-wider shrink-0 self-start md:self-auto border border-[var(--border)] hover:border-[#FF3B00]/40 text-[var(--text-primary)]"
          >
            {btnText}
          </a>
        </div>

        {/* Dynamic Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {reviews.slice(0, 9).map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.1 }}
              className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--border)] flex flex-col justify-between h-full hover:border-[#FF3B00]/30 transition-all shadow-md"
            >
              <div>
                <div className="flex items-center gap-1 text-[#FFC01D] mb-3">
                  {[...Array(review.rating || 5)].map((_, idx) => (
                    <Star key={idx} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed italic mb-6 font-normal">
                  &quot;{review.comment}&quot;
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <div>
                  <p className="font-heading font-extrabold text-[var(--text-primary)] text-base tracking-tight">
                    {review.customer_name}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs flex items-center gap-1 mt-0.5 font-medium">
                    <MapPin size={12} className="text-[#FF3B00]" /> {review.location || 'Prayagraj'}
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
