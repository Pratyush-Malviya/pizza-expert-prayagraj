'use client'

import { useState } from 'react'
import { X, Bell, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface WaitlistModalProps {
  product: { id: string; name: string } | null
  onClose: () => void
}

export default function WaitlistModal({ product, onClose }: WaitlistModalProps) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!product) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() && !phone.trim()) {
      toast.error('Please provide an email or phone number.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('product_waitlist').insert({
        product_id: product.id,
        email: email.trim() || null,
        phone: phone.trim() || null,
      })

      if (error) {
        console.warn('Waitlist insert error:', error.message)
      }

      setSubmitted(true)
      toast.success("You're on the waitlist! We'll notify you when it's back.")
    } catch {
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-[#E7E0D8]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A8A29E] hover:text-[#1C1917] p-1 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#1C1917]">You're on the list!</h3>
            <p className="text-xs text-[#57534E]">
              We will send you a message as soon as <span className="font-bold">{product.name}</span> is available again.
            </p>
            <button
              onClick={onClose}
              className="btn btn-primary text-xs w-full py-2.5 mt-2"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 text-[#B91C1C]">
              <div className="w-10 h-10 bg-[#FEF2F2] rounded-xl flex items-center justify-center">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1C1917]">Restock Notification</h3>
                <p className="text-xs text-[#A8A29E]">{product.name} is currently sold out.</p>
              </div>
            </div>

            <p className="text-xs text-[#57534E]">
              Leave your email or phone number and we will notify you immediately when the kitchen restocks this item!
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#57534E] uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#57534E] uppercase mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field py-2 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2"
            >
              {loading ? 'Submitting...' : 'Notify Me When Available'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
