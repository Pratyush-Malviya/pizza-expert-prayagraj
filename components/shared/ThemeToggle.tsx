'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  variant?: 'pill' | 'icon' | 'badge'
}

export default function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className={cn(
          'w-9 h-9 rounded-full bg-white/5 border border-white/10 animate-pulse',
          className
        )}
        aria-hidden="true"
      />
    )
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme
  const isDark = currentTheme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 border',
          isDark
            ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            : 'bg-black/5 text-[#323338] border-black/10 hover:bg-black/10',
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <>
            <Sun size={14} className="text-[#FFCB00]" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon size={14} className="text-[#0073EA]" />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer border select-none',
        isDark
          ? 'bg-white/10 text-[#FFCB00] hover:text-white hover:bg-white/20 border-white/15 shadow-sm'
          : 'bg-black/5 text-[#323338] hover:text-[#0073EA] hover:bg-black/10 border-black/10 shadow-xs',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun size={17} className="transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon size={17} className="transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  )
}
