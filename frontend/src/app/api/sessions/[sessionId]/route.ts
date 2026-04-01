/**
 * GET /api/sessions/:sessionId
 *
 * Fetches all payloads + generations for a session, grouped by payload.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const { sessionId } = await params

        const supabase = await createServerSupabaseClient()
        const { data: { session }, error: authError } = await supabase.auth.getSession()

        if (authError || !session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const backendRes = await fetch(
            `${BACKEND_URL}/api/v1/jobs/session/${sessionId}`,
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
        console.error('[api/sessions/[sessionId]]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
