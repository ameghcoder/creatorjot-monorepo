/**
 * supabase-server.ts
 *
 * Creates a Supabase client for use in Next.js Server Components,
 * Route Handlers, and Middleware. Uses @supabase/ssr which reads
 * and writes cookies via the Next.js `cookies()` API so the session
 * is persisted correctly on the server side.
 *
 * Use this (not the browser client) in:
 * - Route Handlers (app/api/... or auth/callback/route.ts)
 * - Server Components
 * - Middleware
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
    }

    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                } catch {
                    // setAll called from a Server Component — cookies can't be
                    // set there, but the session will still work if middleware
                    // is refreshing it. Safe to ignore.
                }
            },
        },
    })
}
