import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'
import { onNewUserSignup } from '@/lib/billing/account-deletion'

/**
 * OAuth callback handler.
 *
 * Flow:
 * 1. User clicks "Continue with Google" → Supabase redirects to Google
 * 2. Google redirects back to this route with a `code` query param
 * 3. We exchange the code for a session using the server Supabase client
 *    (which sets the session cookies so the user is authenticated)
 * 4. Redirect to /dashboard (or wherever `next` points)
 *
 * The server client MUST be used here — the browser client cannot set
 * HTTP-only cookies from a Route Handler.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/onboarding'

    if (code) {
        const supabase = await createServerSupabaseClient()

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Fire-and-forget signup check — must not block the redirect (Requirements 5.2, 5.6)
            const user = data.session?.user
            if (user?.email && user?.id) {
                onNewUserSignup(user.email, user.id)
            }

            // Session is now set in cookies — redirect to dashboard
            return NextResponse.redirect(new URL(next, origin))
        }

        // Exchange failed — redirect to login with error
        const loginUrl = new URL('/auth/login', origin)
        loginUrl.searchParams.set('error', 'exchange_failed')
        return NextResponse.redirect(loginUrl)
    }

    // No code param — redirect to login
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(loginUrl)
}
