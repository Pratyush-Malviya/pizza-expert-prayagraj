'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'

export default function WhatsAppButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const storeSettings = useSettingsStore()

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const whatsappNumber = (mounted && storeSettings.whatsapp) 
    ? storeSettings.whatsapp.replace(/[^0-9]/g, '') 
    : '919999999999'

  const MESSAGE = 'Hi Pizza Expert! I would like to place an order.'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.a
          initial={{ opacity: 0, scale: 0.8, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: -20 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(MESSAGE)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 md:bottom-6 left-6 z-50 bg-[#25D366] text-white p-3.5 sm:p-4 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] border border-white/20 transition-all flex items-center justify-center group"
          aria-label="Order on WhatsApp"
        >
          <MessageCircle size={26} fill="currentColor" className="text-white" />
          
          {/* Tooltip on Hover */}
          <span className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#0D0D11]/90 text-white text-xs font-extrabold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10 hidden sm:block">
            Chat on WhatsApp 💬
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  )
}

