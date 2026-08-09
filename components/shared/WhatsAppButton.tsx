'use client'

import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919999999999'
const WHATSAPP_MESSAGE = 'Hi! I would like to place an order from Pizza Expert Prayagraj 🍕'

export default function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#25D366] text-white rounded-full shadow-xl hover:shadow-2xl transition-all group"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Ping animation */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />

      <div className="relative flex items-center gap-2.5 px-4 py-3">
        <MessageCircle size={22} fill="white" strokeWidth={0} />
        <span className="text-sm font-semibold font-[Poppins] hidden sm:inline pr-0.5">
          Order via WhatsApp
        </span>
      </div>
    </motion.a>
  )
}
