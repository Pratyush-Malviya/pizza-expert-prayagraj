'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pizza, Lock, Mail, User, Phone, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
          },
        },
      })

      if (error) {
        toast.error(error.message || 'Registration failed')
      } else {
        toast.success('Registration successful! Please sign in.')
        router.push(redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : '/login')
      }
    } catch {
      toast.error('Registration error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#FBF9F5] min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-8 sm:p-10 border border-[#E7E0D8] shadow-xs max-w-md w-full space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
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
          </Link>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-2">
            Create an Account
          </h1>
          <p className="text-[#57534E] text-xs mt-1">
            Join Pizza Expert for exclusive deals & fast ordering
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1">
              Full Name
            </label>
            <div className="relative">
              <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Sharma"
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="input-field pl-10"
              />
            </div>
          </div>

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
                placeholder="rahul@example.com"
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
            {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight size={17} />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#E7E0D8] text-xs text-[#57534E]">
          Already have an account?{' '}
          <Link href={`/login${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`} className="font-semibold text-[#B91C1C] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
        <div className="w-8 h-8 border-2 border-[#B91C1C] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
