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

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // 1. Strictly enforce role resolution from active profiles table
    let profile: { role: string; is_active: boolean } | null = null

    // Use Service Role Client if available to bypass RLS restrictions during middleware auth check
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (supabaseUrl && serviceRoleKey) {
      const { createClient: createAdmin } = await import('@supabase/supabase-js')
      const adminClient = createAdmin(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: adminProf } = await adminClient
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      profile = adminProf

      // Auto-heal/elevate primary owner account if profile is missing or marked customer
      const isPrimaryAdminEmail = user.email === 'malviya.pratyush26@gmail.com' || user.user_metadata?.role === 'super_admin'
      if (isPrimaryAdminEmail && (!profile || profile.role !== 'super_admin')) {
        const { data: elevatedProf } = await adminClient
          .from('profiles')
          .upsert({
            id: user.id,
            name: user.user_metadata?.name || 'Pratyush Malviya',
            role: 'super_admin',
            is_active: true,
          })
          .select('role, is_active')
          .single()

        if (elevatedProf) {
          profile = elevatedProf
        }
      }
    }

    // Fallback to standard client if service role key is not available
    if (!profile) {
      const { data: userProf } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      profile = userProf
    }

    if (!profile || !profile.is_active) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }

    const role = profile.role

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
