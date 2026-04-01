import { Suspense } from 'react'
import { PricingCards } from '@/components/sections/pricing-section'
import { SuccessBanner } from './success-banner'

export const metadata = {
    title: 'Pricing | CreatorJot',
    description: 'Simple, transparent pricing for CreatorJot. Start free with 3 generations per month, or go Pro for unlimited Twitter threads, LinkedIn posts, and blog drafts from your YouTube videos.',
    alternates: { canonical: 'https://creatorjot.com/pricing' },
}

export default function PricingPage() {
    return (
        <div className="mx-auto w-full border-l border-r border-border bg-background min-h-screen relative flex flex-col pt-16">
            {/* Decorative side-borders */}
            <div aria-hidden="true" className="absolute inset-0 mx-auto hidden min-h-screen w-full max-w-7xl lg:block pointer-events-none">
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 left-0 z-10 h-full w-px bg-foreground/15" />
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 right-0 z-10 h-full w-px bg-foreground/15" />
            </div>

            <main className="flex-1 relative z-10 w-full flex flex-col">
                {/* Success banner — only renders when ?success=true is in the URL */}
                <Suspense>
                    <SuccessBanner />
                </Suspense>

                <section className="w-full relative px-6 py-24 md:py-32 overflow-hidden flex-1 flex flex-col">
                    {/* Gradient orbs behind pricing */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                        <div className="absolute top-10 left-1/4 h-[350px] w-[350px] rounded-full bg-blue-500/3 blur-[100px]" style={{ animation: 'float-slow 14s ease-in-out infinite' }} />
                        <div className="absolute bottom-10 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/3 blur-[100px]" style={{ animation: 'float-slow-reverse 16s ease-in-out infinite' }} />
                    </div>

                    <div className="mb-14 text-center space-y-3 relative z-10">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">Pricing</p>
                        <h1 className="text-4xl font-bold tracking-tight font-suse md:text-5xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            Simple, transparent pricing.
                        </h1>
                        <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                            Choose the plan that fits your content needs. Upgrade anytime.
                        </p>
                    </div>

                    <PricingCards />
                </section>
            </main>
        </div>
    )
}
