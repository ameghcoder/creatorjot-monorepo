'use client'

import { useState, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Sparkles, ArrowRight, Zap, Layers, TrendingUp, ArrowUpRight, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { createBrowserSupabaseClient } from '@/server/supabase/supabase-browser'
import { format } from 'date-fns'
import { ContentPopup, type ContentPopupData } from '@/components/cards/content-popup'
import { formatGeneratedContent } from '@/lib/utils'

/* ── Animation variants ── */
const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
}
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

interface DashboardStats {
    generations: number
    videos: number
    contentPieces: number
}

interface RecentGeneration {
    id: string
    platform: string
    content: string
    created_at: string
    status: string
    session_id: string
    yt_id: string | null
}

function StatSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="size-8 rounded-lg bg-foreground/5" />
                <div className="size-3.5 rounded bg-foreground/5" />
            </div>
            <div className="space-y-1.5">
                <div className="h-7 w-10 rounded bg-foreground/5" />
                <div className="h-3 w-20 rounded bg-foreground/5" />
            </div>
        </div>
    )
}

const PLATFORM_LABELS: Record<string, string> = {
    x: 'X / Twitter',
    linkedin: 'LinkedIn',
    blog: 'Blog',
    yt_community_post: 'YT Community',
    facebook: 'Facebook',
    tumblr: 'Tumblr',
    email: 'Email',
}

