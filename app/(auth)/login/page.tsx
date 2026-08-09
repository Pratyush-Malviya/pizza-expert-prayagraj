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
        toast.success('Logged in successfully!')
        router.push(redirectTarget)
      }
    } catch {
      toast.error('Login error. Please try again.')
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
            Access your orders or admin dashboard
          </p>
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
