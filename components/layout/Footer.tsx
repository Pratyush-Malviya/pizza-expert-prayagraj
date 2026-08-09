'use client'

import Link from 'next/link'
import {
  MapPin, Clock, Phone
} from 'lucide-react'

const InstagramIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
)

const FacebookIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const TwitterIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
)
import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import Image from 'next/image'

const QUICK_LINKS = [
  { label: 'Home',        href: '/' },
  { label: 'Menu',        href: '/menu' },
  { label: 'Offers',      href: '/offers' },
  { label: 'About Us',    href: '/about' },
  { label: 'Contact Us',  href: '/contact' },
  { label: 'FAQs',        href: '/faq' },
]

export default function Footer() {
  const [mounted, setMounted] = useState(false)
  const storeSettings = useSettingsStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <footer className="bg-[var(--bg-dark)] text-[#A8A29E] pt-20 pb-10" role="contentinfo">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-16">
          
          {/* Brand */}
          <div className="space-y-6 lg:col-span-1">
            <Link href="/" className="group flex flex-col w-fit relative z-50">
              {mounted && storeSettings.logoDataUrl ? (
                <div className="relative w-40 h-16">
                  <Image src={storeSettings.logoDataUrl} alt="Store Logo" fill className="object-contain object-left" />
                </div>
              ) : (
                <span className="font-serif font-bold text-2xl leading-tight text-white transition-colors">
                  {mounted ? storeSettings.businessName : 'Pizza Expert Prayagraj'}
                </span>
              )}
            </Link>
            <p className="text-sm leading-relaxed max-w-sm">
              Authentic wood-fired pizzas and handcrafted food, made fresh daily since 2018. 
            </p>
            {/* Social Icons */}
            {mounted && (storeSettings.instagramUrl || storeSettings.facebookUrl || storeSettings.twitterUrl) && (
              <div className="flex items-center gap-4 pt-2">
                {storeSettings.instagramUrl && (
                  <a href={storeSettings.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#27272A] flex items-center justify-center text-white hover:bg-[var(--primary)] transition-colors">
                    <InstagramIcon size={18} />
                  </a>
                )}
                {storeSettings.facebookUrl && (
                  <a href={storeSettings.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#27272A] flex items-center justify-center text-white hover:bg-[var(--primary)] transition-colors">
                    <FacebookIcon size={18} />
                  </a>
                )}
                {storeSettings.twitterUrl && (
                  <a href={storeSettings.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#27272A] flex items-center justify-center text-white hover:bg-[var(--primary)] transition-colors">
                    <TwitterIcon size={18} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif text-white text-lg mb-6">Menu & Links</h3>
            <ul className="space-y-4 text-sm">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-serif text-white text-lg mb-6">Visit Us</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} strokeWidth={1.5} className="text-[var(--primary)] shrink-0 mt-0.5" />
                <span>
                  {mounted ? storeSettings.address : 'Loading address...'}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} strokeWidth={1.5} className="text-[var(--primary)] shrink-0" />
                <a href={`tel:${mounted ? storeSettings.phone : ''}`} className="hover:text-white transition-colors">
                  {mounted ? storeSettings.phone : '...'}
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="font-serif text-white text-lg mb-6">Opening Hours</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Clock size={18} strokeWidth={1.5} className="text-[var(--primary)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">Monday – Friday</p>
                  <p>11:00 AM – 11:00 PM</p>
                  <p className="text-white font-medium mb-1 mt-3">Saturday – Sunday</p>
                  <p>10:00 AM – 11:30 PM</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} {mounted ? storeSettings.businessName : 'Pizza Expert'}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
