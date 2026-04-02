'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Zap, Briefcase, Swords, BookOpenText, TvMinimal, Globe, MessageSquareText, FileText, Youtube, Mail, BookOpen, Newspaper, Copy, Check, ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react'
import { cn, formatGeneratedContent } from '@/lib/utils'
import GenerateInput from '@/components/generate/generate-input'
import { useJobNotifications } from '@/hooks/useJobNotifications'
import type { TonePreset } from '@creatorjot/shared'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ShareButton } from '@/components/ui/share-button'
import { Badge } from '@/components/ui/badge'

// ── Types ──────────────────────────────────────────────────────────────────

interface Hook {
    post_angle_index: number
    hook: string
    score?: number
    category?: string
    core_insight?: string
    sequence?: number
}

interface Generation {
    id: string
    payload_id: string
    platform: string
    lang: string
    content: string
    status: string
    created_at: string
}

interface PayloadGroup {
    payload_id: string
    yt_id: string
    settings: {
        platforms?: string[]
        tone_preset?: string
        selected_hook_index?: number
        selected_hook_text?: string
        x_post_format?: string
    }
    created_at: string
    generations: Generation[]
}

interface SessionData {
    session: { id: string; name: string; status: string; created_at: string }
    yt_id: string | null
    payloads: PayloadGroup[]
}

// ── Platform icon map ──────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    x: MessageSquareText,
    linkedin: Globe,
    blog: BookOpen,
    yt_community_post: Youtube,
    facebook: Newspaper,
    tumblr: FileText,
    email: Mail,
}

const TONE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    viral: Zap,
    professional: Briefcase,
    contrarian: Swords,
    story: BookOpenText,
    minimal: TvMinimal,
}

function platformLabel(p: string) {
    if (p === 'x') return 'X (Twitter)'
    if (p === 'linkedin') return 'LinkedIn'
    if (p === 'yt_community_post') return 'YT Community'
    if (p === 'blog') return 'Blog'
    if (p === 'facebook') return 'Facebook'
    if (p === 'tumblr') return 'Tumblr'
    if (p === 'email') return 'Email'
    return p
}

// ── Pending job tracker ────────────────────────────────────────────────────

interface PendingJob {
    jobId: string
    platform: string
    payloadId: string
}

// ── Generation bubble ──────────────────────────────────────────────────────

