'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  Reply,
  Trash2,
  Search,
  Filter,
  Sparkles,
  ThumbsUp,
  MapPin,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Plus,
  Globe,
  Smartphone,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
  getAdminReviews,
  toggleReviewApprovalAction,
  replyToReviewAction,
  deleteReviewAction,
  createAdminReviewAction,
  ReviewItem,
} from '@/app/actions/reviews'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { Edit3, ExternalLink } from 'lucide-react'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'google' | 'five_star' | 'critical'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState<{ [key: string]: boolean }>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSectionSettings, setShowSectionSettings] = useState(false)
  const storeSettings = useSettingsStore()
  const [headerSettings, setHeaderSettings] = useState({
    ratingScore: '4.9 / 5.0',
    sectionTitle: 'PRAYAGRAJ REVIEWS',
    sectionSubtitle: 'Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad.',
    googleReviewsLink: 'https://g.page/r/pizzaexpert-prayagraj/review',
  })

  useEffect(() => {
    setHeaderSettings({
      ratingScore: storeSettings.reviewsRatingScore || '4.9 / 5.0',
      sectionTitle: storeSettings.reviewsSectionTitle || 'PRAYAGRAJ REVIEWS',
      sectionSubtitle: storeSettings.reviewsSectionSubtitle || 'Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad.',
      googleReviewsLink: storeSettings.googleReviewsLink || 'https://g.page/r/pizzaexpert-prayagraj/review',
    })
  }, [storeSettings])

  const [newReview, setNewReview] = useState({
    customer_name: '',
    rating: 5,
    location: 'Allapur, Prayagraj',
    product_name: 'Wood-Fired Pizza',
    comment: '',
    source: 'google' as 'google' | 'storefront' | 'app',
    is_approved: true,
  })

  const handleSaveHeaderSettings = (e: React.FormEvent) => {
    e.preventDefault()
    storeSettings.updateSettings({
      reviewsRatingScore: headerSettings.ratingScore,
      reviewsSectionTitle: headerSettings.sectionTitle,
      reviewsSectionSubtitle: headerSettings.sectionSubtitle,
      googleReviewsLink: headerSettings.googleReviewsLink,
    })
    toast.success('Homepage Reviews Section updated successfully!')
    setShowSectionSettings(false)
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    setLoading(true)
    try {
      const res = await getAdminReviews()
      if (res.success) {
        setReviews(res.reviews)
      } else {
        toast.error(res.error || 'Failed to load reviews')
      }
    } catch (err: any) {
      toast.error('Could not fetch reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    // Optimistic update
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_approved: newStatus } : r)))
    const res = await toggleReviewApprovalAction(id, newStatus)
    if (res.success) {
      toast.success(newStatus ? 'Review approved & live on website' : 'Review hidden from website')
    } else {
      toast.error('Failed to update review status')
      loadReviews()
    }
  }

  const handleReply = async (id: string) => {
    const text = replyText[id]
    if (!text?.trim()) return

    setSubmitting((prev) => ({ ...prev, [id]: true }))
    const res = await replyToReviewAction(id, text)
    setSubmitting((prev) => ({ ...prev, [id]: false }))

    if (res.success) {
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, admin_reply: text.trim() } : r)))
      setReplyText((prev) => ({ ...prev, [id]: '' }))
      toast.success('Official reply posted successfully')
    } else {
      toast.error('Failed to post reply')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    setReviews((prev) => prev.filter((r) => r.id !== id))
    const res = await deleteReviewAction(id)
    if (res.success) {
      toast.success('Review deleted')
    } else {
      toast.error('Failed to delete review')
      loadReviews()
    }
  }

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReview.customer_name.trim() || !newReview.comment.trim()) {
      toast.error('Customer name and review text are required')
      return
    }

    const res = await createAdminReviewAction(newReview)
    if (res.success) {
      toast.success('New review added to website!')
      setShowAddModal(false)
      setNewReview({
        customer_name: '',
        rating: 5,
        location: 'Allapur, Prayagraj',
        product_name: 'Wood-Fired Pizza',
        comment: '',
        source: 'google',
        is_approved: true,
      })
      loadReviews()
    } else {
      toast.error('Failed to create review')
    }
  }

  // Analytics Metrics
  const totalCount = reviews.length
  const avgRating = totalCount > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / totalCount).toFixed(1) : '5.0'
  const pendingCount = reviews.filter((r) => !r.is_approved).length
  const googleReviewsCount = reviews.filter((r) => r.source === 'google').length
  const repliedCount = reviews.filter((r) => Boolean(r.admin_reply)).length
  const replyRate = totalCount > 0 ? Math.round((repliedCount / totalCount) * 100) : 100

  // Filtered List
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = r.customer_name.toLowerCase().includes(q)
        const matchComment = r.comment.toLowerCase().includes(q)
        const matchLocation = r.location?.toLowerCase().includes(q) || false
        const matchProduct = r.product_name?.toLowerCase().includes(q) || false
        if (!matchName && !matchComment && !matchProduct && !matchLocation) return false
      }

      // Tab filter
      if (filter === 'pending') return !r.is_approved
      if (filter === 'approved') return r.is_approved
      if (filter === 'google') return r.source === 'google'
      if (filter === 'five_star') return r.rating === 5
      if (filter === 'critical') return r.rating <= 3
      return true
    })
  }, [reviews, filter, searchQuery])

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Header & Action Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">Customer Reviews & Ratings</h1>
          <p className="text-[#57534E] text-xs sm:text-sm mt-0.5">
            Moderating verified Google reviews, in-app customer feedback, and homepage testimonials.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowSectionSettings(!showSectionSettings)}
            className="px-3.5 py-2 bg-white border border-[#E7E0D8] hover:bg-[#F4EFEA] text-[#1C1917] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Edit3 size={14} className="text-[#B91C1C]" />
            <span>Customize Homepage Section</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
          >
            <Plus size={14} />
            <span>Add Review</span>
          </button>
          <button
            onClick={loadReviews}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-[#E7E0D8] hover:bg-[#F4EFEA] text-[#1C1917] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Expandable Homepage Reviews Section Customizer ─── */}
      {showSectionSettings && (
        <form onSubmit={handleSaveHeaderSettings} className="bg-white rounded-3xl p-6 border-2 border-[#B91C1C]/30 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917]">Homepage Reviews Section Header & Google Link</h3>
                <p className="text-xs text-[#78716C]">Customize the 4.9★ badge score, headline, description, and &apos;Write a Review&apos; link displayed on the main home page.</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowSectionSettings(false)} className="text-[#A8A29E] hover:text-[#1C1917]">
              <X size={18} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Badge Score (e.g. 4.9 / 5.0)</label>
              <input
                type="text"
                value={headerSettings.ratingScore}
                onChange={(e) => setHeaderSettings({ ...headerSettings, ratingScore: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#E7E0D8] rounded-xl font-mono"
                placeholder="4.9 / 5.0"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Section Heading Title</label>
              <input
                type="text"
                value={headerSettings.sectionTitle}
                onChange={(e) => setHeaderSettings({ ...headerSettings, sectionTitle: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#E7E0D8] rounded-xl font-bold"
                placeholder="PRAYAGRAJ REVIEWS"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">Section Subtitle / Description</label>
            <input
              type="text"
              value={headerSettings.sectionSubtitle}
              onChange={(e) => setHeaderSettings({ ...headerSettings, sectionSubtitle: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-[#E7E0D8] rounded-xl"
              placeholder="Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">Google Maps / My Business Review Link (For &apos;Write a Review&apos; button)</label>
            <div className="relative">
              <input
                type="url"
                value={headerSettings.googleReviewsLink}
                onChange={(e) => setHeaderSettings({ ...headerSettings, googleReviewsLink: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#E7E0D8] rounded-xl pl-8"
                placeholder="https://g.page/r/pizzaexpert-prayagraj/review"
                required
              />
              <ExternalLink size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
            <button
              type="button"
              onClick={() => setShowSectionSettings(false)}
              className="px-4 py-2 text-xs font-bold border border-[#E7E0D8] rounded-xl hover:bg-[#F4EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Save Homepage Changes
            </button>
          </div>
        </form>
      )}

      {/* ─── Metrics KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
            <span>Total Reviews</span>
            <MessageSquare size={16} className="text-[#B91C1C]" />
          </div>
          <p className="text-2xl font-bold text-[#1C1917] font-mono">{totalCount}</p>
          <p className="text-[11px] text-[#15803D] font-medium">{googleReviewsCount} Google + In-app</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
            <span>Average Rating</span>
            <Star size={16} className="text-amber-500 fill-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-[#1C1917] font-mono">{avgRating}</p>
            <span className="text-xs text-amber-600 font-bold">/ 5.0</span>
          </div>
          <p className="text-[11px] text-amber-700 font-medium">★★★★★ High customer love</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
            <span>Homepage Google Reviews</span>
            <Globe size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-[#1C1917] font-mono">{googleReviewsCount}</p>
          <p className="text-[11px] text-blue-700 font-medium">Active on main storefront</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
            <span>Reply Rate</span>
            <Reply size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-[#1C1917] font-mono">{replyRate}%</p>
          <p className="text-[11px] text-purple-700 font-medium">{repliedCount} official store replies</p>
        </div>
      </div>

      {/* ─── Search & Tab Filters ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E7E0D8] shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, location (e.g. Allapur, Katra), or keywords..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E7E0D8] text-xs bg-[#FBF9F5] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:border-[#B91C1C]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filter === 'all' ? 'bg-[#1C1917] text-white shadow-xs' : 'bg-[#F4EFEA] text-[#57534E] hover:bg-[#E7E0D8]'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('google')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filter === 'google'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            🌐 Google Reviews ({googleReviewsCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filter === 'approved'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Public ({totalCount - pendingCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('five_star')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filter === 'five_star' ? 'bg-amber-500 text-white shadow-xs' : 'bg-[#F4EFEA] text-[#57534E] hover:bg-[#E7E0D8]'
            }`}
          >
            ★ 5-Star
          </button>
        </div>
      </div>

      {/* ─── Reviews List ─── */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E7E0D8] space-y-3">
            <RefreshCw size={24} className="animate-spin text-[#B91C1C] mx-auto" />
            <p className="text-xs font-semibold text-[#78716C]">Loading customer reviews from database...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E7E0D8] text-[#78716C] space-y-2">
            <span className="text-4xl block">🍕</span>
            <p className="font-bold text-base text-[#1C1917]">No reviews match your filters</p>
            <p className="text-xs max-w-sm mx-auto">
              Try switching your filter or clearing search terms to see customer feedback.
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col md:flex-row gap-5 ${
                !review.is_approved
                  ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-300/40'
                  : 'border-[#E7E0D8] hover:border-[#B91C1C]/30'
              }`}
            >
              {/* ── Left Profile & Rating Info ── */}
              <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[#E7E0D8] pb-4 md:pb-0 md:pr-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'}
                      />
                    ))}
                    <span className="text-xs font-bold text-[#1C1917] ml-1">{review.rating}.0</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {review.source === 'google' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Globe size={10} /> Google
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 flex items-center gap-1">
                        <Smartphone size={10} /> In-App
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-[#1C1917] text-sm truncate">{review.customer_name}</h3>
                  {review.customer_email && (
                    <p className="text-[11px] text-[#A8A29E] truncate">{review.customer_email}</p>
                  )}
                  {review.location && (
                    <p className="text-[11px] text-[#78716C] flex items-center gap-1 mt-0.5 font-medium">
                      <MapPin size={11} className="text-[#B91C1C]" />
                      <span>{review.location}</span>
                    </p>
                  )}
                  {review.product_name && (
                    <p className="text-[10px] text-[#57534E] bg-[#F4EFEA] px-2 py-0.5 rounded-md inline-block mt-1 font-mono">
                      🍕 {review.product_name}
                    </p>
                  )}
                </div>

                <div className="text-[10px] text-[#A8A29E] font-mono flex items-center gap-1 pt-1">
                  <Clock size={11} />
                  <span>
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* ── Center Content & Feedback Tags ── */}
              <div className="flex-1 space-y-3">
                {/* Highlight Tags */}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {review.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#F4EFEA] text-[#57534E] text-[10px] font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comment Text */}
                <p className="text-xs sm:text-sm text-[#1C1917] leading-relaxed font-normal bg-[#FBF9F5] p-3.5 rounded-xl border border-[#E7E0D8]">
                  &quot;{review.comment}&quot;
                </p>

                {/* Official Pizza Expert Admin Reply */}
                {review.admin_reply ? (
                  <div className="bg-[#FEF2F2] p-3 rounded-xl border border-[#FECACA] relative text-xs text-[#1C1917] space-y-1">
                    <div className="flex items-center justify-between text-[#B91C1C] font-bold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Reply size={13} />
                        <span>Official Response from Pizza Expert</span>
                      </span>
                      <button
                        onClick={() => handleReply(review.id)}
                        className="text-[10px] text-[#B91C1C] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-[#57534E] pl-4">{review.admin_reply}</p>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Write an official response (e.g. 'Thank you for your feedback!')..."
                      value={replyText[review.id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                      className="flex-1 py-1.5 px-3 rounded-xl border border-[#E7E0D8] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20"
                    />
                    <button
                      onClick={() => handleReply(review.id)}
                      disabled={submitting[review.id] || !replyText[review.id]?.trim()}
                      className="px-4 py-1.5 bg-[#1C1917] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <Reply size={12} />
                      <span>{submitting[review.id] ? 'Posting...' : 'Reply'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ── Right Moderation Actions ── */}
              <div className="md:w-36 shrink-0 flex md:flex-col gap-2 justify-end md:justify-start">
                <button
                  onClick={() => handleToggleApproval(review.id, review.is_approved)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    review.is_approved
                      ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#15803D] hover:bg-[#DCFCE7]'
                      : 'bg-[#B91C1C] border-[#B91C1C] text-white hover:bg-[#991B1B] shadow-2xs'
                  }`}
                >
                  {review.is_approved ? (
                    <>
                      <CheckCircle size={14} />
                      <span>Approved</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Approve</span>
                    </>
                  )}
                </button>

                {review.is_approved && (
                  <button
                    onClick={() => handleToggleApproval(review.id, true)}
                    className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-[#78716C] hover:text-amber-800 hover:bg-amber-50 border border-[#E7E0D8] transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <XCircle size={13} />
                    <span>Hide</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(review.id)}
                  className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Add Review Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">Add Verified Review</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#A8A29E] hover:text-[#1C1917]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newReview.customer_name}
                    onChange={(e) => setNewReview({ ...newReview, customer_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 text-xs border border-[#E7E0D8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Star Rating</label>
                  <select
                    value={newReview.rating}
                    onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-[#E7E0D8] rounded-xl bg-white"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 Star)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 Star)</option>
                    <option value={3}>⭐⭐⭐ (3 Star)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Location in Prayagraj</label>
                  <input
                    type="text"
                    value={newReview.location}
                    onChange={(e) => setNewReview({ ...newReview, location: e.target.value })}
                    placeholder="e.g. Allapur, Prayagraj"
                    className="w-full px-3 py-2 text-xs border border-[#E7E0D8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Dish Ordered</label>
                  <input
                    type="text"
                    value={newReview.product_name}
                    onChange={(e) => setNewReview({ ...newReview, product_name: e.target.value })}
                    placeholder="e.g. Paneer Tikka Pizza"
                    className="w-full px-3 py-2 text-xs border border-[#E7E0D8] rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Review Feedback *</label>
                <textarea
                  required
                  rows={3}
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  placeholder="Enter the customer testimonial or Google review text..."
                  className="w-full px-3 py-2 text-xs border border-[#E7E0D8] rounded-xl resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#1C1917] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newReview.is_approved}
                    onChange={(e) => setNewReview({ ...newReview, is_approved: e.target.checked })}
                    className="w-4 h-4 rounded text-[#B91C1C]"
                  />
                  <span>Show immediately on Website Homepage</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#E7E0D8] text-xs font-bold rounded-xl hover:bg-[#F4EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Publish Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
