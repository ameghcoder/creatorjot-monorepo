'use client'

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <html lang="en">
            <body style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h1>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: '24rem' }}>
                    A critical error occurred. Please try again.
                </p>
                <button
                    onClick={reset}
                    style={{ padding: '0.5rem 1.25rem', background: '#000', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                    Try again
                </button>
            </body>
        </html>
    )
}
