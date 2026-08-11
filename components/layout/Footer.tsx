'use client'

import Link from 'next/link'
import { MapPin, Clock, Phone, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import Image from 'next/image'

const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
)

const FacebookIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const TwitterIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
)

const QUICK_LINKS = [
  { label: 'HOME',        href: '/' },
  { label: 'MENU',        href: '/menu' },
  { label: 'OFFERS',      href: '/offers' },
  { label: 'ABOUT US',    href: '/about' },
  { label: 'CONTACT US',  href: '/contact' },
  { label: 'FAQS',        href: '/faq' },
]

export default function Footer() {
  const [mounted, setMounted] = useState(false)
  const storeSettings = useSettingsStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <footer className="bg-[#08080B] text-zinc-300 pt-16 pb-12 border-t border-white/10" role="contentinfo">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-16">
          
          {/* Brand */}
          <div className="space-y-5 lg:col-span-1">
            <Link href="/" className="group flex flex-col w-fit relative z-50">
              {mounted && storeSettings.logoDataUrl ? (
                <div className="relative w-40 h-14">
                  <Image src={storeSettings.logoDataUrl} alt="Store Logo" fill className="object-contain object-left" />
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="font-heading font-extrabold text-2xl uppercase tracking-tight text-[#FF3B00]">
                    {mounted ? storeSettings.businessName : 'PIZZA EXPERT'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider">
                    PRAYAGRAJ • ALLAPUR
                  </span>
                </div>
              )}
            </Link>
            <p className="text-sm leading-relaxed text-zinc-400 font-normal">
              Authentic wood-fired pizzas crafted daily in Allapur with slow-fermented 48-hour dough and fresh ingredients.
            </p>
            {/* Social Icons */}
            {mounted && (storeSettings.instagramUrl || storeSettings.facebookUrl || storeSettings.twitterUrl) && (
              <div className="flex items-center gap-3 pt-2">
                {storeSettings.instagramUrl && (
                  <a href={storeSettings.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#FF3B00] transition-colors">
                    <InstagramIcon size={16} />
                  </a>
                )}
                {storeSettings.facebookUrl && (
                  <a href={storeSettings.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#FF3B00] transition-colors">
                    <FacebookIcon size={16} />
                  </a>
                )}
                {storeSettings.twitterUrl && (
                  <a href={storeSettings.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#FF3B00] transition-colors">
                    <TwitterIcon size={16} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-extrabold text-white text-sm uppercase tracking-wider mb-6">Menu & Navigation</h3>
            <ul className="space-y-3 text-xs font-bold uppercase tracking-wider">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-[#FF3B00] transition-colors text-zinc-400 hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-extrabold text-white text-sm uppercase tracking-wider mb-6">Pizzeria Location</h3>
            <ul className="space-y-4 text-xs font-medium">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-[#FF3B00] shrink-0 mt-0.5" />
                <span className="leading-relaxed text-zinc-300">
                  {mounted ? storeSettings.address : 'Allapur, Prayagraj, Uttar Pradesh - 211006'}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-[#FF3B00] shrink-0" />
                <a href={`tel:${mounted ? storeSettings.phone : ''}`} className="hover:text-white transition-colors font-mono text-zinc-300 font-bold">
                  {mounted ? storeSettings.phone : '+91 99999 99999'}
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="font-heading font-extrabold text-white text-sm uppercase tracking-wider mb-6">Opening Hours</h3>
            <ul className="space-y-4 text-xs font-medium">
              <li className="flex items-start gap-3">
                <Clock size={18} className="text-[#FF3B00] shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-bold uppercase mb-1">Monday – Friday</p>
                  <p className="font-mono text-[#FFC01D] mb-3">11:00 AM – 11:00 PM</p>
                  <p className="text-white font-bold uppercase mb-1">Saturday – Sunday</p>
                  <p className="font-mono text-[#FFC01D]">10:00 AM – 11:30 PM</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-400">
          <p>© {new Date().getFullYear()} {mounted ? storeSettings.businessName : 'Pizza Expert Prayagraj'}. All rights reserved.</p>

          <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
            <span>Designed & Developed with</span>
            <Heart size={13} className="text-[#FF3B00] fill-current" />
            <span>by</span>
            <a
              href="https://www.linkedin.com/in/pratyushmalviy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-[#FF3B00] font-semibold underline underline-offset-4 decoration-[#FF3B00] transition-colors"
            >
              Pratyush Malviya
            </a>
          </p>

          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/admin/login" className="hover:text-white transition-colors font-bold text-[#FF3B00]">Staff / Admin Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

