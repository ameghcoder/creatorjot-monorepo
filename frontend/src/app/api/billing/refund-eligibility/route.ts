import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'
import { checkRefundEligibility } from '@/lib/billing/refund-eligibility'

export async function GET() {
    try {
        // Authenticate (Requirement 7.1)
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Evaluate eligibility server-side (Requirement 7.2)
        const result = await checkRefundEligibility(user.id)

        // Return only the typed eligibility result — no raw DB fields (Requirement 7.3)
        return NextResponse.json(result)
    } catch (err) {
        console.error('[refund-eligibility]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
