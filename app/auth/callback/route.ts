import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login?confirmed=true'

  if (code) {
    const supabase = await createClient()
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && authData?.user) {
      const user = authData.user
      const meta = user.user_metadata || {}
      const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'Registered Customer'
      const phone = meta.phone || null
      const role = (user.email === 'malviya.pratyush26@gmail.com' || user.email === 'admin@demo.com') ? 'super_admin' : (meta.role || 'customer')

      // Ensure profile exists in public.profiles
      try {
        await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              name,
              phone,
              role,
              is_active: true,
              loyalty_points: 50,
            },
            { onConflict: 'id' }
          )
      } catch (upsertErr) {
        console.warn('Profile callback upsert note:', upsertErr)
      }

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
