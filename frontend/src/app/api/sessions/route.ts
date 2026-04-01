/**
 * POST /api/sessions
 *
 * Creates a new session for the current user.
 * If a YouTube URL is provided, fetches the video title via OEmbed
 * and stores it as the session name.
 *
 * Request body: { url?: string }
 * Response:     { session_id: string, name: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'
import { supabaseAdminClient } from '@/server/supabase/supabase-admin'

/**
 * Extract YouTube video ID from various URL formats.
 */
function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }
    // Maybe it's just a raw video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
    return null
}

/**
 * Fetch YouTube video title via the public OEmbed API (no API key needed).
 */
async function fetchYouTubeTitle(videoId: string): Promise<string> {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) })

        if (!res.ok) return 'Untitled Session'

        const data = await res.json()
        return data.title || 'Untitled Session'
    } catch {
        return 'Untitled Session'
    }
}

export async function POST(req: NextRequest) {
    try {
        /* ── 1. Authenticate ── */
        const supabase = await createServerSupabaseClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        /* ── 2. Parse body ── */
        const body = await req.json().catch(() => ({}))
        const { url } = body as { url?: string }

        /* ── 3. Resolve session name from YouTube OEmbed ── */
        let sessionName = 'Untitled Session'

        if (url) {
            const videoId = extractYouTubeId(url.trim())
            if (videoId) {
                sessionName = await fetchYouTubeTitle(videoId)
            }
        }

        /* ── 4. Create session ── */
        const admin = supabaseAdminClient()
        const { data: session, error: sessionError } = await admin
            .from('sessions')
            .insert({
                user_id: user.id,
                name: sessionName,
                status: 'active',
                pin: false,
            })
            .select('id, name')
            .single()

        if (sessionError || !session) {
            console.error('[api/sessions] Failed to create session:', sessionError)
            return NextResponse.json(
                { error: 'Failed to create session' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            session_id: session.id,
            name: session.name,
        })
    } catch (err) {
        console.error('[api/sessions]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
