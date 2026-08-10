'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pizza, Lock, Mail, User, Phone, ArrowRight, Eye, EyeOff, Sparkles, Star, ShieldCheck, Flame } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import Image from 'next/image'
import { motion } from 'framer-motion'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || '/account'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const logoDataUrl = useSettingsStore((state) => state.logoDataUrl)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://pizza-kappa-nine.vercel.app')
      const emailRedirectTo = `${origin}/auth/callback`

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            name,
            phone,
            role: 'customer',
          },
        },
      })

      if (error) {
        toast.error(error.message || 'Registration failed')
      } else {
        toast.success('Account created successfully!')
        router.push(redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : '/login')
      }
    } catch {
      toast.error('Registration error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://pizza-kappa-nine.vercel.app')
      
      const targetRedirect = redirectTarget && redirectTarget !== '/admin' ? redirectTarget : '/account'
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(targetRedirect)}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        toast.error(error.message || 'Google signup failed')
      }
    } catch {
      toast.error('Google Sign-Up error. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Ambient Red & Warm Glow Background */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#E10600]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#FF5500]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Back to Website link */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2 rounded-full">
          ← Back to Pizza Expert
        </Link>
      </div>

      <div className="w-full max-w-5xl bg-[#121216]/80 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Side: Modern Visual Hero Section */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1A0303] via-[#0F0A0A] to-[#141216] p-8 lg:p-12 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#E10600_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          <div className="relative z-10">
            {/* Brand Logo */}
            <Link href="/" className="inline-flex items-center gap-3 mb-10 group">
              {mounted && logoDataUrl ? (
                <div className="relative w-40 h-11">
                  <Image src={logoDataUrl} alt="Store Logo" fill className="object-contain object-left" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-[#E10600] to-[#990000] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#E10600]/30 group-hover:scale-105 transition-transform">
                    <Pizza size={24} />
                  </div>
                  <div>
                    <span className="block font-serif font-black text-xl tracking-wider text-white uppercase">
                      Pizza Expert
                    </span>
                    <span className="block text-[9px] text-[#FF9999] font-mono tracking-[0.25em] uppercase font-bold">
                      Prayagraj • Allapur
                    </span>
                  </div>
                </div>
              )}
            </Link>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E10600]/15 border border-[#E10600]/30 text-[#FF6666] text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles size={14} className="text-[#E10600]" /> Join the Pizza Club
              </div>
              <h2 className="text-3xl font-black font-serif tracking-tight leading-tight text-white mb-3">
                Unlock Exclusive Deals & Rewards.
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Create an account to save your delivery addresses, reorder your favorites in 1-click, and earn loyalty points on every slice.
              </p>
            </motion.div>
          </div>

          {/* Floating Badges Showcase */}
          <div className="space-y-3 my-8 relative z-10">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md p-3 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 text-[#FF6666] flex items-center justify-center shrink-0 font-bold">
                <Flame size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Loyalty Perks & Discounts</div>
                <div className="text-[11px] text-zinc-400">Earn points on every online order</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md p-3 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">100% Secure Checkout</div>
                <div className="text-[11px] text-zinc-400">Razorpay, Cashfree & UPI integrated</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/10 text-[11px] text-zinc-500 flex justify-between items-center">
            <span>© 2026 Pizza Expert Prayagraj</span>
            <span className="text-zinc-400 font-medium">Allapur, UP</span>
          </div>
        </div>

        {/* Right Side: Sleek Modern Register Form */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-[#121216]">
          <div className="max-w-md mx-auto w-full space-y-6">
            
            {/* Tab Header (Sign In / Register toggle) */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h1 className="text-2xl font-serif font-black text-white tracking-tight">
                  Create Account
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Join Pizza Expert with email or Google
                </p>
              </div>

              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                <Link href={`/login${redirectTarget !== '/account' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`} className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white font-medium transition-colors">
                  Sign In
                </Link>
                <span className="px-3 py-1.5 rounded-lg bg-[#E10600] text-white font-bold">Register</span>
              </div>
            </div>

            {/* Google OAuth Button for Customers */}
            <div>
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 rounded-2xl text-xs font-bold text-white uppercase tracking-wider transition-all duration-200 group relative overflow-hidden shadow-lg disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'Connecting to Google...' : 'Sign Up with Google'}</span>
              </button>

              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                  Or fill details
                </span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full bg-white/5 border border-white/10 focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-white/5 border border-white/10 focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full bg-white/5 border border-white/10 focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-2xl py-3 pl-11 pr-11 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
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
                className="w-full bg-gradient-to-r from-[#E10600] to-[#B91C1C] hover:from-[#FF1A1A] hover:to-[#D92626] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-lg shadow-[#E10600]/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Account...
                  </span>
                ) : (
                  <>
                    Create Account <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-4 border-t border-white/10 text-xs text-zinc-400">
              Already have an account?{' '}
              <Link href={`/login${redirectTarget !== '/account' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`} className="font-bold text-[#FF6666] hover:text-white underline transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C]">
        <div className="w-8 h-8 border-2 border-[#E10600] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
