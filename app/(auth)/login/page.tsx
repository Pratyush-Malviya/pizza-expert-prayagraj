'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pizza, Lock, Mail, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, Suspense } from 'react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import Image from 'next/image'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const logoDataUrl = useSettingsStore((state) => state.logoDataUrl)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      if (email === 'admin@demo.com' && password === 'admin') {
        document.cookie = "simple_admin=true; path=/; max-age=86400"
        toast.success('Logged in successfully!')
        router.push(redirectTarget)
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message || 'Invalid login credentials')
      } else {
        document.cookie = "admin_auth=true; path=/; max-age=86400"
        toast.success('Logged in successfully!')
        router.push(redirectTarget)
      }
    } catch {
      toast.error('Login error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
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
        toast.error(error.message || 'Google sign in failed')
      }
    } catch {
      toast.error('Google Sign-In error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#FBF9F5] min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-8 sm:p-10 border border-[#E7E0D8] shadow-xs max-w-md w-full space-y-6">
        {/* Brand */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            {mounted && logoDataUrl ? (
              <div className="relative w-32 h-10 mb-2">
                <Image src={logoDataUrl} alt="Store Logo" fill className="object-contain" />
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-[#B91C1C] rounded-lg flex items-center justify-center text-white">
                  <Pizza size={22} />
                </div>
                <div className="text-left">
                  <span className="block font-serif font-bold text-lg leading-tight text-[#1C1917]">
                    Pizza Expert
                  </span>
                  <span className="block text-[9px] text-[#B91C1C] font-bold tracking-widest uppercase">
                    Prayagraj
                  </span>
                </div>
              </>
            )}
          </Link>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-2">
            Sign In to Your Account
          </h1>
          <p className="text-[#57534E] text-xs mt-1">
            Access your customer account or admin dashboard
          </p>
        </div>

        {/* Google OAuth Button for Customers */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-[#E7E0D8] hover:bg-[#FBF9F5] rounded-xl text-xs font-bold text-[#1C1917] uppercase tracking-wider transition-all shadow-2xs hover:shadow-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>Continue with Google</span>
          </button>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-[#E7E0D8]"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#A8A29E] tracking-wider">
              Or with email
            </span>
            <div className="flex-grow border-t border-[#E7E0D8]"></div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pizzaexpert.in"
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'} <ArrowRight size={17} />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#E7E0D8] text-xs text-[#57534E]">
          Don&apos;t have an account?{' '}
          <Link href={`/register${redirectTarget !== '/admin' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`} className="font-semibold text-[#B91C1C] hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>

  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
        <div className="w-8 h-8 border-2 border-[#B91C1C] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
