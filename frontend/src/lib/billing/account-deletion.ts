'use server'

import { supabaseAdminClient } from '@/server/supabase/supabase-admin'
import { Resend } from 'resend'
import { welcomeEmail } from '@/lib/email-templates'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CanDeleteResult =
    | { canDelete: true }
    | { canDelete: false; reason: 'active_subscription' | 'open_dispute' }

// ── canDeleteAccount ──────────────────────────────────────────────────────────

/**
 * Checks whether a user is allowed to delete their account.
 * Must only be called from server-side code.
 *
 * Evaluation order (Requirements 3.2, 3.3, 3.4):
 *   1. active_subscription — payment_status = 'active' AND cancel_at_period_end = false
 *   2. open_dispute        — access_paused = true in user_disputes
 *   3. canDelete: true
 */
export async function canDeleteAccount(userId: string): Promise<CanDeleteResult> {
    const supabase = supabaseAdminClient()

    // Check for active subscription (Requirement 3.2)
    const { data: plan, error: planError } = await supabase
        .from('user_active_plan')
        .select('payment_status, cancel_at_period_end')
        .eq('user_id', userId)
        .single()

    if (planError && planError.code !== 'PGRST116') {
        throw new Error(`[canDeleteAccount] Failed to fetch user_active_plan: ${planError.message}`)
    }

    if (plan && plan.payment_status === 'active' && plan.cancel_at_period_end === false) {
        return { canDelete: false, reason: 'active_subscription' }
    }

    // Check for open dispute (Requirement 3.3)
    const { data: dispute, error: disputeError } = await supabase
        .from('user_disputes')
        .select('access_paused')
        .eq('user_id', userId)
        .eq('access_paused', true)
        .maybeSingle()

    if (disputeError) {
        throw new Error(`[canDeleteAccount] Failed to fetch user_disputes: ${disputeError.message}`)
    }

    if (dispute) {
        return { canDelete: false, reason: 'open_dispute' }
    }

    return { canDelete: true }
}

// ── executeAccountDeletion ────────────────────────────────────────────────────

/**
 * Archives billing state then deletes the user account.
 * Must only be called after canDeleteAccount returns { canDelete: true }.
 * Requirements: 4.1–4.7
 */
export async function executeAccountDeletion(userId: string): Promise<void> {
    const supabase = supabaseAdminClient()

    // 1. Fetch billing state BEFORE any deletion (Requirement 4.2)
    const [profileResult, planResult, paymentsResult] = await Promise.all([
        supabase
            .from('user_profiles')
            .select('email, refund_count')
            .eq('user_id', userId)
            .single(),
        supabase
            .from('user_active_plan')
            .select('plan_type, credits_used_this_month, dodo_customer_id')
            .eq('user_id', userId)
            .single(),
        supabase
            .from('user_payments')
            .select('amount')
            .eq('user_id', userId)
            .eq('event_type', 'payment.succeeded'),
    ])

    if (profileResult.error || !profileResult.data) {
        throw new Error(`[executeAccountDeletion] Failed to fetch user_profiles: ${profileResult.error?.message}`)
    }

    const profile = profileResult.data
    const plan = planResult.data
    const payments = paymentsResult.data ?? []

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
    const refundCount = profile.refund_count ?? 0
    const isFlagged = refundCount > 0 // Requirement 4.5
    const now = new Date().toISOString()

    // 2. Insert into deleted_account_registry (Requirement 4.3)
    const { error: registryError } = await supabase
        .from('deleted_account_registry')
        .insert({
            original_user_id: userId,
            email: profile.email,
            dodo_customer_id: plan?.dodo_customer_id ?? null,
            total_refunds_issued: refundCount,
            total_amount_refunded: 0, // populated by webhook handler
            had_active_plan: !!plan && plan.plan_type !== 'free',
            credits_used_at_delete: plan?.credits_used_this_month ?? 0,
            deleted_at: now,
            flagged: isFlagged,
            flag_reason: isFlagged ? 'previous_refund_history' : null,
        })

    if (registryError) {
        throw new Error(`[executeAccountDeletion] Failed to insert deleted_account_registry: ${registryError.message}`)
    }

    // 3. Upsert billing_identity_log (Requirement 4.4)
    const { error: logError } = await supabase
        .from('billing_identity_log')
        .upsert(
            {
                user_id: userId,
                email: profile.email,
                dodo_customer_id: plan?.dodo_customer_id ?? null,
                total_paid: totalPaid,
                refund_count: refundCount,
                account_deleted_at: now,
                last_subscription_plan: plan?.plan_type ?? null,
                is_flagged: isFlagged,
                flag_reason: isFlagged ? 'previous_refund_history' : null,
                updated_at: now,
            },
            { onConflict: 'email' }
        )

    if (logError) {
        throw new Error(`[executeAccountDeletion] Failed to upsert billing_identity_log: ${logError.message}`)
    }

    // 4. Delete user data via existing RPC (Requirement 4.6)
    const { error: deleteError } = await supabase.rpc('delete_user_profile', {
        target_user_id: userId,
    })

    if (deleteError) {
        throw new Error(`[executeAccountDeletion] Failed to delete user profile: ${deleteError.message}`)
    }
}

// ── onNewUserSignup ───────────────────────────────────────────────────────────

/**
 * Checks deleted_account_registry on new user signup and flags returning
 * users who previously received refunds.
 *
 * Fire-and-forget safe — never throws (Requirements 5.1, 5.3–5.6).
 * Must be called from the OAuth callback route after session exchange.
 */
export async function onNewUserSignup(email: string, userId: string): Promise<void> {
    try {
        const supabase = supabaseAdminClient()
        const now = new Date().toISOString()

        // Query deleted_account_registry by email (Requirement 5.3)
        const { data: registry } = await supabase
            .from('deleted_account_registry')
            .select('total_refunds_issued, flagged')
            .eq('email', email)
            .maybeSingle()

        // Flag returning users with prior refund history (Requirement 5.4)
        if (registry && (registry.total_refunds_issued > 0 || registry.flagged === true)) {
            await supabase
                .from('user_profiles')
                .update({
                    is_refund_eligible: false,
                    risk_flag: 'previous_refund_history',
                })
                .eq('user_id', userId)
        }

        // Upsert billing_identity_log with new account creation (Requirement 5.5)
        await supabase
            .from('billing_identity_log')
            .upsert(
                {
                    user_id: userId,
                    email,
                    account_created_at: now,
                    updated_at: now,
                },
                { onConflict: 'email' }
            )

        // Send welcome email (fire-and-forget)
        const resendKey = process.env.RESEND_API_KEY
        if (resendKey) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('full_name')
                .eq('user_id', userId)
                .single()
            const name = profile?.full_name?.split(' ')[0] ?? email.split('@')[0]
            const resend = new Resend(resendKey)
            await resend.emails.send({
                from: process.env.EMAIL_FROM ?? 'CreatorJot <notifications@creatorjot.com>',
                to: email,
                subject: 'Welcome to CreatorJot 👋',
                html: welcomeEmail({ name }),
            }).catch(() => {}) // never block signup
        }
    } catch (err) {
        // Never throw — must not block the OAuth redirect (Requirement 5.6)
        console.error('[onNewUserSignup] Non-blocking error during signup check:', err)
    }
}
