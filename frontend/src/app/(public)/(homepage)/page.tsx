'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { siX, siYoutube } from 'simple-icons'
import {
    ArrowRight,
    Check,
    Link2,
    Zap,
    Rocket,
    Lightbulb,
    Globe,
    Sparkles,
    FileText,
    Play,
    Flame,
    MessageSquareText,
    Users,
    Mic,
    Timer,
    Loader,
} from 'lucide-react'
import Link from 'next/link'
import { SimpleIcons } from '@/components/icon-wrapper'
import { ScaleBorder } from '@/components/layout/scale-border'
import { ScaleCard } from '@/components/layout/scale-card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { FaqSection } from '@/components/sections/faq-section'
import { PricingSection } from '@/components/sections/pricing-section'
import { Reveal, useInView } from '@/components/ui/reveal'
import { HowItWorksCards } from '@/components/sections/how-it-works-cards'
import { Typewriter } from '@/components/homepage/typewriter'
import { FloatingCta } from '@/components/homepage/floating-cta'
import { OutputExamples } from '@/components/homepage/output-examples'

/* ================================================================== */
/*  PAGE                                                              */
/* ================================================================== */
const Page = () => {
    const router = useRouter()
    const [heroUrl, setHeroUrl] = useState('')

    function handleHeroGenerate() {
        const url = heroUrl.trim()
        if (url) {
            router.push(`/auth/signup?url=${encodeURIComponent(url)}`)
        } else {
            router.push('/auth/signup')
        }
    }

    const audiences = [
        { icon: <Mic className="size-4" />, label: 'YouTubers' },
        { icon: <MessageSquareText className="size-4" />, label: 'Content Creators' },
        { icon: <Rocket className="size-4" />, label: 'Indie Hackers' },
        { icon: <Users className="size-4" />, label: 'Solopreneurs' },
    ]

    const contentMultipliers = [
        { count: '1', label: 'Twitter thread', icon: <SimpleIcons path={siX.path} className="size-3.5 fill-foreground/50" /> },
        { count: '5', label: 'Tweets', icon: <MessageSquareText className="size-3.5 text-foreground/50" /> },
        { count: '2', label: 'LinkedIn posts', icon: <Globe className="size-3.5 text-foreground/50" /> },
        { count: '3', label: 'Viral hooks', icon: <Flame className="size-3.5 text-foreground/50" /> },
        { count: '1', label: 'Email newsletter', icon: <FileText className="size-3.5 text-foreground/50" /> },
    ]

    return (
        <div className="mx-auto w-full relative">
            <div className="w-full">

                {/* ================================================ */}
                {/*  1. HERO                                          */}
                {/* ================================================ */}
                <div id="hero-sentinel" className="overflow-hidden relative w-full min-h-dvh flex items-center justify-center flex-col bg-white dark:bg-black">
                    {/* Dot grid pattern */}
                    {/* <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid mask-b-from-60% opacity-50" style={{ animation: 'fade-in 10s ease-in-out' }} /> */}

                    <div aria-hidden="true" className="absolute inset-0 isolate hidden overflow-hidden contain-strict lg:block">
                        <div className="absolute inset-0 -top-14 isolate -z-10 bg-[radial-gradient(35%_80%_at_49%_0%,--theme(--color-foreground/.06),transparent)] contain-strict" />
                    </div>

                    <section className="relative z-20 flex flex-col items-center justify-center gap-8 px-6 pt-32 pb-28 md:pt-40 md:pb-36">
                        {/* Pill badge */}
                        <Reveal>
                            <div className="mx-auto flex w-fit items-center gap-2.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                                <Zap className="size-3 text-amber-500/50" />
                                <span>Generate 10+ posts in under 10 seconds</span>
                            </div>
                        </Reveal>

                        {/* Headline */}
                        <Reveal delay={80}>
                            <h1 className="text-balance text-center text-4xl font-bold leading-[1.1] tracking-tight font-suse md:text-5xl lg:text-6xl">
                                Turn 1 YouTube Video
                                <br />
                                Into <span className="bg-linear-to-r from-foreground via-foreground/80 to-foreground/50 bg-clip-text text-transparent">10+ Social Media Posts</span>
                            </h1>
                        </Reveal>

                        {/* Sub-headline */}
                        <Reveal delay={160}>
                            <p className="mx-auto max-w-lg text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
                                Paste a YouTube link and <strong className="text-foreground">CreatorJot</strong> instantly generates ready-to-post content for X, LinkedIn, Facebook, email, and more.
                            </p>
                        </Reveal>

                        {/* CTA */}
                        <Reveal delay={240}>
                            <div className="mt-4 w-full flex flex-col items-center">
                                <ScaleBorder
                                    scaleSize={5}
                                    borderWidth={10}
                                    overflow={50}
                                    className="w-full sm:max-w-2xl mx-auto"
                                    contentClassName="border border-border  w-full flex items-center p-1.5 bg-card backdrop-blur-xl shadow-2xl shadow-foreground/10 gap-1 relative"
                                >
                                    <Input
                                        type="url"
                                        variant="ghost"
                                        icon={<Link2 className="size-5 text-muted-foreground/50" />}
                                        className="focus:bg-transparent! h-10 py-2 border-0 shadow-none focus-visible:ring-0 outline-none text-base sm:text-lg placeholder:text-muted-foreground/60 w-full bg-transparent"
                                        placeholder="Paste any YouTube video link..."
                                        value={heroUrl}
                                        onChange={(e) => setHeroUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleHeroGenerate()}
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleHeroGenerate}
                                        className=" h-10 font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center gap-2 group/btn shrink-0"
                                        icon={<ArrowRight className="size-4 group-hover/btn:rotate-12 transition-transform" />}
                                        iconPosition='end'
                                    >
                                        <span className="hidden sm:inline">Generate</span>
                                    </Button>
                                </ScaleBorder>
                                <p className="mt-5 text-[11px] sm:text-xs text-muted-foreground/80 font-medium tracking-wide flex items-center gap-1.5 uppercase">
                                    <Check className="size-3.5 stroke-3" /> Free to try • No credit card required
                                </p>
                            </div>
                        </Reveal>

                    </section>
                </div>

                {/* ================================================ */}
                {/*  2. PRODUCT PREVIEW SECTION                       */}
                {/* ================================================ */}
                <section className="relative px-6 py-24 md:py-32 overflow-hidden">
                    <Reveal>
                        <div className="mb-14 text-center space-y-3">
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                See CreatorJot in Action
                            </h2>
                        </div>
                    </Reveal>

                    <Reveal delay={100}>
                        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Input Panel */}
                            <ScaleCard
                                title="Input"
                                headerAction={
                                    <div className="flex gap-1.5">
                                        <div className="size-2.5 rounded-full bg-border" />
                                        <div className="size-2.5 rounded-full bg-border" />
                                        <div className="size-2.5 rounded-full bg-border" />
                                    </div>
                                }
                            >
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/50 px-3 py-2">
                                    <SimpleIcons path={siYoutube.path} className="fill-red-500 dark:fill-red-400 size-4 shrink-0" />
                                    <span className="text-xs text-foreground/80 font-mono truncate">youtube.com/watch?v=1A2B3C...</span>
                                </div>
                                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center border border-border/50 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-black/5" />
                                    <div className="size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Play className="size-4 text-foreground/70 ml-1" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                    Paste any YouTube video link. CreatorJot downloads the transcript, extracts the key arguments, and prepares for processing.
                                </p>
                            </ScaleCard>

                            {/* Processing Panel */}
                            <ScaleCard
                                title="Processing"
                                headerAction={<Zap className="size-3.5 text-amber-500" />}
                                bodyClassName="justify-center items-center gap-6"
                            >
                                <div className="relative flex items-center justify-center">
                                    <div className="size-12 rounded-full bg-secondary flex items-center justify-center">
                                        <Loader className="size-5 text-success animate-spin duration-1000" />
                                    </div>
                                </div>

                                <div className="w-full space-y-3">
                                    <Progress value={100} size={"sm"} label='Extracting Hooks' labelPosition='top' state={'success'} showValue={true} />
                                    <Progress value={100} size={"sm"} label='Structuring Arguments' labelPosition='top' state={'success'} showValue={true} />
                                    <Progress value={60} size={"sm"} variant={"striped"} label='Formatting Post' labelPosition='top' state={'loading'} showValue={true} />
                                </div>
                            </ScaleCard>

                            {/* Output Panel */}
                            <ScaleCard
                                title="Generated"
                                headerAction={<Check className="size-3.5 text-emerald-500" />}
                                bodyClassName="gap-3 overflow-y-auto no-scrollbar mask-b-from-80%"
                            >
                                {/* Twitter Preview */}
                                <div className="rounded-lg border border-border bg-background p-3 space-y-2 relative z-10 transition-colors hover:border-foreground/20">
                                    <div className="flex items-center gap-2">
                                        <SimpleIcons path={siX.path} className="size-3 fill-foreground/60" />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Twitter Thread</span>
                                    </div>
                                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
                                        Most creators make one huge mistake: they create amazing videos and let the content die on YouTube... 🧵
                                    </p>
                                </div>
                                {/* LinkedIn Preview */}
                                <div className="rounded-lg border border-border bg-background p-3 space-y-2 relative z-10 transition-colors hover:border-foreground/20">
                                    <div className="flex items-center gap-2">
                                        <Globe className="size-3 text-blue-500" />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">LinkedIn Post</span>
                                    </div>
                                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
                                        Most founders believe product is everything. But distribution decides survival. Here&apos;s my workflow 👇
                                    </p>
                                </div>
                                {/* Blog Preview — removed: blog is not a supported platform */}
                            </ScaleCard>
                        </div>
                    </Reveal>
                </section>

                {/* ================================================ */}
                {/*  4. SOLUTION                                       */}
                {/* ================================================ */}
                <section className="relative px-6 py-24 md:py-32 border-t border-border overflow-hidden">
                    {/* Pulsing center glow */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px]" style={{ animation: 'pulse-glow 6s ease-in-out infinite' }} />
                    </div>
                    <Reveal>
                        <div className="mb-14 text-center space-y-3">
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                Turn One Video Into a Full Content Strategy
                            </h2>
                            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                                One video becomes an entire week of social content.
                            </p>
                        </div>
                    </Reveal>

                    <div className="mx-auto max-w-3xl">
                        {/* Source */}
                        <Reveal>
                            <div className="flex justify-center mb-6">
                                <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3.5 shadow-sm">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/8">
                                        <SimpleIcons path={siYoutube.path} className="fill-red-500 dark:fill-red-400 size-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold font-suse">1 YouTube Video</p>
                                    </div>
                                </div>
                            </div>
                        </Reveal>

                        {/* Arrow */}
                        <Reveal delay={100}>
                            <div className="flex justify-center my-4">
                                <svg width="24" height="40" viewBox="0 0 24 40" fill="none" className="text-foreground/15">
                                    <line x1="12" y1="0" x2="12" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="round" />
                                    <path d="M7 26 L12 34 L17 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/20" />
                                </svg>
                            </div>
                        </Reveal>

                        {/* Content output grid */}
                        <div className="flex flex-wrap justify-center gap-3">
                            {[
                                { count: '1', label: 'Twitter thread', icon: <SimpleIcons path={siX.path} className="size-3.5 fill-foreground/50" /> },
                                { count: '2', label: 'LinkedIn posts', icon: <Globe className="size-3.5 text-foreground/50" /> },
                                { count: '3', label: 'Quote posts', icon: <MessageSquareText className="size-3.5 text-foreground/50" /> },
                                { count: '1', label: 'Email newsletter', icon: <FileText className="size-3.5 text-foreground/50" /> },
                                { count: '5', label: 'Content ideas', icon: <Lightbulb className="size-3.5 text-foreground/50" /> },
                            ].map((item, i) => (
                                <Reveal key={item.label} delay={150 + i * 60}>
                                    <ScaleCard bodyClassName="p-4 items-center gap-2.5 transition-all duration-200 hover:border-foreground/15 hover:shadow-sm">
                                        {item.icon}
                                        <span className="text-xs font-semibold text-foreground leading-tight">{item.label}</span>
                                    </ScaleCard>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ================================================ */}
                {/*  5. HOW IT WORKS                                   */}
                {/* ================================================ */}
                <section className="relative px-6 py-24 md:py-32 border-t border-border overflow-hidden">
                    {/* Grid lines background */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-lines mask-y-from-10% mask-y-to-90%" />
                    <Reveal>
                        <div className="mb-14 text-center space-y-3">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">How It Works</p>
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                Three steps. Zero effort.
                            </h2>
                        </div>
                    </Reveal>

                    <HowItWorksCards />

                    {/* Benefit tags */}
                    <Reveal delay={350}>
                        <div className="mx-auto mt-10 flex flex-wrap justify-center gap-2.5">
                            {['No prompting', 'No manual rewriting', 'No content fatigue'].map((b) => (
                                <span
                                    key={b}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                                >
                                    <Check className="size-3 text-foreground/50" />
                                    {b}
                                </span>
                            ))}
                        </div>
                    </Reveal>
                </section>

                {/* ================================================ */}
                {/*  6. OUTPUT EXAMPLES                                */}
                {/* ================================================ */}
                <section className="px-6 py-24 md:py-32 border-t border-border bg-secondary/10">
                    <Reveal>
                        <div className="mb-14 text-center space-y-3">
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                Example Content Generated by CreatorJot
                            </h2>
                        </div>
                    </Reveal>

                    <div className="mx-auto max-w-5xl">
                        <OutputExamples />
                    </div>
                </section>

                {/* ================================================ */}
                {/*  7. SPEED                                          */}
                {/* ================================================ */}
                <section className="relative px-6 py-24 md:py-32 border-t border-border overflow-hidden bg-background">
                    {/* Background glow */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-amber-500/5 blur-[120px]" />
                    </div>

                    <Reveal>
                        <div className="mx-auto max-w-4xl flex flex-col items-center text-center space-y-8 relative z-10">
                            <div className="inline-flex flex-col items-center justify-center gap-2">
                                <span className="text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-foreground to-foreground/50 tabular-nums">10</span>
                                <span className="text-xl font-medium tracking-wide uppercase text-muted-foreground">Seconds</span>
                            </div>

                            <div className="space-y-4 max-w-2xl">
                                <h2 className="text-3xl font-bold tracking-tight font-suse md:text-5xl">
                                    From video to posts in seconds.
                                </h2>
                                <p className="text-lg leading-relaxed text-muted-foreground">
                                    Stop spending hours taking notes, drafting, and rewriting. CreatorJot processes your 20-minute video and gives you multi-platform content before you can finish your coffee.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-8 border-t border-border/50">
                                {[
                                    { icon: <Timer className="size-4" />, text: 'Instant processing' },
                                    { icon: <Zap className="size-4" />, text: 'No waiting in line' },
                                    { icon: <Flame className="size-4" />, text: 'Ready to post immediately' },
                                ].map((feature) => (
                                    <div key={feature.text} className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm text-foreground/80">
                                        <div className="text-amber-500">{feature.icon}</div>
                                        {feature.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Reveal>
                </section>

                {/* ================================================ */}
                {/*  8. COMPARISON                                     */}
                {/* ================================================ */}
                <section className="relative px-6 py-24 md:py-32 border-t border-border overflow-hidden bg-secondary/5">
                    <Reveal>
                        <div className="mb-14 text-center space-y-3">
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                Manual Repurposing vs CreatorJot
                            </h2>
                            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                                Why top creators are switching to our automated workflow.
                            </p>
                        </div>
                    </Reveal>

                    <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-6 relative">
                        {/* VS Badge */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 size-12 rounded-full bg-background border border-border items-center justify-center shadow-sm hidden md:flex">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">VS</span>
                        </div>

                        {/* Manual Way */}
                        <Reveal>
                            <ScaleCard bodyClassName="p-8">
                                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-destructive">
                                    <span className="size-2 rounded-full bg-destructive/80" />
                                    The Manual Way
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { title: 'Time', desc: '3-4 hours per video' },
                                        { title: 'Process', desc: 'Rewatch, take notes, write' },
                                        { title: 'Quality', desc: 'Drains your creative energy' },
                                        { title: 'Consistency', desc: 'Hard to maintain weekly' },
                                    ].map((item) => (
                                        <div key={item.title} className="flex flex-col gap-1 pb-4 border-b border-destructive/10 last:border-0 last:pb-0">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-destructive/50">{item.title}</span>
                                            <span className="text-sm text-foreground/80">{item.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScaleCard>
                        </Reveal>

                        {/* CreatorJot Way */}
                        <Reveal delay={100}>
                            <ScaleCard bodyClassName="p-8">
                                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <Sparkles className="size-5" />
                                    With CreatorJot
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    {[
                                        { title: 'Time', desc: 'Under 10 seconds' },
                                        { title: 'Process', desc: 'Paste a link, click generate' },
                                        { title: 'Quality', desc: 'Optimized for each platform' },
                                        { title: 'Consistency', desc: 'Effortless content machine' },
                                    ].map((item) => (
                                        <div key={item.title} className="flex flex-col gap-1 pb-4 border-b border-border last:border-0 last:pb-0">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500/60">{item.title}</span>
                                            <span className="text-sm text-foreground/90 font-medium">{item.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScaleCard>
                        </Reveal>
                    </div>
                </section>

                {/* ================================================ */}
                {/*  9. USE CASES                                      */}
                {/* ================================================ */}
                <section className="px-6 py-24 md:py-32 border-t border-border">
                    <Reveal>
                        <div className="mb-14 text-center space-y-3">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Built For You</p>
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                Made for people who create
                            </h2>
                        </div>
                    </Reveal>

                    <div className="mx-auto max-w-5xl grid md:grid-cols-4 gap-4">
                        {audiences.map((audience, i) => (
                            <Reveal key={audience.label} delay={i * 100}>
                                <ScaleCard bodyClassName="items-center justify-center gap-3 p-6">
                                    <div className="size-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70">
                                        {audience.icon}
                                    </div>
                                    <span className="text-sm font-semibold">{audience.label}</span>
                                </ScaleCard>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* ================================================ */}
                {/*  10. VALUE — CONTENT MULTIPLIER                    */}
                {/* ================================================ */}
                <section className="relative px-6 py-24 md:py-32 border-t border-border overflow-hidden">
                    {/* Pulsing center glow */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-emerald-500/3 blur-[120px]" style={{ animation: 'pulse-glow 6s ease-in-out infinite' }} />
                    </div>
                    <Reveal>
                        <div className="mb-14 text-center space-y-3">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">The Multiplier</p>
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                Turn One Video Into Weeks of Content
                            </h2>
                            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                                Your entire content calendar from a single video.
                            </p>
                        </div>
                    </Reveal>

                    <div className="mx-auto max-w-2xl">
                        {/* Source */}
                        <Reveal>
                            <div className="flex justify-center mb-6">
                                <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3.5 shadow-sm">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/8">
                                        <SimpleIcons path={siYoutube.path} className="fill-red-500 dark:fill-red-400 size-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold font-suse">1 YouTube Video</p>
                                        <p className="text-xs text-muted-foreground">Your source content</p>
                                    </div>
                                </div>
                            </div>
                        </Reveal>

                        {/* Arrow */}
                        <Reveal delay={100}>
                            <div className="flex justify-center my-4">
                                <svg width="24" height="40" viewBox="0 0 24 40" fill="none" className="text-foreground/15">
                                    <line x1="12" y1="0" x2="12" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="round" />
                                    <path d="M7 26 L12 34 L17 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/20" />
                                </svg>
                            </div>
                        </Reveal>

                        {/* Content output grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {contentMultipliers.map((item, i) => (
                                <Reveal key={item.label} delay={150 + i * 60}>
                                    <ScaleCard bodyClassName="items-center gap-2.5 p-4 text-center">
                                        <span className="text-2xl font-bold font-suse text-foreground">{item.count}</span>
                                        {item.icon}
                                        <span className="text-xs text-muted-foreground leading-tight">{item.label}</span>
                                    </ScaleCard>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ================================================ */}
                {/*  6. WHY CREATORJOT IS DIFFERENT                    */}
                {/* ================================================ */}
                <section className="relative px-6 py-24 md:py-32 border-t border-border overflow-hidden">
                    {/* Dot grid background */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid" />
                    <Reveal>
                        <div className="mb-14 text-center space-y-3">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Why Us</p>
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                Why CreatorJot Is Different
                            </h2>
                        </div>
                    </Reveal>

                    <div className="mx-auto max-w-2xl">
                        <Reveal>
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Others */}
                                <ScaleCard title="Most AI Tools" bodyClassName="space-y-2.5">
                                    {['Generic summaries', 'One-size-fits-all output', 'No platform awareness', 'Sounds like a robot'].map((item) => (
                                        <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground/70">
                                            <span className="size-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                                            {item}
                                        </div>
                                    ))}
                                </ScaleCard>

                                {/* CreatorJot */}
                                <ScaleCard title="CreatorJot" bodyClassName="space-y-2.5">
                                    {['Viral hooks extraction', 'Platform-specific formatting', 'Strong opinion detection', 'Sounds like you'].map((item) => (
                                        <div key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                                            <Check className="size-3.5 text-emerald-500 shrink-0" />
                                            {item}
                                        </div>
                                    ))}
                                </ScaleCard>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* ================================================ */}
                {/*  7. TARGET AUDIENCE                                */}
                {/* ================================================ */}
                <section className="px-6 py-24 md:py-32 border-t border-border">
                    <Reveal>
                        <div className="mb-14 text-center space-y-3">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Built For You</p>
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                Made for people who create.
                            </h2>
                            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                                Anyone turning long-form content into short-form posts.
                            </p>
                        </div>
                    </Reveal>

                    <div className="mx-auto max-w-lg flex flex-wrap justify-center gap-3">
                        {audiences.map((a, i) => (
                            <Reveal key={a.label} delay={i * 60}>
                                <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-2.5 transition-colors duration-200 hover:border-foreground/15">
                                    <div className="text-foreground/60">{a.icon}</div>
                                    <span className="text-sm font-medium">{a.label}</span>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* ================================================ */}
                {/*  10. FAQ                                           */}
                {/* ================================================ */}
                <FaqSection />

                {/* ================================================ */}
                {/*  11. PRICING TEASER                                */}
                {/* ================================================ */}
                <PricingSection />

                {/* ================================================ */}
                {/*  9. FINAL CTA                                      */}
                {/* ================================================ */}
                <section className="relative px-6 py-24 md:py-32 border-t border-border">
                    {/* Subtle bottom wash */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-foreground/2.5 blur-3xl" />
                    </div>

                    <Reveal>
                        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
                            <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                                Start Turning Videos Into Content
                            </h2>
                            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                                Paste a YouTube link and get X threads, LinkedIn posts, and more in seconds. No prompting, no rewriting.
                            </p>
                            <Link href="/auth/signup">
                                <Button
                                    variant="default"
                                    size="lg"
                                    className="cursor-pointer rounded-lg h-12 text-sm"
                                    compForDark={true}
                                    icon={<ArrowRight className="size-4" />}
                                    iconPosition="end"
                                >
                                    Get Started Free
                                </Button>
                            </Link>
                        </div>
                    </Reveal>
                </section>
            </div>

            {/* ================================================ */}
            {/*  FLOATING MOBILE CTA                              */}
            {/* ================================================ */}
            <FloatingCta />
        </div>
    )
}

export default Page