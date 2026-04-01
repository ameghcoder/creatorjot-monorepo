'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
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
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
            <h1 className="text-2xl font-bold tracking-tight font-suse">Something went wrong</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
                An unexpected error occurred. Try again or return to the homepage.
            </p>
            <div className="flex gap-3">
                <Button variant="default" onClick={reset}>Try again</Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>Go home</Button>
            </div>
        </div>
    )
}
