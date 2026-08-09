'use client'

import Link from 'next/link'
import {
  Pizza, Phone, Mail, MapPin, Clock, Heart, Send
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const QUICK_LINKS = [
  { label: 'Home',        href: '/' },
  { label: 'Menu',        href: '/menu' },
  { label: 'Offers',      href: '/offers' },
  { label: 'About Us',    href: '/about' },
  { label: 'Contact Us',  href: '/contact' },
  { label: 'Track Order', href: '/track' },
  { label: 'FAQs',        href: '/faq' },
]

const POLICY_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Refund Policy', href: '/refund' },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    toast.success('Subscribed! Check your email for exclusive deals.')
    setEmail('')
    setLoading(false)
  }

  return (
    <footer className="bg-[#18181B] text-[#A8A29E] border-t border-[#27272A] relative" role="contentinfo">
      {/* Main Footer Grid */}
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          {/* Brand Column */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3 group" aria-label="Pizza Expert Prayagraj">
              <div className="w-10 h-10 bg-[#B91C1C] rounded-lg flex items-center justify-center text-white">
                <Pizza size={22} strokeWidth={2} />
              </div>
              <div>
                <span className="block font-serif font-bold text-xl text-white">Pizza Expert</span>
                <span className="block text-[9px] text-[#B91C1C] font-bold tracking-widest uppercase">Prayagraj</span>
              </div>
            </Link>
            <p className="text-xs leading-relaxed text-[#A8A29E]">
              Love at first slice. Handcrafted wood-fired pizzas, gourmet burgers, and express delivery in Prayagraj since 2018. Rated 4.9★ on Google.
            </p>
            <div className="pt-1">
              <span className="inline-block bg-[#27272A] text-white text-xs font-semibold px-3 py-1 rounded-md border border-[#3F3F46]">
                4.9★ Rated on Google
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif font-bold text-white text-base mb-4 relative pb-2 after:absolute after:bottom-0 after:left-0 after:w-6 after:h-0.5 after:bg-[#B91C1C]">
              Quick Links
            </h3>
            <ul className="space-y-2 text-xs">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-serif font-bold text-white text-base mb-4 relative pb-2 after:absolute after:bottom-0 after:left-0 after:w-6 after:h-0.5 after:bg-[#B91C1C]">
              Contact Us
            </h3>
            <ul className="space-y-3 text-xs">
              <li>
                <a href="https://maps.google.com/?q=Allapur+Prayagraj" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:text-white transition-colors">
                  <MapPin size={15} className="text-[#B91C1C] mt-0.5 flex-shrink-0" />
                  <span>Allapur, Prayagraj,<br />Uttar Pradesh 211006</span>
                </a>
              </li>
              <li>
                <a href="tel:+919999999999" className="flex items-center gap-2.5 hover:text-white transition-colors">
                  <Phone size={15} className="text-[#B91C1C] flex-shrink-0" />
                  <span>+91-9999999999</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@pizzaexpert.in" className="flex items-center gap-2.5 hover:text-white transition-colors">
                  <Mail size={15} className="text-[#B91C1C] flex-shrink-0" />
                  <span>info@pizzaexpert.in</span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-2.5">
                  <Clock size={15} className="text-[#B91C1C] mt-0.5 flex-shrink-0" />
                  <div>
                    <p>Mon–Fri: 11:00 AM – 11:00 PM</p>
                    <p>Sat–Sun: 10:00 AM – 11:30 PM</p>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-serif font-bold text-white text-base mb-4 relative pb-2 after:absolute after:bottom-0 after:left-0 after:w-6 after:h-0.5 after:bg-[#B91C1C]">
              Subscribe & Save
            </h3>
            <p className="text-xs mb-3 text-[#A8A29E]">
              Get exclusive coupon codes & special deals delivered to your inbox.
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 bg-[#27272A] border border-[#3F3F46] rounded-md px-3 py-2 text-xs text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#B91C1C] transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-sm px-3 flex-shrink-0"
                aria-label="Subscribe"
              >
                <Send size={14} />
              </button>
            </form>

            <div className="mt-5">
              <p className="text-[10px] text-[#A8A29E] uppercase font-bold tracking-wider mb-2">Accepted Payments</p>
              <div className="flex flex-wrap gap-1.5">
                {['UPI', 'Razorpay', 'Visa', 'Mastercard', 'COD'].map((method) => (
                  <span key={method} className="px-2 py-0.5 bg-[#27272A] border border-[#3F3F46] rounded text-[10px] text-white">
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#27272A] bg-[#121214]">
        <div className="container-custom py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A8A29E]">
          <p className="flex items-center gap-1">
            © {new Date().getFullYear()} Pizza Expert Prayagraj. Made with
            <Heart size={13} className="text-[#B91C1C] fill-[#B91C1C]" />
            in Prayagraj.
          </p>
          <div className="flex items-center gap-4">
            {POLICY_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} className="hover:text-white transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
