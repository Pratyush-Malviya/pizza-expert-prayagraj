import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isProtectedAdmin = pathname.startsWith('/admin')
  const isProtectedAccount = pathname.startsWith('/account')

  let supabaseResponse = NextResponse.next({ request })

  // If not accessing a protected route, skip blocking Supabase network requests completely
  if (!isProtectedAdmin && !isProtectedAccount) {
    return supabaseResponse
  }

  // Initialize Supabase SSR client for protected routes
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

  // Retrieve user session from Supabase
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /admin routes
  if (isProtectedAdmin) {
    // 0. Allow dedicated admin login page
    if (pathname === '/admin/login') {
      return supabaseResponse
    }

    // 1. Allow production admin session or demo admin cookie bypass
    const adminSession = request.cookies.get('admin_session')?.value === 'true'
    const simpleAdmin = request.cookies.get('simple_admin')?.value === 'true'
    if (adminSession || simpleAdmin) {
      return supabaseResponse
    }

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Primary admin email override + Role check via profiles table
    let role = (user.email === 'malviya.pratyush26@gmail.com' || user.email === 'admin@demo.com') ? 'super_admin' : ''

    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      role = profile?.role || user.user_metadata?.role || 'super_admin'
    }

    const isAdminRole = ['super_admin', 'manager', 'staff', 'viewer'].includes(role)

    if (!isAdminRole) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Route-level RBAC Enforcement
    if (role === 'staff' && !pathname.startsWith('/admin/kitchen') && !pathname.startsWith('/admin/inventory')) {
      // Staff (like chefs) can only access kitchen and inventory
      const url = request.nextUrl.clone()
      url.pathname = '/admin/kitchen'
      return NextResponse.redirect(url)
    }

    if (role === 'manager' && (pathname.startsWith('/admin/staff') || pathname.startsWith('/admin/settings'))) {
      // Managers cannot access staff management or critical settings
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    
    if (role === 'viewer' && !(pathname === '/admin' || pathname.startsWith('/admin/orders') || pathname.startsWith('/admin/analytics'))) {
      // Viewers can only view dashboard, orders, analytics
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
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
