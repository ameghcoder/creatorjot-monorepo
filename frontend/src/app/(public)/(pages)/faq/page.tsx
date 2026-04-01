import { FaqCards } from '@/components/sections/faq-section'

export const metadata = {
    title: 'FAQ | CreatorJot',
    description: 'Frequently asked questions about CreatorJot — how it works, what platforms are supported, pricing, refunds, and how we turn your YouTube videos into social media posts.',
    alternates: { canonical: 'https://creatorjot.com/faq' },
}

const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'Does this work with Shorts or TikToks?',
            acceptedAnswer: { '@type': 'Answer', text: 'Currently, CreatorJot is optimized for long-form YouTube videos (5+ minutes) to extract the most value and depth for your generated posts.' },
        },
        {
            '@type': 'Question',
            name: 'Will the posts sound like an AI robot?',
            acceptedAnswer: { '@type': 'Answer', text: 'No. We specifically analyze your transcript to match your tone, vocabulary, and sentence structure. It sounds like you, just formatted for the platform.' },
        },
        {
            '@type': 'Question',
            name: 'Can I edit the generated content?',
            acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. We provide high-quality drafts, but you always have the final say. You can tweak, regenerate, or publish directly.' },
        },
        {
            '@type': 'Question',
            name: 'What social platforms do you support?',
            acceptedAnswer: { '@type': 'Answer', text: 'We currently generate content optimized for Twitter (threads and single tweets), LinkedIn posts.' },
        },
    ],
}

export default function FAQPage() {
    return (
        <div className="mx-auto w-full border-l border-r border-border bg-background min-h-screen relative flex flex-col pt-16">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <div aria-hidden="true" className="absolute inset-0 mx-auto hidden min-h-screen w-full max-w-7xl lg:block pointer-events-none">
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 left-0 z-10 h-full w-px bg-foreground/15" />
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 right-0 z-10 h-full w-px bg-foreground/15" />
            </div>

            <main className="flex-1 relative z-10 w-full flex flex-col">
                <section className="relative px-6 py-24 md:py-32 overflow-hidden flex-1">
                    <div className="mb-14 text-center space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">FAQ</p>
                        <h1 className="text-4xl font-bold tracking-tight font-suse md:text-5xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            Common Questions
                        </h1>
                        <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                            Everything you need to know about CreatorJot.
                        </p>
                    </div>

                    <FaqCards />
                </section>
            </main>
        </div>
    )
}
