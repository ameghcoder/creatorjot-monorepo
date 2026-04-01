/**
 * GET /api/notifications/sse
 *
 * Proxies the SSE stream from the backend, injecting the auth token
 * server-side so the client never handles raw JWTs.
 */

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

// Next.js route config — disable body size limit and set max duration
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min max on Railway/Vercel

export async function GET(_req: NextRequest) {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
        return new Response('Unauthorized', { status: 401 })
    }

    // AbortController so we can clean up if the client disconnects
    const controller = new AbortController()
    _req.signal.addEventListener('abort', () => controller.abort())

    let backendRes: Response
    try {
        backendRes = await fetch(`${BACKEND_URL}/api/v1/notifications/sse`, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                Accept: 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
            signal: controller.signal,
            // @ts-expect-error — Next.js fetch supports duplex for streaming
            duplex: 'half',
        })
    } catch {
        return new Response('Failed to connect to notification stream', { status: 502 })
    }

    if (!backendRes.ok || !backendRes.body) {
        return new Response('Failed to connect to notification stream', { status: 502 })
    }

    return new Response(backendRes.body, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    })
}
