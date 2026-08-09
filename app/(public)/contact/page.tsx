'use client'

import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, Send, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    toast.success('Thank you! Your message has been sent. We will get back to you shortly.')
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    setLoading(false)
  }

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-widest text-[#B91C1C] uppercase font-mono block mb-2">
            Get in Touch
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#1C1917] mb-3">
            Contact Pizza Expert
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm max-w-lg mx-auto">
            Have questions about your order, party catering, or feedback? Reach out to our team in Allapur, Prayagraj!
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 mb-12">
          {/* Contact Details Cards (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 bg-[#FEF2F2] text-[#B91C1C] rounded-lg flex items-center justify-center flex-shrink-0 font-bold">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[#1C1917] text-sm mb-1">Store Location</h3>
                <p className="text-[#57534E] text-xs leading-relaxed">
                  Allapur, Prayagraj,<br />Uttar Pradesh 211006
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 bg-[#F0FDF4] text-[#15803D] rounded-lg flex items-center justify-center flex-shrink-0 font-bold">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[#1C1917] text-sm mb-1">Call Us Directly</h3>
                <p className="text-[#57534E] text-xs mb-1 font-mono">+91-9999999999</p>
                <a href="tel:+919999999999" className="text-xs font-semibold text-[#B91C1C] hover:underline">
                  Click to Call →
                </a>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-[#E7E0D8] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 bg-[#FFFBEB] text-[#D97706] rounded-lg flex items-center justify-center flex-shrink-0 font-bold">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[#1C1917] text-sm mb-1">Operating Hours</h3>
                <p className="text-[#57534E] text-xs">Mon–Fri: 11:00 AM – 11:00 PM</p>
                <p className="text-[#57534E] text-xs">Sat–Sun: 10:00 AM – 11:30 PM</p>
              </div>
            </div>

            <a
              href="https://wa.me/919999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
            >
              <MessageCircle size={18} /> Chat on WhatsApp
            </a>
          </div>

          {/* Form Column (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl p-6 sm:p-8 border border-[#E7E0D8] shadow-xs">
            <h2 className="font-serif font-bold text-xl text-[#1C1917] mb-6">
              Send Us a Message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Amit Kumar"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="amit@example.com"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Feedback / Party Order"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Message *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we help you?"
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg flex items-center gap-2"
              >
                {loading ? 'Sending...' : 'Send Message'} <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Google Maps Location */}
        <div className="bg-white rounded-xl border border-[#E7E0D8] p-4 shadow-xs overflow-hidden">
          <h3 className="font-serif font-bold text-[#1C1917] text-base mb-3 px-1">Location Map — Allapur, Prayagraj</h3>
          <div className="w-full h-72 rounded-lg overflow-hidden border border-[#E7E0D8] bg-[#F4EFEA]">
            <iframe
              title="Pizza Expert Prayagraj Location Map"
              src="https://maps.google.com/maps?q=Allapur,+Prayagraj,+Uttar+Pradesh&t=&z=14&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
            />
          </div>
        </div>

      </div>
    </div>
  )
}