export default function DashboardPage() {
    const { loading: authLoading, user } = useAuthStore()
    const [isPaymentPending, setIsPaymentPending] = useState(false)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([])
    const [statsLoading, setStatsLoading] = useState(true)
    const [selectedGeneration, setSelectedGeneration] = useState<ContentPopupData | null>(null)

    useEffect(() => {
        if (!user) return
        const supabase = createBrowserSupabaseClient()

        async function fetchDashboardData() {
            setStatsLoading(true)
            try {
                // Payment status
                const { data: plan } = await supabase
                    .from('user_active_plan')
                    .select('plan_type, payment_status')
                    .eq('user_id', user!.id)
                    .single()

                if (plan?.plan_type === 'pro' && plan?.payment_status === 'pending') {
                    setIsPaymentPending(true)
                }

                // Generations count
                const { count: generationsCount } = await supabase
                    .from('generations')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user!.id)

                // Unique videos — fetch all yt_id values and deduplicate client-side
                // (Supabase count: 'exact' counts rows, not distinct values)
                const { data: payloadRows } = await supabase
                    .from('payloads')
                    .select('yt_id')
                    .eq('user_id', user!.id)
                const videosCount = new Set((payloadRows ?? []).map(r => r.yt_id).filter(Boolean)).size

                setStats({
                    generations: generationsCount ?? 0,
                    videos: videosCount ?? 0,
                    contentPieces: generationsCount ?? 0,
                })

                // Recent generations (last 5) — join payloads to get yt_id
                const { data: recent } = await supabase
                    .from('generations')
                    .select('id, platform, content, created_at, status, session_id, payloads:payload_id ( yt_id )')
                    .eq('user_id', user!.id)
                    .order('created_at', { ascending: false })
                    .limit(5)

                const mapped: RecentGeneration[] = (recent ?? []).map((r: Record<string, unknown>) => {
                    const payload = r.payloads as { yt_id: string | null } | null
                    return {
                        id: r.id as string,
                        platform: r.platform as string,
                        content: r.content as string,
                        created_at: r.created_at as string,
                        status: r.status as string,
                        session_id: r.session_id as string,
                        yt_id: payload?.yt_id ?? null,
                    }
                })
                setRecentGenerations(mapped)
            } catch {
                // Non-fatal — stats just won't show
            } finally {
                setStatsLoading(false)
            }
        }

        fetchDashboardData()
    }, [user])

    const statsConfig = [
        {
            label: 'Generations',
            value: stats ? String(stats.generations) : '0',
            icon: Sparkles,
            iconBg: 'bg-purple-500/8',
            iconColor: 'text-purple-500 dark:text-purple-400',
        },
        {
            label: 'Videos',
            value: stats ? String(stats.videos) : '0',
            icon: Layers,
            iconBg: 'bg-blue-500/8',
            iconColor: 'text-blue-500 dark:text-blue-400',
        },
        {
            label: 'Content Pieces',
            value: stats ? String(stats.contentPieces) : '0',
            icon: TrendingUp,
            iconBg: 'bg-emerald-500/8',
            iconColor: 'text-emerald-500 dark:text-emerald-400',
        },
    ]

    const loading = authLoading || statsLoading

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="px-4 sm:px-8 py-8 sm:py-10 space-y-8">
            {/* ── Header row ── */}
            <motion.div variants={fadeUp} className="flex items-end justify-between gap-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Overview</p>
                    <h1 className="text-2xl font-bold tracking-tight font-suse">Dashboard</h1>
                </div>
                <Link href="/dashboard/generate">
                    <Button variant="default" size="md" className="cursor-pointer" icon={<ArrowRight className="size-3.5" />} iconPosition="end">
                        <span className="hidden sm:inline">New Generation</span>
                        <span className="sm:hidden">New</span>
                    </Button>
                </Link>
            </motion.div>

            {/* ── Payment pending banner ── */}
            {isPaymentPending && (
                <motion.div variants={fadeUp}>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 mt-0.5">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-semibold font-suse text-amber-600 dark:text-amber-500">Payment Processing</p>
                                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                                        Your Pro plan subscription is pending confirmation. It may take a few moments.
                                    </p>
                                </div>
                            </div>
                            <Link href="/dashboard/payments" className="shrink-0">
                                <Button
                                    variant="outline"
                                    size="md"
                                    className="cursor-pointer w-full sm:w-auto border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-500"
                                    icon={<ArrowRight className="size-3.5" />}
                                    iconPosition="end"
                                >
                                    View Details
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Stats grid ── */}
            <motion.div variants={fadeUp} className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                {loading
                    ? Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
                    : statsConfig.map((stat) => (
                        <div
                            key={stat.label}
                            className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-foreground/10 hover:shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div className={`flex size-8 items-center justify-center rounded-lg ${stat.iconBg}`}>
                                    <stat.icon className={`size-4 ${stat.iconColor}`} />
                                </div>
                                <ArrowUpRight className="size-3.5 text-muted-foreground/0 transition-all duration-300 group-hover:text-muted-foreground/40 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </div>
                            <div className="mt-4 space-y-0.5">
                                <p className="text-2xl font-bold font-suse tracking-tight leading-none">{stat.value}</p>
                                <p className="text-[11px] text-muted-foreground/60 font-medium">{stat.label}</p>
                            </div>
                        </div>
                    ))
                }
            </motion.div>

            {/* ── Recent generations ── */}
            <motion.div variants={fadeUp} className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Recent Generations</p>

                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
                        ))}
                    </div>
                ) : recentGenerations.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card/40 py-14 px-8 text-center">
                        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-foreground/4 border border-border mb-4">
                            <Clock className="size-4 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-sm font-semibold font-suse mb-1">No generations yet</h3>
                        <p className="text-[13px] text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                            Your generated content will appear here after your first run.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentGenerations.map((gen) => (
                            <button
                                key={gen.id}
                                onClick={() => setSelectedGeneration({
                                    id: gen.id,
                                    platform: gen.platform,
                                    content: gen.content,
                                    created_at: gen.created_at,
                                    session_id: gen.session_id,
                                    yt_id: gen.yt_id,
                                })}
                                className="w-full rounded-xl border border-border bg-card p-4 flex items-start gap-3 text-left transition-all duration-200 hover:border-foreground/10 hover:shadow-sm cursor-pointer group"
                            >
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/4 mt-0.5">
                                    <Sparkles className="size-3.5 text-muted-foreground/50" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[11px] font-semibold text-foreground/70">
                                            {PLATFORM_LABELS[gen.platform] ?? gen.platform}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/40">
                                            {format(new Date(gen.created_at), 'MMM d, h:mm a')}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-muted-foreground/60 truncate">{formatGeneratedContent(gen.content)}</p>
                                </div>
                                <ArrowUpRight className="size-3.5 text-muted-foreground/0 transition-all duration-200 group-hover:text-muted-foreground/40 shrink-0 mt-1" />
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Content Popup ── */}
            <ContentPopup
                data={selectedGeneration}
                onClose={() => setSelectedGeneration(null)}
            />
        </motion.div>
    )
}
