import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'
import { supabaseAdminClient } from '@/server/supabase/supabase-admin'
import { checkRefundEligibility } from '@/lib/billing/refund-eligibility'
import { EMAIL_ADDR } from '@/constants/emails'

export async function POST() {
    try {
        // Authenticate (Requirement 8.1)
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Always re-evaluate eligibility server-side (Requirement 8.2)
        const eligibility = await checkRefundEligibility(user.id)

        // Reject ineligible requests (Requirement 8.3)
        if (!eligibility.eligible) {
            return NextResponse.json(
                { error: 'Not eligible for refund', reason: eligibility.reason },
                { status: 400 }
            )
        }

        const admin = supabaseAdminClient()

        // Send notification email to support (Requirement 8.4)
        await sendRefundNotification(user.email ?? 'unknown', eligibility.creditsUsed, eligibility.amount, eligibility.currency)

        // Log refund request in user_payments (Requirement 8.5)
        const { error: paymentError } = await admin
            .from('user_payments')
            .insert({
                user_id:    user.id,
                event_type: 'refund_requested',
                amount:     eligibility.amount,
                currency:   eligibility.currency,
                status:     'pending',
            })

        if (paymentError) {
            console.error('[request-refund] Failed to insert user_payments:', paymentError)
        }

        // Prevent duplicate requests (Requirement 8.6)
        const { error: profileError } = await admin
            .from('user_profiles')
            .update({ is_refund_eligible: false })
            .eq('user_id', user.id)

        if (profileError) {
            console.error('[request-refund] Failed to update user_profiles:', profileError)
        }

        // Return success (Requirement 8.7)
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[request-refund]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

async function sendRefundNotification(
    userEmail: string,
    creditsUsed: number,
    amount: number,
    currency: string
): Promise<void> {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
        console.warn('[request-refund] RESEND_API_KEY not set — skipping email notification')
        return
    }

    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: EMAIL_ADDR.notification,
                to:   EMAIL_ADDR.support,
                subject: `Refund request from ${userEmail}`,
                html: `
                    <p><strong>User:</strong> ${userEmail}</p>
                    <p><strong>Credits used:</strong> ${creditsUsed}</p>
                    <p><strong>Amount:</strong> ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}</p>
                    <p>Please process this refund within 1 business day.</p>
                `,
            }),
        })
    } catch (err) {
        // Non-fatal — log and continue
        console.error('[request-refund] Failed to send notification email:', err)
    }
}
