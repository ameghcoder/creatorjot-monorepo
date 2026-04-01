'use client'

import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { createBrowserSupabaseClient } from '@/server/supabase/supabase-browser'
import { useAuthStore } from '@/store/auth.store'
import { SUBSCRIPTION_PLANS } from '@/constants/subscription-plans'
import { EMAIL_ADDR } from '@/constants/emails'
import {
    Crown, Zap, ArrowRight, CheckCircle2, CreditCard,
    X, Mail, ExternalLink, AlertTriangle, Info, AlertCircle,
    ChevronDown, ChevronUp, Video, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScaleCard } from '@/components/layout/scale-card'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Empty } from '@/components/ui/empty'
import Link from 'next/link'

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreditHistoryEntry {
    id: string
    event_type: 'video_processing' | 'post_generation'
    platform: string | null
    credits_charged: number
    video_duration_minutes: number | null
    was_cached: boolean
    created_at: string
}

type RefundEligibility =
    | { eligible: true; creditsUsed: number; amount: number; currency: string }
    | { eligible: false; reason: 'refunds_disabled' }
    | { eligible: false; reason: 'outside_window'; hoursElapsed: number }
    | { eligible: false; reason: 'usage_too_high'; creditsUsed: number }
    | { eligible: false; reason: 'is_renewal' }
    | null

type StatusBadge = 'Active' | 'Cancelled' | 'On Hold' | 'Disputed'

function getStatusBadge(paymentStatus: string, cancelAtPeriodEnd: boolean): StatusBadge {
    if (paymentStatus === 'disputed') return 'Disputed'
    if (paymentStatus === 'cancelled' || cancelAtPeriodEnd) return 'Cancelled'
    if (paymentStatus === 'pending' || paymentStatus === 'revoked' || paymentStatus === 'expired') return 'On Hold'
    return 'Active'
}

function statusBadgeVariant(badge: StatusBadge) {
    switch (badge) {
        case 'Active': return 'success' as const
        case 'Cancelled': return 'warning' as const
        case 'On Hold': return 'secondary' as const
        case 'Disputed': return 'destructive' as const
    }
}

// ── Cancel Subscription Modal ─────────────────────────────────────────────────

interface CancelModalProps {
    subscriptionEnd: string | null
    onClose: () => void
    onSuccess: (accessUntil: string | null) => void
}

