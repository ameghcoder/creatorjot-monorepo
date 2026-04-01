/**
 * useJobNotifications
 *
 * Connects to the backend SSE endpoint and dispatches job status events.
 * Use this alongside useJobStatus for instant push notifications instead
 * of waiting for the next poll cycle.
 *
 * Usage:
 *   useJobNotifications((event) => {
 *     if (event.jobId === myJobId && event.status === 'completed') { ... }
 *   })
 */

import { useEffect, useRef } from 'react'

export interface JobNotificationEvent {
    type: 'job_completed' | 'job_failed' | 'job_progress' | 'connected'
    jobId?: string
    sessionId?: string
    status?: string
    generationId?: string
    errorMessage?: string
    progress?: number
    currentStep?: string
    timestamp: string
}

export function useJobNotifications(
    onEvent: (event: JobNotificationEvent) => void,
    enabled = true
) {
    const onEventRef = useRef(onEvent)
    onEventRef.current = onEvent

    useEffect(() => {
        if (!enabled) return undefined

        // Connect via Next.js API proxy to keep auth token server-side
        const es = new EventSource('/api/notifications/sse')

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data) as JobNotificationEvent
                onEventRef.current(data)
            } catch {
                // ignore malformed events
            }
        }

        es.onerror = () => {
            // EventSource auto-reconnects — no action needed
        }

        return () => {
            es.close()
        }
    }, [enabled])
}
