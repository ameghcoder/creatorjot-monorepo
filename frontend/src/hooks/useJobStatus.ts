/**
 * useJobStatus
 *
 * Polls GET /api/jobs/:jobId (Next.js API route) every `intervalMs`
 * until the job reaches a terminal state (completed | failed | cancelled).
 *
 * Auth is handled server-side via cookies — no token needed on the client.
 *
 * Usage:
 *   const { data, error, done } = useJobStatus(jobId)
 */

import { useEffect, useRef, useState } from 'react'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface JobStatusResult {
    id: string
    status: JobStatus
    progress?: number
    currentStep?: string
    attempts: number
    maxAttempts: number
    errorMessage?: string
    createdAt: string
    updatedAt: string
    completedAt?: string
    generationId?: string
}

interface UseJobStatusReturn {
    data: JobStatusResult | null
    loading: boolean
    error: string | null
    done: boolean
}

const TERMINAL_STATES: JobStatus[] = ['completed', 'failed', 'cancelled']

export function useJobStatus(
    jobId: string | null,
    intervalMs = 2000
): UseJobStatusReturn {
    const [data, setData] = useState<JobStatusResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        if (!jobId) return

        setLoading(true)
        setError(null)

        const poll = async () => {
            try {
                const res = await fetch(`/api/jobs/${jobId}`)

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error ?? `HTTP ${res.status}`)
                }

                const result: JobStatusResult = await res.json()
                setData(result)
                setLoading(false)

                if (TERMINAL_STATES.includes(result.status)) {
                    if (intervalRef.current) clearInterval(intervalRef.current)
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch job status')
                setLoading(false)
                if (intervalRef.current) clearInterval(intervalRef.current)
            }
        }

        poll()
        intervalRef.current = setInterval(poll, intervalMs)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [jobId, intervalMs])

    return {
        data,
        loading,
        error,
        done: data ? TERMINAL_STATES.includes(data.status) : false,
    }
}
