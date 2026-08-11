'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, MessageSquare, CheckCircle, XCircle, Clock, Check, Reply } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface Review {
  id: string
  user_id: string
  order_id: string
  rating: number
  comment: string
  is_approved: boolean
  admin_reply: string | null
  created_at: string
  profiles: { name: string; email: string }
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles(name, email)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load reviews')
    } else {
      setReviews(data as any || [])
    }
    setLoading(false)
  }

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('reviews')
      .update({ is_approved: !currentStatus })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      setReviews(reviews.map(r => r.id === id ? { ...r, is_approved: !currentStatus } : r))
      toast.success(!currentStatus ? 'Review approved and public' : 'Review hidden')
    }
  }

  const handleReply = async (id: string) => {
    const text = replyText[id]
    if (!text?.trim()) return

    setSubmitting({ ...submitting, [id]: true })
    const supabase = createClient()
    const { error } = await supabase
      .from('reviews')
      .update({ admin_reply: text })
      .eq('id', id)

    if (error) {
      toast.error('Failed to save reply')
    } else {
      setReviews(reviews.map(r => r.id === id ? { ...r, admin_reply: text } : r))
      toast.success('Reply saved')
    }
    setSubmitting({ ...submitting, [id]: false })
  }

  const filteredReviews = reviews.filter(r => {
    if (filter === 'pending') return !r.is_approved
    if (filter === 'approved') return r.is_approved
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1C1917]">Review Moderation</h1>
          <p className="text-[#57534E] text-xs sm:text-sm">Manage customer reviews, approve for website display, and reply.</p>
        </div>
        <div className="flex bg-white rounded-lg border border-[#E7E0D8] p-1 shadow-xs">
          {(['pending', 'approved', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${
                filter === f ? 'bg-[#F4EFEA] text-[#1C1917]' : 'text-[#A8A29E] hover:text-[#57534E]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-12 text-[#A8A29E] text-sm">Loading reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-[#E7E0D8] text-[#A8A29E] text-sm">
            No {filter !== 'all' ? filter : ''} reviews found.
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl border border-[#E7E0D8] p-5 shadow-xs flex flex-col md:flex-row gap-6">
              
              {/* Left Details */}
              <div className="md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-[#E7E0D8] pb-4 md:pb-0 md:pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} className={s <= review.rating ? 'fill-current' : 'text-gray-200'} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#1C1917]">{review.rating}.0</span>
                </div>
                <h3 className="font-bold text-[#1C1917] text-sm truncate">{review.profiles?.name || 'Guest'}</h3>
                <p className="text-[11px] text-[#A8A29E] truncate">{review.profiles?.email}</p>
                
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#A8A29E] font-mono">
                  <Clock size={12} />
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </div>
              </div>

              {/* Center Content */}
              <div className="flex-1 space-y-4">
                <div className="text-sm text-[#57534E] whitespace-pre-wrap italic">
                  &quot;{review.comment || 'No comment provided'}&quot;
                </div>

                {review.admin_reply ? (
                  <div className="bg-[#FBF9F5] p-3 rounded-lg border border-[#E7E0D8] relative">
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#B91C1C] rounded-full flex items-center justify-center text-white border-2 border-white">
                      <Reply size={12} />
                    </div>
                    <p className="text-[11px] font-bold text-[#B91C1C] mb-1 pl-4">Pizza Expert Reply</p>
                    <p className="text-xs text-[#57534E] pl-4">{review.admin_reply}</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a public reply..."
                      value={replyText[review.id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                      className="input-field py-1.5 px-3 text-xs flex-1"
                    />
                    <button
                      onClick={() => handleReply(review.id)}
                      disabled={submitting[review.id] || !replyText[review.id]?.trim()}
                      className="btn btn-secondary text-xs px-4 py-1.5 disabled:opacity-50"
                    >
                      {submitting[review.id] ? 'Saving...' : 'Reply'}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Actions */}
              <div className="md:w-40 flex-shrink-0 flex md:flex-col gap-2 justify-end md:justify-start">
                <button
                  onClick={() => handleToggleApproval(review.id, review.is_approved)}
                  className={`btn text-xs py-2 w-full flex items-center justify-center gap-2 ${
                    review.is_approved
                      ? 'bg-[#F0FDF4] border-[#15803D] text-[#15803D] hover:bg-white'
                      : 'bg-white border-[#E7E0D8] text-[#57534E] hover:bg-[#F4EFEA]'
                  }`}
                >
                  {review.is_approved ? <><CheckCircle size={14} /> Approved</> : <><Check size={14} /> Approve</>}
                </button>
                {review.is_approved && (
                  <button
                    onClick={() => handleToggleApproval(review.id, true)}
                    className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-xs py-2 w-full flex items-center justify-center gap-2"
                  >
                    <XCircle size={14} /> Hide Review
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
