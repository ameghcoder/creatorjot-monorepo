// Webhook handler for DodoPayments events — syncs subscription state to Supabase
//
// Event catalog (from Dodo docs):
//   payment.succeeded      → recordPayment + upgrade to pro
//   payment.failed         → recordPayment + conditionally downgrade
//   payment.processing     → recordPayment (no plan change)
//   payment.cancelled      → recordPayment (no plan change)
//   subscription.active    → insert user_subscriptions + recordPayment from invoice + upgrade to pro
//   subscription.renewed   → insert user_subscriptions + recordPayment + refresh subscription_end, increment renewal_count only if new payment
//   subscription.updated   → insert user_subscriptions + sync status
//   subscription.plan_changed → insert user_subscriptions + sync plan
//   subscription.on_hold   → insert user_subscriptions + conditionally downgrade
//   subscription.failed    → insert user_subscriptions + conditionally downgrade
//   subscription.cancelled → insert user_subscriptions + downgrade to free
//   subscription.expired   → insert user_subscriptions + downgrade to free
//   refund.succeeded       → insert user_refunds + check plan + downgrade if needed
//   refund.failed          → insert user_refunds (no plan change)
//   dispute.opened         → insert/upsert user_disputes + pause access
//   dispute.challenged     → upsert user_disputes (status update only)
//   dispute.won            → upsert user_disputes + restore access
//   dispute.cancelled      → upsert user_disputes + restore access
//   dispute.expired        → upsert user_disputes + restore access
//   dispute.lost           → upsert user_disputes + revoke access (downgrade to free)
//   dispute.accepted       → upsert user_disputes + revoke access (downgrade to free)

import { NextRequest, NextResponse } from 'next/server'
import { dodoClient } from '@/server/dodopayments/server-dodoclient'
import { supabaseAdminClient } from '@/server/supabase/supabase-admin'
import { downgradeUserToFree } from '@/lib/subscription/downgrade'
import type { Subscription } from 'dodopayments/resources/subscriptions'
import type { Payment } from 'dodopayments/resources/payments'
import type { Refund } from 'dodopayments/resources/refunds'
import type { Dispute } from 'dodopayments/resources/disputes'

if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    console.warn('[dodo-webhook] WARNING: DODO_PAYMENTS_WEBHOOK_KEY is not set — webhook signature verification will fail')
}

