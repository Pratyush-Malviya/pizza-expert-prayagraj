'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, X, ArrowRight } from 'lucide-react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'

export default function AnnouncementBanner() {
  const { enableFlashBanner, flashBannerText, flashBannerBadge, flashBannerLink, flashBannerImageUrl } = useSettingsStore()
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  if (!mounted || !enableFlashBanner || dismissed) return null

  return (
    <div className="bg-[#e10600] text-white py-2 px-4 border-b border-[#260212] relative flex items-center justify-between text-xs sm:text-sm font-medium shadow-md transition-all z-50">
      <div className="container-custom flex items-center justify-center gap-2 sm:gap-3 flex-1 text-center font-sans tracking-wide min-w-0">
        {flashBannerImageUrl && (
          <span className="relative w-8 h-8 rounded-md overflow-hidden border border-white/25 bg-black/20 shrink-0 hidden sm:block">
            <Image src={flashBannerImageUrl} alt="" fill sizes="32px" className="object-cover" />
          </span>
        )}

        {flashBannerBadge && (
          <span className="bg-black/30 text-[#ffc7c6] border border-[#ffc7c6]/30 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Sparkles size={11} className="text-[#ffc7c6] animate-pulse" />
            {flashBannerBadge}
          </span>
        )}
        
        <span className="line-clamp-1 font-semibold text-white drop-shadow-xs">
          {flashBannerText || 'Special Flash Offer Active! Shop now.'}
        </span>

        {flashBannerLink && (
          <Link
            href={flashBannerLink}
            className="underline underline-offset-2 hover:text-[#ffc7c6] font-bold text-xs shrink-0 flex items-center gap-1 ml-1"
          >
            <span>Claim Offer</span>
            <ArrowRight size={12} />
          </Link>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-black/20 text-white/80 hover:text-white transition-colors shrink-0"
        aria-label="Dismiss Announcement"
      >
        <X size={15} />
      </button>
    </div>
  )
}
