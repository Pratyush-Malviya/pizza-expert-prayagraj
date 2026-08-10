import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login?confirmed=true'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pizza-kappa-nine.vercel.app'
      const baseUrl = forwardedHost ? `https://${forwardedHost}` : (origin.includes('localhost') ? appUrl : origin)

      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  // Fallback if code exchange fails or link expired
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pizza-kappa-nine.vercel.app'
  return NextResponse.redirect(`${appUrl}/login?error=confirmation-link-expired`)
}
