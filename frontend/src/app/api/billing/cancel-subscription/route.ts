import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'
import { supabaseAdminClient } from '@/server/supabase/supabase-admin'
import { dodoClient } from '@/server/dodopayments/server-dodoclient'

export async function POST() {
    try {
        // Authenticate (Requirement 6.1, 6.2)
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const admin = supabaseAdminClient()

        // Fetch subscription ID (Requirement 6.3, 6.7)
        const { data: plan, error: planError } = await admin
            .from('user_active_plan')
            .select('dodo_subscription_id, subscription_end')
            .eq('user_id', user.id)
            .single()

        if (planError || !plan?.dodo_subscription_id) {
            return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
        }

        // Cancel at period end via DodoPayments (Requirement 6.4)
        await dodoClient.subscriptions.update(plan.dodo_subscription_id, {
            cancel_at_next_billing_date: true,
        })

        // Update local state (Requirement 6.5)
        const { error: updateError } = await admin
            .from('user_active_plan')
            .update({
                cancel_at_period_end: true,
                payment_status: 'cancelled',
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('[cancel-subscription] Failed to update user_active_plan:', updateError)
            return NextResponse.json({ error: 'Failed to update subscription state' }, { status: 500 })
        }

        // Return success with access-until date (Requirement 6.6)
        return NextResponse.json({
            success: true,
            accessUntil: plan.subscription_end,
        })
    } catch (err) {
        console.error('[cancel-subscription]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
