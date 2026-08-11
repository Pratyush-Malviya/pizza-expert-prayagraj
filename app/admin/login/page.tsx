'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pizza, Lock, Mail, ArrowRight, Eye, EyeOff, ShieldCheck, KeyRound, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || '/admin'

  const [email, setEmail] = useState('malviya.pratyush26@gmail.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Direct Production Admin Authenticate Helper
  const setAdminSessionCookie = () => {
    document.cookie = "admin_session=true; path=/; max-age=86400; SameSite=Lax"
    document.cookie = "simple_admin=true; path=/; max-age=86400; SameSite=Lax"
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // 1. Attempt Supabase Auth Sign In first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!authError && authData?.user) {
        setAdminSessionCookie()
        toast.success('Admin authentication verified successfully!')
        window.location.href = redirectTarget
        return
      }


      // 3. Fallback: If user tried to sign up as admin or entered valid credentials
      if (authError) {
        // If account doesn't exist yet, attempt automatic admin creation for primary email
        if (email === 'malviya.pratyush26@gmail.com') {
          const { error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { role: 'super_admin', name: 'Pratyush Malviya' }
            }
          })
          if (!signUpErr) {
            setAdminSessionCookie()
            toast.success('Admin account created & authenticated!')
            window.location.href = redirectTarget
            return
          }
        }
        toast.error(authError.message || 'Invalid admin credentials')
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication error. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background Red Glow FX */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#B91C1C]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[#E10600]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Left Public Navigation Link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2 rounded-full"
        >
          ← Back to Public Site
        </Link>
      </div>

      <div className="w-full max-w-md bg-[#111116]/90 backdrop-blur-2xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden p-6 sm:p-8 relative z-10 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-gradient-to-br from-[#B91C1C] to-[#990000] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#B91C1C]/30 mx-auto border border-white/10">
            <ShieldCheck size={30} />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B91C1C]/15 border border-[#B91C1C]/30 text-[#FF8888] text-[10px] font-bold uppercase tracking-widest mb-2">
              <KeyRound size={12} /> Store Operations Portal
            </div>
            <h1 className="text-2xl font-black font-serif text-white tracking-tight">
              Admin Authentication
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Pizza Expert Prayagraj • Management System
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pizzaexpert.com"
                className="w-full bg-white/5 border border-white/10 focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] rounded-2xl py-3 pl-11 pr-11 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#B91C1C] to-[#E10600] hover:from-[#DC2626] hover:to-[#FF1A1A] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-lg shadow-[#B91C1C]/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              <>
                Sign In to Admin Portal <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>



      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#070709]">
        <div className="w-8 h-8 border-2 border-[#B91C1C] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  )
}
