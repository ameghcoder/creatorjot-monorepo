/**
 * GET /api/check-quota
 *
 * Lightweight quota check — returns whether the current user
 * can generate content based on their plan limits.
 *
 * Free users: generations_used_this_month < generations_limit
 * Pro users:  credits_used_this_month < credits_limit
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'
import { supabaseAdminClient } from '@/server/supabase/supabase-admin'

export async function GET() {
    try {
        /* ── 1. Authenticate ── */
        const supabase = await createServerSupabaseClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        /* ── 2. Fetch plan ── */
        const admin = supabaseAdminClient()
        const { data: plan, error: planError } = await admin
            .from('user_active_plan')
            .select(
                'plan_type, credits_limit, credits_used_this_month, generations_limit, generations_used_this_month, max_video_duration_minutes'
            )
            .eq('user_id', user.id)
            .single()

        if (planError || !plan) {
            return NextResponse.json(
                { error: 'Could not fetch plan data.' },
                { status: 500 }
            )
        }

        /* ── 3. Evaluate quota ── */
        let canGenerate = true
        let reason = ''

        if (plan.plan_type === 'free') {
            const limit = plan.generations_limit ?? 2
            const used = plan.generations_used_this_month ?? 0
            if (used >= limit) {
                canGenerate = false
                reason = `You've used all ${limit} free generations this month. Upgrade to Pro for more.`
            }
        } else {
            // Pro user — credit based
            const limit = plan.credits_limit ?? 120
            const used = plan.credits_used_this_month ?? 0
            if (used >= limit) {
                canGenerate = false
                reason = `You've used all ${limit} credits this month. Credits reset at your next billing cycle.`
            }
        }

        return NextResponse.json({
            canGenerate,
            reason,
            plan: {
                planType: plan.plan_type,
                creditsLimit: plan.credits_limit,
                creditsUsed: plan.credits_used_this_month,
                generationsLimit: plan.generations_limit,
                generationsUsed: plan.generations_used_this_month,
                maxVideoDuration: plan.max_video_duration_minutes,
            },
        })
    } catch (err) {
        console.error('[api/check-quota]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