function GenerationBubble({ gen }: { gen: Generation }) {
    const [copied, setCopied] = useState(false)
    const Icon = PLATFORM_ICONS[gen.platform] ?? FileText
    const displayContent = formatGeneratedContent(gen.content)

    async function copy() {
        await navigator.clipboard.writeText(displayContent)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-card border border-border/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Icon className="size-3.5" />
                    <span className="font-medium">{platformLabel(gen.platform)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <ShareButton platform={gen.platform} text={displayContent} variant="ghost" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={copy}
                    >
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </Button>
                </div>
            </div>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                {displayContent}
            </p>
        </div>
    )
}

// ── User message bubble (right-aligned) ───────────────────────────────────

function UserMessage({ payload, hooks }: { payload: PayloadGroup; hooks: Hook[] }) {
    const settings = payload.settings ?? {}
    const platforms = settings.platforms ?? []
    const tone = settings.tone_preset
    const hookIndex = settings.selected_hook_index
    const ToneIcon = tone ? (TONE_ICONS[tone] ?? Zap) : null

    const selectedHook = hookIndex !== undefined ? hooks.find(h => h.post_angle_index === hookIndex) : null

    return (
        <div className="flex justify-end">
            <div className="max-w-[280px] bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 space-y-2">
                {/* Platforms */}
                <div className="flex flex-wrap gap-1.5">
                    {platforms.map(p => {
                        const base = p.split(':')[0]
                        const Icon = PLATFORM_ICONS[base] ?? FileText
                        return (
                            <span key={p} className="flex items-center gap-1 text-[11px] bg-foreground/8 border border-border/40 rounded-full px-2 py-0.5 text-muted-foreground">
                                <Icon className="size-3" />
                                {platformLabel(base)}
                            </span>
                        )
                    })}
                </div>
                {/* Tone */}
                {tone && ToneIcon && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ToneIcon className="size-3" />
                        <span className="capitalize">{tone}</span>
                    </div>
                )}
                {/* Hook */}
                {selectedHook && (
                    <div className="text-[11px] text-primary/80 border-t border-primary/20 pt-2 line-clamp-2">
                        Hook: {selectedHook.hook}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Pending generation placeholder ────────────────────────────────────────

function PendingBubble({ platform }: { platform: string }) {
    const Icon = PLATFORM_ICONS[platform] ?? FileText
    return (
        <div className="bg-card border border-border/60 rounded-xl p-4 flex items-center gap-3">
            <Icon className="size-3.5 text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground">{platformLabel(platform)}</span>
            <Loader2 className="size-3.5 animate-spin text-muted-foreground ml-auto" />
        </div>
    )
}

// ── Hooks panel ────────────────────────────────────────────────────────────

function HooksPanel({
    hooks,
    selectedIndex,
    onSelect,
}: {
    hooks: Hook[]
    selectedIndex: number | undefined
    onSelect: (index: number, hook: string) => void
}) {
    const [expanded, setExpanded] = useState(false)

    // Sort highest score first
    const sorted = [...hooks].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const visible = expanded ? sorted : sorted.slice(0, 3)

    if (hooks.length === 0) return null

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
                <Sparkles className="size-3" />
                <span>Available Hooks</span>
            </div>
            <div className="space-y-1.5">
                {visible.map((h) => {
                    // stable key: prefer sequence, fall back to post_angle_index
                    const stableKey = h.sequence ?? h.post_angle_index
                    const isSelected = selectedIndex === h.sequence
                    const score = h.score ?? 0
                    const scoreTier = score >= 9 ? 'top' : score >= 7 ? 'high' : 'normal'

                    return (
                        <button
                            key={stableKey}
                            onClick={() => onSelect(stableKey, h.hook)}
                            className={cn(
                                'w-full text-left px-3 py-2.5 rounded-lg border text-[12px] leading-snug transition-all cursor-pointer active:scale-95',
                                isSelected
                                    ? 'border-border bg-accent text-accent-foreground shadow-sm'
                                    : 'border-border/40 bg-card/60 text-muted-foreground hover:border-border hover:text-foreground'
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className="flex-1">{h.hook}</span>
                                {h.score !== undefined && (
                                    <span className={cn(
                                        'shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                                        isSelected
                                            ? 'bg-violet-500/20 text-violet-400'
                                            : scoreTier === 'top'
                                                ? 'bg-amber-500/15 text-amber-500'
                                                : scoreTier === 'high'
                                                    ? 'bg-emerald-500/15 text-emerald-500'
                                                    : 'bg-muted text-muted-foreground'
                                    )}>
                                        {h.score}/10
                                    </span>
                                )}
                            </div>
                            {h.category && (
                                <Badge variant={"glass"} size={"sm"}>{h.category}</Badge>
                            )}
                        </button>
                    )
                })}
            </div>
            {hooks.length > 3 && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                    {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    {expanded ? 'Show less' : `Show ${hooks.length - 3} more`}
                </button>
            )}
        </div>
    )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SessionPage() {
    const { session_id: sessionId } = useParams<{ session_id: string }>()

    const [sessionData, setSessionData] = useState<SessionData | null>(null)
    const [hooks, setHooks] = useState<Hook[]>([])
    const [hooksLoading, setHooksLoading] = useState(false)
    const [hooksOpen, setHooksOpen] = useState(false)
    const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([])
    const [generating, setGenerating] = useState(false)
    const [selectedHookIndex, setSelectedHookIndex] = useState<number | undefined>(undefined)
    const [selectedHookText, setSelectedHookText] = useState<string | undefined>(undefined)
    const [initialLoading, setInitialLoading] = useState(true)

    const feedRef = useRef<HTMLDivElement>(null)
    const ytIdRef = useRef<string | null>(null)

    // ── Scroll to bottom ──
    const scrollToBottom = useCallback(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight
        }
    }, [])

    // ── Fetch session data ──
    const fetchSession = useCallback(async () => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}`)
            if (!res.ok) return
            const data: SessionData = await res.json()
            setSessionData(data)
            return data
        } catch {
            // silent
        }
    }, [sessionId])

    // ── Fetch hooks for the video ──
    const fetchHooks = useCallback(async (ytId: string) => {
        setHooksLoading(true)
        try {
            const res = await fetch(`/api/hooks/${ytId}`)
            if (!res.ok) return
            const data = await res.json()
            setHooks(data.hooks ?? [])
        } catch {
            // silent
        } finally {
            setHooksLoading(false)
        }
    }, [])

    // ── Bootstrap: load session + trigger initial generation if needed ──
    useEffect(() => {
        async function bootstrap() {
            const data = await fetchSession()
            setInitialLoading(false)

            if (!data) return

            // Store yt_id for use in SSE handler
            if (data.yt_id) ytIdRef.current = data.yt_id

            // Only fetch hooks immediately if this is an existing session with
            // prior generations — hooks are already available in that case.
            // For brand-new sessions the transcript is still processing;
            // hooks will be fetched after the first job_completed SSE fires.
            if (data.yt_id && data.payloads.length > 0) {
                fetchHooks(data.yt_id)
            }

            // Check if we have pending gen params from the entry page
            const stored = sessionStorage.getItem(`gen_params_${sessionId}`)
            if (stored) {
                sessionStorage.removeItem(`gen_params_${sessionId}`)
                try {
                    const params = JSON.parse(stored) as {
                        url: string
                        platforms: string[]
                        tonePreset: TonePreset | null
                    }
                    await triggerGeneration({
                        url: params.url,
                        platforms: params.platforms,
                        tonePreset: params.tonePreset,
                        selectedHookIndex: undefined,
                    })
                } catch {
                    toast.error('Failed to start generation.')
                }
            }
        }

        bootstrap()
    }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── SSE: listen for job completions ──
    useJobNotifications(async (event) => {
        if (event.type === 'job_completed' && event.sessionId === sessionId) {
            setPendingJobs(prev => prev.filter(j => j.jobId !== event.jobId))
            await fetchSession()
            scrollToBottom()
            // Fetch hooks after first completion if not yet loaded
            if (hooks.length === 0 && ytIdRef.current) {
                fetchHooks(ytIdRef.current)
            }
        }
        if (event.type === 'job_failed' && event.sessionId === sessionId) {
            setPendingJobs(prev => prev.filter(j => j.jobId !== event.jobId))
            toast.error('A generation failed. Please try again.')
        }
    })

    // ── Scroll to bottom when feed updates ──
    useEffect(() => {
        scrollToBottom()
    }, [sessionData?.payloads.length, pendingJobs.length, scrollToBottom])

    // ── Trigger generation ──
    async function triggerGeneration(data: {
        url: string
        platforms: string[]
        tonePreset: TonePreset | null
        selectedHookIndex?: number
    }) {
        setGenerating(true)
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: data.url,
                    platforms: data.platforms,
                    sessionId,
                    tonePreset: data.tonePreset,
                    selectedHookIndex: data.selectedHookIndex,
                }),
            })

            const result = await res.json()

            if (!res.ok) {
                toast.error(result.error ?? 'Generation failed.')
                return
            }

            // Add pending jobs to show loading state
            const newPending: PendingJob[] = (result.generation_jobs ?? []).map(
                (j: { platform: string; job_id: string }) => ({
                    jobId: j.job_id,
                    platform: j.platform,
                    payloadId: result.payload_id,
                })
            )

            // If transcript job was queued (deferred), add pending for all platforms
            if (result.queue_info?.generation_deferred && newPending.length === 0) {
                const platforms = data.platforms.map(p => p.split(':')[0])
                for (const p of platforms) {
                    newPending.push({ jobId: 'deferred', platform: p, payloadId: result.payload_id })
                }
            }

            setPendingJobs(prev => [...prev, ...newPending])

            // Refresh session to show the new payload in the feed
            await fetchSession()

            // Store yt_id so the SSE handler can fetch hooks after completion
            const ytIdMatch = data.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
            if (ytIdMatch) ytIdRef.current = ytIdMatch[1]

            scrollToBottom()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong.')
        } finally {
            setGenerating(false)
        }
    }

    // ── Handle submit from sticky input ──
    async function handleSubmit(data: {
        url: string
        platforms: string[]
        tonePreset: TonePreset | null
        selectedHookIndex?: number
    }) {
        await triggerGeneration(data)
    }

    // ── Derive the locked URL (one video per session) ──
    const lockedUrl = sessionData?.yt_id
        ? `https://www.youtube.com/watch?v=${sessionData.yt_id}`
        : undefined

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
            {/* ── Center: chat feed + sticky input ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Session title */}
                <div className="px-6 py-3 border-b border-border/40 shrink-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <Typography variant="muted" className="text-[11px] uppercase tracking-wider">Session</Typography>
                        <h2 className="text-sm font-semibold truncate">{sessionData?.session.name ?? 'Untitled Session'}</h2>
                    </div>
                    {/* Mobile hooks toggle — highlighted to grab attention */}
                    {(hooks.length > 0 || hooksLoading) && (
                        <button
                            onClick={() => setHooksOpen(true)}
                            className="lg:hidden flex items-center gap-1.5 text-[11px] font-medium shrink-0 transition-all px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-500 hover:bg-violet-500/25 animate-pulse-subtle"
                        >
                            <Sparkles className="size-3" />
                            <span>Hooks{hooks.length > 0 ? ` · ${hooks.length}` : ''}</span>
                        </button>
                    )}
                </div>

                {/* Scrollable feed */}
                <div
                    ref={feedRef}
                    className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-8"
                >
                    {sessionData?.payloads.length === 0 && pendingJobs.length === 0 && (
                        <div className="flex items-center justify-center h-full text-muted-foreground/40 text-sm">
                            Your generations will appear here.
                        </div>
                    )}

                    {sessionData?.payloads.map((payload) => {
                        // Find pending jobs for this payload
                        const payloadPending = pendingJobs.filter(j => j.payloadId === payload.payload_id)
                        // Platforms already generated
                        const generatedPlatforms = new Set(payload.generations.map(g => g.platform))
                        // Pending platforms not yet generated
                        const stillPending = payloadPending.filter(j => !generatedPlatforms.has(j.platform))

                        return (
                            <div key={payload.payload_id} className="space-y-4">
                                {/* User message (right) */}
                                <UserMessage payload={payload} hooks={hooks} />

                                {/* AI output (center) */}
                                <div className="max-w-2xl mx-auto space-y-3">
                                    {payload.generations.map(gen => (
                                        <GenerationBubble key={gen.id} gen={gen} />
                                    ))}
                                    {stillPending.map(j => (
                                        <PendingBubble key={j.jobId + j.platform} platform={j.platform} />
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {/* Pending jobs for payloads not yet in session data */}
                    {(() => {
                        const knownPayloadIds = new Set(sessionData?.payloads.map(p => p.payload_id) ?? [])
                        const orphanPending = pendingJobs.filter(j => !knownPayloadIds.has(j.payloadId))
                        if (orphanPending.length === 0) return null
                        return (
                            <div className="space-y-4">
                                <div className="flex justify-end">
                                    <div className="max-w-[280px] bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
                                        <span className="text-[12px] text-muted-foreground">Processing…</span>
                                    </div>
                                </div>
                                <div className="max-w-2xl mx-auto space-y-3">
                                    {orphanPending.map(j => (
                                        <PendingBubble key={j.jobId + j.platform} platform={j.platform} />
                                    ))}
                                </div>
                            </div>
                        )
                    })()}
                </div>

                {/* Sticky bottom input */}
                <div className="shrink-0 border-t border-border/40 px-4 sm:px-8 py-4 bg-background/80 backdrop-blur-md">
                    <div className="max-w-2xl mx-auto">
                        <GenerateInput
                            onSubmit={(data) => handleSubmit({ ...data, selectedHookIndex })}
                            loading={generating}
                            hiddenUrl={lockedUrl}
                            selectedHookIndex={selectedHookIndex}
                            selectedHookText={selectedHookText}
                        />
                    </div>
                </div>
            </div>

            {/* ── Right sidebar: hooks (desktop) ── */}
            <div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-border/40 shrink-0 overflow-y-auto">
                <div className="px-4 py-3 border-b border-border/40">
                    <Typography variant="muted" className="text-[11px] uppercase tracking-wider">Hooks</Typography>
                    <p className="text-sm font-semibold">Select an angle</p>
                </div>
                <div className="flex-1 px-4 py-4">
                    {hooksLoading ? (
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Extracting hooks…</span>
                        </div>
                    ) : (
                        <HooksPanel
                            hooks={hooks}
                            selectedIndex={selectedHookIndex}
                            onSelect={(index, hook) => {
                                setSelectedHookIndex(prev => prev === index ? undefined : index)
                                setSelectedHookText(prev => prev === hook ? undefined : hook)
                            }}
                        />
                    )}
                    {!hooksLoading && hooks.length === 0 && (
                        <p className="text-[12px] text-muted-foreground/50">
                            Hooks will appear here after the first generation completes.
                        </p>
                    )}
                </div>
            </div>

            {/* ── Mobile hooks drawer ── */}
            {hooksOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setHooksOpen(false)}
                    />
                    {/* Sheet */}
                    <div className="relative bg-background border-t border-border/60 rounded-t-2xl max-h-[75vh] flex flex-col">
                        {/* Handle + header */}
                        <div className="px-4 pt-3 pb-2 border-b border-border/40 shrink-0">
                            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <Typography variant="muted" className="text-[11px] uppercase tracking-wider">Hooks</Typography>
                                    <p className="text-sm font-semibold">Select an angle</p>
                                </div>
                                <button
                                    onClick={() => setHooksOpen(false)}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        </div>
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            {hooksLoading ? (
                                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                    <Loader2 className="size-3.5 animate-spin" />
                                    <span>Extracting hooks…</span>
                                </div>
                            ) : (
                                <HooksPanel
                                    hooks={hooks}
                                    selectedIndex={selectedHookIndex}
                                    onSelect={(index, hook) => {
                                        setSelectedHookIndex(prev => prev === index ? undefined : index)
                                        setSelectedHookText(prev => prev === hook ? undefined : hook)
                                        setHooksOpen(false)
                                    }}
                                />
                            )}
                            {!hooksLoading && hooks.length === 0 && (
                                <p className="text-[12px] text-muted-foreground/50">
                                    Hooks will appear here after the first generation completes.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
