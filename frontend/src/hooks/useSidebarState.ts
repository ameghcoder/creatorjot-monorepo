'use client'

import { useCallback, useSyncExternalStore } from 'react'

const COOKIE_NAME = 'sidebar-open'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function readCookie(): boolean {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`))
    return match ? match[1] === '1' : false
}

function writeCookie(open: boolean): void {
    document.cookie = `${COOKIE_NAME}=${open ? '1' : '0'}; path=/; max-age=${MAX_AGE}; SameSite=Lax`
}

/**
 * Subscribers notified when sidebar state changes so
 * `useSyncExternalStore` can re-read the cookie.
 */
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
    listeners.add(cb)
    return () => listeners.delete(cb)
}

function getSnapshot(): boolean {
    return readCookie()
}

function getServerSnapshot(): boolean {
    return false // SSR — always collapsed
}

/**
 * Hook that persists sidebar open/close state in a cookie.
 * Uses `useSyncExternalStore` to avoid hydration mismatches.
 */
export function useSidebarState(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
    const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

    const setOpen: React.Dispatch<React.SetStateAction<boolean>> = useCallback(
        (value) => {
            const next = typeof value === 'function' ? value(readCookie()) : value
            writeCookie(next)
            // Notify all subscribers so useSyncExternalStore re-reads
            listeners.forEach((cb) => cb())
        },
        [],
    )

    return [open, setOpen]
}
