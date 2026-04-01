// Centralised downgrade helper — used by webhook handlers on cancellation/failure
import { supabaseAdminClient } from '@/server/supabase/supabase-admin'

/**
 * Downgrades a user to the free plan via the set_user_plan RPC.
 * Throws on DB failure so callers can handle the error explicitly.
 */
export async function downgradeUserToFree(userId: string, reason: string): Promise<void> {
    const supabase = supabaseAdminClient()

    const { error } = await supabase.rpc('set_user_plan', {
        p_user_id: userId,
        p_plan_type: 'free',
        p_payment_status: 'active',
    })

    if (error) {
        throw new Error(`[downgrade] Failed to downgrade user ${userId}: ${error.message}`)
    }
}
