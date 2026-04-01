// Checkout error page — shown when payment fails, is cancelled, or session is invalid
import type { Metadata } from 'next'
import Link from 'next/link'
import { XCircle } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Checkout Error | CreatorJot',
    description: 'Something went wrong during checkout.',
    robots: { index: false, follow: false },
}

type ErrorReason = 'payment_failed' | 'cancelled' | 'invalid_session' | 'unknown'

const REASON_COPY: Record<ErrorReason, { heading: string; body: string }> = {
    payment_failed: {
        heading: 'Payment failed',
        body: 'Your payment could not be processed. Please check your card details and try again.',
    },
    cancelled: {
        heading: 'Checkout cancelled',
        body: 'You cancelled the checkout. No charge was made.',
    },
    invalid_session: {
        heading: 'Session expired',
        body: 'Your checkout session has expired. Please start again from the pricing page.',
    },
    unknown: {
        heading: 'Something went wrong',
        body: 'An unexpected error occurred during checkout. Please try again or contact support.',
    },
}

export default async function CheckoutErrorPage({
    searchParams,
}: {
    searchParams: Promise<{ reason?: string }>
}) {
    const params = await searchParams
    const reason = (params.reason as ErrorReason) ?? 'unknown'
    const copy = REASON_COPY[reason] ?? REASON_COPY.unknown

    return (
        <div className="min-h-dvh flex items-center justify-center px-6">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center space-y-5">
                {/* Error icon */}
                <XCircle className="size-12 text-destructive mx-auto" />

                {/* Heading + body */}
                <div className="space-y-2">
                    <h1 className="text-xl font-bold font-suse">{copy.heading}</h1>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{copy.body}</p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-2">
                    <Link
                        href="/pricing"
                        className="inline-flex items-center justify-center h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-opacity hover:opacity-90"
                    >
                        Try again
                    </Link>
                    <a
                        href="mailto:support@creatorjot.com"
                        className="inline-flex items-center justify-center h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20"
                    >
                        Contact support
                    </a>
                </div>
            </div>
        </div>
    )
}
