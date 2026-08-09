import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Fast-path: Only execute auth checks for protected route prefixes
  const isProtectedAdmin = pathname.startsWith('/admin')
  const isProtectedAccount = pathname.startsWith('/account')

  let supabaseResponse = NextResponse.next({ request })

  // 1. Fast Admin Bypass: If admin cookie exists, return immediately without network latency
  const hasSimpleAdmin = request.cookies.get('simple_admin')?.value === 'true'
  const hasAdminAuth = request.cookies.get('admin_auth')?.value === 'true'

  if (isProtectedAdmin && (hasSimpleAdmin || hasAdminAuth)) {
    return supabaseResponse
  }

  // If not accessing a protected route, skip blocking Supabase network requests completely
  if (!isProtectedAdmin && !isProtectedAccount) {
    return supabaseResponse
  }

  // 2. Initialize Supabase SSR client for protected routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Retrieve user session from Supabase
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /admin routes
  if (isProtectedAdmin) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Role check via profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || 'customer'
    const isAdminRole = ['super_admin', 'manager', 'staff', 'viewer'].includes(role)

    if (!isAdminRole) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Cache admin authorization cookie to make future page clicks instant
    supabaseResponse.cookies.set('admin_auth', 'true', {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
    })
  }

  // Protect /account routes
  if (isProtectedAccount) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
