// Return URL page — DodoPayments redirects here after checkout completes or is cancelled
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
    title: 'Processing Payment | CreatorJot',
    description: 'Confirming your subscription.',
    robots: { index: false, follow: false },
}

import { supabaseAdminClient } from '@/server/supabase/supabase-admin'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'
import { ReturnPagePoller } from './poller'

interface SearchParams {
    user_id?: string
    [key: string]: string | string[] | undefined
}

export default async function CheckoutReturnPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const params = await searchParams
    const userId = typeof params.user_id === 'string' ? params.user_id : null

    // Missing or invalid user_id — redirect to pricing with error
    if (!userId) {
        redirect('/pricing?error=invalid_session')
    }

    // Verify the authenticated session matches the user_id in the URL
    const supabaseAuth = await createServerSupabaseClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user || user.id !== userId) {
        redirect('/pricing?error=invalid_session')
    }

    // Re-query the DB — never trust redirect params as ground truth
    const supabase = supabaseAdminClient()
    const { data: plan } = await supabase
        .from('user_active_plan')
        .select('plan_type')
        .eq('user_id', userId)
        .single()

    // Webhook already fired and upgraded the user — go straight to success
    if (plan?.plan_type === 'pro') {
        redirect('/pricing?success=true')
    }

    // Webhook hasn't fired yet — show polling UI
    return <ReturnPagePoller userId={userId} />
}
