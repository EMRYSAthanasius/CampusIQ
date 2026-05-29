// src/proxy.ts
// Refreshes auth sessions and protects routes

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware entirely for public routes that don't need auth
  if (pathname === '/' || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

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

    // Refresh user session
    const { data: { user } } = await supabase.auth.getUser()

    // Protect dashboard and admin routes
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/quiz') || pathname.startsWith('/admin')
    const isAuthRoute = pathname.startsWith('/auth')

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', 'protected')
      return NextResponse.redirect(url)
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (e) {
    // If middleware crashes, let the request through rather than blocking
    console.error('Middleware error:', e)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match request paths that need auth handling:
     * - /dashboard, /quiz, /admin, /auth routes
     */
    '/dashboard/:path*',
    '/quiz/:path*',
    '/admin/:path*',
    '/auth/:path*',
  ],
}