function CancelModal({ subscriptionEnd, onClose, onSuccess }: CancelModalProps) {
    const [submitting, setSubmitting] = useState(false)

    const endDateFormatted = subscriptionEnd
        ? format(new Date(subscriptionEnd), 'MMM d, yyyy')
        : 'the end of your billing period'

    async function handleCancel() {
        setSubmitting(true)
        try {
            const res = await fetch('/api/billing/cancel-subscription', { method: 'POST' })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to cancel subscription')
            }
            const data = await res.json()
            onSuccess(data.accessUntil ?? subscriptionEnd)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
                    disabled={submitting}
                >
                    <X className="size-4" />
                </button>

                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="size-6 text-destructive" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold font-suse">Cancel subscription?</h3>
                    <p className="text-[13px] text-muted-foreground/90 leading-relaxed">
                        Your plan will remain active until{' '}
                        <span className="font-semibold text-foreground">{endDateFormatted}</span>.
                        You won&apos;t be charged again. Are you sure you want to cancel?
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Keep my plan
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={handleCancel}
                        disabled={submitting}
                        state={submitting ? 'loading' : 'idle'}
                    >
                        Cancel subscription
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}

// ── Refund Modal ──────────────────────────────────────────────────────────────

interface RefundModalProps {
    creditsUsed: number
    userEmail: string
    onClose: () => void
    onSuccess: () => void
}

function RefundModal({ creditsUsed, userEmail, onClose, onSuccess }: RefundModalProps) {
    const [submitting, setSubmitting] = useState(false)
    const [succeeded, setSucceeded] = useState(false)

    async function handleRequestRefund() {
        setSubmitting(true)
        try {
            const res = await fetch('/api/billing/request-refund', { method: 'POST' })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to submit refund request')
            }
            setSucceeded(true)
            onSuccess()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
                    disabled={submitting}
                >
                    <X className="size-4" />
                </button>

                {succeeded ? (
                    <div className="flex flex-col items-center text-center gap-4 py-2">
                        <div className="flex size-12 items-center justify-center rounded-full bg-green-500/10">
                            <CheckCircle2 className="size-6 text-green-600" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-lg font-bold font-suse">Refund request received</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                We&apos;ll process it within 1 business day and email you at{' '}
                                <span className="font-medium text-foreground">{userEmail}</span>.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={onClose} className="mt-2">
                            Close
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                                <CreditCard className="size-6 text-primary" />
                            </div>
                            <h3 className="mb-2 text-lg font-bold font-suse">Confirm refund request</h3>
                            <p className="text-[13px] text-muted-foreground/90 leading-relaxed">
                                You&apos;ve used <span className="font-semibold text-foreground">{creditsUsed}</span> of your credits.
                                A full refund will be issued to your original payment method.
                                This action will cancel your subscription immediately and remove your remaining access.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={handleRequestRefund}
                                disabled={submitting}
                                state={submitting ? 'loading' : 'idle'}
                            >
                                Request refund
                            </Button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
    const { user, loading: authLoading } = useAuthStore()
    const supabase = createBrowserSupabaseClient()

    // Plan state
    const [planType, setPlanType] = useState<string>('free')
    const [paymentStatus, setPaymentStatus] = useState<string>('active')
    const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null)
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
    const [nextBillingDate, setNextBillingDate] = useState<string | null>(null)
    const [billingInterval, setBillingInterval] = useState<string | null>(null)
    const [creditsUsedThisMonth, setCreditsUsedThisMonth] = useState<number>(0)
    const [creditsLimit, setCreditsLimit] = useState<number>(0)
    const [subscriptionStart, setSubscriptionStart] = useState<string | null>(null)

    // Refund state
    const [refundEligibility, setRefundEligibility] = useState<RefundEligibility>(null)
    const [refundEligibilityLoading, setRefundEligibilityLoading] = useState(false)
    const [showRefundModal, setShowRefundModal] = useState(false)
    const [refundSubmitted, setRefundSubmitted] = useState(false)

    // Cancel state
    const [showCancelModal, setShowCancelModal] = useState(false)

    // Credit history state
    const [showCreditHistory, setShowCreditHistory] = useState(false)
    const [creditHistory, setCreditHistory] = useState<CreditHistoryEntry[]>([])
    const [creditHistoryLoading, setCreditHistoryLoading] = useState(false)
    const [creditHistoryLoaded, setCreditHistoryLoaded] = useState(false)

    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        if (!user) return
        supabase
            .from('user_active_plan')
            .select('plan_type, payment_status, subscription_end, cancel_at_period_end, dodo_subscription_id, next_billing_date, billing_interval, credits_used_this_month, credits_limit, subscription_start')
            .eq('user_id', user.id)
            .single()
            .then(({ data, error }) => {
                if (data && !error) {
                    setPlanType(data.plan_type)
                    setPaymentStatus(data.payment_status)
                    setSubscriptionEnd(data.subscription_end)
                    setCancelAtPeriodEnd(data.cancel_at_period_end ?? false)
                    setNextBillingDate(data.next_billing_date)
                    setBillingInterval(data.billing_interval)
                    setCreditsUsedThisMonth(data.credits_used_this_month ?? 0)
                    setCreditsLimit(data.credits_limit ?? 0)
                    setSubscriptionStart(data.subscription_start)
                }
                setFetching(false)
            })
    }, [user, supabase])

    // Fetch refund eligibility for paid users
    useEffect(() => {
        if (!user || planType === 'free') return
        setRefundEligibilityLoading(true)
        fetch('/api/billing/refund-eligibility')
            .then(res => res.json())
            .then(data => setRefundEligibility(data))
            .catch(() => setRefundEligibility(null))
            .finally(() => setRefundEligibilityLoading(false))
    }, [user, planType])

    async function handleShowCreditHistory() {
        if (creditHistoryLoaded) {
            setShowCreditHistory(v => !v)
            return
        }
        setShowCreditHistory(true)
        setCreditHistoryLoading(true)
        try {
            const { data, error } = await supabase
                .from('credit_usage_log')
                .select('id, event_type, platform, credits_charged, video_duration_minutes, was_cached, created_at')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false })
                .limit(100)
            if (!error && data) {
                setCreditHistory(data as CreditHistoryEntry[])
                setCreditHistoryLoaded(true)
            }
        } finally {
            setCreditHistoryLoading(false)
        }
    }

    async function handleUpgrade() {
        if (!user) return
        setIsCheckoutLoading(true)
        try {
            const res = await fetch('/api/payments/create-checkout', { method: 'POST' })
            if (!res.ok) throw new Error('Failed to create checkout session')
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                throw new Error('Invalid checkout session')
            }
        } catch (error: unknown) {
            const err = error as Error
            toast.error(err.message || 'Payment service unavailable')
            setIsCheckoutLoading(false)
        }
    }

    if (authLoading || fetching) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground/50">
                <p>Loading billing details...</p>
            </div>
        )
    }

    const proPlanObj = SUBSCRIPTION_PLANS.find(p => p.id === 'pro')!
    const statusBadge = getStatusBadge(paymentStatus, cancelAtPeriodEnd)
    const creditsPercent = creditsLimit > 0 ? Math.min(100, (creditsUsedThisMonth / creditsLimit) * 100) : 0

    return (
        <motion.div
            initial="hidden"
            animate="show"
            className="px-4 sm:px-8 py-8 sm:py-10 space-y-8"
        >
            <motion.div variants={fadeUp} className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
                    Billing & Subscription
                </p>
                <h1 className="text-2xl font-bold tracking-tight font-suse">
                    Payments
                </h1>
            </motion.div>

            {/* ── Plan Status Card ── */}
            <motion.div variants={fadeUp} className="max-w-3xl">
                <h2 className="text-sm font-semibold mb-4">Current Plan</h2>
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                    {/* Plan name + status badge */}
                    <div className="flex flex-wrap items-center gap-2">
                        {planType === 'pro' ? (
                            <Crown className="size-5 text-primary" />
                        ) : (
                            <Zap className="size-5 text-foreground/70" />
                        )}
                        <h3 className="text-lg font-bold font-suse capitalize">
                            {planType} Plan
                        </h3>
                        <Badge
                            variant={statusBadgeVariant(statusBadge)}
                            badgeStyle="modern"
                            size="sm"
                            dot
                        >
                            {statusBadge}
                        </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                        {planType === 'free'
                            ? 'You are currently on the free tier. Upgrade to Pro for increased generation limits and premium content tools.'
                            : 'You have access to all premium features and higher generation limits.'}
                    </p>

                    {/* Credits progress bar */}
                    {planType !== 'free' && creditsLimit > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Credits used this month</span>
                                <span className="font-mono">{creditsUsedThisMonth} / {creditsLimit}</span>
                            </div>
                            <Progress
                                value={creditsPercent}
                                size="sm"
                                shape="rounded"
                                state={creditsPercent >= 90 ? 'error' : creditsPercent >= 70 ? 'loading' : 'idle'}
                            />
                        </div>
                    )}

                    {/* Billing details */}
                    {planType !== 'free' && (
                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                            {billingInterval && (
                                <span className="capitalize">
                                    {billingInterval === 'month' ? 'Monthly' : billingInterval === 'year' ? 'Yearly' : billingInterval} billing
                                </span>
                            )}
                            {subscriptionStart && (
                                <span>
                                    Started {format(new Date(subscriptionStart), 'MMM d, yyyy')}
                                </span>
                            )}
                            {cancelAtPeriodEnd && subscriptionEnd ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    Access until {format(new Date(subscriptionEnd), 'MMM d, yyyy')}
                                </span>
                            ) : nextBillingDate ? (
                                <span>
                                    Next billing {format(new Date(nextBillingDate), 'MMM d, yyyy')}
                                </span>
                            ) : subscriptionEnd ? (
                                <span>
                                    Renews {format(new Date(subscriptionEnd), 'MMM d, yyyy')}
                                </span>
                            ) : null}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ── Upgrade Section for Free Users ── */}
            {planType === 'free' && (
                <motion.div variants={fadeUp} className="max-w-md pt-4">
                    <h2 className="text-sm font-semibold mb-4 text-primary">Available Upgrades</h2>
                    <ScaleCard
                        title={proPlanObj.name}
                        className="border-primary/20 shadow-md ring-1 ring-primary/10 relative overflow-hidden"
                        bodyClassName="space-y-6"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -z-10 rounded-bl-full" />

                        <p className="text-3xl font-bold font-suse">
                            ${proPlanObj.price}
                            <span className="text-sm font-normal text-muted-foreground">/{proPlanObj.interval}</span>
                        </p>

                        <div className="space-y-3">
                            {proPlanObj.features.map((f, i) => (
                                <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                                    <CheckCircle2 className="size-3.5 text-primary/70" />
                                    {f.text}
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={handleUpgrade}
                            disabled={isCheckoutLoading}
                            state={isCheckoutLoading ? 'loading' : 'idle'}
                            variant="default"
                            className="w-full cursor-pointer mt-6"
                            icon={<ArrowRight className="size-3.5" />}
                            iconPosition="end"
                        >
                            {paymentStatus === 'pending' ? 'Retry Payment' : 'Upgrade to Pro'}
                        </Button>
                    </ScaleCard>
                </motion.div>
            )}

            {/* ── Refund Section (paid users only) ── */}
            {planType !== 'free' && (
                <motion.div variants={fadeUp} className="max-w-3xl">
                    <h2 className="text-sm font-semibold mb-4">Refund</h2>
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">

                        {refundEligibilityLoading ? (
                            <p className="text-sm text-muted-foreground">Checking refund eligibility...</p>
                        ) : refundEligibility === null ? (
                            <p className="text-sm text-muted-foreground">Unable to load refund eligibility.</p>
                        ) : refundEligibility.eligible ? (
                            /* State A — Eligible */
                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
                                <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                    You&apos;re within the 24-hour refund window and have used 5 or fewer credits.{' '}
                                    {!refundSubmitted ? (
                                        <button
                                            onClick={() => setShowRefundModal(true)}
                                            className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer"
                                        >
                                            Request a refund →
                                        </button>
                                    ) : (
                                        <span className="font-semibold">Refund request submitted.</span>
                                    )}
                                </p>
                            </div>
                        ) : refundEligibility.reason === 'usage_too_high' ? (
                            /* State B — Usage too high */
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
                                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                                    Not eligible for a refund. You&apos;ve used{' '}
                                    <span className="font-semibold">{refundEligibility.creditsUsed} credits</span>{' '}
                                    on this plan. Refunds are not available after more than 5 credits have been consumed,
                                    as underlying API costs are immediately incurred on each generation.
                                </p>
                            </div>
                        ) : refundEligibility.reason === 'outside_window' ? (
                            /* State C — Outside window */
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
                                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                                    Refund window closed. Our 24-hour refund window has passed for this purchase.
                                    For any billing concerns, email us — we&apos;ll do our best to help.
                                </p>
                            </div>
                        ) : refundEligibility.reason === 'is_renewal' ? (
                            /* State D — Is Renewal */
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
                                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                                    Not eligible for a refund. Refunds are only available for first-time subscription payments. Renewals are final and non-refundable.
                                </p>
                            </div>
                        ) : (
                            /* State E — Refunds disabled */
                            <p className="text-sm text-muted-foreground">
                                Refunds are not available for your account. Please contact support if you have questions.
                            </p>
                        )}

                        {/* Support email — shown in ALL states */}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<Mail className="size-3.5" />}
                                iconPosition="start"
                                asChild
                            >
                                <a href={`mailto:${EMAIL_ADDR.support}`}>
                                    Email us at {EMAIL_ADDR.support}
                                </a>
                            </Button>

                            <Link
                                href="/refund-policy"
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View refund policy
                                <ExternalLink className="size-3" />
                            </Link>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Cancel Subscription Section (paid users only) ── */}
            {planType !== 'free' && (
                <motion.div variants={fadeUp} className="max-w-3xl">
                    <h2 className="text-sm font-semibold mb-4">Cancel Subscription</h2>
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">

                        {cancelAtPeriodEnd ? (
                            /* Already cancelled — show confirmation message (Requirement 10.12) */
                            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 flex gap-3">
                                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                                    Successfully cancelled. You have access until{' '}
                                    <span className="font-semibold">
                                        {subscriptionEnd ? format(new Date(subscriptionEnd), 'MMM d, yyyy') : 'the end of your billing period'}
                                    </span>. You won&apos;t be charged again.
                                </p>
                            </div>
                        ) : paymentStatus === 'active' ? (
                            /* Active — show policy summary + cancel button (Requirements 10.8, 10.9) */
                            <>
                                <ul className="space-y-2">
                                    {[
                                        `Your plan stays active until the end of the current billing period${subscriptionEnd ? ` (${format(new Date(subscriptionEnd), 'MMM d, yyyy')})` : ''}`,
                                        'You keep all your remaining credits until that date',
                                        'You will not be charged again after cancellation',
                                        'Cancellation does not trigger a refund — refunds are handled separately in the Refund section above',
                                    ].map((point, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <span className="mt-1.5 size-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                                            {point}
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    href="/refund-policy"
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 w-fit"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    View full refund policy
                                    <ExternalLink className="size-3" />
                                </Link>

                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setShowCancelModal(true)}
                                >
                                    Cancel Subscription
                                </Button>
                            </>
                        ) : null}

                    </div>
                </motion.div>
            )}

            {/* ── Credit Usage History ── */}
            <motion.div variants={fadeUp} className="max-w-3xl pb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold">Credit Usage</h2>
                    <button
                        onClick={handleShowCreditHistory}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showCreditHistory ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        {showCreditHistory ? 'Hide' : 'Show Used Credits'}
                    </button>
                </div>

                {showCreditHistory && (
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                        {creditHistoryLoading ? (
                            <div className="p-6 text-sm text-muted-foreground">Loading history…</div>
                        ) : creditHistory.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground/60">No credit usage recorded yet.</div>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {creditHistory.map(entry => {
                                    const isVideo = entry.event_type === 'video_processing'
                                    const label = isVideo
                                        ? entry.was_cached ? 'Video (cached)' : 'Video processing'
                                        : entry.platform
                                            ? entry.platform === 'x' ? 'X (Twitter)'
                                                : entry.platform === 'yt_community_post' ? 'YT Community'
                                                    : entry.platform.charAt(0).toUpperCase() + entry.platform.slice(1)
                                            : 'Generation'

                                    return (
                                        <div key={entry.id} className="flex items-center justify-between px-5 py-3 gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`shrink-0 flex size-7 items-center justify-center rounded-lg ${isVideo ? 'bg-violet-500/10' : 'bg-blue-500/10'}`}>
                                                    {isVideo
                                                        ? <Video className="size-3.5 text-violet-500" />
                                                        : <FileText className="size-3.5 text-blue-500" />
                                                    }
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-medium truncate">{label}</p>
                                                    <p className="text-[11px] text-muted-foreground/60">
                                                        {format(new Date(entry.created_at), 'MMM d, yyyy · h:mm a')}
                                                        {entry.video_duration_minutes != null && (
                                                            <span> · {Math.round(entry.video_duration_minutes)} min</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`shrink-0 text-[12px] font-semibold tabular-nums ${entry.credits_charged === 0 ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                                                {entry.credits_charged === 0 ? '—' : `-${entry.credits_charged}`}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* ── Refund Confirmation Modal ── */}
            {showRefundModal && user && (
                <RefundModal
                    creditsUsed={refundEligibility?.eligible ? refundEligibility.creditsUsed : 0}
                    userEmail={user.email ?? ''}
                    onClose={() => setShowRefundModal(false)}
                    onSuccess={() => {
                        setRefundSubmitted(true)
                        setShowRefundModal(false)
                    }}
                />
            )}

            {/* ── Cancel Subscription Modal ── */}
            {showCancelModal && (
                <CancelModal
                    subscriptionEnd={subscriptionEnd}
                    onClose={() => setShowCancelModal(false)}
                    onSuccess={(accessUntil) => {
                        setShowCancelModal(false)
                        setCancelAtPeriodEnd(true)
                        setPaymentStatus('cancelled')
                        if (accessUntil) setSubscriptionEnd(accessUntil)
                    }}
                />
            )}
        </motion.div>
    )
}
