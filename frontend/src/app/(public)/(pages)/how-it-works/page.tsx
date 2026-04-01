import { HowItWorksCards } from '@/components/sections/how-it-works-cards'
import { Check } from 'lucide-react'

export const metadata = {
    title: 'How It Works | CreatorJot',
    description: 'Three steps to turn any YouTube video into Twitter threads, LinkedIn posts, and blog drafts — no prompting, no rewriting.',
    alternates: { canonical: 'https://creatorjot.com/how-it-works' },
}


export default function HowItWorksPage() {

    return (
        <div className="mx-auto w-full border-l border-r border-border bg-background min-h-screen relative flex flex-col pt-16">
            <div aria-hidden="true" className="absolute inset-0 mx-auto hidden min-h-screen w-full max-w-7xl lg:block pointer-events-none">
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 left-0 z-10 h-full w-px bg-foreground/15" />
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 right-0 z-10 h-full w-px bg-foreground/15" />
            </div>

            <main className="flex-1 relative z-10 w-full flex flex-col">
                <section className="relative px-6 py-24 md:py-32 overflow-hidden flex-1">
                    {/* Grid lines background */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-lines mask-y-from-10% mask-y-to-90%" />

                    <div className="mb-14 text-center space-y-3 relative z-10">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">How It Works</p>
                        <h1 className="text-4xl font-bold tracking-tight font-suse md:text-5xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            Three steps. Zero effort.
                        </h1>
                        <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                            See how we automate your content workflow.
                        </p>
                    </div>

                    <HowItWorksCards />

                    {/* Benefit tags */}
                    <div className="mx-auto mt-12 flex flex-wrap justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 relative z-10">
                        {['No prompting', 'No manual rewriting', 'No content fatigue'].map((b) => (
                            <span
                                key={b}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm"
                            >
                                <Check className="size-3.5 text-foreground/50" />
                                {b}
                            </span>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}
