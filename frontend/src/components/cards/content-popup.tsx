'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, CheckCheck, ExternalLink, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn, formatGeneratedContent } from '@/lib/utils'
import { ShareButton } from '@/components/ui/share-button'

const PLATFORM_LABELS: Record<string, string> = {
    x: 'X / Twitter',
    linkedin: 'LinkedIn',
    blog: 'Blog',
    yt_community_post: 'YT Community',
    facebook: 'Facebook',
    tumblr: 'Tumblr',
    email: 'Email',
}

export interface ContentPopupData {
    id: string
    platform: string
    content: string
    created_at: string
    session_id: string
    yt_id: string | null
}

interface ContentPopupProps {
    data: ContentPopupData | null
    onClose: () => void
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    async function handleCopy() {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button
            onClick={handleCopy}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-200 cursor-pointer',
                copied
                    ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400'
                    : 'border-border bg-foreground/3 text-muted-foreground hover:bg-foreground/6 hover:text-foreground'
            )}
        >
            {copied ? <CheckCheck className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
        </button>
    )
}

export function ContentPopup({ data, onClose }: ContentPopupProps) {
    return (
        <AnimatePresence>
            {data && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="popup-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm h-full"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        key="popup-modal"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-auto sm:w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Top accent line */}
                        <div className="h-px bg-linear-to-r from-transparent via-foreground/10 to-transparent" />

                        {/* Header */}
                        <div className="flex items-center justify-between p-5 pb-0">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-foreground/5">
                                    <Sparkles className="size-3.5 text-muted-foreground/60" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold font-suse">
                                        {PLATFORM_LABELS[data.platform] ?? data.platform}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/50">
                                        Generated content
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-all cursor-pointer"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Content area */}
                        <div className="flex-1 overflow-y-auto p-5">
                            <div className="rounded-xl border border-border bg-background/50 p-4">
                                <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/80 font-sans">
                                    {formatGeneratedContent(data.content)}
                                </pre>
                            </div>
                        </div>

                        <div className="border-t border-border p-4 flex flex-wrap items-center gap-2">
                            <CopyButton text={formatGeneratedContent(data.content)} />
                            <ShareButton platform={data.platform} text={data.content} variant="outline" />

                            <Link
                                href={`/dashboard/generate/${data.session_id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/3 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-foreground/6 hover:text-foreground transition-all"
                            >
                                Go to Session
                                <ArrowRight className="size-3.5" />
                            </Link>

                            {data.yt_id && (
                                <a
                                    href={`https://www.youtube.com/watch?v=${data.yt_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/3 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-foreground/6 hover:text-foreground transition-all"
                                >
                                    YouTube Video
                                    <ExternalLink className="size-3.5" />
                                </a>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
