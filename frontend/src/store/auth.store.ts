/**
 * Auth Store — Zustand
 *
 * Holds the current Supabase user session in global client state.
 * Populated once on app load via `initAuthStore()` and kept in sync
 * by the Supabase `onAuthStateChange` listener.
 *
 * Usage:
 *   const { user, loading } = useAuthStore()
 */

import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/server/supabase/supabase-browser'

interface AuthState {
    /** The currently authenticated Supabase user, or null if not signed in */
    user: User | null
    /** True while the initial session is being fetched */
    loading: boolean
    /** Set the user manually (used by the auth listener) */
    setUser: (user: User | null) => void
    /** Set loading state */
    setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),
}))

/**
 * initAuthStore
 *
 * Call once at the top of the app (e.g. in a client provider).
 * Fetches the current session and subscribes to auth state changes.
 * Returns the unsubscribe function so you can clean up on unmount.
 */
export async function initAuthStore() {
    const supabase = createBrowserSupabaseClient()
    const { setUser, setLoading } = useAuthStore.getState()

    // Fetch current session
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user ?? null)
    setLoading(false)

    // Subscribe to future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
}
