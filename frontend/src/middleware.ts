/**
 * Next.js Middleware — Auth Guard
 *
 * Runs on every request before the page renders (edge runtime).
 * Uses @supabase/ssr to read the session from cookies without a
 * round-trip to the database.
 *
 * Rules:
 * - /dashboard/* → requires a session → redirect to /auth/login if not logged in
 * - /auth/login, /auth/signup → redirect to /dashboard if already logged in
 * - Everything else (public pages, /auth/callback) → pass through untouched
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/* Routes that require the user to be authenticated */
const PROTECTED_PREFIX = '/dashboard'

/* Checkout return — requires auth so we can look up the user's plan */
const CHECKOUT_RETURN = '/checkout/return'

/* Onboarding route */
const ONBOARDING_ROUTE = '/onboarding'

/* Auth routes — logged-in users should be bounced away from these */
const AUTH_ROUTES = ['/auth/login', '/auth/signup']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Build a response we can attach updated cookies to
    let response = NextResponse.next({
        request: { headers: request.headers },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Create a Supabase client that can read/write cookies on the response
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                // Write updated cookies onto both the request and response so
                // the refreshed session is available downstream
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                )
                response = NextResponse.next({
                    request: { headers: request.headers },
                })
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                )
            },
        },
    })

    // getUser() validates the JWT with Supabase Auth — more reliable than
    // getSession() which only reads the local cookie without server validation
    const { data: { user } } = await supabase.auth.getUser()

    const isLoggedIn = !!user
    const isProtected = pathname.startsWith(PROTECTED_PREFIX)
    const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
    const isCheckoutReturn = pathname.startsWith(CHECKOUT_RETURN)

    // Not logged in → trying to access a protected page, onboarding, or checkout return → send to login
    if (!isLoggedIn && (isProtected || pathname.startsWith(ONBOARDING_ROUTE) || isCheckoutReturn)) {
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Already logged in → trying to access login/signup → send to dashboard
    if (isLoggedIn && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Onboarding gate — only check for dashboard and onboarding routes
    if (isLoggedIn && (isProtected || pathname.startsWith(ONBOARDING_ROUTE))) {
        // Check cookie first to skip DB call
        const onboardedCookie = request.cookies.get('onboarded')?.value

        if (onboardedCookie === '1') {
            // Already onboarded — redirect away from /onboarding
            if (pathname.startsWith(ONBOARDING_ROUTE)) {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
            return response
        }

        // No cached cookie → check in DB
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('onboarded')
            .eq('user_id', user!.id)
            .single()

        const isOnboarded = profile?.onboarded === true

        if (isOnboarded) {
            // Set cookie so we skip DB lookup next time (30-day expiry)
            response.cookies.set('onboarded', '1', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30,
                path: '/',
            })

            // Redirect away from /onboarding if already onboarded
            if (pathname.startsWith(ONBOARDING_ROUTE)) {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
            return response
        }

        // Not onboarded → redirect to onboarding (unless already there)
        if (!pathname.startsWith(ONBOARDING_ROUTE)) {
            return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
        }
    }

    return response
}

/**
 * matcher — controls which paths the middleware runs on.
 *
 * Excludes:
 * - _next/static  (static assets)
 * - _next/image   (image optimisation)
 * - favicon.ico   (browser default request)
 * - /auth/callback (must pass through so the code exchange can happen)
 * - public asset folders (pwa, assets)
 */
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|auth/callback|pwa|assets).*)',
    ],
}
