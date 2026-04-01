'use server'

import { supabaseAdminClient } from '@/server/supabase/supabase-admin'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RefundIneligibleResult =
    | { eligible: false; reason: 'refunds_disabled' }
    | { eligible: false; reason: 'outside_window'; hoursElapsed: number }
    | { eligible: false; reason: 'usage_too_high'; creditsUsed: number }
    | { eligible: false; reason: 'is_renewal' }

export type RefundEligibleResult = {
    eligible: true
    amount: number
    currency: string
    creditsUsed: number
}

export type RefundEligibilityResult = RefundIneligibleResult | RefundEligibleResult

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Evaluates refund eligibility for a given user.
 * Must only be called from server-side code.
 *
 * Evaluation order (Requirement 2.7):
 *   1. refunds_disabled  — is_refund_eligible = false
 *   2. outside_window    — subscription_start > 24h ago
 *   3. usage_too_high    — credits_used_this_month > 5
 *   4. eligible
 */
export async function checkRefundEligibility(userId: string): Promise<RefundEligibilityResult> {
    const supabase = supabaseAdminClient()

    // Fetch user_active_plan, user_profiles, and latest payment in parallel
    const [planResult, paymentResult] = await Promise.all([
        supabase
            .from('user_active_plan')
            .select('plan_type, subscription_start, credits_used_this_month, renewal_count')
            .eq('user_id', userId)
            .single(),
        supabase
            .from('user_payments')
            .select('amount, currency')
            .eq('user_id', userId)
            .eq('event_type', 'payment.succeeded')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ])

    if (planResult.error || !planResult.data) {
        throw new Error(`[checkRefundEligibility] Failed to fetch user_active_plan for user ${userId}: ${planResult.error?.message}`)
    }

    const plan    = planResult.data
    const payment = paymentResult.data

    // If no successful payment exists, they cannot be partially eligible
    if (paymentResult.error) {
        throw new Error(`[checkRefundEligibility] Failed to fetch user_payments for user ${userId}: ${paymentResult.error?.message}`)
    }
    if (!payment) {
        return { eligible: false, reason: 'refunds_disabled' }
    }

    // 2. is_renewal - User has renewed at least once
    if ((plan.renewal_count ?? 0) > 0) {
        return { eligible: false, reason: 'is_renewal' }
    }

    // 2. outside_window — >24h since subscription_start (Requirement 2.4)
    const subscriptionStart = new Date(plan.subscription_start)
    const now               = new Date()
    const msElapsed         = now.getTime() - subscriptionStart.getTime()
    const hoursElapsed      = msElapsed / (1000 * 60 * 60)

    if (hoursElapsed > 24) {
        return { eligible: false, reason: 'outside_window', hoursElapsed }
    }

    // 3. usage_too_high — strictly > 5 (Requirement 2.5)
    const creditsUsed = plan.credits_used_this_month ?? 0

    if (creditsUsed > 5) {
        return { eligible: false, reason: 'usage_too_high', creditsUsed }
    }

    // 4. Eligible (Requirement 2.6)
    return {
        eligible:    true,
        amount:      payment.amount,
        currency:    payment.currency,
        creditsUsed,
    }
}
