// Polling endpoint — returns the current plan tier for the authenticated user
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdminClient } from '@/server/supabase/supabase-admin'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'

export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get('user_id')

    if (!userId) {
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    // Verify the authenticated session matches the requested user_id
    const supabaseAuth = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const supabase = supabaseAdminClient()

        // Query the user's current plan — source of truth is the DB, not the redirect params
        const { data, error } = await supabase
            .from('user_active_plan')
            .select('plan_type')
            .eq('user_id', userId)
            .single()

        if (error || !data) {
            return NextResponse.json({ plan: 'free' })
        }

        return NextResponse.json({ plan: data.plan_type as 'free' | 'pro' })
    } catch (err) {
        console.error('[checkout/status]', err)
        return NextResponse.json({ plan: 'free' })
    }
}
