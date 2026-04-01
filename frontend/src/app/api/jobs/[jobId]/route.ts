/**
 * GET /api/jobs/:jobId
 *
 * Server-side proxy for polling job status from the backend.
 * Keeps BACKEND_URL and raw auth token on the server side.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params

        /* ── 1. Authenticate ── */
        const supabase = await createServerSupabaseClient()
        const {
            data: { session },
            error: authError,
        } = await supabase.auth.getSession()

        if (authError || !session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        /* ── 2. Forward to backend ── */
        const backendRes = await fetch(`${BACKEND_URL}/api/v1/jobs/${jobId}`, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        })

        const data = await backendRes.json().catch(() => ({}))

        if (!backendRes.ok) {
            return NextResponse.json(
                { error: data.message ?? `Backend error (${backendRes.status})` },
                { status: backendRes.status }
            )
        }

        return NextResponse.json(data)
    } catch (err) {
        console.error('[api/jobs]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
