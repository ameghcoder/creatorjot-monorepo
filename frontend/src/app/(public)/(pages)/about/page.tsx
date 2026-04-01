import Image from 'next/image'

export const metadata = {
    title: 'About Us | CreatorJot',
    description: 'Learn how CreatorJot was built to help creators, founders, and indie hackers turn YouTube videos into multi-platform social content.',
    alternates: { canonical: 'https://creatorjot.com/about' },
}

export default function AboutPage() {
    return (
        <div className="mx-auto w-full border-l border-r border-border bg-background min-h-screen relative flex flex-col pt-16">
            <div aria-hidden="true" className="absolute inset-0 mx-auto hidden min-h-screen w-full max-w-7xl lg:block pointer-events-none">
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 left-0 z-10 h-full w-px bg-foreground/15" />
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 right-0 z-10 h-full w-px bg-foreground/15" />
            </div>

            <main className="flex-1 relative z-10 w-full flex flex-col">
                <section className="relative px-6 py-24 md:py-32 overflow-hidden flex-1 max-w-3xl mx-auto">
                    <div className="mb-14 text-center space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">About Us</p>
                        <h1 className="text-4xl font-bold tracking-tight font-suse md:text-5xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            Our Mission
                        </h1>
                    </div>

                    <div className="space-y-6 text-base leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        <p>
                            At <strong className="text-foreground">CreatorJot</strong>, we believe that great content shouldn't die on a single platform. We saw creators spending hours scripting, filming, and editing incredible YouTube videos, only to let that knowledge sit unseen by audiences on Twitter, LinkedIn, and blogs.
                        </p>
                        <p>
                            Manual repurposing is exhausting. It drains creative energy that should be spent on your next big idea.
                        </p>
                        <p>
                            That's why we built CreatorJot. We wanted a tool that didn't just summarize, but actually understood the hooks, the arguments, and the unique tone of a creator. A tool that could turn a 20-minute video into a month's worth of multi-platform content in seconds.
                        </p>
                        <p>
                            Our team is dedicated to empowering creators, founders, and indie hackers to maximize their reach with zero extra effort. We handle the distribution format, so you can focus on the product and the creative vision.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    )
}
