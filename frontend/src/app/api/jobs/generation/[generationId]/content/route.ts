/**
 * GET /api/jobs/generation/:generationId/content
 *
 * Fetches generated content by generation ID from the backend.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ generationId: string }> }
) {
    try {
        const { generationId } = await params

        const supabase = await createServerSupabaseClient()
        const { data: { session }, error: authError } = await supabase.auth.getSession()

        if (authError || !session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const backendRes = await fetch(
            `${BACKEND_URL}/api/v1/jobs/generation/${generationId}/content`,
            { headers: { Authorization: `Bearer ${session.access_token}` } }
        )

        const data = await backendRes.json().catch(() => ({}))

        if (!backendRes.ok) {
            return NextResponse.json(
                { error: data.message ?? `Backend error (${backendRes.status})` },
                { status: backendRes.status }
            )
        }

        return NextResponse.json(data)
    } catch (err) {
        console.error('[api/jobs/generation/content]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
