'use client'

import { LogOut, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    
    // Clear simple admin cookie if present
    if (typeof document !== 'undefined') {
      document.cookie = 'simple_admin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    }
    
    window.location.href = '/login'
  }

  return (
    <button 
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-bold text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors text-left disabled:opacity-70"
    >
      {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />} 
      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
    </button>
  )
}
