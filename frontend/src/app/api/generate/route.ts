/**
 * POST /api/generate
 *
 * Server-side proxy for the backend YouTube generation endpoint.
 * Keeps BACKEND_URL and raw auth token handling on the server —
 * the client sends { url, platforms, sessionId, tonePreset }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
    try {
        /* ── 1. Authenticate via Supabase cookies ── */
        const supabase = await createServerSupabaseClient()
        const {
            data: { session },
            error: authError,
        } = await supabase.auth.getSession()

        if (authError || !session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        /* ── 2. Parse & validate request body ── */
        const body = await req.json()
        const { url, platforms, sessionId, tonePreset, selectedHookIndex } = body as {
            url?: string
            platforms?: string[]
            sessionId?: string
            tonePreset?: string
            selectedHookIndex?: number
        }

        if (!url?.trim()) {
            return NextResponse.json({ error: 'Missing YouTube URL.' }, { status: 400 })
        }

        if (!platforms?.length) {
            return NextResponse.json({ error: 'Select at least one platform.' }, { status: 400 })
        }

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing session ID.' }, { status: 400 })
        }

        let xPostFormat = 'short'
        const finalPlatforms: string[] = []
        
        for (const p of platforms) {
            if (p.startsWith('x:')) {
                xPostFormat = p.split(':')[1]
                if (!finalPlatforms.includes('x')) finalPlatforms.push('x')
            } else {
                if (!finalPlatforms.includes(p)) finalPlatforms.push(p)
            }
        }

        /* ── 3. Forward to backend ── */
        const backendRes = await fetch(`${BACKEND_URL}/api/v1/yt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                url: url.trim(),
                output_lang: 'en',
                sessionId,
                ...(tonePreset ? { tone_preset: tonePreset } : {}),
                settings: {
                    auto_generate: true,
                    platforms: finalPlatforms,
                    x_post_format: xPostFormat,
                    ...(typeof selectedHookIndex === 'number' ? {
                        is_regeneration: true,
                        selected_hook_index: selectedHookIndex,
                    } : {})
                },
            }),
        })

        const data = await backendRes.json().catch(() => ({}))

        if (!backendRes.ok) {
            return NextResponse.json(
                { error: data.message ?? `Backend error (${backendRes.status})` },
                { status: backendRes.status }
            )
        }

        /* ── 4. Return sanitised payload ── */
        return NextResponse.json(data)
    } catch (err) {
        console.error('[api/generate]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
