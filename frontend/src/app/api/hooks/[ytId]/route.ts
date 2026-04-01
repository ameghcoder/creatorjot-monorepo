/**
 * GET /api/hooks/:ytId
 *
 * Fetches post angles (hooks) for a given YouTube video ID directly from Supabase.
 *
 * Ownership check: verifies the user has at least one payload with this yt_id
 * (transcript table has no user_id — it's a shared cache keyed by yt_id).
 *
 * Response:
 *   200 → { ytId, hooks: PostAngle[] }
 *   202 → { status: "processing" }   — rich_context not yet extracted
 *   403 → { error: "Forbidden" }     — user has no payload for this yt_id
 *   404 → { error: "NotFound" }      — transcript doesn't exist
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'
import { supabaseAdminClient } from '@/server/supabase/supabase-admin'
import { PostAngle } from '@/types/transcript'



export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ ytId: string }> }
) {
    try {
        const { ytId } = await params

        // Auth — use getUser() to verify against Supabase Auth server
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const admin = supabaseAdminClient()

        // Ownership check — user must have a payload with this yt_id
        const { data: payload } = await admin
            .from('payloads')
            .select('id')
            .eq('yt_id', ytId)
            .eq('user_id', user.id)
            .limit(1)
            .single()

        if (!payload) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Fetch transcript
        const { data: transcript, error } = await admin
            .from('transcript')
            .select('rich_context, rich_context_extracted_at')
            .eq('yt_id', ytId)
            .single()

        if (error || !transcript) {
            return NextResponse.json({ error: 'NotFound' }, { status: 404 })
        }

        if (!transcript.rich_context_extracted_at) {
            return NextResponse.json({ status: 'processing' }, { status: 202 })
        }

        const hooks = (transcript.rich_context as { post_angles: PostAngle[] } | null)?.post_angles ?? []

        return NextResponse.json({ ytId, hooks })
    } catch (err) {
        console.error('[api/hooks]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