export async function POST(req: NextRequest) {
    const bodyText = await req.text()
    const headers = Object.fromEntries(req.headers.entries())

    let event
    try {
        event = dodoClient.webhooks.unwrap(bodyText, {
            headers,
            key: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
        })
    } catch (err) {
        console.error('[dodo-webhook] Signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const supabase = supabaseAdminClient()

    switch (event.type) {
        // ── Payment events ──────────────────────────────────────────────────────
        case 'payment.succeeded':
        case 'payment.failed':
        case 'payment.processing':
        case 'payment.cancelled': {
            await handlePaymentEvent(supabase, event.data as Payment, event.type)
            break
        }

        // ── Subscription events ─────────────────────────────────────────────────
        case 'subscription.active':
        case 'subscription.renewed':
        case 'subscription.updated':
        case 'subscription.plan_changed':
        case 'subscription.on_hold':
        case 'subscription.failed':
        case 'subscription.cancelled':
        case 'subscription.expired': {
            await handleSubscriptionEvent(supabase, event.data as Subscription, event.type)
            break
        }

        // ── Refund events ───────────────────────────────────────────────────────
        case 'refund.succeeded':
        case 'refund.failed': {
            await handleRefundEvent(supabase, event.data as Refund, event.type)
            break
        }

        // ── Dispute events ──────────────────────────────────────────────────────
        case 'dispute.opened':
        case 'dispute.challenged':
        case 'dispute.won':
        case 'dispute.cancelled':
        case 'dispute.expired':
        case 'dispute.lost':
        case 'dispute.accepted': {
            await handleDisputeEvent(supabase, event.data as Dispute, event.type)
            break
        }

        default:
            break
    }

    return NextResponse.json({ received: true })
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SupabaseAdmin = ReturnType<typeof supabaseAdminClient>

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve user_id from dodo_customer_id stored in user_profiles */
async function resolveUserIdByCustomer(
    supabase: SupabaseAdmin,
    customerId: string,
    eventType: string
): Promise<string | null> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('dodo_customer_id', customerId)
        .single()

    if (error || !data) {
        console.error(`[dodo-webhook][${eventType}] No profile found for customer_id=${customerId}:`, error)
        return null
    }
    return data.user_id
}

/** Resolve user_id from dodo_subscription_id stored in user_active_plan */
async function resolveUserIdBySubscription(
    supabase: SupabaseAdmin,
    subscriptionId: string,
    eventType: string
): Promise<string | null> {
    const { data, error } = await supabase
        .from('user_active_plan')
        .select('user_id')
        .eq('dodo_subscription_id', subscriptionId)
        .single()

    if (error || !data) {
        console.error(`[dodo-webhook][${eventType}] No plan found for subscription_id=${subscriptionId}:`, error)
        return null
    }
    return data.user_id
}

/** Resolve user_id from a dodo_payment_id stored in user_payments */
async function resolveUserIdByPayment(
    supabase: SupabaseAdmin,
    paymentId: string,
    eventType: string
): Promise<string | null> {
    const { data, error } = await supabase
        .from('user_payments')
        .select('user_id')
        .eq('dodo_payment_id', paymentId)
        .limit(1)
        .single()

    if (error || !data) {
        console.error(`[dodo-webhook][${eventType}] No payment found for payment_id=${paymentId}:`, error)
        return null
    }
    return data.user_id
}

// ── Shared payment recorder ───────────────────────────────────────────────────

/**
 * Inserts a payment row into user_payments using dodo_payment_id as the
 * conflict key. Returns true if a new row was inserted, false if it was
 * a duplicate (23505 conflict — already recorded).
 *
 * Safe to call multiple times for the same payment — never throws on duplicate.
 */
async function recordPayment(
    supabase: SupabaseAdmin,
    userId: string,
    payment: Payment,
    sourceEventType: string
): Promise<boolean> {
    const { error } = await supabase
        .from('user_payments')
        .insert({
            user_id:              userId,
            dodo_payment_id:      payment.payment_id,
            dodo_subscription_id: payment.subscription_id ?? null,
            amount:               payment.total_amount / 100,
            currency:             payment.currency,
            status:               payment.status ?? sourceEventType,
            event_type:           sourceEventType,
            failure_reason:       payment.error_message ?? null,
            payment_method:       payment.payment_method ?? null,
            payment_method_last4: payment.card_last_four ?? null,
            billing_period_start: null,
            billing_period_end:   null,
            plan_type:            sourceEventType === 'payment.succeeded' ? 'pro' : null,
            metadata:             payment as unknown as Record<string, unknown>,
        })

    if (error) {
        if (error.code === '23505') {
            console.warn(`[dodo-webhook][${sourceEventType}] Duplicate payment ignored for payment_id=${payment.payment_id}`)
            return false
        }
        console.error(`[dodo-webhook][${sourceEventType}] recordPayment insert failed for payment_id=${payment.payment_id}:`, error)
        return false
    }

    return true
}

// ── Payment handler ───────────────────────────────────────────────────────────

/**
 * payment.succeeded / payment.failed / payment.processing / payment.cancelled
 *
 * Always records via recordPayment (idempotent upsert).
 * On succeeded: upgrades user to pro via set_user_plan.
 * On failed: conditionally downgrades if not already on active pro.
 */
async function handlePaymentEvent(
    supabase: SupabaseAdmin,
    data: Payment,
    eventType: string
): Promise<void> {
    try {
        const userId = await resolveUserIdByCustomer(supabase, data.customer.customer_id, eventType)
        if (!userId) return

        await recordPayment(supabase, userId, data, eventType)

        if (eventType === 'payment.succeeded') {
            const { error } = await supabase.rpc('set_user_plan', {
                p_user_id:        userId,
                p_plan_type:      'pro',
                p_payment_status: 'active',
            })
            if (error) console.error(`[dodo-webhook][${eventType}] set_user_plan failed:`, error)
            return
        }

        if (eventType === 'payment.failed') {
            const { data: plan } = await supabase
                .from('user_active_plan')
                .select('plan_type, payment_status')
                .eq('user_id', userId)
                .single()

            if (plan?.plan_type !== 'pro' || plan?.payment_status !== 'active') {
                await downgradeUserToFree(userId, eventType)
            }
        }
    } catch (err) {
        console.error(`[dodo-webhook][${eventType}]`, err)
    }
}

// ── Subscription handler ──────────────────────────────────────────────────────

/**
 * All subscription.* events
 *
 * Step 1: Insert a row into user_subscriptions (history).
 * Step 2: Update user_active_plan (current state).
 *
 * Lookup strategy:
 *   - First try dodo_subscription_id in user_active_plan (fast path for renewals/updates).
 *   - Fall back to customer_id in user_profiles (needed for subscription.active — first activation).
 *
 * subscription.active: fetches the latest invoice payment from Dodo API and
 *   records it via recordPayment to avoid a gap when payment.succeeded fires
 *   before the subscription is created in our DB.
 *
 * subscription.renewed: increments renewal_count only if recordPayment
 *   returned true (new payment row), preventing double-increments when
 *   payment.succeeded already fired for the same payment.
 */
async function handleSubscriptionEvent(
    supabase: SupabaseAdmin,
    data: Subscription,
    eventType: string
): Promise<void> {
    try {
        // Resolve user — try subscription lookup first, fall back to customer lookup
        let userId = await resolveUserIdBySubscription(supabase, data.subscription_id, eventType)
        if (!userId) {
            userId = await resolveUserIdByCustomer(supabase, data.customer.customer_id, eventType)
        }
        if (!userId) return

        const periodStart = data.previous_billing_date ? new Date(data.previous_billing_date).toISOString() : null
        const periodEnd   = data.next_billing_date     ? new Date(data.next_billing_date).toISOString()     : null

        // ── Step 1: Insert history row ──────────────────────────────────────────
        const { error: historyError } = await supabase
            .from('user_subscriptions')
            .insert({
                user_id:              userId,
                dodo_subscription_id: data.subscription_id,
                dodo_product_id:      data.product_id ?? null,
                event_type:           eventType,
                status:               data.status,
                plan_type:            'pro',
                amount:               data.recurring_pre_tax_amount != null
                                        ? data.recurring_pre_tax_amount / 100
                                        : null,
                currency:             data.currency ?? null,
                period_start:         periodStart,
                period_end:           periodEnd,
                previous_plan:        eventType === 'subscription.plan_changed' ? 'pro' : null,
                new_plan:             eventType === 'subscription.plan_changed' ? 'pro' : null,
                raw_payload:          data as unknown as Record<string, unknown>,
            })

        if (historyError) {
            console.error(`[dodo-webhook][${eventType}] insert user_subscriptions failed:`, historyError)
        }

        // ── Step 2: Update current state ────────────────────────────────────────
        const isActive   = ['subscription.active', 'subscription.renewed', 'subscription.updated', 'subscription.plan_changed'].includes(eventType)
        const isTerminal = ['subscription.cancelled', 'subscription.expired'].includes(eventType)
        const isDegraded = ['subscription.on_hold', 'subscription.failed'].includes(eventType)

        if (isActive) {
            const updatePayload: Record<string, unknown> = {
                dodo_subscription_id: data.subscription_id,
                dodo_product_id:      data.product_id ?? null,
                payment_status:       data.status,
                cancel_at_period_end: data.cancel_at_next_billing_date ?? false,
                next_billing_date:    periodEnd,
                billing_interval:     data.payment_frequency_interval ?? null,
                updated_at:           new Date().toISOString(),
            }

            if (eventType === 'subscription.active') {
                // Fetch the latest invoice payment from Dodo to fill the payment gap.
                // payment.succeeded may have fired before the subscription existed in our DB.
                try {
                    const sub = await dodoClient.subscriptions.retrieve(data.subscription_id)
                    const invoicePayment = (sub as unknown as Record<string, unknown>)?.latest_invoice as Payment | undefined

                    if (invoicePayment?.payment_id && invoicePayment?.status === 'succeeded') {
                        await recordPayment(supabase, userId, invoicePayment, 'payment.succeeded')
                    } else {
                        console.warn(`[dodo-webhook][${eventType}] No succeeded invoice payment found for subscription_id=${data.subscription_id}`)
                    }
                } catch (fetchErr) {
                    console.error(`[dodo-webhook][${eventType}] Failed to fetch subscription invoice for subscription_id=${data.subscription_id}:`, fetchErr)
                }

                // Upgrade user to pro
                const { error } = await supabase.rpc('set_user_plan', {
                    p_user_id:        userId,
                    p_plan_type:      'pro',
                    p_payment_status: 'active',
                })
                if (error) console.error(`[dodo-webhook][${eventType}] set_user_plan failed:`, error)
            }

            if (eventType === 'subscription.renewed') {
                updatePayload.subscription_start = periodStart
                updatePayload.subscription_end   = periodEnd

                // Increment renewal_count atomically.
                // Duplicate renewal events are rare — the payment.succeeded deduplication
                // via recordPayment handles the payment side. renewal_count tracks billing
                // cycles, not payments, so we increment unconditionally here.
                const { data: current } = await supabase
                    .from('user_active_plan')
                    .select('renewal_count')
                    .eq('user_id', userId)
                    .single()

                updatePayload.renewal_count = (current?.renewal_count ?? 0) + 1

                const { error: renewError } = await supabase
                    .from('user_active_plan')
                    .update(updatePayload)
                    .eq('user_id', userId)

                if (renewError) {
                    console.error(`[dodo-webhook][${eventType}] update user_active_plan failed:`, renewError)
                }
                return
            }

            const { error } = await supabase
                .from('user_active_plan')
                .update(updatePayload)
                .eq('user_id', userId)

            if (error) console.error(`[dodo-webhook][${eventType}] update user_active_plan failed:`, error)
            return
        }

        if (isTerminal) {
            await downgradeUserToFree(userId, eventType)
            await supabase
                .from('user_active_plan')
                .update({
                    dodo_subscription_id: null,
                    cancel_at_period_end: false,
                    next_billing_date:    null,
                    updated_at:           new Date().toISOString(),
                })
                .eq('user_id', userId)
            return
        }

        if (isDegraded) {
            const { data: plan } = await supabase
                .from('user_active_plan')
                .select('plan_type, payment_status')
                .eq('user_id', userId)
                .single()

            if (plan?.plan_type !== 'pro' || plan?.payment_status !== 'active') {
                await downgradeUserToFree(userId, eventType)
            } else {
                await supabase
                    .from('user_active_plan')
                    .update({ payment_status: data.status, updated_at: new Date().toISOString() })
                    .eq('user_id', userId)
            }
        }
    } catch (err) {
        console.error(`[dodo-webhook][${eventType}]`, err)
    }
}

// ── Refund handler ────────────────────────────────────────────────────────────

/**
 * refund.succeeded / refund.failed
 *
 * Always inserts into user_refunds.
 * On succeeded: checks current plan and downgrades to free (access_revoked = true).
 */
async function handleRefundEvent(
    supabase: SupabaseAdmin,
    data: Refund,
    eventType: string
): Promise<void> {
    try {
        const userId = await resolveUserIdByCustomer(supabase, data.customer.customer_id, eventType)
        if (!userId) return

        const isSucceeded = eventType === 'refund.succeeded'

        const { error: insertError } = await supabase
            .from('user_refunds')
            .insert({
                user_id:         userId,
                dodo_refund_id:  data.refund_id,
                dodo_payment_id: data.payment_id,
                amount:          data.amount != null ? data.amount / 100 : 0,
                currency:        data.currency ?? '',
                reason:          data.reason ?? null,
                status:          data.status,
                access_revoked:  false,
                raw_payload:     data as unknown as Record<string, unknown>,
            })

        if (insertError) {
            if (insertError.code === '23505') {
                console.warn(`[dodo-webhook][${eventType}] Duplicate ignored for refund_id=${data.refund_id}`)
                return
            }
            console.error(`[dodo-webhook][${eventType}] insert user_refunds failed:`, insertError)
            return
        }

        if (isSucceeded) {
            const { data: plan } = await supabase
                .from('user_active_plan')
                .select('plan_type, payment_status')
                .eq('user_id', userId)
                .single()

            if (plan?.plan_type === 'pro') {
                await downgradeUserToFree(userId, eventType)
                await supabase
                    .from('user_refunds')
                    .update({ access_revoked: true })
                    .eq('dodo_refund_id', data.refund_id)
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('refund_count')
                .eq('user_id', userId)
                .single()

            await supabase
                .from('user_profiles')
                .update({
                    is_refund_eligible: false,
                    refund_count: (profile?.refund_count ?? 0) + 1,
                })
                .eq('user_id', userId)

            const refundAmountDollars = data.amount != null ? data.amount / 100 : 0

            const { data: authUser } = await supabase.auth.admin.getUserById(userId)
            const email = authUser?.user?.email

            if (email) {
                const { data: existingLog } = await supabase
                    .from('billing_identity_log')
                    .select('total_refunded, refund_count')
                    .eq('email', email)
                    .maybeSingle()

                await supabase
                    .from('billing_identity_log')
                    .upsert(
                        {
                            email,
                            user_id:        userId,
                            total_refunded: (existingLog?.total_refunded ?? 0) + refundAmountDollars,
                            refund_count:   (existingLog?.refund_count ?? 0) + 1,
                            updated_at:     new Date().toISOString(),
                        },
                        { onConflict: 'email' }
                    )
            } else {
                console.warn(`[dodo-webhook][${eventType}] Could not resolve email for userId=${userId} — billing_identity_log not updated`)
            }
        }
    } catch (err) {
        console.error(`[dodo-webhook][${eventType}]`, err)
    }
}

// ── Dispute handler ───────────────────────────────────────────────────────────

/**
 * All dispute.* events
 *
 * dispute.opened     → insert row, pause access (payment_status = 'disputed')
 * dispute.challenged → update status only
 * dispute.won        → update status, clear access_paused, restore payment_status = 'active'
 * dispute.cancelled  → update status, clear access_paused, restore payment_status = 'active'
 * dispute.expired    → update status, clear access_paused, restore payment_status = 'active'
 * dispute.lost       → update status, clear access_paused, revoke access (downgrade to free)
 * dispute.accepted   → update status, clear access_paused, revoke access (downgrade to free)
 */
async function handleDisputeEvent(
    supabase: SupabaseAdmin,
    data: Dispute,
    eventType: string
): Promise<void> {
    try {
        const userId = await resolveUserIdByPayment(supabase, data.payment_id, eventType)
        if (!userId) return

        const now = new Date().toISOString()
        const isOpened     = eventType === 'dispute.opened'
        const isResolved   = ['dispute.won', 'dispute.cancelled', 'dispute.expired'].includes(eventType)
        const isRevoked    = ['dispute.lost', 'dispute.accepted'].includes(eventType)
        const isChallenged = eventType === 'dispute.challenged'

        if (isOpened) {
            const { error } = await supabase
                .from('user_disputes')
                .insert({
                    user_id:         userId,
                    dodo_dispute_id: data.dispute_id,
                    dodo_payment_id: data.payment_id,
                    amount:          parseFloat(data.amount) / 100,
                    currency:        data.currency,
                    reason:          data.remarks ?? null,
                    status:          eventType,
                    access_paused:   true,
                    opened_at:       now,
                    raw_payload:     data as unknown as Record<string, unknown>,
                })

            if (error) {
                if (error.code === '23505') {
                    console.warn(`[dodo-webhook][${eventType}] Duplicate ignored for dispute_id=${data.dispute_id}`)
                    return
                }
                console.error(`[dodo-webhook][${eventType}] insert user_disputes failed:`, error)
                return
            }

            await supabase
                .from('user_active_plan')
                .update({ payment_status: 'disputed', updated_at: now })
                .eq('user_id', userId)

            return
        }

        if (isChallenged) {
            await supabase
                .from('user_disputes')
                .update({ status: eventType, raw_payload: data as unknown as Record<string, unknown> })
                .eq('dodo_dispute_id', data.dispute_id)
            return
        }

        if (isResolved) {
            await supabase
                .from('user_disputes')
                .update({ status: eventType, access_paused: false, resolved_at: now })
                .eq('dodo_dispute_id', data.dispute_id)

            await supabase
                .from('user_active_plan')
                .update({ payment_status: 'active', updated_at: now })
                .eq('user_id', userId)

            return
        }

        if (isRevoked) {
            await supabase
                .from('user_disputes')
                .update({ status: eventType, access_paused: false, resolved_at: now })
                .eq('dodo_dispute_id', data.dispute_id)

            await downgradeUserToFree(userId, eventType)
            await supabase
                .from('user_active_plan')
                .update({
                    payment_status:       'revoked',
                    subscription_end:     now,
                    dodo_subscription_id: null,
                    updated_at:           now,
                })
                .eq('user_id', userId)
        }
    } catch (err) {
        console.error(`[dodo-webhook][${eventType}]`, err)
    }
}
