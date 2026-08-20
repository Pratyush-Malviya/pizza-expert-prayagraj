'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  X,
  Sparkles,
  CheckCircle2,
  ThumbsUp,
  MessageSquare,
  Bike,
  ChefHat,
  ExternalLink,
  Heart,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { toast } from 'sonner'

interface DeliveryFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  driverName?: string
  orderTotal?: number
  onSubmitted?: () => void
}

const RATING_EMOJIS = [
  { star: 1, label: 'Terrible', emoji: '😞' },
  { star: 2, label: 'Could be better', emoji: '😐' },
  { star: 3, label: 'Good & Tasty', emoji: '😊' },
  { star: 4, label: 'Super Delicious', emoji: '😋' },
  { star: 5, label: 'Extraordinary!', emoji: '🌟' },
]

const QUICK_TAGS = [
  '🔥 Hot & Fresh',
  '🧀 Extra Cheesy',
  '⚡ Super Fast Delivery',
  '🛵 Polite Rider',
  '📦 Great Packaging',
  '🍕 Perfect Crust',
  '🌿 Fresh Ingredients',
  '💯 Value for Money',
]

export default function DeliveryFeedbackModal({
  isOpen,
  onClose,
  orderId,
  driverName,
  orderTotal,
  onSubmitted,
}: DeliveryFeedbackModalProps) {
  const [foodRating, setFoodRating] = useState<number>(5)
  const [deliveryRating, setDeliveryRating] = useState<number>(5)
  const [selectedTags, setSelectedTags] = useState<string[]>([
    '🔥 Hot & Fresh',
    '⚡ Super Fast Delivery',
  ])
  const [comment, setComment] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)
  const [hoverFood, setHoverFood] = useState<number | null>(null)
  const [hoverDelivery, setHoverDelivery] = useState<number | null>(null)

  const googleReviewsLink = useSettingsStore((state) => state.googleReviewsLink)
  const businessName = useSettingsStore((state) => state.businessName) || 'Pizza Expert'

  // Reset states when opening for a new order
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false)
      setFoodRating(5)
      setDeliveryRating(5)
      setSelectedTags(['🔥 Hot & Fresh', '⚡ Super Fast Delivery'])
      setComment('')
    }
  }, [isOpen, orderId])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foodRating) {
      toast.error('Please select a star rating.')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const fullComment = [
        comment.trim(),
        selectedTags.length > 0 ? `Tags: ${selectedTags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' | ')

      const { error } = await supabase.from('reviews').insert({
        order_id: orderId,
        user_id: user?.id || null,
        rating: foodRating,
        delivery_rating: deliveryRating,
        tags: selectedTags,
        comment: fullComment || 'Great experience!',
        is_approved: true,
      })

      if (error) {
        console.warn('Supabase review insert warning:', error.message)
      }

      // Mark as reviewed in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`reviewed_order_${orderId}`, 'true')
      }

      setIsSuccess(true)
      toast.success('Thank you! Your feedback helps us bake better pizzas.')
      if (onSubmitted) onSubmitted()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review. Thank you anyway!')
      setIsSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const activeFoodEmoji =
    RATING_EMOJIS.find((r) => r.star === (hoverFood || foodRating)) || RATING_EMOJIS[4]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-lg bg-[#14141A] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white z-10 my-8 overflow-hidden"
        >
          {/* Subtle warm glow background */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF3B00]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FFC01D]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close review popup"
          >
            <X size={18} />
          </button>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Header */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF3B00]/15 border border-[#FF3B00]/30 text-[#FF3B00] text-xs font-black uppercase tracking-wider mb-1 font-mono">
                  <Sparkles size={13} className="animate-spin" />
                  Order Delivered Successfully!
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
                  How Was Your Pizza?
                </h2>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Order #{orderId.slice(-6).toUpperCase()} • Your feedback helps {businessName} serve you the hottest, crispest slices!
                </p>
              </div>

              {/* Food Rating Section */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-300">
                  <ChefHat size={15} className="text-[#FF3B00]" />
                  <span>Rate Food & Taste</span>
                  <span className="text-xl">{activeFoodEmoji.emoji}</span>
                </div>

                <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverFood || foodRating)
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFoodRating(star)}
                        onMouseEnter={() => setHoverFood(star)}
                        onMouseLeave={() => setHoverFood(null)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          size={32}
                          className={`transition-colors ${
                            isFilled
                              ? 'fill-[#FFC01D] text-[#FFC01D] filter drop-shadow-[0_0_8px_rgba(255,192,29,0.5)]'
                              : 'text-zinc-600 hover:text-zinc-400'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
                <div className="text-xs font-bold text-[#FFC01D] tracking-wide">
                  {activeFoodEmoji.label}
                </div>
              </div>

              {/* Delivery Partner Rating */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Bike size={16} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-white">
                      {driverName ? `Delivery by ${driverName}` : 'Delivery Experience'}
                    </p>
                    <p className="text-[10px] text-zinc-400">Speed, courtesy & packaging</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setDeliveryRating(star)}
                      onMouseEnter={() => setHoverDelivery(star)}
                      onMouseLeave={() => setHoverDelivery(null)}
                      className="p-0.5 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={18}
                        className={
                          star <= (hoverDelivery || deliveryRating)
                            ? 'fill-emerald-400 text-emerald-400'
                            : 'text-zinc-600'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tags */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  What did you like the most?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#FF3B00] text-white shadow-md shadow-[#FF3B00]/30 border border-[#FF3B00]'
                            : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Comment Textarea */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Detailed Review / Suggestions (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Tell us what you loved or how we can make your next meal even better..."
                  className="w-full bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B00] resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:flex-1 bg-gradient-to-r from-[#FF3B00] to-[#E03400] hover:from-[#E03400] hover:to-[#C02B00] text-white py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF3B00]/30 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting Feedback...</span>
                    </>
                  ) : (
                    <>
                      <ThumbsUp size={15} />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </form>
          ) : (
            /* Success State */
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-serif font-black text-white">
                  Thank You for Your Feedback! 🍕
                </h3>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                  Your review has been captured. We look forward to baking your next hot meal!
                </p>
              </div>

              {/* Google Reviews Boost for 4-5 stars */}
              {foodRating >= 4 && googleReviewsLink && (
                <div className="bg-gradient-to-br from-[#FF3B00]/15 to-[#FFC01D]/15 border border-[#FF3B00]/30 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center gap-2">
                    <Heart size={18} className="text-[#FF3B00] fill-[#FF3B00]" />
                    <span className="text-xs font-bold text-white">
                      Loved your pizza from {businessName}?
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    It would mean the world to our team if you shared a quick 5-star rating on Google Reviews!
                  </p>
                  <a
                    href={googleReviewsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF3B00] hover:bg-[#E03400] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-colors"
                  >
                    <span>Post on Google Reviews</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
