'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function WhatsAppButton() {
  const [isVisible, setIsVisible] = useState(false)
  const WHATSAPP_NUMBER = '919999999999'
  const MESSAGE = 'Hi Pizza Expert! I would like to place an order.'

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.a
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#15803D] text-white p-3.5 rounded-full shadow-md hover:bg-[#14532D] hover:shadow-lg transition-all flex items-center justify-center group"
          aria-label="Order on WhatsApp"
        >
          <MessageCircle size={24} strokeWidth={1.5} />
        </motion.a>
      )}
    </AnimatePresence>
  )
}
