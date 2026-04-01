'use client'

import { motion, type Variants } from 'framer-motion'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import GenerateInput from '@/components/generate/generate-input'
import type { TonePreset } from '@creatorjot/shared'
import { Typography } from '@/components/ui/typography'

/* ── Animation variants ── */
const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
}
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

/* ================================================================== */
/*  /dashboard/generate — Entry point                                  */
/*  Flow: check quota → create session → redirect to /generate/[id]   */
/* ================================================================== */

export default function GeneratePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleGenerate(data: {
        url: string
        platforms: string[]
        tonePreset: TonePreset | null
    }) {
        setLoading(true)

        try {
            /* ── 1. Check quota ── */
            const quotaRes = await fetch('/api/check-quota')
            const quota = await quotaRes.json()

            if (!quotaRes.ok) {
                toast.error(quota.error ?? 'Failed to check quota.')
                return
            }

            if (!quota.canGenerate) {
                toast.warning(quota.reason ?? 'You have reached your generation limit.')
                return
            }

            /* ── 2. Create session (with YouTube OEmbed title) ── */
            const sessionRes = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: data.url }),
            })

            const sessionData = await sessionRes.json()

            if (!sessionRes.ok) {
                toast.error(sessionData.error ?? 'Failed to create session.')
                return
            }

            /* ── 3. Redirect to session page with generation params ── */
            // Store generation params in sessionStorage so the session page can pick them up
            const genParams = {
                url: data.url,
                platforms: data.platforms,
                tonePreset: data.tonePreset,
            }
            sessionStorage.setItem(
                `gen_params_${sessionData.session_id}`,
                JSON.stringify(genParams)
            )

            router.push(`/dashboard/generate/${sessionData.session_id}`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="px-4 sm:px-8 py-8 sm:py-10 space-y-8 h-[calc(100vh-3.5rem)] flex items-center justify-center flex-col"
        >
            <div className='w-full max-w-2xl flex flex-col gap-4 items-stretch'>
                {/* ── Page header ── */}
                <motion.div variants={fadeUp} className="space-y-1">
                    <Typography variant={"muted"} className='uppercase'>
                        Create
                    </Typography>
                    {/* <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
                    </p> */}
                    <h1 className="text-2xl font-bold tracking-tight font-suse">Generate</h1>
                </motion.div>

                {/* ── Subtitle ── */}
                <motion.div variants={fadeUp} className="flex items-center gap-2 text-[13px] text-muted-foreground/60">
                    <Sparkles className="size-4 shrink-0" />
                    <span>Paste a YouTube link, choose platforms & tone, and hit Generate.</span>
                </motion.div>

                {/* ── Input card ── */}
                <motion.div variants={fadeUp}>
                    <GenerateInput
                        onSubmit={handleGenerate}
                        loading={loading}
                    />
                </motion.div>
            </div>
        </motion.div>
    )
}
