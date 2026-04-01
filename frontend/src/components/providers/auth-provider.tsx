'use client'

/**
 * AuthProvider
 *
 * Client component that initialises the Zustand auth store once on mount.
 * Wrap this around any layout that needs access to the current user
 * (e.g. the dashboard layout).
 *
 * It calls `initAuthStore()` which:
 *  1. Fetches the current Supabase session
 *  2. Subscribes to auth state changes for the lifetime of the component
 */

import { useEffect } from 'react'
import { initAuthStore } from '@/store/auth.store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // initAuthStore returns the unsubscribe fn — clean up on unmount
        let unsub: (() => void) | undefined

        initAuthStore().then((fn) => {
            unsub = fn
        })

        return () => unsub?.()
    }, [])

    return <>{children}</>
}
