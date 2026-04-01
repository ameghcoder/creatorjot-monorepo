'use client'

// Client component that polls /api/checkout/status until the plan upgrades or times out
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const MAX_POLLS = 5
const POLL_INTERVAL_MS = 2500

export function ReturnPagePoller({ userId }: { userId: string }) {
    const router = useRouter()
    const [timedOut, setTimedOut] = useState(false)
    const pollCount = useRef(0)

    useEffect(() => {
        // Poll /api/checkout/status every 2.5 seconds up to MAX_POLLS times
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/checkout/status?user_id=${userId}`)
                const data: { plan: 'free' | 'pro' } = await res.json()

                // Only increment on a successful response (network errors do not count)
                pollCount.current += 1

                if (data.plan === 'pro') {
                    clearInterval(interval)
                    router.replace('/pricing?success=true')
                    return
                }

                if (pollCount.current >= MAX_POLLS) {
                    clearInterval(interval)
                    setTimedOut(true)
                }
            } catch {
                // Network error — keep polling without incrementing the failure count
            }
        }, POLL_INTERVAL_MS)

        return () => clearInterval(interval)
    }, [userId, router])

    if (timedOut) {
        // Timeout state — webhook may still arrive, show a helpful message
        return (
            <div className="min-h-dvh flex items-center justify-center px-6">
                <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center space-y-4">
                    <h2 className="text-lg font-bold font-suse">Taking longer than expected</h2>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                        Your payment may still be processing. Check your email for confirmation or contact support.
                    </p>
                    <Link
                        href="/pricing"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <ArrowLeft className="size-3.5" />
                        Back to pricing
                    </Link>
                </div>
            </div>
        )
    }

    // Processing state — spinner while polling
    return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <div className="text-center space-y-1">
                <h2 className="text-lg font-bold font-suse">Confirming your payment…</h2>
                <p className="text-[13px] text-muted-foreground">This usually takes a few seconds.</p>
            </div>
        </div>
    )
}
